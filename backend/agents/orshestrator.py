import copy
from typing import Any, Dict, List

from backend.agents.behavior_agent import get_behavior_profile
from backend.agents.explanation_agent import explain_response
from backend.config import get_env_float
from backend.db.user_repository import get_user_data
from backend.services.gemini_services import ask_gemini
from backend.tools.sip_calculator import calculate_sip


def detect_intent(query: str) -> str:
    normalized = query.strip().lower()
    if "retire" in normalized or "fire" in normalized or "future" in normalized:
        return "retirement"
    if "partner" in normalized or "couple" in normalized:
        return "couple"
    return "general"


def _to_float(value: Any, default: float = 0.0) -> float:
    if value is None:
        return default
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _to_int(value: Any, default: int) -> int:
    if value is None:
        return default
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _clamp(value: float, lower: float, upper: float) -> float:
    return max(lower, min(upper, value))


def _clean_lines(text: str) -> List[str]:
    lines: List[str] = []
    for raw in (text or "").splitlines():
        line = raw.strip().lstrip("-* ").strip()
        if line:
            lines.append(line)
    return lines


def _deep_merge(base: Dict[str, Any], overrides: Dict[str, Any]) -> Dict[str, Any]:
    merged = copy.deepcopy(base)
    for key, value in (overrides or {}).items():
        if isinstance(value, dict) and isinstance(merged.get(key), dict):
            merged[key] = _deep_merge(merged[key], value)
        else:
            merged[key] = value
    return merged


def _sanitize_user_context(context: Dict[str, Any] | None) -> Dict[str, Any]:
    if not isinstance(context, dict):
        return {}
    allowed = {
        "personal_info",
        "income",
        "expenses",
        "assets",
        "liabilities",
        "insurance",
        "goals",
        "investments",
        "profile",
        "partner",
    }
    return {k: v for k, v in context.items() if k in allowed}


def _missing_fields_for_intent(intent: str, user_data: Dict[str, Any]) -> List[str]:
    missing: List[str] = []

    salary = _to_float(user_data.get("income", {}).get("salary"), 0.0)
    monthly_expenses = _to_float(user_data.get("expenses", {}).get("total"), 0.0)
    current_age = _to_int(user_data.get("goals", {}).get("current_age"), 0)
    retirement_age = _to_int(user_data.get("goals", {}).get("retirement_age"), 0)
    partner_salary = _to_float(user_data.get("partner", {}).get("salary"), 0.0)

    if intent == "retirement":
        if current_age <= 0:
            missing.append("current age")
        if retirement_age <= current_age:
            missing.append("retirement age (greater than current age)")
        if monthly_expenses <= 0:
            missing.append("monthly expenses")

    elif intent == "couple":
        if salary <= 0:
            missing.append("your annual income")
        if partner_salary <= 0:
            missing.append("partner annual income")

    return missing


def _llm_bullet_suggestions(
    prompt: str,
    fallback: List[str],
    max_items: int = 4,
    use_ai: bool = True,
) -> List[str]:
    if not use_ai:
        return fallback

    text = ask_gemini(prompt)
    if "Gemini is not configured" in text:
        return fallback

    lines = _clean_lines(text)
    if not lines:
        return fallback
    return lines[:max_items]


