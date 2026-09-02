from datetime import date

from pydantic import BaseModel, Field


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
