from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import RiskProfile, TfsaAccount
from app.schemas import (
    AllocationSuggestion,
    TfsaAccountIn,
    TfsaRoomOut,
)
from app.tfsa_rules import core_satellite_allocation, lifetime_room

router = APIRouter(prefix="/api/tfsa", tags=["tfsa"])


@router.put("/account", response_model=TfsaRoomOut)
def set_account(payload: TfsaAccountIn, db: Session = Depends(get_db)):
    account = db.get(TfsaAccount, 1)
    if account is None:
        account = TfsaAccount(id=1)
        db.add(account)
    account.birth_year = payload.birth_year
    account.year_became_resident = payload.year_became_resident
    account.total_contributions_to_date = payload.total_contributions_to_date
    account.total_withdrawals_this_year = payload.total_withdrawals_this_year
    db.commit()
    return _room_for(account)


@router.get("/room", response_model=TfsaRoomOut)
def get_room(db: Session = Depends(get_db)):
    account = db.get(TfsaAccount, 1)
    if account is None:
        return TfsaRoomOut(
            total_lifetime_room=0,
            total_contributions_to_date=0,
            withdrawals_added_back_next_year=0,
            available_room_now=0,
            as_of_year=date.today().year,
        )
    return _room_for(account)


def _room_for(account: TfsaAccount) -> TfsaRoomOut:
    as_of_year = date.today().year
    total_room = lifetime_room(account.birth_year, account.year_became_resident, as_of_year)
    # Withdrawals only restore contribution room starting January 1 of the
    # *following* year (CRA rule) - they do not increase room available today.
    available_now = total_room - account.total_contributions_to_date
    return TfsaRoomOut(
        total_lifetime_room=total_room,
        total_contributions_to_date=account.total_contributions_to_date,
        withdrawals_added_back_next_year=account.total_withdrawals_this_year,
        available_room_now=round(available_now, 2),
        as_of_year=as_of_year,
    )


@router.get("/allocation", response_model=AllocationSuggestion)
def get_allocation(db: Session = Depends(get_db)):
    profile = db.get(RiskProfile, 1)
    risk_bucket = profile.risk_bucket if profile else "balanced"
    core, satellite, rationale = core_satellite_allocation(risk_bucket)
    return AllocationSuggestion(core_etf_pct=core, satellite_stock_pct=satellite, rationale=rationale)
