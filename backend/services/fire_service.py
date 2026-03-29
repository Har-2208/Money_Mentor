from typing import Any, Dict

from backend.agents.orshestrator import run_fire_feature
from backend.db.fire_plan_repository import (
    FirePlanPersistenceError,
    extract_fire_run_payload,
    get_latest_fire_plan_run,
    save_fire_plan_run,
)


def generate_fire_plan(
    user_id: str,
    retirement_age: int | None = None,
    profile_overrides: Dict[str, Any] | None = None,
) -> Dict[str, Any]:
    plan = run_fire_feature(user_id, retirement_age, profile_overrides)
    return plan


def generate_and_save_fire_plan(
    user_id: str,
    retirement_age: int | None = None,
    profile_overrides: Dict[str, Any] | None = None,
) -> Dict[str, Any]:
    payload = profile_overrides or {}
    plan = run_fire_feature(user_id, retirement_age, payload)

    input_data = {
        "retirement_age": retirement_age,
        "current_age": payload.get("current_age"),
        "monthly_income": payload.get("monthly_income"),
        "monthly_expenses": payload.get("monthly_expenses"),
        "current_investments": payload.get("current_investments"),
        "monthly_investment": payload.get("monthly_investment"),
        "risk_level": payload.get("risk_level"),
        "inflation_rate": payload.get("inflation_rate"),
        "annual_return": payload.get("annual_return"),
        "safe_withdrawal_rate": payload.get("safe_withdrawal_rate"),
    }

    try:
        saved_row = save_fire_plan_run(user_id=user_id, input_data=input_data, plan_output=plan)
        if saved_row:
            plan["fire_run"] = {
                "id": saved_row.get("id"),
                "created_at": saved_row.get("created_at"),
            }
    except FirePlanPersistenceError:
        plan["warning"] = "Plan generated, but saving to fire_plan_runs failed."

    return plan


def get_latest_saved_fire_plan(user_id: str) -> Dict[str, Any]:
    row = get_latest_fire_plan_run(user_id)
    payload = extract_fire_run_payload(row)

    if not payload:
        return {"found": False}

    return {
        "found": True,
        "fire_run": payload,
    }