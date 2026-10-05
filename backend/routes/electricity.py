from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models import ElectricityBill, User
from schemas import ElectricityCreate, ElectricityOut
from auth import get_current_user

router = APIRouter(prefix="/electricity", tags=["Electricity"])


@router.get("/", response_model=List[ElectricityOut])
def list_bills(
    room_number: Optional[str] = None,
    month: Optional[int] = None,
    year: Optional[int] = None,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    query = db.query(ElectricityBill)
    if room_number:
        query = query.filter(ElectricityBill.room_number == room_number)
    if month:
        query = query.filter(ElectricityBill.month == month)
    if year:
        query = query.filter(ElectricityBill.year == year)
    return query.order_by(ElectricityBill.year.desc(), ElectricityBill.month.desc()).all()


@router.get("/last-reading/{room_number}")
def last_reading(
    room_number: str,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """Return the most recent electricity bill for a room (for auto-populating prev reading)."""
    bill = db.query(ElectricityBill).filter(
        ElectricityBill.room_number == room_number
    ).order_by(ElectricityBill.year.desc(), ElectricityBill.month.desc()).first()
    if not bill:
        return {"curr_reading": None, "rate_per_unit": 8.0}
    return {"curr_reading": bill.curr_reading, "rate_per_unit": bill.rate_per_unit}


@router.post("/", response_model=ElectricityOut, status_code=status.HTTP_201_CREATED)
def add_reading(
    data: ElectricityCreate,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    # Check for duplicate
    existing = db.query(ElectricityBill).filter(
        ElectricityBill.room_number == data.room_number,
        ElectricityBill.month == data.month,
        ElectricityBill.year == data.year,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Reading already exists for this room/month")

    if data.curr_reading < data.prev_reading:
        raise HTTPException(status_code=400, detail="Current reading cannot be less than previous")

    units = data.curr_reading - data.prev_reading
    total = units * data.rate_per_unit

    bill = ElectricityBill(
        room_number=data.room_number,
        month=data.month,
        year=data.year,
        prev_reading=data.prev_reading,
        curr_reading=data.curr_reading,
        rate_per_unit=data.rate_per_unit,
        total_amount=round(total, 2),
    )
    db.add(bill)
    db.commit()
    db.refresh(bill)
    return bill


@router.delete("/{bill_id}")
def delete_bill(
    bill_id: int,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    bill = db.query(ElectricityBill).filter(ElectricityBill.id == bill_id).first()
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")
    db.delete(bill)
    db.commit()
    return {"message": "Bill deleted"}
