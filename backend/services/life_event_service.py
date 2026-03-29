from typing import Any, Dict

from backend.agents.orshestrator import run_life_event_feature


def generate_life_event_plan(
    user_id: str,
    event: str,
    profile_overrides: Dict[str, Any] | None = None,
    use_ai: bool = False,
) -> Dict[str, Any]:
    return run_life_event_feature(user_id, event, profile_overrides, use_ai=use_ai)