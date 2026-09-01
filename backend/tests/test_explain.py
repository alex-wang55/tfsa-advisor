from app.analysis.explain import build_explanations, build_tfsa_notes
from app.schemas import StockMetrics


def _metrics(**overrides) -> StockMetrics:
    base = dict(ticker="TEST", exchange="US")
    base.update(overrides)
    return StockMetrics(**base)


def test_no_metrics_produces_no_crash_and_some_default_bullets():
    bullets = build_explanations(_metrics())
    # No dividend data -> should still mention it doesn't pay a dividend.
    assert any("dividend" in b.text.lower() for b in bullets)


def test_uptrend_bullet_is_positive():
    bullets = build_explanations(_metrics(price=110, sma200=100))
    uptrend = [b for b in bullets if "200-day" in b.text]
    assert uptrend and uptrend[0].tone == "positive"


def test_downtrend_bullet_is_caution():
    bullets = build_explanations(_metrics(price=90, sma200=100))
    downtrend = [b for b in bullets if "200-day" in b.text]
    assert downtrend and downtrend[0].tone == "caution"


def test_us_dividend_stock_gets_withholding_tax_note():
    notes = build_tfsa_notes(_metrics(exchange="US", dividend_yield=3.0))
    assert any("withholding" in n.text.lower() for n in notes)


def test_tsx_stock_does_not_get_us_withholding_note():
    notes = build_tfsa_notes(_metrics(exchange="TSX", dividend_yield=3.0))
    assert not any("withholding" in n.text.lower() for n in notes)


def test_high_volatility_gets_capital_loss_note():
    notes = build_tfsa_notes(_metrics(exchange="US", volatility_annualized=60))
    assert any("capital loss" in n.text.lower() for n in notes)
