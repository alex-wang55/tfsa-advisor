from datetime import date, datetime, timezone

import pandas as pd
import pytest
from fastapi.testclient import TestClient

import app.main as main
from app import paper
from app.schemas import PaperTransaction

T0 = datetime(2026, 10, 5, 14, 0, tzinfo=timezone.utc)  # Mon 10:00 ET


def _at(day: int, hour_utc: int = 15) -> datetime:
    return datetime(2026, 10, day, hour_utc, 0, tzinfo=timezone.utc)


def deposit(amount: float, when: datetime = T0, id: str = "d1") -> PaperTransaction:
    return PaperTransaction(id=id, kind="deposit", amount_cad=amount, executed_at=when)


def trade(kind: str, ticker: str, shares: float, price: float, when: datetime, fx: float = 1.0,
          currency: str = "CAD", id: str | None = None) -> PaperTransaction:
    return PaperTransaction(
        id=id or f"{kind}-{ticker}-{when.isoformat()}",
        kind=kind, ticker=ticker, name=ticker, exchange="TSX" if currency == "CAD" else "US",
        currency=currency, shares=shares, price=price, fx_rate=fx,
        amount_cad=round(shares * price * fx, 2), executed_at=when,
    )


def quote(ticker: str, price: float, prev_close: float | None = None, prev_day: date | None = None,
          fx: float = 1.0, currency: str = "CAD") -> paper.Quote:
    return paper.Quote(ticker=ticker, price=price, prev_close=prev_close, prev_close_date=prev_day,
                       fx_rate=fx, name=ticker, currency=currency)


def test_replay_tracks_cash_and_average_cost():
    ledger = paper.replay([
        deposit(10_000),
        trade("buy", "RY.TO", 10, 100, _at(6)),
        trade("buy", "RY.TO", 10, 120, _at(7)),
        trade("sell", "RY.TO", 5, 130, _at(8)),
    ])
    pos = ledger.positions["RY.TO"]
    assert pos.shares == 15
    # Average cost is 110/share, so selling 5 at 130 realizes 5 * 20.
    assert pos.cost_cad == pytest.approx(1650)
    assert pos.realized_pnl_cad == pytest.approx(100)
    assert ledger.cash_cad == pytest.approx(10_000 - 1000 - 1200 + 650)


def test_replay_orders_by_time_not_list_order():
    ledger = paper.replay([trade("buy", "RY.TO", 1, 100, _at(6)), deposit(500)])
    assert ledger.cash_cad == pytest.approx(400)


def test_selling_everything_closes_the_position():
    ledger = paper.replay([deposit(1000), trade("buy", "RY.TO", 3, 100, _at(6)),
                           trade("sell", "RY.TO", 3, 90, _at(7))])
    assert ledger.open_positions() == []
    assert ledger.realized_pnl_cad == pytest.approx(-30)


def test_buy_by_dollars_converts_usd_at_the_fx_rate():
    ledger = paper.replay([deposit(1000)])
    shares, amount = paper.plan_order(ledger, quote("AAPL", 200, fx=1.25, currency="USD"), "buy", amount_cad=500)
    assert amount == 500
    assert shares == pytest.approx(2.0)


def test_buy_more_than_cash_is_rejected():
    ledger = paper.replay([deposit(100)])
    with pytest.raises(paper.TradeError, match="Not enough practice cash"):
        paper.plan_order(ledger, quote("RY.TO", 150), "buy", shares=1)


def test_buy_entire_cash_balance_is_allowed():
    ledger = paper.replay([deposit(1234.56)])
    _, amount = paper.plan_order(ledger, quote("RY.TO", 33.33), "buy", amount_cad=1234.56)
    assert amount == 1234.56


def test_sell_more_than_held_is_rejected():
    ledger = paper.replay([deposit(1000), trade("buy", "RY.TO", 2, 100, _at(6))])
    with pytest.raises(paper.TradeError, match="only hold"):
        paper.plan_order(ledger, quote("RY.TO", 100), "sell", shares=3)


def test_dollar_sell_of_nearly_everything_sells_exact_holding():
    ledger = paper.replay([deposit(1000), trade("buy", "RY.TO", 2, 100, _at(6))])
    shares, amount = paper.plan_order(ledger, quote("RY.TO", 101), "sell", amount_cad=201.99)
    assert shares == 2
    assert amount == 202


def test_selling_something_not_held_is_rejected():
    ledger = paper.replay([deposit(1000)])
    with pytest.raises(paper.TradeError, match="don't own"):
        paper.plan_order(ledger, quote("RY.TO", 100), "sell", shares=1)


