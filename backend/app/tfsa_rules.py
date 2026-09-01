"""TFSA contribution room rules and allocation heuristics.

Annual limits are set by the CRA and published each year; this table must be
updated when a new limit is announced (they don't follow a simple formula
year to year because of indexation rounding).
"""

ANNUAL_LIMITS: dict[int, float] = {
    2009: 5000, 2010: 5000, 2011: 5000, 2012: 5000,
    2013: 5500, 2014: 5500,
    2015: 10000,
    2016: 5500, 2017: 5500, 2018: 5500,
    2019: 6000, 2020: 6000,
    2021: 6000, 2022: 6000,
    2023: 6500,
    2024: 7000, 2025: 7000, 2026: 7000,
}
TFSA_STARTED_YEAR = 2009
ELIGIBILITY_AGE = 18


def lifetime_room(birth_year: int, year_became_resident: int, as_of_year: int) -> float:
    """Room accumulates starting the later of (a) turning 18 or (b) becoming a
    Canadian resident, but never before the TFSA program started in 2009."""
    eligible_from = max(TFSA_STARTED_YEAR, birth_year + ELIGIBILITY_AGE, year_became_resident)
    total = 0.0
    for year in range(eligible_from, as_of_year + 1):
        limit = ANNUAL_LIMITS.get(year)
        if limit is None:
            # Fall back to the most recent known limit for years beyond our table.
            limit = ANNUAL_LIMITS[max(ANNUAL_LIMITS)]
        total += limit
    return total


def core_satellite_allocation(risk_bucket: str) -> tuple[int, int, list[str]]:
    """Returns (core_etf_pct, satellite_stock_pct, rationale)."""
    if risk_bucket == "conservative":
        core, satellite = 85, 15
        rationale = [
            "With a shorter time horizon or lower risk tolerance, a larger broad-market "
            "ETF core reduces the impact of any single stock underperforming.",
            "A small satellite still lets you learn how individual stock analysis works "
            "without risking a large share of your account.",
        ]
    elif risk_bucket == "growth":
        core, satellite = 60, 40
        rationale = [
            "A longer time horizon and higher risk tolerance can absorb more single-stock "
            "volatility in exchange for higher potential long-term returns.",
            "Even at higher risk tolerance, keeping a majority in diversified ETFs limits "
            "the damage if any one stock pick underperforms.",
        ]
    else:
        core, satellite = 70, 30
        rationale = [
            "A 70/30 core-satellite split is a common starting point: most of the account "
            "in low-cost diversified ETFs, with a smaller portion for individual stock picks "
            "you actively research and follow.",
            "This keeps the bulk of your TFSA insulated from any single company's bad year "
            "while still giving you room to apply what you learn about individual stocks.",
        ]
    return core, satellite, rationale
