from __future__ import annotations

import logging
from typing import Any, Dict, List

import requests

from backend.db.supabase_client import get_supabase_rest_config


logger = logging.getLogger(__name__)


def _default_user_data(user_id: str | int) -> Dict[str, Any]:
    return {
        "user_id": user_id,
        "personal_info": {
            "age": 30,
            "city": "",
            "marital_status": "",
            "dependents": 0,
        },
        "income": {
            "salary": 0,
            "base_salary": 0,
            "hra": 0,
            "other_allowances": 0,
            "other_income": 0,
            "bonus": 0,
        },
        "expenses": {
            "total": 0,
            "rent": 0,
            "food": 0,
            "travel": 0,
            "subscriptions": 0,
            "misc": 0,
        },
        "assets": {
            "cash": 0,
            "fd": 0,
            "mutual_funds": 0,
            "ppf": 0,
            "stocks": 0,
        },
        "liabilities": {
            "home_loan": 0,
            "emi": 0,
            "credit_card_dues": 0,
        },
        "insurance": {
            "health_insurance": 0,
            "life_insurance": 0,
        },
        "goals": {
            "retirement_age": 60,
            "current_age": 30,
        },
        "goals_list": [],
        "risk_profile": "",
        "investments": {
            "current_corpus": 0,
            "monthly_investment": 0,
            "current_allocation": {
                "equity": 0.65,
                "debt": 0.30,
                "gold": 0.05,
            },
        },
        "partner": {
            "salary": 0,
            "deductions_80c": 0,
        },
    }


def _merge_defaults(defaults: Dict[str, Any], payload: Dict[str, Any]) -> Dict[str, Any]:
    merged = dict(defaults)
    for key, value in payload.items():
        if isinstance(value, dict) and isinstance(merged.get(key), dict):
            merged[key] = {**merged[key], **value}
        else:
            merged[key] = value
    return merged


def _fetch_rows(
    rest_config: Dict[str, str],
    table_name: str,
    user_id_value: str,
    *,
    select: str = "*",
    limit: int | None = 1,
    order: str | None = None,
) -> List[Dict[str, Any]]:
    params: Dict[str, str] = {
        "select": select,
        "user_id": f"eq.{user_id_value}",
    }
    if limit is not None:
        params["limit"] = str(limit)
    if order:
        params["order"] = order

    response = requests.get(
        f"{rest_config['base_url']}/{table_name}",
        params=params,
        headers={
            "apikey": rest_config["api_key"],
            "Authorization": f"Bearer {rest_config['api_key']}",
        },
        timeout=8,
    )
    response.raise_for_status()
    rows = response.json() or []
    return rows if isinstance(rows, list) else []


def _fetch_single(
    rest_config: Dict[str, str],
    table_name: str,
    user_id_value: str,
    *,
    select: str = "*",
    order: str | None = None,
) -> Dict[str, Any] | None:
    rows = _fetch_rows(
        rest_config,
        table_name,
        user_id_value,
        select=select,
        limit=1,
        order=order,
    )
    return rows[0] if rows else None


