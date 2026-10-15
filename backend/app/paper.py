"""Practice ("paper") trading: a pretend TFSA funded with fake money, so you
can buy stocks at live prices and watch how they perform without risking
anything real.

Everything is derived by replaying an append-only ledger of transactions
(deposits, buys, sells), so the cash balance, positions, cost basis and the
performance history always agree with each other. Cost basis uses the
average-cost method and is tracked in CAD at the exchange rate on the day of
each trade, so currency moves show up in the returns on US stocks the same
way they would in a real account. Stock splits after a trade are applied
when replaying, so a 10-for-1 split doesn't read as a 90% loss.

The ledger itself is stored by the client and sent with each request; this
module only prices, validates and values it.
"""

import logging
from bisect import bisect_right
from collections.abc import Iterable, Sequence
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, field
from datetime import date, datetime, time, timezone
from zoneinfo import ZoneInfo

import pandas as pd

from app.analysis import data
from app.schemas import PaperHistoryPoint, PaperHolding, PaperPortfolioOut, PaperTransaction

logger = logging.getLogger(__name__)

MARKET_TZ = ZoneInfo("America/Toronto")  # the TSX and NYSE/Nasdaq both run on Eastern time
MARKET_CLOSE = time(16, 0)
SUPPORTED_CURRENCIES = ("CAD", "USD")
MIN_ORDER_CAD = 1.0
MAX_LEDGER_TICKERS = 60
SHARE_EPSILON = 1e-9
# Selling all but a sliver of a position closes it, so dollar-sized sell
# orders that land a hair under the full value don't leave unsellable dust.
DUST_SHARES = 1e-4

# ticker -> [(date the split took effect, ratio)], e.g. 10.0 for a 10-for-1 split
Splits = dict[str, list[tuple[date, float]]]


class TradeError(Exception):
    """An order the practice account can't fill (not enough cash/shares, unsupported listing)."""


def as_utc(ts: datetime) -> datetime:
    return ts.replace(tzinfo=timezone.utc) if ts.tzinfo is None else ts.astimezone(timezone.utc)


def market_date(ts: datetime) -> date:
    """The exchange-local calendar date a timestamp falls on."""
    return as_utc(ts).astimezone(MARKET_TZ).date()


def market_close_at(day: date) -> datetime:
    return datetime.combine(day, MARKET_CLOSE, tzinfo=MARKET_TZ).astimezone(timezone.utc)


def ordered(transactions: Iterable[PaperTransaction]) -> list[PaperTransaction]:
    return sorted(transactions, key=lambda t: as_utc(t.executed_at))


def split_factor(splits: Splits | None, ticker: str | None, when: datetime) -> float:
    """How many of today's shares one share traded at `when` has become."""
    if not splits or not ticker:
        return 1.0
    traded_on = market_date(when)
    factor = 1.0
    for day, ratio in splits.get(ticker, ()):
        if day > traded_on:
            factor *= ratio
    return factor


# --- Replaying the ledger ---

@dataclass
class Position:
    ticker: str
    name: str | None
    exchange: str
    currency: str
    shares: float = 0.0
    cost_cad: float = 0.0  # CAD cost basis of the shares still held
    cost_native: float = 0.0  # the same, in the listing currency (for average price per share)
    realized_pnl_cad: float = 0.0
    last_price: float = 0.0  # most recent fill: the fallback when live prices are unavailable
    last_fx_rate: float = 1.0

    @property
    def is_open(self) -> bool:
        return self.shares > SHARE_EPSILON


