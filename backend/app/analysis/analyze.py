"""Ties data fetching + indicators + fundamentals + scoring + explanations
together into one StockAnalysis for a given ticker and risk bucket."""

from app.analysis import data, explain, fundamentals, indicators
from app.schemas import StockAnalysis, StockMetrics
from app.analysis.scoring import score_stock


def analyze_ticker(ticker: str, risk_bucket: str = "balanced") -> StockAnalysis:
    ticker = data.normalize_ticker(ticker)
    # 2y of history so 12-month momentum and 200-day SMA both have a full
    # trailing window available (a 1y fetch never has enough days for either).
    history = data.fetch_history(ticker, period="2y")
    info = data.fetch_info(ticker)

    tech = indicators.compute_all(history)
    fund = fundamentals.extract(info, price=tech.get("price"))

    history_points = [
        {
            "date": idx.strftime("%Y-%m-%d"),
            "open": round(float(row["Open"]), 2),
            "high": round(float(row["High"]), 2),
            "low": round(float(row["Low"]), 2),
            "close": round(float(row["Close"]), 2),
        }
        for idx, row in history.iterrows()
    ]

    metrics = StockMetrics(
        ticker=ticker,
        exchange=data.exchange_for_ticker(ticker),
        history=history_points,
        **tech,
        **fund,
    )

    score, sub_scores = score_stock(metrics, risk_bucket)
    explanations = explain.build_explanations(metrics)
    tfsa_notes = explain.build_tfsa_notes(metrics)

    return StockAnalysis(
        metrics=metrics,
        score=score,
        sub_scores=sub_scores,
        explanations=explanations,
        tfsa_notes=tfsa_notes,
    )
