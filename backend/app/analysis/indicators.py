"""Technical indicators computed from a price history DataFrame
(expects columns: Close, indexed by date, ascending)."""

import numpy as np
import pandas as pd


def sma(close: pd.Series, window: int) -> float | None:
    if len(close) < window:
        return None
    return float(close.rolling(window).mean().iloc[-1])


def rsi14(close: pd.Series, window: int = 14) -> float | None:
    if len(close) < window + 1:
        return None
    delta = close.diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)
    avg_gain = gain.rolling(window).mean()
    avg_loss = loss.rolling(window).mean()
    last_avg_loss = avg_loss.iloc[-1]
    last_avg_gain = avg_gain.iloc[-1]
    if last_avg_loss == 0:
        return 100.0
    rs = last_avg_gain / last_avg_loss
    return float(100 - (100 / (1 + rs)))


def momentum(close: pd.Series, trading_days: int) -> float | None:
    """Percent price change over the given number of trading days."""
    if len(close) <= trading_days:
        return None
    past = close.iloc[-trading_days - 1]
    now = close.iloc[-1]
    if past == 0:
        return None
    return float((now - past) / past * 100)


def annualized_volatility(close: pd.Series, trading_days_per_year: int = 252) -> float | None:
    if len(close) < 20:
        return None
    daily_returns = close.pct_change().dropna()
    if daily_returns.empty:
        return None
    return float(daily_returns.std() * np.sqrt(trading_days_per_year) * 100)


def compute_all(history: pd.DataFrame) -> dict:
    close = history["Close"].dropna()
    return {
        "price": float(close.iloc[-1]) if len(close) else None,
        "sma50": sma(close, 50),
        "sma200": sma(close, 200),
        "rsi14": rsi14(close),
        "momentum_3m": momentum(close, 63),
        "momentum_12m": momentum(close, 252),
        "volatility_annualized": annualized_volatility(close),
    }
