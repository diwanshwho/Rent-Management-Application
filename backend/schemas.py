import re
from datetime import date
from typing import Optional
from pydantic import BaseModel, field_validator


# --- Validators ---

def validate_indian_phone(phone: str) -> str:
    """Validate Indian mobile number: 10 digits starting with 6-9, optional +91 prefix."""
    cleaned = re.sub(r"[\s\-()]", "", phone)  # Remove spaces, dashes, parens
    # Strip +91 or 91 prefix
    if cleaned.startswith("+91"):
        cleaned = cleaned[3:]
    elif cleaned.startswith("91") and len(cleaned) == 12:
        cleaned = cleaned[2:]
    # Must be 10 digits starting with 6-9
    if not re.match(r"^[6-9]\d{9}$", cleaned):
        raise ValueError("Invalid phone number. Must be 10 digits starting with 6-9 (Indian mobile)")
    return f"+91{cleaned}"


# --- Auth ---

class LoginRequest(BaseModel):
    email: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    id: int
    email: str
    name: str

    class Config:
        from_attributes = True


# --- Tenant ---

class TenantCreate(BaseModel):
    name: str
    phone: str
    room_number: str
    monthly_rent: float
    rent_due_day: int = 1
    join_date: date

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError("Name cannot be empty")
        if len(v.strip()) < 2:
            raise ValueError("Name must be at least 2 characters")
        return v.strip()

    @field_validator("phone")
    @classmethod
    def phone_valid(cls, v):
        return validate_indian_phone(v)

    @field_validator("room_number")
    @classmethod
    def room_not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError("Room number cannot be empty")
        return v.strip()

    @field_validator("monthly_rent")
    @classmethod
    def rent_positive(cls, v):
        if v <= 0:
            raise ValueError("Monthly rent must be greater than 0")
        return v

    @field_validator("rent_due_day")
    @classmethod
    def due_day_valid(cls, v):
        if v < 1 or v > 28:
            raise ValueError("Due day must be between 1 and 28")
        return v


class TenantUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    room_number: Optional[str] = None
    monthly_rent: Optional[float] = None
    rent_due_day: Optional[int] = None
    is_active: Optional[bool] = None

    @field_validator("phone")
    @classmethod
    def phone_valid(cls, v):
        if v is not None:
            return validate_indian_phone(v)
        return v

    @field_validator("monthly_rent")
    @classmethod
    def rent_positive(cls, v):
        if v is not None and v <= 0:
            raise ValueError("Monthly rent must be greater than 0")
        return v

    @field_validator("rent_due_day")
    @classmethod
    def due_day_valid(cls, v):
        if v is not None and (v < 1 or v > 28):
            raise ValueError("Due day must be between 1 and 28")
        return v


class TenantOut(BaseModel):
    id: int
    name: str
    phone: str
    room_number: str
    monthly_rent: float
    rent_due_day: int
    join_date: date
    is_active: bool

    class Config:
        from_attributes = True


# --- Rent ---

class RentGenerate(BaseModel):
    month: int
    year: int

    @field_validator("month")
    @classmethod
    def month_valid(cls, v):
        if v < 1 or v > 12:
            raise ValueError("Month must be between 1 and 12")
        return v

    @field_validator("year")
    @classmethod
    def year_valid(cls, v):
        if v < 2020 or v > 2100:
            raise ValueError("Year must be between 2020 and 2100")
        return v


class RentUpdate(BaseModel):
    status: Optional[str] = None
    amount_paid: Optional[float] = None


class RentOut(BaseModel):
    id: int
    tenant_id: int
    month: int
    year: int
    amount_due: float
    amount_paid: float
    status: str
    due_date: date
    paid_date: Optional[date] = None
    tenant_name: Optional[str] = None

    class Config:
        from_attributes = True


# --- Payment ---

class PaymentCreate(BaseModel):
    rent_id: int
    tenant_id: int
    amount: float
    date: date
    method: str = "cash"
    note: Optional[str] = None

    @field_validator("amount")
    @classmethod
    def amount_positive(cls, v):
        if v <= 0:
            raise ValueError("Payment amount must be greater than 0")
        return v

    @field_validator("method")
    @classmethod
    def method_valid(cls, v):
        allowed = ["cash", "upi", "bank_transfer", "other"]
        if v not in allowed:
            raise ValueError(f"Method must be one of: {', '.join(allowed)}")
        return v


class PaymentOut(BaseModel):
    id: int
    rent_id: int
    tenant_id: int
    amount: float
    date: date
    method: str
    note: Optional[str] = None
    tenant_name: Optional[str] = None

    class Config:
        from_attributes = True


# --- Notification ---

class SendReminder(BaseModel):
    tenant_id: int
    message: Optional[str] = None


class NotificationOut(BaseModel):
    id: int
    tenant_id: int
    message: str
    status: str
    sent_at: Optional[str] = None
    created_at: Optional[str] = None
    tenant_name: Optional[str] = None

    class Config:
        from_attributes = True


# --- Electricity ---

class ElectricityCreate(BaseModel):
    room_number: str
    month: int
    year: int
    prev_reading: float
    curr_reading: float
    rate_per_unit: float = 8.0

    @field_validator("curr_reading")
    @classmethod
    def reading_valid(cls, v):
        if v < 0:
            raise ValueError("Reading cannot be negative")
        return v

    @field_validator("rate_per_unit")
    @classmethod
    def rate_positive(cls, v):
        if v <= 0:
            raise ValueError("Rate must be greater than 0")
        return v


class ElectricityOut(BaseModel):
    id: int
    room_number: str
    month: int
    year: int
    prev_reading: float
    curr_reading: float
    rate_per_unit: float
    total_amount: float

    class Config:
        from_attributes = True


# --- Dashboard ---

class DashboardStats(BaseModel):
    total_tenants: int
    active_tenants: int
    total_collected: float
    total_pending: float
    paid_count: int
    pending_count: int
    overdue_count: int
