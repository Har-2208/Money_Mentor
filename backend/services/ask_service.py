from typing import Any, Dict

from backend.agents.orshestrator import orchestrator


def handle_ask(query: str, user_id: str, user_context: Dict[str, Any] | None = None) -> Dict[str, Any]:
    return orchestrator(query, user_id, user_context=user_context)