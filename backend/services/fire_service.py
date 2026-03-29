from typing import Any, Dict

from backend.agents.orshestrator import run_fire_feature


def generate_fire_plan(
    user_id: str,
    retirement_age: int | None = None,
    profile_overrides: Dict[str, Any] | None = None,
) -> Dict[str, Any]:
    return run_fire_feature(user_id, retirement_age, profile_overrides)