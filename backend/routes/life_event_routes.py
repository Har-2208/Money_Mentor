from fastapi import APIRouter
from pydantic import BaseModel

from backend.services.life_event_service import generate_life_event_plan

router = APIRouter()


class LifeEventRequest(BaseModel):
    user_id: str
    event: str
    annual_income: float | None = None
    monthly_expenses: float | None = None
    bonus: float | None = None
    use_ai: bool = False


@router.post("/feature/life-event")
def life_event(req: LifeEventRequest):
    return generate_life_event_plan(
        req.user_id,
        req.event,
        {
            "annual_income": req.annual_income,
            "monthly_expenses": req.monthly_expenses,
            "bonus": req.bonus,
        },
        use_ai=req.use_ai,
    )