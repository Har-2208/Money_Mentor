import copy
from typing import Any, Dict

from backend.agents.behavior_agent import get_behavior_profile
from backend.agents.compliance_agent import add_disclaimer
from backend.agents.explanation_agent import explain_response
from backend.agents.portfolio_xray_crew import run_portfolio_xray_crew
from backend.agents.tax_wizard_crew import run_tax_wizard_crew
from backend.config import get_env_float
from backend.db.user_repository import get_user_data
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


def _build_fire_plan(user_data: Dict[str, Any], behavior: Dict[str, Any], retirement_age: int | None = None) -> Dict[str, Any]:
    inflation_rate = get_env_float("FIRE_INFLATION_RATE", 0.06)
    annual_return = get_env_float("FIRE_ANNUAL_RETURN", 0.12)
    swr = get_env_float("FIRE_SAFE_WITHDRAWAL_RATE", 0.04)

    monthly_expense = float(user_data["expenses"]["total"])
    current_age = int(user_data["goals"].get("current_age", 30))
    selected_retirement_age = retirement_age or int(user_data["goals"].get("retirement_age", 55))

    years_to_retire = max(selected_retirement_age - current_age, 1)
    adjusted_annual_expense = (monthly_expense * 12) * ((1 + inflation_rate) ** years_to_retire)
    target_corpus = adjusted_annual_expense / swr

    current_corpus = float(user_data["investments"].get("current_corpus", 0))
    required_corpus = max(target_corpus - current_corpus, 0)
    monthly_sip = calculate_sip(required_corpus, years_to_retire, annual_rate=annual_return)

    if behavior.get("adherence_score", 0.5) < 0.5:
        monthly_sip = monthly_sip * 0.9

    allocation = user_data["investments"].get(
        "current_allocation",
        {"equity": 0.7, "debt": 0.25, "gold": 0.05},
    )

    insurance_gap = max((monthly_expense * 12 * 20) - float(user_data["income"]["salary"]), 0)

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
    # Only timeline and SIP are recomputed for dynamic updates.
    updated = _build_fire_plan(user_data, behavior, retirement_age=new_retirement_age)
    existing = copy.deepcopy(existing_plan)
    existing.setdefault("fire_plan", {})
    existing["fire_plan"]["timeline"] = updated["fire_plan"]["timeline"]
    existing["fire_plan"]["monthly_sip"] = updated["fire_plan"]["monthly_sip"]
    existing["fire_plan"]["target_corpus"] = updated["fire_plan"]["target_corpus"]
    return existing


def _build_life_event_plan(user_data: Dict[str, Any], event: str) -> Dict[str, Any]:
    bonus = float(user_data["income"].get("bonus", 0))
    tax_impact = round(bonus * 0.30, 2)
    allocation_strategy = {"emergency_fund": 0.3, "debt_reduction": 0.2, "equity_investing": 0.5}
    suggestions = [
        f"Event detected: {event}",
        "Use windfall allocation buckets before lifestyle upgrades.",
    ]
    return {
        "life_event_plan": {
            "allocation_strategy": allocation_strategy,
            "tax_impact": tax_impact,
            "suggestions": suggestions,
        }
    }


def _build_couple_plan(user_data: Dict[str, Any]) -> Dict[str, Any]:
    primary_salary = float(user_data["income"]["salary"])
    partner_salary = float(user_data["partner"]["salary"])
    combined_income = primary_salary + partner_salary

    return {
        "couple_plan": {
            "combined_income": combined_income,
            "combined_80c_capacity": 300000,
            "goal_strategy": "Pool emergency corpus first, then split equity goals by timeline.",
        }
    }


def run_fire_feature(user_id: int, retirement_age: int | None = None) -> Dict[str, Any]:
    user_data = get_user_data(user_id)
    behavior = get_behavior_profile(user_id)
    if retirement_age is None:
        return _build_fire_plan(user_data, behavior)

    base = _build_fire_plan(user_data, behavior)
    return recalculate_fire_plan_on_retirement_age_change(base, user_data, behavior, retirement_age)


def run_tax_feature(user_id: int, salary: float | None = None, deductions: Dict[str, float] | None = None) -> Dict[str, Any]:
    user_data = get_user_data(user_id)
    resolved_salary = salary if salary is not None else float(user_data["income"]["salary"])
    resolved_deductions = deductions if deductions is not None else user_data.get("tax", {}).get("deductions", {})
    return run_tax_wizard_crew(resolved_salary, resolved_deductions)


def run_life_event_feature(user_id: int, event: str) -> Dict[str, Any]:
    user_data = get_user_data(user_id)
    return _build_life_event_plan(user_data, event)


def run_couple_feature(user_id: int) -> Dict[str, Any]:
    user_data = get_user_data(user_id)
    return _build_couple_plan(user_data)


def run_portfolio_feature(file_bytes: bytes) -> Dict[str, Any]:
    return run_portfolio_xray_crew(file_bytes)


def orchestrator(query: str, user_id: int) -> Dict[str, Any]:
    intent = detect_intent(query)
    user_data = get_user_data(user_id)
    behavior = get_behavior_profile(user_id)

    if intent == "retirement":
        result = _build_fire_plan(user_data, behavior)
    elif intent == "tax":
        salary = float(user_data["income"]["salary"])
        deductions = user_data.get("tax", {}).get("deductions", {})
        result = run_tax_wizard_crew(salary, deductions)
    elif intent == "life_event":
        result = _build_life_event_plan(user_data, event=query)
    elif intent == "couple":
        result = _build_couple_plan(user_data)
    elif intent == "portfolio":
        result = {
            "message": "Use the dedicated portfolio endpoint with CAMS PDF upload for portfolio_analysis output.",
        }
    else:
        result = {
            "message": "I can help with FIRE planning, tax optimization, life events, and couple planning.",
        }

    explanation = explain_response(result)
    final_response = add_disclaimer(explanation)
    return {
        "intent": intent,
        "data": result,
        "explanation": final_response,
    }