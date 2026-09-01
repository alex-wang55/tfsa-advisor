from datetime import date, datetime

from sqlalchemy import Date, DateTime, Float, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class RiskProfile(Base):
    """Single-row table: this is a single-user app, so there is at most one profile."""

    __tablename__ = "risk_profile"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    time_horizon_years: Mapped[int] = mapped_column(Integer)
    risk_tolerance: Mapped[str] = mapped_column(String)  # "low" | "medium" | "high"
    experience: Mapped[str] = mapped_column(String)  # "new" | "some" | "experienced"
    risk_bucket: Mapped[str] = mapped_column(String)  # "conservative" | "balanced" | "growth"
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class TfsaAccount(Base):
    """Single-row table holding the inputs needed to compute contribution room."""

    __tablename__ = "tfsa_account"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    birth_year: Mapped[int] = mapped_column(Integer)
    year_became_resident: Mapped[int] = mapped_column(Integer)
    total_contributions_to_date: Mapped[float] = mapped_column(Float, default=0.0)
    total_withdrawals_this_year: Mapped[float] = mapped_column(Float, default=0.0)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class WatchlistItem(Base):
    __tablename__ = "watchlist_item"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    ticker: Mapped[str] = mapped_column(String, unique=True, index=True)
    notes: Mapped[str] = mapped_column(String, default="")
    added_on: Mapped[date] = mapped_column(Date, default=date.today)
