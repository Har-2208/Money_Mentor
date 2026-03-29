import copy
from typing import Any, Dict, List

from backend.agents.behavior_agent import get_behavior_profile
from backend.agents.explanation_agent import explain_response
from backend.agents.portfolio_xray_crew import run_portfolio_xray_crew
from backend.agents.tax_wizard_crew import run_tax_wizard_crew
from backend.config import get_env_float
from backend.db.user_repository import get_user_data
from backend.services.gemini_services import ask_gemini
from backend.tools.sip_calculator import calculate_sip


def detect_intent(query: str) -> str:
    normalized = query.strip().lower()
    if "tax" in normalized or "form 16" in normalized or "deduction" in normalized:
        return "tax"
    if "retire" in normalized or "fire" in normalized or "future" in normalized:
        return "retirement"
    if "bonus" in normalized or "married" in normalized or "marriage" in normalized:
        return "life_event"
    if "partner" in normalized or "couple" in normalized:
        return "couple"
    if "portfolio" in normalized or "xray" in normalized or "cams" in normalized:
        return "portfolio"
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
        "income",
        "expenses",
        "goals",
        "investments",
        "tax",
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

    if intent == "tax":
        if salary <= 0:
            missing.append("annual salary")

    elif intent == "retirement":
        if current_age <= 0:
            missing.append("current age")
        if retirement_age <= current_age:
            missing.append("retirement age (greater than current age)")
        if monthly_expenses <= 0:
            missing.append("monthly expenses")

    elif intent == "life_event":
        if salary <= 0:
            missing.append("annual income")
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
    inflation_rate = get_env_float("FIRE_INFLATION_RATE", 0.06)
    annual_return = get_env_float("FIRE_ANNUAL_RETURN", 0.12)
    swr = get_env_float("FIRE_SAFE_WITHDRAWAL_RATE", 0.04)

    monthly_expense = _to_float(user_data.get("expenses", {}).get("total"), 0.0)
    current_age = _to_int(user_data.get("goals", {}).get("current_age"), 30)
    selected_retirement_age = retirement_age or _to_int(user_data.get("goals", {}).get("retirement_age"), 55)

    years_to_retire = max(selected_retirement_age - current_age, 1)
    adjusted_annual_expense = (monthly_expense * 12) * ((1 + inflation_rate) ** years_to_retire)
    target_corpus = adjusted_annual_expense / swr if swr > 0 else 0.0

    current_corpus = _to_float(user_data.get("investments", {}).get("current_corpus"), 0.0)
    required_corpus = max(target_corpus - current_corpus, 0.0)
    monthly_sip = calculate_sip(required_corpus, years_to_retire, annual_rate=annual_return) if required_corpus > 0 else 0.0

    if behavior.get("adherence_score", 0.5) < 0.5:
        monthly_sip = monthly_sip * 0.9

    allocation = user_data.get("investments", {}).get(
        "current_allocation",
        {"equity": 0.65, "debt": 0.30, "gold": 0.05},
    )

    annual_income = _to_float(user_data.get("income", {}).get("salary"), 0.0)
    insurance_gap = max((monthly_expense * 12 * 20) - annual_income, 0.0)

    return {
        "fire_plan": {
            "monthly_sip": round(monthly_sip, 2),
            "asset_allocation": allocation,
            "timeline": {"years_to_retire": years_to_retire, "retirement_age": selected_retirement_age},
            "insurance_gap": round(insurance_gap, 2),
            "target_corpus": round(target_corpus, 2),
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


def _build_life_event_plan(user_data: Dict[str, Any], event: str, use_ai: bool = False) -> Dict[str, Any]:
    annual_income = _to_float(user_data.get("income", {}).get("salary"), 0.0)
    monthly_expense = _to_float(user_data.get("expenses", {}).get("total"), 0.0)
    bonus = _to_float(user_data.get("income", {}).get("bonus"), 0.0)
    tax_on_bonus = round(bonus * 0.30, 2)

    emergency_target = round(monthly_expense * 6, 2)
    allocation_strategy = [
        f"Build emergency buffer toward INR {emergency_target:,.0f} first.",
        "Split any event-linked windfall into safety, goals, and lifestyle buckets.",
        "Refresh insurance and nominations after this life event.",
    ]

    suggestions_prompt = (
        "You are a financial planning assistant. "
        f"User annual income INR {annual_income:.0f}, monthly expense INR {monthly_expense:.0f}, "
        f"event '{event}'. Provide 4 concise bullet suggestions."
    )
    suggestions = _llm_bullet_suggestions(
        suggestions_prompt,
        [
            "Stabilize liquidity before adding new recurring commitments.",
            "Update monthly budget categories for the new life stage.",
            "Re-evaluate tax-saving and protection coverage after this event.",
            "Track progress with a 90-day follow-up review.",
        ],
        use_ai=use_ai,
    )

    warnings: List[str] = []
    if monthly_expense > 0 and bonus > 0 and bonus < monthly_expense * 2:
        warnings.append("Bonus may not cover multi-month commitments. Keep contingency cash.")
    if annual_income <= 0:
        warnings.append("Income details are missing, so advice is based on limited inputs.")

    return {
        "life_event_plan": {
            "event": event,
            "allocation_strategy": allocation_strategy,
            "tax_impact": [f"Estimated tax on bonus component: INR {tax_on_bonus:,.2f}"],
            "suggestions": suggestions,
            "warnings": warnings,
        }
    }


def _build_couple_plan(
    user_data: Dict[str, Any],
    profile_overrides: Dict[str, Any] | None = None,
    use_ai: bool = False,
) -> Dict[str, Any]:
    profile_overrides = profile_overrides or {}

    partner1_income = _to_float(profile_overrides.get("partner1_income"), _to_float(user_data.get("income", {}).get("salary"), 0.0))
    partner2_income = _to_float(profile_overrides.get("partner2_income"), _to_float(user_data.get("partner", {}).get("salary"), 0.0))
    partner1_expenses = _to_float(profile_overrides.get("partner1_expenses"), _to_float(user_data.get("expenses", {}).get("total"), 0.0) * 12)
    partner2_expenses = _to_float(profile_overrides.get("partner2_expenses"), _to_float(user_data.get("expenses", {}).get("total"), 0.0) * 0.8 * 12)
    partner1_investments = _to_float(profile_overrides.get("partner1_investments"), _to_float(user_data.get("investments", {}).get("current_corpus"), 0.0))
    partner2_investments = _to_float(profile_overrides.get("partner2_investments"), _to_float(user_data.get("investments", {}).get("current_corpus"), 0.0) * 0.6)

    shared_goals = str(profile_overrides.get("shared_goals") or "Shared emergency corpus and long-term goals").strip()
    risk_preference = str(profile_overrides.get("risk_preference") or "moderate").strip().lower()

    combined_income = partner1_income + partner2_income
    combined_expenses = partner1_expenses + partner2_expenses
    net_savings = max(combined_income - combined_expenses, 0.0)

    investment_strategy = _llm_bullet_suggestions(
        (
            "You are a financial advisor assistant. Provide 3 concise investment strategy bullets "
            f"for a couple with income INR {combined_income:.0f}, expenses INR {combined_expenses:.0f}, "
            f"risk preference {risk_preference}, goals: {shared_goals}."
        ),
        [
            "Maintain a shared emergency fund before increasing risk allocation.",
            "Automate monthly SIP allocations linked to risk preference.",
            "Rebalance jointly every 6 months and after major life changes.",
        ],
        max_items=3,
        use_ai=use_ai,
    )

    tax_suggestions = _llm_bullet_suggestions(
        (
            "Provide 3 concise Indian tax optimization bullets for a salaried couple "
            f"with combined income INR {combined_income:.0f}."
        ),
        [
            "Use both partners' 80C capacity efficiently before year-end.",
            "Claim eligible 80D deductions through health insurance planning.",
            "Evaluate old vs new regime each year before filing.",
        ],
        max_items=3,
        use_ai=use_ai,
    )

    goal_strategy = [
        f"Prioritize and sequence goals: {shared_goals}.",
        "Split contributions based on net take-home proportion.",
        "Review progress quarterly and adjust for income changes.",
    ]

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
            "net_savings": round(net_savings, 2),
            "combined_80c_capacity": 150000 * 2,
            "investment_strategy": investment_strategy,
            "tax_suggestions": tax_suggestions,
            "goal_strategy": goal_strategy,
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


def run_tax_feature(user_id: str | int, salary: float | None = None, deductions: Dict[str, float] | None = None) -> Dict[str, Any]:
    user_data = get_user_data(user_id)
    resolved_salary = salary if salary is not None else _to_float(user_data.get("income", {}).get("salary"), 0.0)
    resolved_deductions = deductions if deductions is not None else user_data.get("tax", {}).get("deductions", {})
    return run_tax_wizard_crew(resolved_salary, resolved_deductions)


def run_life_event_feature(
    user_id: str | int,
    event: str,
    profile_overrides: Dict[str, Any] | None = None,
    use_ai: bool = False,
) -> Dict[str, Any]:
    user_data = get_user_data(user_id)
    profile_overrides = profile_overrides or {}
    if profile_overrides.get("annual_income") is not None:
        user_data.setdefault("income", {})["salary"] = _to_float(profile_overrides.get("annual_income"))
    if profile_overrides.get("monthly_expenses") is not None:
        user_data.setdefault("expenses", {})["total"] = _to_float(profile_overrides.get("monthly_expenses"))
    if profile_overrides.get("bonus") is not None:
        user_data.setdefault("income", {})["bonus"] = _to_float(profile_overrides.get("bonus"))
    return _build_life_event_plan(user_data, event, use_ai=use_ai)


def run_couple_feature(
    user_id: str | int,
    profile_overrides: Dict[str, Any] | None = None,
    use_ai: bool = False,
) -> Dict[str, Any]:
    user_data = get_user_data(user_id)
    return _build_couple_plan(user_data, profile_overrides, use_ai=use_ai)


def run_portfolio_feature(file_bytes: bytes) -> Dict[str, Any]:
    return run_portfolio_xray_crew(file_bytes)


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
    elif intent == "tax":
        if missing_fields:
            result = {
                "message": "Tax projections are approximate because profile inputs are incomplete.",
                "missing_fields": missing_fields,
            }
        else:
            salary = _to_float(user_data.get("income", {}).get("salary"), 0.0)
            deductions = user_data.get("tax", {}).get("deductions", {})
            result = run_tax_wizard_crew(salary, deductions)
    elif intent == "life_event":
        if missing_fields:
            result = {
                "message": "Life-event guidance is available, but personalization is limited by missing inputs.",
                "missing_fields": missing_fields,
                "event": query,
            }
        else:
            result = _build_life_event_plan(user_data, event=query, use_ai=False)
    elif intent == "couple":
        if missing_fields:
            result = {
                "message": "Couple planning guidance is available, but key income data is missing.",
                "missing_fields": missing_fields,
            }
        else:
            result = _build_couple_plan(user_data, use_ai=False)
    elif intent == "portfolio":
        result = {
            "message": "Use the dedicated portfolio endpoint with CAMS PDF upload for portfolio analysis output.",
        }
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