@dataclass
class Ledger:
    cash_cad: float = 0.0
    deposited_cad: float = 0.0
    positions: dict[str, Position] = field(default_factory=dict)

    @property
    def realized_pnl_cad(self) -> float:
        return sum(p.realized_pnl_cad for p in self.positions.values())

    def open_positions(self) -> list[Position]:
        return [p for p in self.positions.values() if p.is_open]

    def shares_of(self, ticker: str) -> float:
        pos = self.positions.get(ticker)
        return pos.shares if pos and pos.is_open else 0.0

    def apply(self, txn: PaperTransaction, split: float = 1.0) -> None:
        if txn.kind == "deposit":
            self.cash_cad += txn.amount_cad
            self.deposited_cad += txn.amount_cad
            return

        shares, price = txn.shares * split, txn.price / split
        pos = self.positions.get(txn.ticker)
        if pos is None:
            pos = Position(txn.ticker, txn.name, txn.exchange or data.exchange_for_ticker(txn.ticker), txn.currency)
            self.positions[txn.ticker] = pos
        pos.last_price, pos.last_fx_rate = price, txn.fx_rate

        if txn.kind == "buy":
            self.cash_cad -= txn.amount_cad
            pos.shares += shares
            pos.cost_cad += txn.amount_cad
            pos.cost_native += shares * price
        else:  # sell: average-cost basis, so each share sold carries the average cost
            fraction = min(shares / pos.shares, 1.0) if pos.shares > 0 else 1.0
            sold_cost_cad = pos.cost_cad * fraction
            self.cash_cad += txn.amount_cad
            pos.realized_pnl_cad += txn.amount_cad - sold_cost_cad
            pos.cost_cad -= sold_cost_cad
            pos.cost_native -= pos.cost_native * fraction
            pos.shares -= shares
            if pos.shares <= SHARE_EPSILON:
                pos.shares = pos.cost_cad = pos.cost_native = 0.0


def replay(transactions: Iterable[PaperTransaction], splits: Splits | None = None) -> Ledger:
    ledger = Ledger()
    for txn in ordered(transactions):
        ledger.apply(txn, split_factor(splits, txn.ticker, txn.executed_at))
    return ledger


# --- Market data ---

@dataclass
class Quote:
    ticker: str
    price: float
    prev_close: float | None
    prev_close_date: date | None
    fx_rate: float  # CAD per 1 unit of `currency`
    name: str | None = None
    exchange: str = "US"
    currency: str = "USD"

    @property
    def price_cad(self) -> float:
        return self.price * self.fx_rate

    @property
    def change_pct(self) -> float | None:
        if not self.prev_close:
            return None
        return (self.price - self.prev_close) / self.prev_close * 100


@dataclass
class TickerData:
    closes: pd.Series  # split-adjusted daily closes
    splits: list[tuple[date, float]]


def _ticker_data(ticker: str) -> TickerData:
    # Same 2y window analyze_ticker uses, so this usually hits the shared cache.
    hist = data.fetch_history(ticker, period="2y")
    splits: list[tuple[date, float]] = []
    if "Stock Splits" in hist:
        ratios = hist["Stock Splits"]
        splits = [(idx.date(), float(r)) for idx, r in ratios[ratios > 0].items()]
    return TickerData(closes=hist["Close"].dropna(), splits=splits)


def load_ticker_data(tickers: Iterable[str]) -> dict[str, TickerData]:
    """Price history and splits per ticker, fetched in parallel. Tickers that
    fail to load are left out, and callers value them at their fill price."""

    def _one(ticker: str) -> tuple[str, TickerData | None]:
        try:
            return ticker, _ticker_data(ticker)
        except Exception:
            logger.warning("No market data for %s in the practice portfolio", ticker, exc_info=True)
            return ticker, None

    unique = sorted(set(tickers))
    if not unique:
        return {}
    with ThreadPoolExecutor(max_workers=8) as pool:
        return {t: d for t, d in pool.map(_one, unique) if d is not None}


def splits_of(market: dict[str, TickerData]) -> Splits:
    return {ticker: d.splits for ticker, d in market.items() if d.splits}


def _quote_from(ticker: str, closes: pd.Series, fx_rate: float, **listing) -> Quote:
    has_prev = len(closes) >= 2
    return Quote(
        ticker=ticker,
        price=float(closes.iloc[-1]),
        prev_close=float(closes.iloc[-2]) if has_prev else None,
        prev_close_date=closes.index[-2].date() if has_prev else None,
        fx_rate=fx_rate,
        **listing,
    )


def fetch_quote(ticker: str) -> Quote:
    """A live price plus listing details, for placing an order."""
    ticker = data.normalize_ticker(ticker)
    closes = _ticker_data(ticker).closes
    info = data.fetch_info(ticker)
    exchange = data.exchange_for_ticker(ticker)
    currency = info.get("currency") or ("CAD" if exchange == "TSX" else "USD")
    if currency not in SUPPORTED_CURRENCIES:
        raise TradeError(
            f"Practice trading covers TSX and US listings priced in CAD or USD — {ticker} trades in {currency}."
        )
    fx_rate = 1.0 if currency == "CAD" else float(data.fetch_usdcad_history().iloc[-1])
    return _quote_from(
        ticker, closes, fx_rate,
        name=info.get("shortName") or info.get("longName"), exchange=exchange, currency=currency,
    )


