from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
from datetime import datetime
import uuid

# User Models
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    created_at: datetime

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    password: str  # hashed
    name: str
    role: str = "user"  # admin or user
    created_at: datetime = Field(default_factory=datetime.utcnow)
    settings: dict = Field(default_factory=lambda: {"notifications": True, "theme": "dark"})

# Task Models
class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    priority: str = "medium"  # low, medium, high
    due_date: Optional[datetime] = None

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[datetime] = None
    status: Optional[str] = None

class Task(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    title: str
    description: Optional[str] = None
    priority: str = "medium"
    status: str = "pending"  # pending, completed
    due_date: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Habit Models
class HabitCreate(BaseModel):
    name: str
    description: Optional[str] = None
    frequency: str = "daily"  # daily, weekly

class HabitUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    frequency: Optional[str] = None

class Habit(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    name: str
    description: Optional[str] = None
    frequency: str = "daily"
    streak: int = 0
    completed_dates: List[datetime] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Project Models
class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None
    deadline: Optional[datetime] = None

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    deadline: Optional[datetime] = None

class Project(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    name: str
    description: Optional[str] = None
    status: str = "active"  # active, completed, archived
    tasks: List[str] = Field(default_factory=list)
    deadline: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Reminder Models
class ReminderCreate(BaseModel):
    title: str
    description: Optional[str] = None
    remind_at: datetime

class ReminderUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    remind_at: Optional[datetime] = None
    is_active: Optional[bool] = None

class Reminder(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    title: str
    description: Optional[str] = None
    remind_at: datetime
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Finance Models
class TransactionCreate(BaseModel):
    type: str  # income, expense
    category: str
    amount: float
    description: Optional[str] = None
    payment_method: str = "other"  # pix, card, boleto, cash, transfer, other
    account_scope: str = "personal"  # personal, business
    date: Optional[datetime] = None

class TransactionUpdate(BaseModel):
    type: Optional[str] = None
    category: Optional[str] = None
    amount: Optional[float] = None
    description: Optional[str] = None
    payment_method: Optional[str] = None
    account_scope: Optional[str] = None
    date: Optional[datetime] = None

class Transaction(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    type: str
    category: str
    amount: float
    description: Optional[str] = None
    payment_method: str = "other"
    account_scope: str = "personal"
    date: datetime = Field(default_factory=datetime.utcnow)
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Chat Models
class ChatMessage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    role: str  # user, assistant
    content: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    metadata: dict = Field(default_factory=dict)

class ChatMessageCreate(BaseModel):
    content: str

# Dashboard Models
class DashboardStats(BaseModel):
    tasks_completed: int
    tasks_pending: int
    habits_active: int
    habits_streak_avg: float
    projects_active: int
    finances_balance: float
    productivity_score: int
