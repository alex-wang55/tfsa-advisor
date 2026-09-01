"""Pulls fundamental metrics out of yfinance's raw `.info` dict.

yfinance's info dict is inconsistent across tickers/exchanges (field
availability varies a lot for TSX names in particular), so every lookup is
defensive and falls back to None rather than raising.
"""


def _get(info: dict, *keys, default=None):
    for key in keys:
        value = info.get(key)
        if value is not None:
            return value
    return default


def extract(info: dict, price: float | None = None) -> dict:
    dividend_rate = _get(info, "dividendRate")
    if dividend_rate is not None and price:
        # Compute directly from the per-share dividend rate and current
        # price - unambiguous, unlike `dividendYield` whose units (fraction
        # vs. percent) have varied across yfinance versions.
        dividend_yield = dividend_rate / price * 100
    else:
        dividend_yield = _get(info, "dividendYield")

    return {
        "name": _get(info, "shortName", "longName"),
        "sector": _get(info, "sector"),
        "currency": _get(info, "currency"),
        "pe_trailing": _get(info, "trailingPE"),
        "pe_forward": _get(info, "forwardPE"),
        "dividend_yield": dividend_yield,
        "payout_ratio": _get(info, "payoutRatio"),
        "debt_to_equity": _get(info, "debtToEquity"),
        "market_cap": _get(info, "marketCap"),
        "beta": _get(info, "beta"),
    }
