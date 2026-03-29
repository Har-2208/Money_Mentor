from __future__ import annotations

import logging
from typing import Any, Dict, Optional

import requests  # pyright: ignore[reportMissingModuleSource]

from backend.db.supabase_client import get_supabase_rest_config


logger = logging.getLogger(__name__)

TABLE_NAME = "fire_plan_runs"


class FirePlanPersistenceError(Exception):
    pass


def _headers(api_key: str) -> Dict[str, str]:
    return {
        "apikey": api_key,
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }


def _post_row(base_url: str, api_key: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    response = requests.post(
        f"{base_url}/{TABLE_NAME}",
        headers=_headers(api_key),
        json=payload,
        timeout=8,
    )
    response.raise_for_status()

    rows = response.json() or []
    if isinstance(rows, list) and rows:
        return rows[0]
    return {}


def save_fire_plan_run(
    user_id: str,
    input_data: Dict[str, Any],
    plan_output: Dict[str, Any],
) -> Optional[Dict[str, Any]]:
    rest_config = get_supabase_rest_config()
    if rest_config is None:
        return None

    base_url = rest_config["base_url"]
    api_key = rest_config["api_key"]

    rich_payload = {
        "user_id": user_id,
        "input_data": input_data,
        "plan_output": plan_output,
        "retirement_age": input_data.get("retirement_age"),
        "current_age": input_data.get("current_age"),
        "monthly_income": input_data.get("monthly_income"),
        "monthly_expenses": input_data.get("monthly_expenses"),
        "current_investments": input_data.get("current_investments"),
        "monthly_investment": input_data.get("monthly_investment"),
        "risk_level": input_data.get("risk_level"),
        "inflation_rate": input_data.get("inflation_rate"),
        "annual_return": input_data.get("annual_return"),
        "safe_withdrawal_rate": input_data.get("safe_withdrawal_rate"),
        "target_corpus": plan_output.get("fire_plan", {}).get("target_corpus"),
        "monthly_sip": plan_output.get("fire_plan", {}).get("monthly_sip"),
    }

    fallback_payloads = [
        rich_payload,
        {
            "user_id": user_id,
            "input_data": input_data,
            "plan_output": plan_output,
        },
        {
            "user_id": user_id,
            "fire_input": input_data,
            "fire_plan": plan_output,
        },
    ]

    last_error: Exception | None = None
    for payload in fallback_payloads:
        try:
            return _post_row(base_url, api_key, payload)
        except requests.RequestException as exc:
            last_error = exc
            continue

    logger.warning("Failed to persist fire plan run for user_id=%s: %s", user_id, last_error)
    raise FirePlanPersistenceError("Unable to persist fire plan run")


def get_latest_fire_plan_run(user_id: str) -> Optional[Dict[str, Any]]:
    rest_config = get_supabase_rest_config()
    if rest_config is None:
        return None

    base_url = rest_config["base_url"]
    api_key = rest_config["api_key"]

    query_variants = [
        {
            "select": "*",
            "user_id": f"eq.{user_id}",
            "order": "created_at.desc",
            "limit": 1,
        },
        {
            "select": "*",
            "user_id": f"eq.{user_id}",
            "order": "id.desc",
            "limit": 1,
        },
    ]

    for params in query_variants:
        try:
            response = requests.get(
                f"{base_url}/{TABLE_NAME}",
                params=params,
                headers={
                    "apikey": api_key,
                    "Authorization": f"Bearer {api_key}",
                },
                timeout=8,
            )
            response.raise_for_status()
            rows = response.json() or []
            if rows:
                return rows[0]
        except requests.RequestException:
            continue

    return None


def extract_fire_run_payload(row: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    if not row:
        return None

    input_data = row.get("input_data") or row.get("fire_input") or {}
    plan_output = row.get("plan_output") or row.get("fire_plan") or {}

    if "fire_plan" not in plan_output and any(
        key in plan_output for key in ("monthly_sip", "target_corpus", "asset_allocation")
    ):
        plan_output = {"fire_plan": plan_output}

    if not input_data:
        input_data = {
            "retirement_age": row.get("retirement_age"),
            "current_age": row.get("current_age"),
            "monthly_income": row.get("monthly_income"),
            "monthly_expenses": row.get("monthly_expenses"),
            "current_investments": row.get("current_investments"),
            "monthly_investment": row.get("monthly_investment"),
            "risk_level": row.get("risk_level"),
            "inflation_rate": row.get("inflation_rate"),
            "annual_return": row.get("annual_return"),
            "safe_withdrawal_rate": row.get("safe_withdrawal_rate"),
        }

    return {
        "id": row.get("id"),
        "created_at": row.get("created_at"),
        "input_data": input_data,
        "plan_output": plan_output,
    }
