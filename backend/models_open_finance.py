from datetime import datetime, timezone
from typing import Any, Dict, Optional
import uuid

from pydantic import BaseModel, Field


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


class OpenFinanceConnection(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    workspace_id: str
    provider: str
    item_id: str
    consent_id: Optional[str] = None
    institution_name: str = "Instituicao"
    status: str = "connected"
    last_sync_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=_now_utc)


class ExternalAccount(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    connection_id: str
    workspace_id: str
    external_account_id: str
    type: str = "bank"
    subtype: Optional[str] = None
    name: str
    number_masked: Optional[str] = None
    balance_current: float = 0.0
    balance_available: float = 0.0
    currency: str = "BRL"
    source: str = "open_finance"
    metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=_now_utc)
    updated_at: datetime = Field(default_factory=_now_utc)


class ExternalTransaction(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    connection_id: str
    workspace_id: str
    external_transaction_id: str
    external_account_id: str
    description: str
    amount: float
    type: str = "debit"
    category_raw: Optional[str] = None
    category_normalized: Optional[str] = None
    date: datetime
    source: str = "open_finance"
    metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=_now_utc)
    updated_at: datetime = Field(default_factory=_now_utc)


class OpenFinanceConnectTokenRequest(BaseModel):
    provider: str = "pluggy"
    callback_url: Optional[str] = None
    item_id: Optional[str] = None


class OpenFinanceConnectCallbackRequest(BaseModel):
    provider: str = "pluggy"
    item_id: str
    consent_id: Optional[str] = None
    institution_name: Optional[str] = None
    status: str = "connected"
    metadata: Dict[str, Any] = Field(default_factory=dict)
