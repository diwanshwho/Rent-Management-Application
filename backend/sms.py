import logging
from datetime import datetime

from config import TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER

logger = logging.getLogger(__name__)


def is_sms_configured() -> bool:
    return all([TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER])


def send_sms(to: str, body: str) -> dict:
    """Send an SMS via Twilio. Falls back to logging if not configured."""
    if not is_sms_configured():
        logger.info(f"[SMS-LOG] To: {to} | Message: {body}")
        return {"status": "logged", "message": "Twilio not configured, SMS logged only"}

    try:
        from twilio.rest import Client
        client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        message = client.messages.create(
            body=body,
            from_=TWILIO_PHONE_NUMBER,
            to=to,
        )
        logger.info(f"[SMS-SENT] To: {to} | SID: {message.sid}")
        return {"status": "sent", "sid": message.sid}
    except Exception as e:
        logger.error(f"[SMS-FAIL] To: {to} | Error: {e}")
        return {"status": "failed", "error": str(e)}
