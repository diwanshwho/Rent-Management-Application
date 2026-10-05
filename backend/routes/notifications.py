from datetime import datetime, date
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Notification, Tenant, Rent, RentStatus, NotificationStatus, User
from schemas import SendReminder, NotificationOut
from auth import get_current_user

router = APIRouter(prefix="/notifications", tags=["Notifications"])


def _build_reminder_message(tenant: Tenant, rent: Rent = None) -> str:
    msg = f"Hi {tenant.name}, this is a reminder to pay your rent"
    if rent:
        pending = rent.amount_due - rent.amount_paid
        msg += f" of Rs.{pending:.0f} for {rent.month}/{rent.year}"
    msg += f" (Room {tenant.room_number}). Please pay at the earliest. Thank you!"
    return msg


@router.post("/send-reminder")
def send_reminder(
    data: SendReminder,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """Generate a reminder message for a tenant. Returns phone + message for the SMS app."""
    tenant = db.query(Tenant).filter(Tenant.id == data.tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    # Find latest unpaid rent
    rent = db.query(Rent).filter(
        Rent.tenant_id == tenant.id,
        Rent.status.in_([RentStatus.PENDING, RentStatus.OVERDUE, RentStatus.PARTIAL]),
    ).order_by(Rent.year.desc(), Rent.month.desc()).first()

    message = data.message or _build_reminder_message(tenant, rent)

    # Save notification record
    notification = Notification(
        tenant_id=tenant.id,
        message=message,
        status=NotificationStatus.SENT,
        sent_at=datetime.utcnow(),
    )
    db.add(notification)
    db.commit()

    return {
        "phone": tenant.phone,
        "message": message,
        "tenant_name": tenant.name,
    }


@router.get("/", response_model=List[NotificationOut])
def list_notifications(
    tenant_id: Optional[int] = None,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    query = db.query(Notification)
    if tenant_id:
        query = query.filter(Notification.tenant_id == tenant_id)
    notifs = query.order_by(Notification.created_at.desc()).limit(100).all()

    result = []
    for n in notifs:
        out = NotificationOut(
            id=n.id,
            tenant_id=n.tenant_id,
            message=n.message,
            status=n.status,
            sent_at=n.sent_at.isoformat() if n.sent_at else None,
            created_at=n.created_at.isoformat() if n.created_at else None,
            tenant_name=n.tenant.name if n.tenant else None,
        )
        result.append(out)
    return result