def holding_quotes(
    positions: Sequence[Position], market: dict[str, TickerData], usdcad: float | None
) -> dict[str, Quote]:
    """Latest prices for open positions. Positions without market data are
    left out (and get valued at their last fill price)."""
    quotes = {}
    for pos in positions:
        d = market.get(pos.ticker)
        if d is None or d.closes.empty:
            continue
        fx = 1.0 if pos.currency == "CAD" else (usdcad or pos.last_fx_rate)
        quotes[pos.ticker] = _quote_from(
            pos.ticker, d.closes, fx, name=pos.name, exchange=pos.exchange, currency=pos.currency
        )
    return quotes


def check_ticker_count(transactions: Sequence[PaperTransaction]) -> None:
    tickers = {t.ticker for t in transactions if t.ticker}
    if len(tickers) > MAX_LEDGER_TICKERS:
        raise TradeError(f"The practice account supports up to {MAX_LEDGER_TICKERS} different stocks.")


# --- Orders ---

def plan_order(
    ledger: Ledger,
    quote: Quote,
    side: str,
    amount_cad: float | None = None,
    shares: float | None = None,
) -> tuple[float, float]:
    """Returns (shares, amount_cad) for an order sized in dollars or shares,
    or raises TradeError if the account can't cover it."""
    price_cad = quote.price_cad
    if price_cad <= 0:
        raise TradeError(f"There's no valid price for {quote.ticker} right now.")
    if shares is None:
        shares = amount_cad / price_cad

    closes_position = False
    if side == "sell":
        held = ledger.shares_of(quote.ticker)
        if held <= 0:
            raise TradeError(f"You don't own any {quote.ticker} in your practice portfolio.")
        if shares > held + DUST_SHARES:
            raise TradeError(
                f"You only hold {held:,.4f} shares of {quote.ticker} (about ${held * price_cad:,.2f})."
            )
        if held - shares < DUST_SHARES:
            shares, closes_position = held, True

    amount = round(shares * price_cad, 2)
    if amount < MIN_ORDER_CAD and not closes_position:
        raise TradeError(f"The minimum practice order is ${MIN_ORDER_CAD:.2f}.")
    if side == "buy" and amount > round(ledger.cash_cad, 2):
        raise TradeError(
            f"Not enough practice cash: this order costs ${amount:,.2f} and you have "
            f"${max(ledger.cash_cad, 0):,.2f} available."
        )
    return shares, amount


# --- Valuation ---

def _day_change_cad(
    ticker: str, txns: Sequence[PaperTransaction], quote: Quote, value_cad: float, splits: Splits | None
) -> float:
    """Today's gain on one holding: what it's worth now, minus what the shares
    held at the previous close were worth then, minus cash put in since."""
    if quote.prev_close is None or quote.prev_close_date is None:
        return 0.0
    start_shares = 0.0
    net_flows_cad = 0.0
    for t in txns:
        if t.ticker != ticker or t.kind == "deposit":
            continue
        sign = 1 if t.kind == "buy" else -1
        if market_date(t.executed_at) <= quote.prev_close_date:
            start_shares += sign * t.shares * split_factor(splits, ticker, t.executed_at)
        else:
            net_flows_cad += sign * t.amount_cad
    start_value = max(start_shares, 0.0) * quote.prev_close * quote.fx_rate
    return value_cad - start_value - net_flows_cad


