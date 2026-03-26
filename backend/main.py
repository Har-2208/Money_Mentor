# main.py

from typing import Dict

from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from backend.agents.orshestrator import (
    orchestrator,
    run_couple_feature,
    run_fire_feature,
    run_life_event_feature,
    run_portfolio_feature,
    run_tax_feature,
)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class QueryRequest(BaseModel):
    user_id: int
    query: str


class FireRequest(BaseModel):
    user_id: int
    retirement_age: int | None = None


class TaxRequest(BaseModel):
    user_id: int
    salary: float | None = None
    deductions: Dict[str, float] | None = None


class LifeEventRequest(BaseModel):
    user_id: int
    event: str


class CoupleRequest(BaseModel):
    user_id: int


@app.get("/")
def root():
    return {
        "status": "ok",
        "message": "MoneyMentor API is running.",
        "docs": "/docs",
        "endpoints": [
            "/ask",
            "/feature/fire",
            "/feature/tax",
            "/feature/portfolio-xray",
            "/feature/life-event",
            "/feature/couple",
        ],
    }


@app.post("/ask")
def ask_ai(req: QueryRequest):
    result = orchestrator(req.query, req.user_id)
    return result


@app.post("/feature/fire")
def fire_planner(req: FireRequest):
    return run_fire_feature(req.user_id, req.retirement_age)


@app.post("/feature/tax")
def tax_wizard(req: TaxRequest):
    return run_tax_feature(req.user_id, req.salary, req.deductions)


@app.post("/feature/life-event")
def life_event(req: LifeEventRequest):
    return run_life_event_feature(req.user_id, req.event)


@app.post("/feature/couple")
def couple_planner(req: CoupleRequest):
    return run_couple_feature(req.user_id)


@app.post("/feature/portfolio-xray")
async def portfolio_xray(file: UploadFile = File(...)):
    payload = await file.read()
    return run_portfolio_feature(payload)