def _apply_fire_inputs(user_data: Dict[str, Any], profile_overrides: Dict[str, Any] | None) -> Dict[str, Any]:
    if not profile_overrides:
        return user_data

    updated = copy.deepcopy(user_data)

    if profile_overrides.get("monthly_income") is not None:
        updated.setdefault("income", {})["salary"] = _to_float(profile_overrides.get("monthly_income")) * 12
    if profile_overrides.get("monthly_expenses") is not None:
        updated.setdefault("expenses", {})["total"] = _to_float(profile_overrides.get("monthly_expenses"))
    if profile_overrides.get("current_age") is not None:
        updated.setdefault("goals", {})["current_age"] = _to_int(profile_overrides.get("current_age"), 30)
    if profile_overrides.get("retirement_age") is not None:
        updated.setdefault("goals", {})["retirement_age"] = _to_int(profile_overrides.get("retirement_age"), 55)
    if profile_overrides.get("current_investments") is not None:
        updated.setdefault("investments", {})["current_corpus"] = _to_float(profile_overrides.get("current_investments"))
    if profile_overrides.get("monthly_investment") is not None:
        updated.setdefault("investments", {})["monthly_investment"] = _to_float(profile_overrides.get("monthly_investment"))
    if profile_overrides.get("inflation_rate") is not None:
        updated.setdefault("assumptions", {})["inflation_rate"] = _to_float(profile_overrides.get("inflation_rate"))
    if profile_overrides.get("annual_return") is not None:
        updated.setdefault("assumptions", {})["annual_return"] = _to_float(profile_overrides.get("annual_return"))
    if profile_overrides.get("safe_withdrawal_rate") is not None:
        updated.setdefault("assumptions", {})["safe_withdrawal_rate"] = _to_float(
            profile_overrides.get("safe_withdrawal_rate")
        )

    risk_level = str(profile_overrides.get("risk_level") or "").lower().strip()
    if risk_level:
        allocation_map = {
            "conservative": {"equity": 0.5, "debt": 0.45, "gold": 0.05},
            "moderate": {"equity": 0.65, "debt": 0.30, "gold": 0.05},
            "aggressive": {"equity": 0.8, "debt": 0.15, "gold": 0.05},
        }
        updated.setdefault("investments", {})["current_allocation"] = allocation_map.get(
            risk_level,
            allocation_map["moderate"],
        )

    return updated


def _build_fire_plan(user_data: Dict[str, Any], behavior: Dict[str, Any], retirement_age: int | None = None) -> Dict[str, Any]:
    inflation_rate = _clamp(
        _to_float(user_data.get("assumptions", {}).get("inflation_rate"), get_env_float("FIRE_INFLATION_RATE", 0.06)),
        0.0,
        0.2,
    )
    annual_return = _clamp(
        _to_float(user_data.get("assumptions", {}).get("annual_return"), get_env_float("FIRE_ANNUAL_RETURN", 0.12)),
        0.01,
        0.3,
    )
    swr = _clamp(
        _to_float(
            user_data.get("assumptions", {}).get("safe_withdrawal_rate"),
            get_env_float("FIRE_SAFE_WITHDRAWAL_RATE", 0.04),
        ),
        0.01,
        0.08,
    )

    monthly_expense = _to_float(user_data.get("expenses", {}).get("total"), 0.0)
    monthly_income = _to_float(user_data.get("income", {}).get("salary"), 0.0) / 12
    current_age = _to_int(user_data.get("goals", {}).get("current_age"), 30)
    selected_retirement_age = retirement_age or _to_int(user_data.get("goals", {}).get("retirement_age"), 55)

    years_to_retire = max(selected_retirement_age - current_age, 1)
    adjusted_annual_expense = (monthly_expense * 12) * ((1 + inflation_rate) ** years_to_retire)
    target_corpus = adjusted_annual_expense / swr if swr > 0 else 0.0

    current_corpus = _to_float(user_data.get("investments", {}).get("current_corpus"), 0.0)
    existing_monthly_investment = max(
        0.0,
        _to_float(user_data.get("investments", {}).get("monthly_investment"), 0.0),
    )

    projected_current_corpus = current_corpus * ((1 + annual_return) ** years_to_retire)
    monthly_rate = annual_return / 12
    months = years_to_retire * 12
    sip_growth_factor = (
        (((1 + monthly_rate) ** months) - 1) / monthly_rate * (1 + monthly_rate)
        if monthly_rate > 0
        else months
    )
    projected_existing_contributions = existing_monthly_investment * sip_growth_factor

    required_future_gap = max(target_corpus - projected_current_corpus - projected_existing_contributions, 0.0)
    additional_monthly_sip = calculate_sip(required_future_gap, years_to_retire, annual_rate=annual_return) if required_future_gap > 0 else 0.0
    monthly_sip = existing_monthly_investment + additional_monthly_sip

    if behavior.get("adherence_score", 0.5) < 0.5:
        monthly_sip = monthly_sip * 0.95

    allocation = user_data.get("investments", {}).get(
        "current_allocation",
        {"equity": 0.65, "debt": 0.30, "gold": 0.05},
    )

    annual_income = _to_float(user_data.get("income", {}).get("salary"), 0.0)
    insurance_gap = max((monthly_expense * 12 * 20) - annual_income, 0.0)
    monthly_surplus = max(monthly_income - monthly_expense, 0.0)
    savings_rate = (monthly_surplus / monthly_income) if monthly_income > 0 else 0.0

    warnings: List[str] = []
    if monthly_expense <= 0:
        warnings.append("Monthly expenses are zero or missing, so corpus estimate may be unrealistically low.")
    if monthly_income > 0 and monthly_expense > monthly_income:
        warnings.append("Monthly expenses exceed income; prioritize cash-flow correction before aggressive FIRE targets.")
    if selected_retirement_age <= current_age:
        warnings.append("Retirement age must be greater than current age. Assumed minimum 1-year horizon.")
    if monthly_surplus > 0 and monthly_sip > monthly_surplus:
        warnings.append("Recommended monthly investment exceeds current monthly surplus.")

    return {
        "fire_plan": {
            "monthly_sip": round(monthly_sip, 2),
            "additional_sip_needed": round(additional_monthly_sip, 2),
            "existing_monthly_investment": round(existing_monthly_investment, 2),
            "asset_allocation": allocation,
            "timeline": {"years_to_retire": years_to_retire, "retirement_age": selected_retirement_age},
            "insurance_gap": round(insurance_gap, 2),
            "target_corpus": round(target_corpus, 2),
            "projected_current_corpus": round(projected_current_corpus, 2),
            "projected_existing_contributions": round(projected_existing_contributions, 2),
            "monthly_income": round(monthly_income, 2),
            "monthly_expenses": round(monthly_expense, 2),
            "monthly_surplus": round(monthly_surplus, 2),
            "savings_rate": round(savings_rate, 4),
            "assumptions": {
                "inflation_rate": round(inflation_rate, 4),
                "annual_return": round(annual_return, 4),
                "safe_withdrawal_rate": round(swr, 4),
            },
            "warnings": warnings,
        }
    }


