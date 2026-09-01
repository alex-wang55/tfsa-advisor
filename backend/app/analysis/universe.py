"""A curated starter universe of TSX + major US tickers by sector, used by
the /api/screen endpoint. This is not exhaustive - it exists so the screener
has a concrete, reasonably diversified list to rank without needing a paid
whole-market screener API. Users can still look up any arbitrary ticker
directly via /api/stocks/{ticker}."""

UNIVERSE: list[dict] = [
    # --- TSX: Financials ---
    {"ticker": "RY.TO", "sector": "Financials"},
    {"ticker": "TD.TO", "sector": "Financials"},
    {"ticker": "BNS.TO", "sector": "Financials"},
    {"ticker": "BMO.TO", "sector": "Financials"},
    {"ticker": "CM.TO", "sector": "Financials"},
    {"ticker": "MFC.TO", "sector": "Financials"},
    {"ticker": "SLF.TO", "sector": "Financials"},
    # --- TSX: Energy ---
    {"ticker": "SU.TO", "sector": "Energy"},
    {"ticker": "CNQ.TO", "sector": "Energy"},
    {"ticker": "ENB.TO", "sector": "Energy"},
    {"ticker": "TRP.TO", "sector": "Energy"},
    # --- TSX: Materials ---
    {"ticker": "ABX.TO", "sector": "Materials"},
    {"ticker": "NTR.TO", "sector": "Materials"},
    {"ticker": "FM.TO", "sector": "Materials"},
    # --- TSX: Tech / Industrials / Other ---
    {"ticker": "SHOP.TO", "sector": "Technology"},
    {"ticker": "CSU.TO", "sector": "Technology"},
    {"ticker": "CNR.TO", "sector": "Industrials"},
    {"ticker": "CP.TO", "sector": "Industrials"},
    {"ticker": "WCN.TO", "sector": "Industrials"},
    {"ticker": "L.TO", "sector": "Consumer Staples"},
    {"ticker": "ATD.TO", "sector": "Consumer Discretionary"},
    {"ticker": "QSR.TO", "sector": "Consumer Discretionary"},
    {"ticker": "BCE.TO", "sector": "Telecom"},
    {"ticker": "T.TO", "sector": "Telecom"},
    # --- US: Technology ---
    {"ticker": "AAPL", "sector": "Technology"},
    {"ticker": "MSFT", "sector": "Technology"},
    {"ticker": "GOOGL", "sector": "Technology"},
    {"ticker": "NVDA", "sector": "Technology"},
    {"ticker": "AVGO", "sector": "Technology"},
    {"ticker": "CRM", "sector": "Technology"},
    {"ticker": "ADBE", "sector": "Technology"},
    # --- US: Consumer ---
    {"ticker": "AMZN", "sector": "Consumer Discretionary"},
    {"ticker": "COST", "sector": "Consumer Staples"},
    {"ticker": "WMT", "sector": "Consumer Staples"},
    {"ticker": "PG", "sector": "Consumer Staples"},
    {"ticker": "KO", "sector": "Consumer Staples"},
    {"ticker": "MCD", "sector": "Consumer Discretionary"},
    {"ticker": "NKE", "sector": "Consumer Discretionary"},
    # --- US: Healthcare ---
    {"ticker": "JNJ", "sector": "Healthcare"},
    {"ticker": "UNH", "sector": "Healthcare"},
    {"ticker": "LLY", "sector": "Healthcare"},
    {"ticker": "ABBV", "sector": "Healthcare"},
    # --- US: Financials ---
    {"ticker": "JPM", "sector": "Financials"},
    {"ticker": "V", "sector": "Financials"},
    {"ticker": "MA", "sector": "Financials"},
    {"ticker": "BRK-B", "sector": "Financials"},
    # --- US: Industrials / Energy / Other ---
    {"ticker": "XOM", "sector": "Energy"},
    {"ticker": "CVX", "sector": "Energy"},
    {"ticker": "CAT", "sector": "Industrials"},
    {"ticker": "HON", "sector": "Industrials"},
    {"ticker": "DIS", "sector": "Communication Services"},
    {"ticker": "META", "sector": "Communication Services"},
]


def tickers_for(exchange: str | None = None) -> list[str]:
    if exchange is None:
        return [item["ticker"] for item in UNIVERSE]
    suffix_match = exchange.upper() == "TSX"
    return [
        item["ticker"]
        for item in UNIVERSE
        if item["ticker"].endswith(".TO") == suffix_match
    ]
