from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
from datetime import datetime
import uuid

# Workspace/Company Models (Multiempresa)
class WorkspaceCreate(BaseModel):
    name: str
    subdomain: Optional[str] = None
    description: Optional[str] = None

class WorkspaceUpdate(BaseModel):
    name: Optional[str] = None
    subdomain: Optional[str] = None
    description: Optional[str] = None
    settings: Optional[dict] = None

class Workspace(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    subdomain: Optional[str] = None
    description: Optional[str] = None
    owner_id: str
    members: List[str] = Field(default_factory=list)  # user IDs
    created_at: datetime = Field(default_factory=datetime.utcnow)
    settings: dict = Field(default_factory=lambda: {
        "branding": {
            "logo": None,
            "primary_color": "#06b6d4",  # cyan-500
            "secondary_color": "#3b82f6"  # blue-500
        },
        "features": {
            "crm": True,
            "tasks": True,
            "automation": True
        }
    })

# Client/Customer Models (CRM)
class ClientCreate(BaseModel):
    name: str
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    document: Optional[str] = None  # CPF/CNPJ
    address: Optional[dict] = None
    notes: Optional[str] = None

class ClientUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    document: Optional[str] = None
    address: Optional[dict] = None
    notes: Optional[str] = None
    status: Optional[str] = None

class Client(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    workspace_id: str
    user_id: str  # who created
    name: str
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    document: Optional[str] = None  # CPF/CNPJ
    address: Optional[dict] = None
    notes: Optional[str] = None
    status: str = "active"  # active, inactive, blocked
    tags: List[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

# Client Activity/History
class ClientActivity(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    workspace_id: str
    client_id: str
    user_id: str  # who performed the action
    activity_type: str  # created, updated, contacted, meeting, etc
    description: str
    metadata: Optional[dict] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Enhanced Task Model for Kanban
class TaskUpdateEnhanced(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[datetime] = None
    status: Optional[str] = None
    stage: Optional[str] = None  # todo, in_progress, review, done
    assigned_to: Optional[str] = None  # user_id
    client_id: Optional[str] = None  # link to client
    tags: Optional[List[str]] = None

class TaskEnhanced(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    workspace_id: str
    user_id: str
    title: str
    description: Optional[str] = None
    priority: str = "medium"  # low, medium, high, urgent
    status: str = "pending"  # pending, completed, cancelled
    stage: str = "todo"  # todo, in_progress, review, done
    due_date: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    assigned_to: Optional[str] = None
    client_id: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    attachments: List[dict] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

# Notification Model
class Notification(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    workspace_id: str
    user_id: str
    title: str
    message: str
    type: str  # info, warning, success, error
    read: bool = False
    action_url: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Automation Model
class AutomationCreate(BaseModel):
    name: str
    trigger_type: str  # task_created, client_added, date, etc
    trigger_config: dict
    action_type: str  # send_email, send_whatsapp, create_task, etc
    action_config: dict
    enabled: bool = True

class Automation(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    workspace_id: str
    user_id: str
    name: str
    description: Optional[str] = None
    trigger_type: str
    trigger_config: dict
    action_type: str
    action_config: dict
    enabled: bool = True
    last_run: Optional[datetime] = None
    run_count: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)
