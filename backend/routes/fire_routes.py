from fastapi import APIRouter, Query
from pydantic import BaseModel, Field, model_validator

from backend.services.fire_service import generate_and_save_fire_plan, get_latest_saved_fire_plan

router = APIRouter()


class FireRequest(BaseModel):
    user_id: str
    retirement_age: int | None = Field(default=None, ge=30, le=120)
    current_age: int | None = Field(default=None, ge=18, le=120)
    monthly_income: float | None = Field(default=None, ge=0)
    monthly_expenses: float | None = Field(default=None, ge=0)
    current_investments: float | None = Field(default=None, ge=0)
    monthly_investment: float | None = Field(default=None, ge=0)
    risk_level: str | None = None
    inflation_rate: float | None = Field(default=None, ge=0, le=0.2)
    annual_return: float | None = Field(default=None, gt=0, le=0.3)
    safe_withdrawal_rate: float | None = Field(default=None, gt=0, le=0.08)

    @model_validator(mode="after")
    def validate_age_and_cashflow(self):
        if (
            self.current_age is not None
            and self.retirement_age is not None
            and self.retirement_age <= self.current_age
        ):
            raise ValueError("retirement_age must be greater than current_age")
        return self


@router.post("/feature/fire")
def fire_planner(req: FireRequest):
    return generate_and_save_fire_plan(
        req.user_id,
        req.retirement_age,
        {
            "current_age": req.current_age,
            "monthly_income": req.monthly_income,
            "monthly_expenses": req.monthly_expenses,
            "current_investments": req.current_investments,
            "monthly_investment": req.monthly_investment,
            "risk_level": req.risk_level,
            "inflation_rate": req.inflation_rate,
            "annual_return": req.annual_return,
            "safe_withdrawal_rate": req.safe_withdrawal_rate,
        },
    )


@router.get("/feature/fire/latest")
def get_latest_fire(user_id: str = Query(..., min_length=1)):
    return get_latest_saved_fire_plan(user_id)
