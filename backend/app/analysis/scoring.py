"""Combines technical + fundamental metrics into a 0-100 composite score,
weighted by risk profile. All sub-scores are independently 0-100 so weights
are easy to reason about and test.

This is a heuristic screening score, not a valuation model - it rewards
observable trend/quality/value/income characteristics, it does not predict
future returns.
"""

from app.schemas import StockMetrics, SubScores

RISK_WEIGHTS = {
    "conservative": {"trend": 0.15, "value": 0.30, "quality": 0.35, "income": 0.20},
    "balanced": {"trend": 0.30, "value": 0.25, "quality": 0.30, "income": 0.15},
    "growth": {"trend": 0.45, "value": 0.15, "quality": 0.30, "income": 0.10},
}


def _clamp(value: float, low: float = 0.0, high: float = 100.0) -> float:
    return max(low, min(high, value))


def _scale(value: float | None, low: float, high: float, *, invert: bool = False) -> float:
    """Linearly scale value into [0, 100] between low and high, clamped at the ends.
    Returns a neutral 50 when the input is missing."""
    if value is None:
        return 50.0
    if high == low:
        return 50.0
    pct = (value - low) / (high - low) * 100
    pct = _clamp(pct)
    return 100 - pct if invert else pct


def trend_score(m: StockMetrics) -> float:
    if m.price is None or m.sma50 is None or m.sma200 is None:
        return 50.0
    parts = []
    # Above/below the long-term trend line.
    parts.append(100.0 if m.price > m.sma200 else 20.0)
    # Golden cross (short-term average above long-term) vs. death cross.
    parts.append(100.0 if m.sma50 > m.sma200 else 20.0)
    # 12-month momentum, scaled: -20%..+40% maps to 0..100.
    parts.append(_scale(m.momentum_12m, -20, 40))
    # RSI: reward a healthy uptrend (50-70), penalize deeply oversold or
    # extremely overbought extremes.
    if m.rsi14 is not None:
        if 45 <= m.rsi14 <= 70:
            parts.append(85.0)
        elif m.rsi14 > 80 or m.rsi14 < 25:
            parts.append(30.0)
        else:
            parts.append(60.0)
    return sum(parts) / len(parts)


def value_score(m: StockMetrics) -> float:
    parts = []
    if m.pe_trailing is not None and m.pe_trailing > 0:
        # Lower P/E scores higher; 8x..35x mapped, inverted.
        parts.append(_scale(m.pe_trailing, 8, 35, invert=True))
    if m.pe_forward is not None and m.pe_forward > 0:
        parts.append(_scale(m.pe_forward, 8, 35, invert=True))
    if not parts:
        return 50.0
    return sum(parts) / len(parts)


def quality_score(m: StockMetrics) -> float:
    parts = []
    if m.debt_to_equity is not None:
        # debtToEquity from yfinance is typically expressed as a percentage
        # (e.g. 120 == 1.2x); lower is better. 0..250 mapped, inverted.
        parts.append(_scale(m.debt_to_equity, 0, 250, invert=True))
    if m.beta is not None:
        # Prefer moderate beta (~1.0); heavily penalize extreme volatility betas.
        parts.append(_clamp(100 - abs(m.beta - 1.0) * 60))
    if m.volatility_annualized is not None:
        # Lower realized volatility scores higher; 10%..70% mapped, inverted.
        parts.append(_scale(m.volatility_annualized, 10, 70, invert=True))
    if not parts:
        return 50.0
    return sum(parts) / len(parts)


def income_score(m: StockMetrics) -> float:
    if m.dividend_yield is None or m.dividend_yield == 0:
        return 40.0  # non-payers aren't "bad", just neutral-low on this axis
    yield_score = _scale(m.dividend_yield, 0, 6)
    if m.payout_ratio is not None:
        # A very high payout ratio (>0.9) suggests the dividend is less safe.
        sustainability_penalty = 25.0 if m.payout_ratio > 0.9 else 0.0
        return _clamp(yield_score - sustainability_penalty)
    return yield_score


def score_stock(m: StockMetrics, risk_bucket: str) -> tuple[float, SubScores]:
    weights = RISK_WEIGHTS.get(risk_bucket, RISK_WEIGHTS["balanced"])
    sub = SubScores(
        trend=round(trend_score(m), 1),
        value=round(value_score(m), 1),
        quality=round(quality_score(m), 1),
        income=round(income_score(m), 1),
    )
    composite = (
        sub.trend * weights["trend"]
        + sub.value * weights["value"]
        + sub.quality * weights["quality"]
        + sub.income * weights["income"]
    )
    return round(composite, 1), sub
