from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.analysis.data import normalize_ticker
from app.db import get_db
from app.models import WatchlistItem
from app.schemas import WatchlistItemIn, WatchlistItemOut

router = APIRouter(prefix="/api/watchlist", tags=["watchlist"])


@router.get("", response_model=list[WatchlistItemOut])
def list_watchlist(db: Session = Depends(get_db)):
    items = db.scalars(select(WatchlistItem).order_by(WatchlistItem.added_on.desc())).all()
    return items


@router.post("", response_model=WatchlistItemOut, status_code=201)
def add_watchlist_item(payload: WatchlistItemIn, db: Session = Depends(get_db)):
    ticker = normalize_ticker(payload.ticker)
    existing = db.scalar(select(WatchlistItem).where(WatchlistItem.ticker == ticker))
    if existing:
        raise HTTPException(status_code=409, detail=f"'{ticker}' is already on the watchlist")
    item = WatchlistItem(ticker=ticker, notes=payload.notes)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{item_id}", status_code=204)
def remove_watchlist_item(item_id: int, db: Session = Depends(get_db)):
    item = db.get(WatchlistItem, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Watchlist item not found")
    db.delete(item)
    db.commit()