def summarize(
    transactions: Sequence[PaperTransaction],
    quotes: dict[str, Quote],
    usdcad: float | None,
    splits: Splits | None = None,
) -> PaperPortfolioOut:
    txns = ordered(transactions)
    ledger = replay(txns, splits)

    rows = []
    for pos in ledger.open_positions():
        quote = quotes.get(pos.ticker)
        price = quote.price if quote else pos.last_price
        fx = quote.fx_rate if quote else pos.last_fx_rate
        value = pos.shares * price * fx
        day = _day_change_cad(pos.ticker, txns, quote, value, splits) if quote else 0.0
        rows.append((pos, quote, price, fx, value, day))

    holdings_value = sum(r[4] for r in rows)
    total_value = ledger.cash_cad + holdings_value
    day_change = sum(r[5] for r in rows)
    total_return = total_value - ledger.deposited_cad
    start_of_day_value = total_value - day_change

    holdings = [
        PaperHolding(
            ticker=pos.ticker,
            name=pos.name,
            exchange=pos.exchange,
            currency=pos.currency,
            shares=pos.shares,
            avg_cost=round(pos.cost_native / pos.shares, 4),
            price=round(price, 4),
            price_stale=quote is None,
            fx_rate=round(fx, 6),
            market_value_cad=round(value, 2),
            cost_basis_cad=round(pos.cost_cad, 2),
            unrealized_pnl_cad=round(value - pos.cost_cad, 2),
            unrealized_pnl_pct=round((value - pos.cost_cad) / pos.cost_cad * 100, 2) if pos.cost_cad else 0.0,
            day_change_cad=round(day, 2),
            day_change_pct=round(quote.change_pct, 2) if quote and quote.change_pct is not None else None,
            weight_pct=round(value / total_value * 100, 2) if total_value > 0 else 0.0,
        )
        for pos, quote, price, fx, value, day in sorted(rows, key=lambda r: r[4], reverse=True)
    ]

    return PaperPortfolioOut(
        started_at=as_utc(txns[0].executed_at),
        cash_cad=round(ledger.cash_cad, 2),
        holdings_value_cad=round(holdings_value, 2),
        total_value_cad=round(total_value, 2),
        deposited_cad=round(ledger.deposited_cad, 2),
        total_return_cad=round(total_return, 2),
        total_return_pct=round(total_return / ledger.deposited_cad * 100, 2) if ledger.deposited_cad else 0.0,
        day_change_cad=round(day_change, 2),
        day_change_pct=round(day_change / start_of_day_value * 100, 2) if start_of_day_value > 0 else 0.0,
        realized_pnl_cad=round(ledger.realized_pnl_cad, 2),
        unrealized_pnl_cad=round(sum(r[4] - r[0].cost_cad for r in rows), 2),
        usdcad=round(usdcad, 4) if usdcad else None,
        holdings=holdings,
    )


class _AsOf:
    """Last known value on or before a date, for a series indexed by trading day."""

    def __init__(self, series: pd.Series):
        self.days = [idx.date() for idx in series.index]
        self.values = [float(v) for v in series.values]

    def at(self, day: date) -> float | None:
        i = bisect_right(self.days, day)
        return self.values[i - 1] if i else None


def value_history(
    transactions: Sequence[PaperTransaction],
    market: dict[str, TickerData],
    usdcad: pd.Series | None,
    now_value_cad: float,
    now: datetime,
) -> list[PaperHistoryPoint]:
    """Account value right after it was opened, at every market close since,
    and right now (`now_value_cad`, so the last point matches the live summary)."""
    txns = ordered(transactions)
    if not txns:
        return []
    now = as_utc(now)
    start = as_utc(txns[0].executed_at)
    splits = splits_of(market)
    price_at = {ticker: _AsOf(d.closes) for ticker, d in market.items() if len(d.closes)}
    fx_at = _AsOf(usdcad) if usdcad is not None and len(usdcad) else None

    ledger = Ledger()
    applied = 0

    def advance_to(cutoff: datetime) -> None:
        nonlocal applied
        while applied < len(txns) and as_utc(txns[applied].executed_at) <= cutoff:
            t = txns[applied]
            ledger.apply(t, split_factor(splits, t.ticker, t.executed_at))
            applied += 1

    def mark(day: date | None) -> float:
        value = ledger.cash_cad
        for pos in ledger.open_positions():
            price = price_at[pos.ticker].at(day) if day and pos.ticker in price_at else None
            fx = 1.0 if pos.currency == "CAD" else (fx_at.at(day) if day and fx_at else None)
            value += pos.shares * (price or pos.last_price) * (fx or pos.last_fx_rate)
        return value

    def point(t: datetime, value: float) -> PaperHistoryPoint:
        return PaperHistoryPoint(t=t, value_cad=round(value, 2), deposited_cad=round(ledger.deposited_cad, 2))

    advance_to(start)
    points = [point(start, mark(None))]
    trading_days = sorted({d for lookup in price_at.values() for d in lookup.days})
    for day in trading_days:
        close_at = market_close_at(day)
        if start < close_at < now:
            advance_to(close_at)
            points.append(point(close_at, mark(day)))
    advance_to(now)
    points.append(point(now, now_value_cad))
    return points