def get_user_data(user_id: str | int) -> Dict[str, Any]:
    defaults = _default_user_data(user_id)
    rest_config = get_supabase_rest_config()

    if rest_config is None:
        return defaults

    user_id_value = str(user_id).strip()
    if not user_id_value:
        return defaults

    try:
        onboarding_row = _fetch_single(rest_config, "onboarding_profiles", user_id_value)
        expense_row = _fetch_single(rest_config, "expense_profiles", user_id_value)
        income_row = _fetch_single(rest_config, "income_details", user_id_value)
        asset_row = _fetch_single(rest_config, "asset_snapshots", user_id_value, order="snapshot_date.desc")
        liability_row = _fetch_single(rest_config, "liability_snapshots", user_id_value, order="snapshot_date.desc")
        insurance_row = _fetch_single(rest_config, "insurance_snapshots", user_id_value, order="snapshot_date.desc")
        goals_rows = _fetch_rows(rest_config, "goals", user_id_value, limit=20, order="goal_type.asc")

        if not any([onboarding_row, expense_row, income_row, asset_row, liability_row, insurance_row, goals_rows]):
            return defaults

        retirement_goal = None
        if goals_rows:
            retirement_goal = next(
                (goal for goal in goals_rows if str(goal.get("goal_type", "")).lower() == "retirement"),
                goals_rows[0],
            )

        salary_value = (income_row or {}).get("base_salary")
        if salary_value is None:
            salary_value = (expense_row or {}).get("salary", defaults["income"]["salary"])

        monthly_expenses_value = (expense_row or {}).get("monthly_expenses")
        if monthly_expenses_value is None:
            monthly_expenses_value = defaults["expenses"]["total"]

        current_age_value = (expense_row or {}).get("current_age")
        if current_age_value is None:
            current_age_value = (onboarding_row or {}).get("age", defaults["goals"]["current_age"])

        retirement_age_value = (expense_row or {}).get("retirement_age")
        if retirement_age_value is None and retirement_goal is not None:
            target_years = retirement_goal.get("target_years")
            if target_years is not None:
                try:
                    retirement_age_value = float(current_age_value) + float(target_years)
                except (TypeError, ValueError):
                    retirement_age_value = None
        if retirement_age_value is None:
            retirement_age_value = defaults["goals"]["retirement_age"]

        computed_corpus = (
            (asset_row or {}).get("cash", 0)
            + (asset_row or {}).get("fd", 0)
            + (asset_row or {}).get("mutual_funds", 0)
            + (asset_row or {}).get("ppf", 0)
            + (asset_row or {}).get("stocks", 0)
        )

        mapped = {
            "user_id": user_id,
            "personal_info": {
                "age": (onboarding_row or {}).get("age", defaults["personal_info"]["age"]),
                "city": (onboarding_row or {}).get("city", defaults["personal_info"]["city"]),
                "marital_status": (onboarding_row or {}).get("marital_status", defaults["personal_info"]["marital_status"]),
                "dependents": (onboarding_row or {}).get("dependents", defaults["personal_info"]["dependents"]),
            },
            "income": {
                "salary": salary_value,
                "base_salary": (income_row or {}).get("base_salary", defaults["income"]["base_salary"]),
                "hra": (income_row or {}).get("hra", defaults["income"]["hra"]),
                "other_allowances": (income_row or {}).get("other_allowances", defaults["income"]["other_allowances"]),
                "other_income": (income_row or {}).get("other_income", defaults["income"]["other_income"]),
                "bonus": (income_row or {}).get("bonus", (expense_row or {}).get("bonus", defaults["income"]["bonus"])),
            },
            "expenses": {
                "total": monthly_expenses_value,
                "rent": (expense_row or {}).get("rent", defaults["expenses"]["rent"]),
                "food": (expense_row or {}).get("food", defaults["expenses"]["food"]),
                "travel": (expense_row or {}).get("travel", defaults["expenses"]["travel"]),
                "subscriptions": (expense_row or {}).get("subscriptions", defaults["expenses"]["subscriptions"]),
                "misc": (expense_row or {}).get("misc", defaults["expenses"]["misc"]),
            },
            "assets": {
                "cash": (asset_row or {}).get("cash", defaults["assets"]["cash"]),
                "fd": (asset_row or {}).get("fd", defaults["assets"]["fd"]),
                "mutual_funds": (asset_row or {}).get("mutual_funds", defaults["assets"]["mutual_funds"]),
                "ppf": (asset_row or {}).get("ppf", defaults["assets"]["ppf"]),
                "stocks": (asset_row or {}).get("stocks", defaults["assets"]["stocks"]),
            },
            "liabilities": {
                "home_loan": (liability_row or {}).get("home_loan", defaults["liabilities"]["home_loan"]),
                "emi": (liability_row or {}).get("emi", defaults["liabilities"]["emi"]),
                "credit_card_dues": (liability_row or {}).get("credit_card_dues", defaults["liabilities"]["credit_card_dues"]),
            },
            "insurance": {
                "health_insurance": (insurance_row or {}).get("health_insurance", defaults["insurance"]["health_insurance"]),
                "life_insurance": (insurance_row or {}).get("life_insurance", defaults["insurance"]["life_insurance"]),
            },
            "goals": {
                "retirement_age": retirement_age_value,
                "current_age": current_age_value,
            },
            "goals_list": [
                {
                    "goal_type": goal.get("goal_type"),
                    "target_amount": goal.get("target_amount"),
                    "target_years": goal.get("target_years"),
                }
                for goal in goals_rows
            ],
            "risk_profile": (onboarding_row or {}).get("risk_profile", defaults["risk_profile"]),
            "investments": {
                "current_corpus": (expense_row or {}).get("current_corpus", computed_corpus),
                "monthly_investment": (expense_row or {}).get("monthly_investment", defaults["investments"]["monthly_investment"]),
                "current_allocation": (expense_row or {}).get("current_allocation", defaults["investments"]["current_allocation"]),
            },
            "partner": {
                "salary": (expense_row or {}).get("partner_salary", defaults["partner"]["salary"]),
                "deductions_80c": (expense_row or {}).get("partner_deductions_80c", defaults["partner"]["deductions_80c"]),
            },
        }

        return _merge_defaults(defaults, mapped)
    except requests.HTTPError:
        logger.warning(
            "Supabase profile read failed (user_id=%s, status=%s, body=%s)",
            user_id_value,
            response.status_code if "response" in locals() and response is not None else "unknown",
            response.text[:250] if "response" in locals() and response is not None else "",
        )
        return defaults
    except requests.RequestException as exc:
        logger.warning(
            "Supabase profile request error (user_id=%s): %s",
            user_id_value,
            exc,
        )
        return defaults
    except Exception as exc:
        logger.warning(
            "Unexpected profile read error (user_id=%s): %s",
            user_id_value,
            exc,
        )
        return defaults


def find_user_profile_by_email(email: str) -> Dict[str, Any] | None:
    rest_config = get_supabase_rest_config()
    if rest_config is None:
        return None

    normalized_email = str(email or "").strip().lower()
    if not normalized_email:
        return None

    try:
        response = requests.get(
            f"{rest_config['base_url']}/profiles",
            params={
                "select": "id,full_name,email",
                "email": f"ilike.{normalized_email}",
                "limit": "1",
            },
            headers={
                "apikey": rest_config["api_key"],
                "Authorization": f"Bearer {rest_config['api_key']}",
            },
            timeout=8,
        )
        response.raise_for_status()
        rows = response.json() or []
        if not isinstance(rows, list) or not rows:
            return None
        first = rows[0]
        return {
            "id": first.get("id"),
            "full_name": first.get("full_name") or "",
            "email": first.get("email") or normalized_email,
        }
    except requests.RequestException:
        return None
