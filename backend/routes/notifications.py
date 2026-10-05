from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Notification, Tenant, Rent, RentStatus, NotificationStatus, User
from schemas import SendReminder, NotificationOut
from auth import get_current_user
from sms import send_sms

router = APIRouter(prefix="/notifications", tags=["Notifications"])


def _build_reminder_message(tenant: Tenant, rent: Rent = None) -> str:
    msg = f"Hi {tenant.name}, this is a reminder to pay your rent"
    if rent:
        pending = rent.amount_due - rent.amount_paid
        msg += f" of ₹{pending:.0f} for {rent.month}/{rent.year}"
    msg += f" (Room {tenant.room_number}). Please pay at the earliest. Thank you!"
    return msg


@router.post("/send-reminder")
def send_reminder(
    data: SendReminder,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    tenant = db.query(Tenant).filter(Tenant.id == data.tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    # Find latest unpaid rent
    rent = db.query(Rent).filter(
        Rent.tenant_id == tenant.id,
        Rent.status.in_([RentStatus.PENDING, RentStatus.OVERDUE, RentStatus.PARTIAL]),
    ).order_by(Rent.year.desc(), Rent.month.desc()).first()

    message = data.message or _build_reminder_message(tenant, rent)

    # Send SMS
    sms_result = send_sms(tenant.phone, message)

    # Save notification record
    notification = Notification(
        tenant_id=tenant.id,
        message=message,
        status=NotificationStatus.SENT if sms_result["status"] in ("sent", "logged") else NotificationStatus.FAILED,
        sent_at=datetime.utcnow(),
    )
    db.add(notification)
    db.commit()

    return {"message": f"Reminder sent to {tenant.name}", "sms_status": sms_result}


@router.post("/send-bulk")
def send_bulk_reminders(
    month: Optional[int] = None,
    year: Optional[int] = None,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """Send reminders to all tenants with unpaid rent for the given month."""
    from datetime import date
    today = date.today()
    m = month or today.month
    y = year or today.year

    unpaid_rents = db.query(Rent).filter(
        Rent.month == m,
        Rent.year == y,
        Rent.status.in_([RentStatus.PENDING, RentStatus.OVERDUE, RentStatus.PARTIAL]),
    ).all()

    results = []
    for rent in unpaid_rents:
        tenant = rent.tenant
        if not tenant or not tenant.is_active:
            continue

        message = _build_reminder_message(tenant, rent)
        sms_result = send_sms(tenant.phone, message)

        notification = Notification(
            tenant_id=tenant.id,
            message=message,
            status=NotificationStatus.SENT if sms_result["status"] in ("sent", "logged") else NotificationStatus.FAILED,
            sent_at=datetime.utcnow(),
        )
        db.add(notification)
        results.append({"tenant": tenant.name, "status": sms_result["status"]})

    db.commit()
    return {"sent": len(results), "details": results}


@router.get("/", response_model=List[NotificationOut])
def list_notifications(
    tenant_id: Optional[int] = None,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    query = db.query(Notification)
    if tenant_id:
        query = query.filter(Notification.tenant_id == tenant_id)
    notifs = query.order_by(Notification.created_at.desc()).limit(50).all()

    result = []
    for n in notifs:
        out = NotificationOut.model_validate(n)
        out.tenant_name = n.tenant.name if n.tenant else None
        out.sent_at = n.sent_at.isoformat() if n.sent_at else None
        result.append(out)
    return result


@router.post("/test-sms")
def test_sms(
    phone: str,
    _user: User = Depends(get_current_user),
):
    """Send a test SMS to verify Twilio config."""
    result = send_sms(phone, "Test message from Rent Manager 🏠")
    return result
