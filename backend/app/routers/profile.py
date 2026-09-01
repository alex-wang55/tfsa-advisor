from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import RiskProfile
from app.schemas import RiskProfileIn, RiskProfileOut

router = APIRouter(prefix="/api/profile", tags=["profile"])

VALID_TOLERANCE = {"low", "medium", "high"}
VALID_EXPERIENCE = {"new", "some", "experienced"}


def _derive_bucket(payload: RiskProfileIn) -> str:
    """Simple point system: longer horizon + higher risk tolerance + more
    experience pushes toward 'growth'; short horizon or low tolerance pushes
    toward 'conservative'."""
    points = 0
    points += {"low": 0, "medium": 1, "high": 2}[payload.risk_tolerance]
    points += {"new": 0, "some": 1, "experienced": 2}[payload.experience]
    points += 2 if payload.time_horizon_years >= 10 else 1 if payload.time_horizon_years >= 5 else 0

    if points <= 1:
        return "conservative"
    if points <= 3:
        return "balanced"
    return "growth"


@router.put("", response_model=RiskProfileOut)
def set_profile(payload: RiskProfileIn, db: Session = Depends(get_db)):
    if payload.risk_tolerance not in VALID_TOLERANCE:
        raise HTTPException(status_code=422, detail=f"risk_tolerance must be one of {VALID_TOLERANCE}")
    if payload.experience not in VALID_EXPERIENCE:
        raise HTTPException(status_code=422, detail=f"experience must be one of {VALID_EXPERIENCE}")

    bucket = _derive_bucket(payload)
    profile = db.get(RiskProfile, 1)
    if profile is None:
        profile = RiskProfile(id=1)
        db.add(profile)
    profile.time_horizon_years = payload.time_horizon_years
    profile.risk_tolerance = payload.risk_tolerance
    profile.experience = payload.experience
    profile.risk_bucket = bucket
    profile.updated_at = datetime.utcnow()
    db.commit()
    return RiskProfileOut(**payload.model_dump(), risk_bucket=bucket)


@router.get("", response_model=RiskProfileOut | None)
def get_profile(db: Session = Depends(get_db)):
    profile = db.get(RiskProfile, 1)
    if profile is None:
        return None
    return RiskProfileOut(
        time_horizon_years=profile.time_horizon_years,
        risk_tolerance=profile.risk_tolerance,
        experience=profile.experience,
        risk_bucket=profile.risk_bucket,
    )
