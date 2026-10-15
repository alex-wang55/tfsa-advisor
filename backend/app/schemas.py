from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field, model_validator


class SubScores(BaseModel):
    trend: float
    value: float
    quality: float
    income: float


class ExplanationBullet(BaseModel):
    text: str
    tone: str  # "positive" | "neutral" | "caution"


class StockMetrics(BaseModel):
    ticker: str
    exchange: str  # "TSX" | "US"
    name: str | None = None
    sector: str | None = None
    currency: str | None = None
    price: float | None = None
    price_change: float | None = None
    price_change_pct: float | None = None
    sma50: float | None = None
    sma200: float | None = None
    rsi14: float | None = None
    momentum_3m: float | None = None
    momentum_12m: float | None = None
    volatility_annualized: float | None = None
    pe_trailing: float | None = None
    pe_forward: float | None = None
    dividend_yield: float | None = None
    payout_ratio: float | None = None
    debt_to_equity: float | None = None
    market_cap: float | None = None
    beta: float | None = None
    history: list[dict] = Field(default_factory=list)  # [{date, close}]


class StockAnalysis(BaseModel):
    metrics: StockMetrics
    score: float
    sub_scores: SubScores
    explanations: list[ExplanationBullet]
    tfsa_notes: list[ExplanationBullet]


class ScreenResultItem(BaseModel):
    ticker: str
    name: str | None
    exchange: str
    sector: str | None
    score: float
    sub_scores: SubScores
    price_change_pct: float | None = None


class RiskProfileIn(BaseModel):
    time_horizon_years: int
    risk_tolerance: str
    experience: str


class RiskProfileOut(RiskProfileIn):
    risk_bucket: str


class TfsaAccountIn(BaseModel):
    birth_year: int
    year_became_resident: int
    total_contributions_to_date: float = 0.0
    total_withdrawals_this_year: float = 0.0


class TfsaRoomOut(BaseModel):
    total_lifetime_room: float
    total_contributions_to_date: float
    withdrawals_added_back_next_year: float
    available_room_now: float
    as_of_year: int


class AllocationSuggestion(BaseModel):
    core_etf_pct: int
    satellite_stock_pct: int
    rationale: list[str]


class WatchlistItemIn(BaseModel):
    ticker: str
    notes: str = ""


class WatchlistItemOut(WatchlistItemIn):
    id: int
    added_on: date


# --- Practice (paper) trading ---
# The practice ledger lives in the browser (so it survives serverless restarts
# and each visitor gets their own); the API is stateless and receives it with
# every request.

MAX_LEDGER_TRANSACTIONS = 2000


class PaperTransaction(BaseModel):
    """One entry in the practice account's append-only ledger."""

    id: str = Field(min_length=1, max_length=64)
    kind: Literal["deposit", "buy", "sell"]
    ticker: str | None = None
    name: str | None = None
    exchange: str | None = None
    currency: str = "CAD"
    shares: float = Field(default=0.0, ge=0)
    price: float = Field(default=0.0, ge=0)  # per share, in `currency`
    fx_rate: float = Field(default=1.0, gt=0)  # CAD per 1 unit of `currency`
    amount_cad: float = Field(gt=0, le=10_000_000)  # gross cash moved
    executed_at: datetime

    @model_validator(mode="after")
    def _trades_name_a_ticker(self):
        if self.kind != "deposit" and not self.ticker:
            raise ValueError("buy/sell transactions need a ticker")
        return self


class PaperLedgerIn(BaseModel):
    transactions: list[PaperTransaction] = Field(max_length=MAX_LEDGER_TRANSACTIONS)


class PaperQuoteIn(PaperLedgerIn):
    ticker: str


class PaperOrder(BaseModel):
    """Size an order by dollars (CAD) or by shares - exactly one of the two."""

    ticker: str
    side: Literal["buy", "sell"]
    amount_cad: float | None = Field(default=None, gt=0)
    shares: float | None = Field(default=None, gt=0)

    @model_validator(mode="after")
    def _exactly_one_size(self):
        if (self.amount_cad is None) == (self.shares is None):
            raise ValueError("Provide either amount_cad or shares (not both)")
        return self


class PaperOrderIn(PaperLedgerIn):
    order: PaperOrder


class PaperQuoteOut(BaseModel):
    ticker: str
    name: str | None
    exchange: str
    currency: str
    price: float
    price_change_pct: float | None
    fx_rate: float
    price_cad: float
    cash_cad: float
    shares_held: float


class PaperHolding(BaseModel):
    ticker: str
    name: str | None
    exchange: str
    currency: str
    shares: float
    avg_cost: float  # per share, in the listing currency
    price: float  # latest, in the listing currency
    price_stale: bool  # live data unavailable, so the last fill price is shown
    fx_rate: float
    market_value_cad: float
    cost_basis_cad: float
    unrealized_pnl_cad: float
    unrealized_pnl_pct: float
    day_change_cad: float
    day_change_pct: float | None  # the stock's own move today
    weight_pct: float


class PaperPortfolioOut(BaseModel):
    started_at: datetime
    cash_cad: float
    holdings_value_cad: float
    total_value_cad: float
    deposited_cad: float
    total_return_cad: float
    total_return_pct: float
    day_change_cad: float
    day_change_pct: float
    realized_pnl_cad: float
    unrealized_pnl_cad: float
    usdcad: float | None
    holdings: list[PaperHolding]


class PaperHistoryPoint(BaseModel):
    t: datetime
    value_cad: float
    deposited_cad: float
