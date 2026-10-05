from datetime import date
from typing import Optional
from pydantic import BaseModel, EmailStr


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


class TenantUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    room_number: Optional[str] = None
    monthly_rent: Optional[float] = None
    rent_due_day: Optional[int] = None
    is_active: Optional[bool] = None


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
