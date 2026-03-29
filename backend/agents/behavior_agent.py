from typing import Any, Dict


def _safe_float(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def get_behavior_profile(user_id: str | int, user_data: Dict[str, Any] | None = None) -> dict:
    payload = user_data or {}
    annual_income = _safe_float(payload.get("income", {}).get("salary"), 0.0)
    monthly_expenses = _safe_float(payload.get("expenses", {}).get("total"), 0.0)
    corpus = _safe_float(payload.get("investments", {}).get("current_corpus"), 0.0)

    annual_expenses = monthly_expenses * 12
    cushion_ratio = (corpus / annual_expenses) if annual_expenses > 0 else 0.0

    if cushion_ratio >= 2.0:
        risk_profile = "aggressive"
        adherence_score = 0.8
        preferred_holding_years = 12
    elif cushion_ratio >= 1.0:
        risk_profile = "moderate"
        adherence_score = 0.65
        preferred_holding_years = 8
    else:
        risk_profile = "conservative"
        adherence_score = 0.5
        preferred_holding_years = 5

    if annual_income <= 0:
        adherence_score = min(adherence_score, 0.55)

    return {
        "user_id": user_id,
        "risk_profile": risk_profile,
        "adherence_score": round(adherence_score, 2),
        "preferred_holding_years": preferred_holding_years,
    }