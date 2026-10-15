import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException

from app import paper
from app.analysis import data
from app.analysis.data import FxUnavailableError, TickerNotFoundError
from app.schemas import (
    PaperHistoryPoint,
    PaperLedgerIn,
    PaperOrderIn,
    PaperPortfolioOut,
    PaperQuoteIn,
    PaperQuoteOut,
    PaperTransaction,
)

# Every endpoint receives the client's practice ledger and is otherwise
# stateless - see the note on PaperTransaction in app/schemas.py.
router = APIRouter(prefix="/api/paper", tags=["paper"])
logger = logging.getLogger(__name__)


def _quote_or_http_error(ticker: str) -> paper.Quote:
    try:
        return paper.fetch_quote(ticker)
    except paper.TradeError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except TickerNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except FxUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        logger.warning("Live quote failed for %s", ticker, exc_info=True)
        raise HTTPException(
            status_code=502, detail=f"Couldn't load a live price for {ticker.upper()} right now — try again shortly."
        ) from exc


def _checked(transactions: list[PaperTransaction]) -> list[PaperTransaction]:
    try:
        paper.check_ticker_count(transactions)
    except paper.TradeError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return transactions


def _usdcad_series(transactions: list[PaperTransaction]):
    if not any(t.currency == "USD" for t in transactions):
        return None
    try:
        return data.fetch_usdcad_history()
    except Exception:
        logger.warning("USD/CAD unavailable; using each trade's recorded rate", exc_info=True)
        return None


def _portfolio(transactions, market, usdcad_series) -> PaperPortfolioOut:
    splits = paper.splits_of(market)
    usdcad = float(usdcad_series.iloc[-1]) if usdcad_series is not None else None
    ledger = paper.replay(transactions, splits)
    quotes = paper.holding_quotes(ledger.open_positions(), market, usdcad)
    return paper.summarize(transactions, quotes, usdcad, splits)


def _ledger_for(transactions: list[PaperTransaction], ticker: str) -> paper.Ledger:
    """Replays the ledger with the splits that matter for trading `ticker`."""
    traded = {t.ticker for t in transactions if t.ticker == ticker}
    return paper.replay(transactions, paper.splits_of(paper.load_ticker_data(traded)))


@router.post("/portfolio", response_model=PaperPortfolioOut | None)
def portfolio(payload: PaperLedgerIn):
    transactions = _checked(payload.transactions)
    if not transactions:
        return None
    market = paper.load_ticker_data(t.ticker for t in transactions if t.ticker)
    return _portfolio(transactions, market, _usdcad_series(transactions))


@router.post("/history", response_model=list[PaperHistoryPoint])
def history(payload: PaperLedgerIn):
    transactions = _checked(payload.transactions)
    if not transactions:
        return []
    # Every ticker ever held matters here, not just today's positions.
    market = paper.load_ticker_data(t.ticker for t in transactions if t.ticker)
    usdcad = _usdcad_series(transactions)
    now_value = _portfolio(transactions, market, usdcad).total_value_cad
    return paper.value_history(transactions, market, usdcad, now_value, datetime.now(timezone.utc))


@router.post("/quote", response_model=PaperQuoteOut)
def quote(payload: PaperQuoteIn):
    transactions = _checked(payload.transactions)
    q = _quote_or_http_error(payload.ticker)
    ledger = _ledger_for(transactions, q.ticker)
    return PaperQuoteOut(
        ticker=q.ticker,
        name=q.name,
        exchange=q.exchange,
        currency=q.currency,
        price=round(q.price, 4),
        price_change_pct=round(q.change_pct, 2) if q.change_pct is not None else None,
        fx_rate=round(q.fx_rate, 6),
        price_cad=round(q.price_cad, 4),
        cash_cad=round(ledger.cash_cad, 2),
        shares_held=ledger.shares_of(q.ticker),
    )


@router.post("/orders", response_model=PaperTransaction, status_code=201)
def place_order(payload: PaperOrderIn):
    """Fills an order at the latest price and returns the new ledger entry for
    the client to append. Nothing is stored server-side."""
    transactions = _checked(payload.transactions)
    if not any(t.kind == "deposit" for t in transactions):
        raise HTTPException(status_code=409, detail="Open a practice account before placing orders.")
    order = payload.order
    q = _quote_or_http_error(order.ticker)
    try:
        shares, amount = paper.plan_order(
            _ledger_for(transactions, q.ticker), q, order.side, amount_cad=order.amount_cad, shares=order.shares
        )
    except paper.TradeError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return PaperTransaction(
        id=uuid.uuid4().hex,
        kind=order.side,
        ticker=q.ticker,
        name=q.name,
        exchange=q.exchange,
        currency=q.currency,
        shares=shares,
        price=q.price,
        fx_rate=q.fx_rate,
        amount_cad=amount,
        executed_at=datetime.now(timezone.utc),
    )
