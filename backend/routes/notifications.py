from datetime import datetime, date
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Notification, Tenant, Rent, RentStatus, NotificationStatus, User
from schemas import SendReminder, NotificationOut
from auth import get_current_user
from sms import send_sms, is_sms_configured

router = APIRouter(prefix="/notifications", tags=["Notifications"])


def _build_reminder_message(tenant: Tenant, rent: Rent = None) -> str:
    msg = f"Hi {tenant.name}, this is a reminder to pay your rent"
    if rent:
        pending = rent.amount_due - rent.amount_paid
        msg += f" of Rs.{pending:.0f} for {rent.month}/{rent.year}"
    msg += f" (Room {tenant.room_number}). Please pay at the earliest. Thank you!"
    return msg


def _map_sms_status(sms_result: dict) -> str:
    """Map SMS result to notification status."""
    if sms_result["status"] == "sent":
        return NotificationStatus.SENT
    elif sms_result["status"] == "not_configured":
        return NotificationStatus.FAILED
    else:
        return NotificationStatus.FAILED


@router.get("/sms-status")
def check_sms_config(_user: User = Depends(get_current_user)):
    """Check if Twilio SMS is configured."""
    return {
        "configured": is_sms_configured(),
        "message": "Twilio is configured and ready" if is_sms_configured()
        else "Twilio not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER in environment variables.",
    }


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
    notif_status = _map_sms_status(sms_result)

    # Save notification record
    notification = Notification(
        tenant_id=tenant.id,
        message=message,
        status=notif_status,
        sent_at=datetime.utcnow() if notif_status == NotificationStatus.SENT else None,
    )
    db.add(notification)
    db.commit()

    # Return honest status
    if sms_result["status"] == "sent":
        return {"message": f"SMS sent to {tenant.name} ({tenant.phone})", "sms": sms_result}
    elif sms_result["status"] == "not_configured":
        return {"message": f"Twilio not configured. Notification saved but SMS not sent.", "sms": sms_result}
    else:
        return {"message": f"SMS failed for {tenant.name}: {sms_result.get('error', 'Unknown error')}", "sms": sms_result}


@router.post("/send-bulk")
def send_bulk_reminders(
    month: Optional[int] = None,
    year: Optional[int] = None,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """Send reminders to all tenants with unpaid rent for the given month."""
    today = date.today()
    m = month or today.month
    y = year or today.year

    unpaid_rents = db.query(Rent).filter(
        Rent.month == m,
        Rent.year == y,
        Rent.status.in_([RentStatus.PENDING, RentStatus.OVERDUE, RentStatus.PARTIAL]),
    ).all()

    sent = 0
    failed = 0
    results = []
    for rent in unpaid_rents:
        tenant = rent.tenant
        if not tenant or not tenant.is_active:
            continue

        message = _build_reminder_message(tenant, rent)
        sms_result = send_sms(tenant.phone, message)
        notif_status = _map_sms_status(sms_result)

        notification = Notification(
            tenant_id=tenant.id,
            message=message,
            status=notif_status,
            sent_at=datetime.utcnow() if notif_status == NotificationStatus.SENT else None,
        )
        db.add(notification)

        if sms_result["status"] == "sent":
            sent += 1
        else:
            failed += 1
        results.append({"tenant": tenant.name, "status": sms_result["status"]})

    db.commit()
    return {"sent": sent, "failed": failed, "total": len(results), "details": results}


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
    if not is_sms_configured():
        return {
            "status": "not_configured",
            "message": "Twilio is not configured. Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER to your environment variables.",
        }
    result = send_sms(phone, "Test message from Rent Manager")
    return result
