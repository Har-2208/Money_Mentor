from fastapi import APIRouter, File, UploadFile

from backend.services.portfolio_service import generate_portfolio_xray

router = APIRouter()


@router.post("/feature/portfolio-xray")
async def portfolio_xray(file: UploadFile = File(...)):
    payload = await file.read()
    return generate_portfolio_xray(payload)