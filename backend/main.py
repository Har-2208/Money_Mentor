# main.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.routes.ask_routes import router as ask_router
from backend.routes.couple_routes import router as couple_router
from backend.routes.fire_routes import router as fire_router

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
            "/feature/fire/latest",
            "/feature/couple",
            "/feature/couple/import-profile",
        ],
    }


app.include_router(ask_router)
app.include_router(fire_router)
app.include_router(couple_router)
