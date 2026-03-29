from fastapi import APIRouter
from pydantic import BaseModel

from backend.services.fire_service import generate_fire_plan

router = APIRouter()


class FireRequest(BaseModel):
    user_id: str
    retirement_age: int | None = None
    current_age: int | None = None
    monthly_income: float | None = None
    monthly_expenses: float | None = None
    current_investments: float | None = None
    risk_level: str | None = None


@router.post("/feature/fire")
def fire_planner(req: FireRequest):
    return generate_fire_plan(
        req.user_id,
        req.retirement_age,
        {
            "current_age": req.current_age,
            "monthly_income": req.monthly_income,
            "monthly_expenses": req.monthly_expenses,
            "current_investments": req.current_investments,
            "risk_level": req.risk_level,
        },
    )
