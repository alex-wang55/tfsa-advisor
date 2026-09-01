from app.analysis.scoring import score_stock
from app.schemas import StockMetrics


def _metrics(**overrides) -> StockMetrics:
    base = dict(ticker="TEST", exchange="US")
    base.update(overrides)
    return StockMetrics(**base)


def test_missing_metrics_default_to_neutral():
    score, sub = score_stock(_metrics(), "balanced")
    assert 40 <= score <= 60
    assert sub.trend == 50.0
    assert sub.value == 50.0


def test_strong_uptrend_scores_higher_than_downtrend():
    strong = _metrics(price=110, sma50=105, sma200=100, rsi14=60, momentum_12m=25)
    weak = _metrics(price=80, sma50=85, sma200=100, rsi14=40, momentum_12m=-15)
    strong_score, _ = score_stock(strong, "growth")
    weak_score, _ = score_stock(weak, "growth")
    assert strong_score > weak_score


def test_low_pe_scores_higher_value_than_high_pe():
    cheap = _metrics(pe_trailing=10)
    expensive = _metrics(pe_trailing=45)
    _, cheap_sub = score_stock(cheap, "balanced")
    _, expensive_sub = score_stock(expensive, "balanced")
    assert cheap_sub.value > expensive_sub.value


def test_negative_pe_does_not_crash_and_is_excluded_from_value_score():
    metrics = _metrics(pe_trailing=-5)
    score, sub = score_stock(metrics, "balanced")
    assert sub.value == 50.0  # neutral, since negative P/E is excluded


def test_high_payout_ratio_penalizes_income_score():
    sustainable = _metrics(dividend_yield=4.0, payout_ratio=0.5)
    risky = _metrics(dividend_yield=4.0, payout_ratio=0.95)
    _, sustainable_sub = score_stock(sustainable, "balanced")
    _, risky_sub = score_stock(risky, "balanced")
    assert sustainable_sub.income > risky_sub.income


def test_risk_buckets_weight_differently():
    growth_leaning = _metrics(
        price=110, sma50=105, sma200=100, rsi14=60, momentum_12m=30,
        pe_trailing=40, dividend_yield=0,
    )
    conservative_score, _ = score_stock(growth_leaning, "conservative")
    growth_score, _ = score_stock(growth_leaning, "growth")
    assert growth_score > conservative_score
