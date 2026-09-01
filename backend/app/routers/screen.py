import logging
from concurrent.futures import ThreadPoolExecutor, as_completed

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.analysis.analyze import analyze_ticker
from app.analysis.universe import tickers_for
from app.db import get_db
from app.models import RiskProfile
from app.schemas import ScreenResultItem

router = APIRouter(prefix="/api/screen", tags=["screen"])
logger = logging.getLogger(__name__)


@router.get("", response_model=list[ScreenResultItem])
def screen(
    exchange: str | None = Query(default=None, description="'TSX' or 'US'"),
    db: Session = Depends(get_db),
):
    profile = db.get(RiskProfile, 1)
    risk_bucket = profile.risk_bucket if profile else "balanced"

    tickers = tickers_for(exchange)
    results: list[ScreenResultItem] = []

    def _safe_analyze(ticker: str):
        try:
            return analyze_ticker(ticker, risk_bucket)
        except Exception:
            logger.warning("Skipping %s in screen: fetch/analysis failed", ticker, exc_info=True)
            return None

    with ThreadPoolExecutor(max_workers=10) as pool:
        futures = {pool.submit(_safe_analyze, t): t for t in tickers}
        for future in as_completed(futures):
            analysis = future.result()
            if analysis is None:
                continue
            results.append(ScreenResultItem(
                ticker=analysis.metrics.ticker,
                name=analysis.metrics.name,
                exchange=analysis.metrics.exchange,
                sector=analysis.metrics.sector,
                score=analysis.score,
                sub_scores=analysis.sub_scores,
            ))

    results.sort(key=lambda r: r.score, reverse=True)
    return results
