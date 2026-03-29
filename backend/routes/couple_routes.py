from fastapi import APIRouter
from pydantic import BaseModel

from backend.services.couple_service import generate_couple_plan

router = APIRouter()


class CoupleRequest(BaseModel):
    user_id: str
    partner1_income: float | None = None
    partner1_expenses: float | None = None
    partner1_investments: float | None = None
    partner2_income: float | None = None
    partner2_expenses: float | None = None
    partner2_investments: float | None = None
    shared_goals: str | None = None
    risk_preference: str | None = None
    use_ai: bool = False


@router.post("/feature/couple")
def couple_planner(req: CoupleRequest):
    return generate_couple_plan(
        req.user_id,
        {
            "partner1_income": req.partner1_income,
            "partner1_expenses": req.partner1_expenses,
            "partner1_investments": req.partner1_investments,
            "partner2_income": req.partner2_income,
            "partner2_expenses": req.partner2_expenses,
            "partner2_investments": req.partner2_investments,
            "shared_goals": req.shared_goals,
            "risk_preference": req.risk_preference,
        },
        use_ai=req.use_ai,
    )