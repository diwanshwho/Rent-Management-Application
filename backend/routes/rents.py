from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models import Rent, Tenant, Payment, RentStatus, User
from schemas import RentGenerate, RentUpdate, RentOut, PaymentCreate, PaymentOut, DashboardStats
from auth import get_current_user

router = APIRouter(prefix="/rents", tags=["Rents"])


def _tenant_filter(query, user):
    """Apply owner or tenant filter to a query that already joins Tenant."""
    if user._role == "admin":
        return query.filter(Tenant.owner_id == user._owner_id)
    return query.filter(Rent.tenant_id == user._tenant_access_id)


# --- Dashboard ---

@router.get("/dashboard", response_model=DashboardStats)
def dashboard_stats(
    month: Optional[int] = None,
    year: Optional[int] = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if user._role == "tenant":
        raise HTTPException(status_code=403, detail="Access denied")

    today = date.today()
    m = month or today.month
    y = year or today.year

    total_tenants = db.query(Tenant).filter(Tenant.owner_id == user._owner_id).count()
    active_tenants = db.query(Tenant).filter(Tenant.owner_id == user._owner_id, Tenant.is_active == True).count()

    rents = db.query(Rent).join(Tenant).filter(
        Rent.month == m, Rent.year == y,
        Tenant.is_active == True, Tenant.owner_id == user._owner_id,
    ).all()

    paid = [r for r in rents if r.status == RentStatus.PAID]
    pending = [r for r in rents if r.status in (RentStatus.PENDING, RentStatus.PARTIAL)]
    overdue = [r for r in rents if r.status == RentStatus.OVERDUE]

    total_collected = sum(r.amount_paid for r in rents)
    total_pending = sum(r.amount_due - r.amount_paid for r in rents if r.status != RentStatus.PAID)

    return DashboardStats(
        total_tenants=total_tenants,
        active_tenants=active_tenants,
        total_collected=total_collected,
        total_pending=total_pending,
        paid_count=len(paid),
        pending_count=len(pending),
        overdue_count=len(overdue),
    )


# --- Rent CRUD ---

@router.get("/", response_model=List[RentOut])
def list_rents(
    month: Optional[int] = None,
    year: Optional[int] = None,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    query = db.query(Rent).join(Tenant)
    query = _tenant_filter(query, user)
    if user._role == "admin":
        query = query.filter(Tenant.is_active == True)
    if month:
        query = query.filter(Rent.month == month)
    if year:
        query = query.filter(Rent.year == year)
    if status_filter:
        query = query.filter(Rent.status == status_filter)

    rents = query.order_by(Rent.due_date.desc()).all()

    result = []
    for r in rents:
        out = RentOut.model_validate(r)
        out.tenant_name = r.tenant.name if r.tenant else None
        result.append(out)
    return result


@router.post("/generate")
def generate_rents(
    data: RentGenerate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if user._role == "tenant":
        raise HTTPException(status_code=403, detail="Access denied")

    tenants = db.query(Tenant).filter(Tenant.is_active == True, Tenant.owner_id == user._owner_id).all()
    created = 0
    skipped = 0

    for tenant in tenants:
        existing = db.query(Rent).filter(
            Rent.tenant_id == tenant.id,
            Rent.month == data.month,
            Rent.year == data.year,
        ).first()
        if existing:
            skipped += 1
            continue

        due_day = min(tenant.rent_due_day, 28)
        rent = Rent(
            tenant_id=tenant.id,
            month=data.month,
            year=data.year,
            amount_due=tenant.monthly_rent,
            due_date=date(data.year, data.month, due_day),
        )
        db.add(rent)
        created += 1

    db.commit()
    return {"message": f"Generated {created} rent entries, skipped {skipped} (already exist)"}


@router.put("/{rent_id}", response_model=RentOut)
def update_rent(
    rent_id: int,
    data: RentUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if user._role == "tenant":
        raise HTTPException(status_code=403, detail="Access denied")
    rent = db.query(Rent).join(Tenant).filter(Rent.id == rent_id, Tenant.owner_id == user._owner_id).first()
    if not rent:
        raise HTTPException(status_code=404, detail="Rent record not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(rent, key, value)
    db.commit()
    db.refresh(rent)
    out = RentOut.model_validate(rent)
    out.tenant_name = rent.tenant.name if rent.tenant else None
    return out


@router.post("/mark-overdue")
def mark_overdue(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if user._role == "tenant":
        raise HTTPException(status_code=403, detail="Access denied")

    today = date.today()
    rents = db.query(Rent).join(Tenant).filter(
        Rent.status.in_([RentStatus.PENDING, RentStatus.PARTIAL]),
        Rent.due_date < today,
        Tenant.is_active == True,
        Tenant.owner_id == user._owner_id,
    ).all()

    count = 0
    for rent in rents:
        rent.status = RentStatus.OVERDUE
        count += 1
    db.commit()
    return {"message": f"Marked {count} rents as overdue"}


# --- Payments ---

@router.get("/payments", response_model=List[PaymentOut])
def list_payments(
    tenant_id: Optional[int] = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    query = db.query(Payment).join(Tenant, Payment.tenant_id == Tenant.id)
    if user._role == "admin":
        query = query.filter(Tenant.owner_id == user._owner_id, Tenant.is_active == True)
    else:
        query = query.filter(Payment.tenant_id == user._tenant_access_id)
    if tenant_id:
        query = query.filter(Payment.tenant_id == tenant_id)
    payments = query.order_by(Payment.date.desc()).all()

    result = []
    for p in payments:
        out = PaymentOut.model_validate(p)
        out.tenant_name = p.tenant.name if p.tenant else None
        result.append(out)
    return result


@router.post("/payments", response_model=PaymentOut, status_code=status.HTTP_201_CREATED)
def record_payment(
    data: PaymentCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if user._role == "tenant":
        raise HTTPException(status_code=403, detail="Access denied")

    rent = db.query(Rent).filter(Rent.id == data.rent_id).first()
    if not rent:
        raise HTTPException(status_code=404, detail="Rent record not found")
    if rent.tenant_id != data.tenant_id:
        raise HTTPException(status_code=400, detail="Tenant doesn't match this rent record")

    tenant = db.query(Tenant).filter(Tenant.id == data.tenant_id, Tenant.owner_id == user._owner_id).first()
    if not tenant:
        raise HTTPException(status_code=403, detail="Access denied")

    payment = Payment(**data.model_dump())
    db.add(payment)

    rent.amount_paid += data.amount
    if rent.amount_paid >= rent.amount_due:
        rent.status = RentStatus.PAID
        rent.paid_date = data.date
    elif rent.amount_paid > 0:
        rent.status = RentStatus.PARTIAL

    db.commit()
    db.refresh(payment)

    out = PaymentOut.model_validate(payment)
    out.tenant_name = payment.tenant.name if payment.tenant else None
    return out


@router.delete("/payments/{payment_id}")
def delete_payment(
    payment_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if user._role == "tenant":
        raise HTTPException(status_code=403, detail="Access denied")

    payment = db.query(Payment).join(Tenant, Payment.tenant_id == Tenant.id).filter(
        Payment.id == payment_id, Tenant.owner_id == user._owner_id,
    ).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    rent = db.query(Rent).filter(Rent.id == payment.rent_id).first()
    if rent:
        rent.amount_paid = max(0, rent.amount_paid - payment.amount)
        if rent.amount_paid <= 0:
            rent.status = RentStatus.PENDING
            rent.paid_date = None
        elif rent.amount_paid < rent.amount_due:
            rent.status = RentStatus.PARTIAL
            rent.paid_date = None

    db.delete(payment)
    db.commit()
    return {"message": "Payment deleted"}
