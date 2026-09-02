from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.analysis.analyze import analyze_ticker
from app.analysis.data import TickerNotFoundError
from app.db import get_db
from app.models import RiskProfile
from app.schemas import StockAnalysis

router = APIRouter(prefix="/api/stocks", tags=["stocks"])


def _current_risk_bucket(db: Session) -> str:
    profile = db.get(RiskProfile, 1)
    return profile.risk_bucket if profile else "balanced"


@router.get("/{ticker}", response_model=StockAnalysis)
def get_stock(ticker: str, refresh: bool = Query(False), db: Session = Depends(get_db)):
    try:
        return analyze_ticker(ticker, _current_risk_bucket(db), force_refresh=refresh)
    except TickerNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
