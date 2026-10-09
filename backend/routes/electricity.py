from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models import ElectricityBill, Tenant, Rent, RentStatus, User
from schemas import ElectricityCreate, ElectricityOut
from auth import get_current_user

router = APIRouter(prefix="/electricity", tags=["Electricity"])


@router.get("/", response_model=List[ElectricityOut])
def list_bills(
    tenant_id: Optional[int] = None,
    month: Optional[int] = None,
    year: Optional[int] = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    query = db.query(ElectricityBill).join(Tenant, ElectricityBill.tenant_id == Tenant.id)
    if user._role == "admin":
        query = query.filter(Tenant.owner_id == user._owner_id)
    else:
        query = query.filter(ElectricityBill.tenant_id == user._tenant_access_id)
    if tenant_id:
        query = query.filter(ElectricityBill.tenant_id == tenant_id)
    if month:
        query = query.filter(ElectricityBill.month == month)
    if year:
        query = query.filter(ElectricityBill.year == year)
    return query.order_by(ElectricityBill.year.desc(), ElectricityBill.month.desc()).all()


@router.get("/last-reading/{tenant_id}")
def last_reading(
    tenant_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if user._role == "tenant" and user._tenant_access_id != tenant_id:
        raise HTTPException(status_code=403, detail="Access denied")
    if user._role == "admin":
        tenant = db.query(Tenant).filter(Tenant.id == tenant_id, Tenant.owner_id == user._owner_id).first()
        if not tenant:
            raise HTTPException(status_code=404, detail="Tenant not found")

    bill = db.query(ElectricityBill).filter(
        ElectricityBill.tenant_id == tenant_id
    ).order_by(ElectricityBill.year.desc(), ElectricityBill.month.desc()).first()
    if not bill:
        return {"curr_reading": None, "rate_per_unit": 8.0}
    return {"curr_reading": bill.curr_reading, "rate_per_unit": bill.rate_per_unit}


@router.post("/", response_model=ElectricityOut, status_code=status.HTTP_201_CREATED)
def add_reading(
    data: ElectricityCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if user._role == "tenant":
        raise HTTPException(status_code=403, detail="Access denied")

    tenant = db.query(Tenant).filter(Tenant.id == data.tenant_id, Tenant.owner_id == user._owner_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    existing = db.query(ElectricityBill).filter(
        ElectricityBill.tenant_id == data.tenant_id,
        ElectricityBill.month == data.month,
        ElectricityBill.year == data.year,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Reading already exists for this tenant/month")

    if data.curr_reading < data.prev_reading:
        raise HTTPException(status_code=400, detail="Current reading cannot be less than previous")

    units = data.curr_reading - data.prev_reading
    total = units * data.rate_per_unit

    bill = ElectricityBill(
        tenant_id=data.tenant_id,
        room_number=data.room_number,
        month=data.month,
        year=data.year,
        prev_reading=data.prev_reading,
        curr_reading=data.curr_reading,
        rate_per_unit=data.rate_per_unit,
        total_amount=round(total, 2),
    )
    db.add(bill)

    rent = db.query(Rent).filter(
        Rent.tenant_id == data.tenant_id, Rent.month == data.month, Rent.year == data.year
    ).first()
    if rent:
        rent.electricity_amount = round(total, 2)
        rent.amount_due = tenant.monthly_rent + round(total, 2)
        if rent.amount_paid >= rent.amount_due:
            rent.status = RentStatus.PAID
        elif rent.amount_paid > 0:
            rent.status = RentStatus.PARTIAL

    db.commit()
    db.refresh(bill)
    return bill


@router.delete("/{bill_id}")
def delete_bill(
    bill_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if user._role == "tenant":
        raise HTTPException(status_code=403, detail="Access denied")

    bill = db.query(ElectricityBill).join(Tenant, ElectricityBill.tenant_id == Tenant.id).filter(
        ElectricityBill.id == bill_id, Tenant.owner_id == user._owner_id,
    ).first()
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")

    tenant = db.query(Tenant).filter(Tenant.id == bill.tenant_id).first()
    if tenant:
        rent = db.query(Rent).filter(
            Rent.tenant_id == bill.tenant_id, Rent.month == bill.month, Rent.year == bill.year
        ).first()
        if rent:
            rent.electricity_amount = 0
            rent.amount_due = tenant.monthly_rent
            if rent.amount_paid >= rent.amount_due:
                rent.status = RentStatus.PAID
            elif rent.amount_paid > 0:
                rent.status = RentStatus.PARTIAL
            else:
                rent.status = RentStatus.PENDING

    db.delete(bill)
    db.commit()
    return {"message": "Bill deleted"}
