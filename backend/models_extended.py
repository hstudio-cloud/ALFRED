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


class FinancialCategoryCreate(BaseModel):
    name: str
    kind: str = "expense"  # income, expense, both
    color: str = "#06b6d4"
    icon: Optional[str] = None
    account_scope: str = "both"  # personal, business, both


class FinancialCategoryUpdate(BaseModel):
    name: Optional[str] = None
    kind: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    account_scope: Optional[str] = None
    active: Optional[bool] = None


class FinancialCategory(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    workspace_id: str
    user_id: str
    name: str
    kind: str = "expense"
    color: str = "#06b6d4"
    icon: Optional[str] = None
    account_scope: str = "both"
    active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class FinancialAccountCreate(BaseModel):
    name: str
    institution: Optional[str] = None
    account_type: str = "checking"  # checking, savings, cash, wallet, investment
    account_scope: str = "personal"  # personal, business
    initial_balance: float = 0.0
    color: str = "#b91c1c"
    active: bool = True


class FinancialAccountUpdate(BaseModel):
    name: Optional[str] = None
    institution: Optional[str] = None
    account_type: Optional[str] = None
    account_scope: Optional[str] = None
    initial_balance: Optional[float] = None
    color: Optional[str] = None
    active: Optional[bool] = None


class FinancialAccount(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    workspace_id: str
    user_id: str
    name: str
    institution: Optional[str] = None
    account_type: str = "checking"
    account_scope: str = "personal"
    initial_balance: float = 0.0
    color: str = "#b91c1c"
    active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class CreditCardCreate(BaseModel):
    name: str
    institution: Optional[str] = None
    brand: Optional[str] = None
    account_scope: str = "personal"
    limit_amount: float = 0.0
    closing_day: int = 1
    due_day: int = 10
    color: str = "#ef4444"
    linked_account_id: Optional[str] = None
    active: bool = True


class CreditCardUpdate(BaseModel):
    name: Optional[str] = None
    institution: Optional[str] = None
    brand: Optional[str] = None
    account_scope: Optional[str] = None
    limit_amount: Optional[float] = None
    closing_day: Optional[int] = None
    due_day: Optional[int] = None
    color: Optional[str] = None
    linked_account_id: Optional[str] = None
    active: Optional[bool] = None


class CreditCard(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    workspace_id: str
    user_id: str
    name: str
    institution: Optional[str] = None
    brand: Optional[str] = None
    account_scope: str = "personal"
    limit_amount: float = 0.0
    closing_day: int = 1
    due_day: int = 10
    color: str = "#ef4444"
    linked_account_id: Optional[str] = None
    active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class BillCreate(BaseModel):
    title: str
    amount: float
    type: str  # payable, receivable
    due_date: datetime
    category: str
    payment_method: str = "other"
    account_scope: str = "business"
    description: Optional[str] = None
    client_name: Optional[str] = None
    recurring: bool = False
    recurrence_rule: Optional[str] = None


class BillUpdate(BaseModel):
    title: Optional[str] = None
    amount: Optional[float] = None
    type: Optional[str] = None
    due_date: Optional[datetime] = None
    category: Optional[str] = None
    payment_method: Optional[str] = None
    account_scope: Optional[str] = None
    description: Optional[str] = None
    client_name: Optional[str] = None
    status: Optional[str] = None
    recurring: Optional[bool] = None
    recurrence_rule: Optional[str] = None


class Bill(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    workspace_id: str
    user_id: str
    title: str
    amount: float
    type: str  # payable, receivable
    due_date: datetime
    category: str
    payment_method: str = "other"
    account_scope: str = "business"
    description: Optional[str] = None
    client_name: Optional[str] = None
    status: str = "pending"  # pending, paid, received, overdue, cancelled
    recurring: bool = False
    recurrence_rule: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class ReminderFinancialCreate(BaseModel):
    title: str
    remind_at: datetime
    description: Optional[str] = None
    linked_type: Optional[str] = None  # bill, transaction, report
    linked_id: Optional[str] = None


class ReminderFinancialUpdate(BaseModel):
    title: Optional[str] = None
    remind_at: Optional[datetime] = None
    description: Optional[str] = None
    linked_type: Optional[str] = None
    linked_id: Optional[str] = None
    is_active: Optional[bool] = None


class ReminderFinancial(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    workspace_id: str
    user_id: str
    title: str
    remind_at: datetime
    description: Optional[str] = None
    linked_type: Optional[str] = None
    linked_id: Optional[str] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class SaasSubscriptionUpdate(BaseModel):
    plan_name: Optional[str] = None
    status: Optional[str] = None
    billing_cycle: Optional[str] = None  # monthly, yearly
    price: Optional[float] = None
    trial_ends_at: Optional[datetime] = None
    features: Optional[List[str]] = None


class SaasSubscription(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    workspace_id: str
    plan_name: str = "Starter"
    status: str = "trial"
    billing_cycle: str = "monthly"
    price: float = 0.0
    trial_ends_at: Optional[datetime] = None
    features: List[str] = Field(default_factory=lambda: [
        "Dashboard financeiro",
        "Receitas e despesas",
        "Contas e lembretes",
        "Relatórios"
    ])
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class AutomationInsight(BaseModel):
    label: str
    message: str
    severity: str = "info"  # info, warning, success


class StatementImport(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    workspace_id: str
    user_id: str
    file_name: str
    file_type: str
    status: str = "parsed"  # parsed, pending_manual_review, failed
    account_scope: str = "general"
    row_count: int = 0
    preview_rows: List[dict] = Field(default_factory=list)
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class EmployeeCreate(BaseModel):
    name: str
    cpf: str
    role: str
    salary: float
    employee_type: str = "clt"  # clt, contract
    payment_cycle: str = "monthly"  # monthly, biweekly
    inss_percent: Optional[float] = None
    admission_date: Optional[str] = None
    termination_date: Optional[str] = None
    dependents_count: Optional[int] = 0
    salary_family_amount: Optional[float] = 0.0
    active: bool = True
    notes: Optional[str] = None


class EmployeeUpdate(BaseModel):
    name: Optional[str] = None
    cpf: Optional[str] = None
    role: Optional[str] = None
    salary: Optional[float] = None
    employee_type: Optional[str] = None
    payment_cycle: Optional[str] = None
    inss_percent: Optional[float] = None
    admission_date: Optional[str] = None
    termination_date: Optional[str] = None
    dependents_count: Optional[int] = None
    salary_family_amount: Optional[float] = None
    active: Optional[bool] = None
    notes: Optional[str] = None


class Employee(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    workspace_id: str
    user_id: str
    name: str
    cpf: str
    role: str
    salary: float
    employee_type: str = "clt"  # clt, contract
    payment_cycle: str = "monthly"  # monthly, biweekly
    inss_percent: float = 0.0
    admission_date: Optional[str] = None
    termination_date: Optional[str] = None
    dependents_count: int = 0
    salary_family_amount: float = 0.0
    active: bool = True
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class AttendanceRecordCreate(BaseModel):
    employee_id: str
    date: datetime
    status: str = "present"  # present, absent
    notes: Optional[str] = None


class AttendanceRecordUpdate(BaseModel):
    date: Optional[datetime] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class AttendanceRecord(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    workspace_id: str
    user_id: str
    employee_id: str
    date: datetime
    status: str = "present"  # present, absent
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
