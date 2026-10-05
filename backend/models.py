import enum
from datetime import datetime

from sqlalchemy import (
    Column, Integer, String, Float, Boolean, Date, DateTime, ForeignKey, UniqueConstraint
)
from sqlalchemy.orm import relationship
from database import Base


# --- Enums ---

class RentStatus(str, enum.Enum):
    PENDING = "pending"
    PAID = "paid"
    OVERDUE = "overdue"
    PARTIAL = "partial"


class PaymentMethod(str, enum.Enum):
    CASH = "cash"
    UPI = "upi"
    BANK_TRANSFER = "bank_transfer"
    OTHER = "other"


class NotificationStatus(str, enum.Enum):
    SENT = "sent"
    FAILED = "failed"
    PENDING = "pending"


# --- Models ---

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    name = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class Tenant(Base):
    __tablename__ = "tenants"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    room_number = Column(String, nullable=False)
    monthly_rent = Column(Float, nullable=False)
    rent_due_day = Column(Integer, default=1)  # Day of month rent is due
    join_date = Column(Date, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    rents = relationship("Rent", back_populates="tenant", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="tenant", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="tenant", cascade="all, delete-orphan")
    electricity_bills = relationship("ElectricityBill", back_populates="tenant", cascade="all, delete-orphan")


class Rent(Base):
    __tablename__ = "rents"
    __table_args__ = (UniqueConstraint("tenant_id", "month", "year", name="uq_tenant_month_year"),)

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False)
    month = Column(Integer, nullable=False)
    year = Column(Integer, nullable=False)
    amount_due = Column(Float, nullable=False)
    electricity_amount = Column(Float, default=0, nullable=False, server_default="0")
    amount_paid = Column(Float, default=0)
    status = Column(String, default=RentStatus.PENDING)
    due_date = Column(Date, nullable=False)
    paid_date = Column(Date, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    tenant = relationship("Tenant", back_populates="rents")
    payments = relationship("Payment", back_populates="rent", cascade="all, delete-orphan")


class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    rent_id = Column(Integer, ForeignKey("rents.id"), nullable=False)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False)
    amount = Column(Float, nullable=False)
    date = Column(Date, nullable=False)
    method = Column(String, default=PaymentMethod.CASH)
    note = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    rent = relationship("Rent", back_populates="payments")
    tenant = relationship("Tenant", back_populates="payments")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False)
    message = Column(String, nullable=False)
    status = Column(String, default=NotificationStatus.PENDING)
    sent_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    tenant = relationship("Tenant", back_populates="notifications")


class ElectricityBill(Base):
    __tablename__ = "electricity_bills"
    __table_args__ = (UniqueConstraint("tenant_id", "month", "year", name="uq_tenant_elec_month_year"),)

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False)
    room_number = Column(String, nullable=False)
    month = Column(Integer, nullable=False)
    year = Column(Integer, nullable=False)
    prev_reading = Column(Float, nullable=False)
    curr_reading = Column(Float, nullable=False)
    rate_per_unit = Column(Float, nullable=False, default=8.0)
    total_amount = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    tenant = relationship("Tenant", back_populates="electricity_bills")
