from __future__ import annotations

from typing import Any, Dict

import requests

from backend.config import get_env_str
from backend.db.supabase_client import get_supabase_rest_config


def _default_user_data(user_id: int) -> Dict[str, Any]:
    return {
        "user_id": user_id,
        "income": {
            "salary": 0,
            "bonus": 0,
        },
        "expenses": {
            "total": 0,
        },
        "goals": {
            "retirement_age": 60,
            "current_age": 30,
        },
        "investments": {
            "current_corpus": 0,
            "monthly_investment": 0,
            "current_allocation": {
                "equity": 0.65,
                "debt": 0.30,
                "gold": 0.05,
            },
        },
        "tax": {
            "deductions": {
                "80C": 0,
                "80D": 0,
            }
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


def get_user_data(user_id: int) -> Dict[str, Any]:
    defaults = _default_user_data(user_id)
    rest_config = get_supabase_rest_config()

    if rest_config is None:
        return defaults

    table_name = get_env_str("SUPABASE_PROFILE_TABLE", "user_financial_profile")

    try:
        response = requests.get(
            f"{rest_config['base_url']}/{table_name}",
            params={
                "select": "*",
                "user_id": f"eq.{user_id}",
                "limit": 1,
            },
            headers={
                "apikey": rest_config["api_key"],
                "Authorization": f"Bearer {rest_config['api_key']}",
            },
            timeout=8,
        )
        response.raise_for_status()
        rows = response.json() or []

        if not rows:
            return defaults

        row = rows[0]
        mapped = {
            "user_id": user_id,
            "income": {
                "salary": row.get("salary", defaults["income"]["salary"]),
                "bonus": row.get("bonus", defaults["income"]["bonus"]),
            },
            "expenses": {
                "total": row.get("monthly_expenses", defaults["expenses"]["total"]),
            },
            "goals": {
                "retirement_age": row.get("retirement_age", defaults["goals"]["retirement_age"]),
                "current_age": row.get("current_age", defaults["goals"]["current_age"]),
            },
            "investments": {
                "current_corpus": row.get("current_corpus", defaults["investments"]["current_corpus"]),
                "monthly_investment": row.get("monthly_investment", defaults["investments"]["monthly_investment"]),
                "current_allocation": row.get("current_allocation", defaults["investments"]["current_allocation"]),
            },
            "tax": {
                "deductions": row.get("deductions", defaults["tax"]["deductions"]),
            },
            "partner": {
                "salary": row.get("partner_salary", defaults["partner"]["salary"]),
                "deductions_80c": row.get("partner_deductions_80c", defaults["partner"]["deductions_80c"]),
            },
        }

        return _merge_defaults(defaults, mapped)
    except Exception:
        return defaults
