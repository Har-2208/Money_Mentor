from typing import Any, Dict

from backend.agents.orshestrator import run_couple_feature
from backend.db.user_repository import find_user_profile_by_email, get_user_data


def generate_couple_plan(
    user_id: str,
    profile_overrides: Dict[str, Any] | None = None,
    use_ai: bool = False,
) -> Dict[str, Any]:
    return run_couple_feature(user_id, profile_overrides, use_ai=use_ai)


def import_partner_profile(email: str) -> Dict[str, Any]:
    profile = find_user_profile_by_email(email)
    if not profile:
        raise ValueError("No registered user found with this email.")

    partner_user_id = profile.get("id")
    partner_data = get_user_data(partner_user_id)

    income = partner_data.get("income", {})
    expenses = partner_data.get("expenses", {})
    investments = partner_data.get("investments", {})
    goals = partner_data.get("goals_list", [])

    salary_total = float(income.get("salary") or 0.0)
    if salary_total <= 0:
        salary_total = (
            float(income.get("base_salary") or 0.0)
            + float(income.get("hra") or 0.0)
            + float(income.get("other_allowances") or 0.0)
            + float(income.get("other_income") or 0.0)
        )

    monthly_expenses = float(expenses.get("total") or 0.0)
    annual_expenses = monthly_expenses * 12.0

    current_investments = float(investments.get("current_corpus") or 0.0)
    if current_investments <= 0:
        assets = partner_data.get("assets", {})
        current_investments = (
            float(assets.get("cash") or 0.0)
            + float(assets.get("fd") or 0.0)
            + float(assets.get("mutual_funds") or 0.0)
            + float(assets.get("ppf") or 0.0)
            + float(assets.get("stocks") or 0.0)
        )

    goal_names = [
        str(goal.get("goal_type") or "").strip()
        for goal in goals
        if str(goal.get("goal_type") or "").strip()
    ]

    return {
        "partner_profile": {
            "user_id": str(partner_user_id),
            "email": profile.get("email") or email,
            "name": profile.get("full_name") or "Partner",
            "annual_income": round(max(salary_total, 0.0), 2),
            "annual_expenses": round(max(annual_expenses, 0.0), 2),
            "current_investments": round(max(current_investments, 0.0), 2),
            "risk_profile": partner_data.get("risk_profile") or "",
            "goal_summary": ", ".join(goal_names[:3]),
        }
    }