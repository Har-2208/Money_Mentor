from typing import Dict

from fastapi import APIRouter
from pydantic import BaseModel

from backend.services.tax_service import generate_tax_analysis

router = APIRouter()


class TaxRequest(BaseModel):
    user_id: str
    salary: float | None = None
    deductions: Dict[str, float] | None = None


@router.post("/feature/tax")
def tax_wizard(req: TaxRequest):
    return generate_tax_analysis(req.user_id, req.salary, req.deductions)