def recalculate_fire_plan_on_retirement_age_change(
    existing_plan: Dict[str, Any],
    user_data: Dict[str, Any],
    behavior: Dict[str, Any],
    new_retirement_age: int,
) -> Dict[str, Any]:
    updated = _build_fire_plan(user_data, behavior, retirement_age=new_retirement_age)
    existing = copy.deepcopy(existing_plan)
    existing.setdefault("fire_plan", {})
    existing["fire_plan"]["timeline"] = updated["fire_plan"]["timeline"]
    existing["fire_plan"]["monthly_sip"] = updated["fire_plan"]["monthly_sip"]
    existing["fire_plan"]["target_corpus"] = updated["fire_plan"]["target_corpus"]
    return existing


def _build_couple_plan(
    user_data: Dict[str, Any],
    profile_overrides: Dict[str, Any] | None = None,
    use_ai: bool = False,
) -> Dict[str, Any]:
    profile_overrides = profile_overrides or {}

    default_p1_income = _to_float(user_data.get("income", {}).get("salary"), 0.0)
    default_p2_income = _to_float(user_data.get("partner", {}).get("salary"), 0.0)
    default_p1_expenses = _to_float(user_data.get("expenses", {}).get("total"), 0.0) * 12
    default_p2_expenses = default_p1_expenses * 0.8
    default_p1_investments = _to_float(user_data.get("investments", {}).get("current_corpus"), 0.0)
    default_p2_investments = default_p1_investments * 0.6

    partner1_income = _to_float(profile_overrides.get("partner1_income"), default_p1_income)
    partner2_income = _to_float(profile_overrides.get("partner2_income"), default_p2_income)
    partner1_expenses = _to_float(profile_overrides.get("partner1_expenses"), default_p1_expenses)
    partner2_expenses = _to_float(profile_overrides.get("partner2_expenses"), default_p2_expenses)
    partner1_investments = _to_float(profile_overrides.get("partner1_investments"), default_p1_investments)
    partner2_investments = _to_float(profile_overrides.get("partner2_investments"), default_p2_investments)

    shared_goals = str(profile_overrides.get("shared_goals") or "Shared emergency corpus and long-term goals").strip()
    risk_preference = str(profile_overrides.get("risk_preference") or "moderate").strip().lower()

    combined_income = partner1_income + partner2_income
    combined_expenses = partner1_expenses + partner2_expenses
    annual_surplus = combined_income - combined_expenses

    monthly_income = combined_income / 12 if combined_income > 0 else 0.0
    monthly_expenses = combined_expenses / 12 if combined_expenses > 0 else 0.0
    monthly_surplus = monthly_income - monthly_expenses

    savings_rate = (annual_surplus / combined_income) if combined_income > 0 else 0.0
    combined_investments = max(partner1_investments + partner2_investments, 0.0)

    emergency_target = max(monthly_expenses * 6, 0.0)
    emergency_available = min(combined_investments * 0.20, emergency_target)
    emergency_gap = max(emergency_target - emergency_available, 0.0)

    monthly_emergency_topup = max(min(monthly_surplus * 0.35, emergency_gap / 12), 0.0)
    monthly_investment_capacity = max(monthly_surplus - monthly_emergency_topup, 0.0)

    if risk_preference == "conservative":
        allocation = {"equity": 0.45, "debt": 0.45, "gold": 0.10}
    elif risk_preference == "aggressive":
        allocation = {"equity": 0.80, "debt": 0.15, "gold": 0.05}
    else:
        allocation = {"equity": 0.65, "debt": 0.30, "gold": 0.05}

    income_total_for_split = max(partner1_income + partner2_income, 0.0)
    partner1_contribution_ratio = (partner1_income / income_total_for_split) if income_total_for_split > 0 else 0.5
    partner2_contribution_ratio = 1.0 - partner1_contribution_ratio

    investment_strategy = _llm_bullet_suggestions(
        (
            "You are a financial advisor assistant. Provide 3 concise investment strategy bullets "
            f"for a couple with income INR {combined_income:.0f}, expenses INR {combined_expenses:.0f}, "
            f"risk preference {risk_preference}, goals: {shared_goals}."
        ),
        [
            f"Allocate monthly investment in the ratio {round(partner1_contribution_ratio * 100)}:{round(partner2_contribution_ratio * 100)} to keep contributions fair.",
            f"Use target allocation Equity {int(allocation['equity'] * 100)}%, Debt {int(allocation['debt'] * 100)}%, Gold {int(allocation['gold'] * 100)}% for new investments.",
            "Rebalance the combined portfolio every 6 months or after a >10% drift in allocation.",
        ],
        max_items=3,
        use_ai=use_ai,
    )

    budget_suggestions = _llm_bullet_suggestions(
        (
            "Provide 3 concise cash-flow optimization bullets for a salaried couple "
            f"with combined income INR {combined_income:.0f}."
        ),
        [
            f"Set household fixed costs under 60% of monthly income (current: {round((monthly_expenses / monthly_income) * 100) if monthly_income > 0 else 0}%).",
            f"Auto-transfer INR {monthly_emergency_topup:,.0f}/month to emergency fund until INR {emergency_target:,.0f} is reached.",
            f"Auto-invest INR {monthly_investment_capacity:,.0f}/month after mandatory bills and emergency contribution.",
        ],
        max_items=3,
        use_ai=use_ai,
    )

    goal_strategy = [
        f"Prioritize and sequence shared goals: {shared_goals}.",
        f"Contribute in proportion to income: Partner 1 {round(partner1_contribution_ratio * 100)}%, Partner 2 {round(partner2_contribution_ratio * 100)}%.",
        "Create one joint review every quarter to reprice goals and update contributions.",
    ]

    warnings: List[str] = []
    if combined_income <= 0:
        warnings.append("Combined income is missing. Couple plan quality is limited.")
    if annual_surplus <= 0:
        warnings.append("Current annual expenses are equal to or above annual income. Reduce cash burn before increasing investments.")
    if savings_rate < 0.15 and annual_surplus > 0:
        warnings.append("Savings rate is below 15%. Consider reducing discretionary expenses or raising savings automation.")

    return {
        "couple_plan": {
            "partner1_income": round(partner1_income, 2),
            "partner2_income": round(partner2_income, 2),
            "partner1_expenses": round(partner1_expenses, 2),
            "partner2_expenses": round(partner2_expenses, 2),
            "partner1_investments": round(partner1_investments, 2),
            "partner2_investments": round(partner2_investments, 2),
            "combined_income": round(combined_income, 2),
            "combined_expenses": round(combined_expenses, 2),
            "net_savings": round(max(annual_surplus, 0.0), 2),
            "annual_surplus": round(annual_surplus, 2),
            "monthly_income": round(monthly_income, 2),
            "monthly_expenses": round(monthly_expenses, 2),
            "monthly_surplus": round(monthly_surplus, 2),
            "savings_rate": round(savings_rate, 4),
            "current_combined_investments": round(combined_investments, 2),
            "emergency_fund_target": round(emergency_target, 2),
            "estimated_emergency_available": round(emergency_available, 2),
            "emergency_fund_gap": round(emergency_gap, 2),
            "recommended_monthly_emergency_contribution": round(monthly_emergency_topup, 2),
            "recommended_monthly_investment": round(monthly_investment_capacity, 2),
            "contribution_split": {
                "partner1": round(partner1_contribution_ratio, 4),
                "partner2": round(partner2_contribution_ratio, 4),
            },
            "recommended_allocation": allocation,
            "combined_80c_capacity": 150000 * 2,
            "investment_strategy": investment_strategy,
            "budget_suggestions": budget_suggestions,
            "goal_strategy": goal_strategy,
            "warnings": warnings,
        }
    }


