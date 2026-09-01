from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db import init_db
from app.routers import profile, screen, stocks, tfsa, watchlist

app = FastAPI(title="TFSA Investment Teacher API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    init_db()


app.include_router(stocks.router)
app.include_router(screen.router)
app.include_router(tfsa.router)
app.include_router(profile.router)
app.include_router(watchlist.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
