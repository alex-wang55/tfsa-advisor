"""Fetches raw price history + fundamentals from Yahoo Finance via yfinance,
with a simple in-memory TTL cache so the UI stays snappy and we don't hammer
Yahoo's undocumented rate limits."""

import time

import pandas as pd
import yfinance as yf

CACHE_TTL_SECONDS = 60
_cache: dict[str, tuple[float, object]] = {}


class TickerNotFoundError(Exception):
    pass


def _cached(key: str, fetch_fn, force: bool = False):
    now = time.time()
    if not force and key in _cache:
        cached_at, value = _cache[key]
        if now - cached_at < CACHE_TTL_SECONDS:
            return value
    value = fetch_fn()
    _cache[key] = (now, value)
    return value


def normalize_ticker(ticker: str) -> str:
    return ticker.strip().upper()


def exchange_for_ticker(ticker: str) -> str:
    return "TSX" if ticker.endswith(".TO") or ticker.endswith(".V") else "US"


def fetch_history(ticker: str, period: str = "1y", force: bool = False) -> pd.DataFrame:
    ticker = normalize_ticker(ticker)

    def _fetch():
        hist = yf.Ticker(ticker).history(period=period, auto_adjust=True)
        if hist is None or hist.empty:
            raise TickerNotFoundError(f"No price history found for '{ticker}'")
        return hist

    return _cached(f"history:{ticker}:{period}", _fetch, force=force)


def fetch_info(ticker: str, force: bool = False) -> dict:
    ticker = normalize_ticker(ticker)

    def _fetch():
        info = yf.Ticker(ticker).get_info()
        if not info or info.get("regularMarketPrice") is None and info.get("currentPrice") is None:
            # Some tickers (esp. ETFs/indices) omit these fields; only hard-fail
            # when there's truly nothing usable back from Yahoo.
            if not info or len(info) < 3:
                raise TickerNotFoundError(f"No info found for '{ticker}'")
        return info

    return _cached(f"info:{ticker}", _fetch, force=force)
