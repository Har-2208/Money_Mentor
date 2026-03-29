from typing import Any, Dict

from fastapi import APIRouter
from pydantic import BaseModel

from backend.services.ask_service import handle_ask

router = APIRouter()


class QueryRequest(BaseModel):
    user_id: str
    query: str
    user_context: Dict[str, Any] | None = None


@router.post("/ask")
def ask_ai(req: QueryRequest):
    return handle_ask(req.query, req.user_id, user_context=req.user_context)