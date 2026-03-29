from typing import Any, Dict

from backend.agents.orshestrator import run_couple_feature


def generate_couple_plan(
    user_id: str,
    profile_overrides: Dict[str, Any] | None = None,
    use_ai: bool = False,
) -> Dict[str, Any]:
    return run_couple_feature(user_id, profile_overrides, use_ai=use_ai)