def run_fire_feature(
    user_id: str | int,
    retirement_age: int | None = None,
    profile_overrides: Dict[str, Any] | None = None,
) -> Dict[str, Any]:
    user_data = _apply_fire_inputs(get_user_data(user_id), profile_overrides)
    behavior = get_behavior_profile(user_id, user_data)
    if retirement_age is None:
        return _build_fire_plan(user_data, behavior)

    base = _build_fire_plan(user_data, behavior)
    return recalculate_fire_plan_on_retirement_age_change(base, user_data, behavior, retirement_age)


def run_couple_feature(
    user_id: str | int,
    profile_overrides: Dict[str, Any] | None = None,
    use_ai: bool = False,
) -> Dict[str, Any]:
    user_data = get_user_data(user_id)
    return _build_couple_plan(user_data, profile_overrides, use_ai=use_ai)


def orchestrator(query: str, user_id: str | int, user_context: Dict[str, Any] | None = None) -> Dict[str, Any]:
    intent = detect_intent(query)
    user_data = get_user_data(user_id)
    user_data = _deep_merge(user_data, _sanitize_user_context(user_context))
    behavior = get_behavior_profile(user_id, user_data)

    missing_fields = _missing_fields_for_intent(intent, user_data)

    if intent == "retirement":
        if missing_fields:
            result = {
                "message": "Personalized FIRE math is limited because some profile inputs are missing.",
                "missing_fields": missing_fields,
            }
        else:
            result = _build_fire_plan(user_data, behavior)
    elif intent == "couple":
        if missing_fields:
            result = {
                "message": "Couple planning guidance is available, but key income data is missing.",
                "missing_fields": missing_fields,
            }
        else:
            result = _build_couple_plan(user_data, use_ai=False)
    else:
        result = {
            "message": "General finance question detected. Provide broad guidance and then tailor with available profile context.",
        }

    explanation = explain_response(
        result,
        query=query,
        intent=intent,
        user_context=user_data,
        missing_fields=missing_fields,
    )
    return {
        "intent": intent,
        "data": result,
        "explanation": explanation,
    }