def test_summary_values_holdings_and_returns():
    txns = [deposit(10_000), trade("buy", "RY.TO", 10, 100, _at(6)),
            trade("buy", "AAPL", 5, 200, _at(6), fx=1.3, currency="USD")]
    out = paper.summarize(txns, {
        "RY.TO": quote("RY.TO", 110, prev_close=105, prev_day=date(2026, 10, 6)),
        "AAPL": quote("AAPL", 210, prev_close=200, prev_day=date(2026, 10, 6), fx=1.4, currency="USD"),
    }, usdcad=1.4)
    assert out.cash_cad == pytest.approx(10_000 - 1000 - 1300)
    assert out.holdings_value_cad == pytest.approx(1100 + 5 * 210 * 1.4)
    assert out.total_return_cad == pytest.approx(out.total_value_cad - 10_000)
    aapl = next(h for h in out.holdings if h.ticker == "AAPL")
    # Both the price move and the CAD weakening show up in the CAD return.
    assert aapl.unrealized_pnl_cad == pytest.approx(5 * 210 * 1.4 - 1300)
    assert aapl.avg_cost == pytest.approx(200)
    # Bought on the previous close date, so today's change is the whole move since then.
    ry = next(h for h in out.holdings if h.ticker == "RY.TO")
    assert ry.day_change_cad == pytest.approx(10 * (110 - 105))
    assert sum(h.weight_pct for h in out.holdings) + out.cash_cad / out.total_value_cad * 100 == pytest.approx(100, abs=0.05)


def test_day_change_only_counts_gains_since_a_same_day_buy():
    txns = [deposit(1000), trade("buy", "RY.TO", 2, 108, _at(8))]
    out = paper.summarize(txns, {"RY.TO": quote("RY.TO", 110, prev_close=100, prev_day=date(2026, 10, 7))}, None)
    assert out.holdings[0].day_change_cad == pytest.approx(2 * (110 - 108))


def test_summary_falls_back_to_last_fill_when_price_unavailable():
    txns = [deposit(1000), trade("buy", "RY.TO", 2, 100, _at(6))]
    out = paper.summarize(txns, {}, None)
    assert out.holdings[0].price_stale is True
    assert out.total_value_cad == pytest.approx(1000)


def test_history_marks_each_close_after_the_account_opened():
    closes = pd.Series(
        [100.0, 104.0, 108.0],
        index=pd.DatetimeIndex(["2026-10-05", "2026-10-06", "2026-10-07"]).tz_localize("America/Toronto"),
    )
    txns = [deposit(1000, when=T0), trade("buy", "RY.TO", 5, 100, _at(5, 18))]
    market = {"RY.TO": paper.TickerData(closes=closes, splits=[])}
    points = paper.value_history(txns, market, None, now_value_cad=1050, now=_at(8, 13))
    assert [round(p.value_cad) for p in points] == [1000, 1000, 1020, 1040, 1050]
    assert all(p.deposited_cad == 1000 for p in points)


def test_splits_after_a_buy_scale_shares_not_value():
    splits = {"NVDA": [(date(2026, 10, 7), 10.0)]}
    txns = [deposit(5000), trade("buy", "NVDA", 2, 1000, _at(6))]
    ledger = paper.replay(txns, splits)
    assert ledger.shares_of("NVDA") == pytest.approx(20)
    out = paper.summarize(txns, {"NVDA": quote("NVDA", 101)}, None, splits)
    assert out.holdings[0].avg_cost == pytest.approx(100)
    assert out.holdings[0].unrealized_pnl_cad == pytest.approx(20)
    # Selling the post-split share count is allowed.
    shares, _ = paper.plan_order(ledger, quote("NVDA", 101), "sell", shares=20)
    assert shares == pytest.approx(20)


def test_splits_before_a_buy_are_ignored():
    splits = {"NVDA": [(date(2026, 10, 1), 10.0)]}
    assert paper.replay([deposit(5000), trade("buy", "NVDA", 2, 100, _at(6))], splits).shares_of("NVDA") == 2


# --- API ---

@pytest.fixture
def client(monkeypatch):
    monkeypatch.setattr(paper, "load_ticker_data", lambda tickers: {})
    monkeypatch.setattr(paper, "fetch_quote", lambda ticker: quote(ticker.upper(), 50.0, prev_close=49.0,
                                                                   prev_day=date(2026, 10, 13)))
    return TestClient(main.app)


def _ledger_json(*txns: PaperTransaction) -> list[dict]:
    return [t.model_dump(mode="json") for t in txns]


def test_order_returns_a_fill_for_the_client_to_store(client):
    res = client.post("/api/paper/orders", json={
        "transactions": _ledger_json(deposit(1000)),
        "order": {"ticker": "ry.to", "side": "buy", "amount_cad": 500},
    })
    assert res.status_code == 201
    fill = res.json()
    assert fill["kind"] == "buy" and fill["ticker"] == "RY.TO"
    assert fill["shares"] == pytest.approx(10)
    assert fill["amount_cad"] == 500


def test_order_needs_an_open_account(client):
    res = client.post("/api/paper/orders", json={
        "transactions": [], "order": {"ticker": "RY.TO", "side": "buy", "shares": 1},
    })
    assert res.status_code == 409


def test_order_rejects_insufficient_cash_with_a_readable_message(client):
    res = client.post("/api/paper/orders", json={
        "transactions": _ledger_json(deposit(10)),
        "order": {"ticker": "RY.TO", "side": "buy", "shares": 1},
    })
    assert res.status_code == 422
    assert "Not enough practice cash" in res.json()["detail"]


def test_order_must_be_sized_one_way(client):
    res = client.post("/api/paper/orders", json={
        "transactions": _ledger_json(deposit(1000)),
        "order": {"ticker": "RY.TO", "side": "buy", "shares": 1, "amount_cad": 50},
    })
    assert res.status_code == 422


def test_empty_ledger_has_no_portfolio(client):
    assert client.post("/api/paper/portfolio", json={"transactions": []}).json() is None
