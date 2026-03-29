# main.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.routes.ask_routes import router as ask_router
from backend.routes.couple_routes import router as couple_router
from backend.routes.fire_routes import router as fire_router
from backend.routes.life_event_routes import router as life_event_router
from backend.routes.portfolio_routes import router as portfolio_router
from backend.routes.tax_routes import router as tax_router

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


app.include_router(ask_router)
app.include_router(fire_router)
app.include_router(tax_router)
app.include_router(life_event_router)
app.include_router(couple_router)
app.include_router(portfolio_router)