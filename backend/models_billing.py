from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, Optional
from uuid import uuid4

from pydantic import BaseModel, Field


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class SubscriptionRecord(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    user_id: str
    workspace_id: str
    plan_code: str
    provider: str
    payment_method: str
    provider_customer_id: Optional[str] = None
    provider_subscription_id: Optional[str] = None
    provider_checkout_id: Optional[str] = None
    status: str = "pending"
    current_period_end: Optional[datetime] = None
    trial_end: Optional[datetime] = None
    cancel_at_period_end: bool = False
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)


class PaymentRecord(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    subscription_id: str
    provider: str
    provider_payment_id: Optional[str] = None
    amount: float
    currency: str = "BRL"
    status: str = "pending"
    paid_at: Optional[datetime] = None
    due_date: Optional[datetime] = None
    invoice_url: Optional[str] = None
    pix_qr_code: Optional[str] = None
    pix_payload: Optional[str] = None
    raw_payload: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)
