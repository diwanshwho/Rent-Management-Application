import logging
from datetime import datetime

from config import TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER

logger = logging.getLogger(__name__)


def is_sms_configured() -> bool:
    return all([TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER])


def send_sms(to: str, body: str) -> dict:
    """Send an SMS via Twilio. Returns clear status about what happened."""
    if not is_sms_configured():
        logger.info(f"[SMS-SKIP] Twilio not configured. To: {to} | Message: {body}")
        return {
            "status": "not_configured",
            "message": "Twilio credentials not set. Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER to environment variables.",
        }

    try:
        from twilio.rest import Client
        client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        message = client.messages.create(
            body=body,
            from_=TWILIO_PHONE_NUMBER,
            to=to,
        )
        logger.info(f"[SMS-SENT] To: {to} | SID: {message.sid} | Status: {message.status}")
        return {"status": "sent", "sid": message.sid, "twilio_status": message.status}
    except Exception as e:
        error_msg = str(e)
        logger.error(f"[SMS-FAIL] To: {to} | Error: {error_msg}")
        # Give helpful error messages
        if "authenticate" in error_msg.lower() or "credentials" in error_msg.lower():
            hint = "Check your TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN"
        elif "not a valid phone" in error_msg.lower() or "unverified" in error_msg.lower():
            hint = "On Twilio free trial, you can only send to verified numbers. Verify this number in Twilio Console."
        elif "not a mobile number" in error_msg.lower():
            hint = "Twilio cannot send SMS to this number type"
        else:
            hint = error_msg
        return {"status": "failed", "error": hint, "raw_error": error_msg}
