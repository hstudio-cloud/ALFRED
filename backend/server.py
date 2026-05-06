from contextlib import asynccontextmanager
from datetime import datetime, timezone
import logging
import os
from pathlib import Path
import re
from typing import List
import uuid

from dotenv import load_dotenv
from fastapi import APIRouter, FastAPI, Request, Response
from fastapi.responses import JSONResponse
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, ConfigDict, Field
from starlette.middleware.cors import CORSMiddleware

from auth import get_password_hash
from database import users_collection
from models import User
from routes import (
    accounts_routes,
    activities_routes,
    assistant_routes,
    auth_routes,
    billing_routes,
    billing_webhook_routes,
    chat_routes,
    client_routes,
    dashboard_routes,
    finance_hub_routes,
    finance_routes,
    habit_routes,
    nano_ops_routes,
    open_finance_routes,
    payroll_routes,
    reports_routes,
    task_routes,
    tasks_enhanced_routes,
    transactions_routes,
    whatsapp_routes,
    workspace_routes,
)
from services.nano_scheduler_service import NanoSchedulerService

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)
scheduler_service = NanoSchedulerService(
    interval_seconds=int(os.environ.get("NANO_AUTOMATION_INTERVAL_SECONDS", "60"))
)


def _env_flag(name: str, default: str) -> bool:
    return os.environ.get(name, default).strip().lower() == "true"


async def _seed_admin_if_enabled() -> None:
    if not _env_flag("SEED_ADMIN_ENABLED", "false"):
        logger.info("SEED_ADMIN_ENABLED=false, skipping default admin seed")
        return

    admin_email = "admin@alfred.com"
    existing_admin = await users_collection.find_one({"email": admin_email})
    if existing_admin:
        logger.info("Admin user already exists")
        return

    admin_user = User(
        email=admin_email,
        password=get_password_hash("Admin@123456"),
        name="Admin",
        role="admin",
    )
    await users_collection.insert_one(admin_user.dict())
    logger.warning("Default admin user created because SEED_ADMIN_ENABLED=true")

    from models_extended import Workspace

    default_workspace = Workspace(
        name="Minha Empresa",
        subdomain="default",
        description="Workspace padrao",
        owner_id=admin_user.id,
        members=[admin_user.id],
    )
    await db.workspaces.insert_one(default_workspace.dict())
    logger.warning("Default workspace created for seeded admin")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Nano API...")
    await _seed_admin_if_enabled()

    if _env_flag("NANO_AUTOMATION_SCHEDULER_ENABLED", "true"):
        await scheduler_service.start()

    yield

    await scheduler_service.stop()
    client.close()
    logger.info("Nano API shutdown")


app = FastAPI(title="Nano API", version="1.0.0", lifespan=lifespan)
api_router = APIRouter(prefix="/api")


class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class StatusCheckCreate(BaseModel):
    client_name: str


@api_router.get("/")
async def root():
    return {"message": "Nano API is running"}


@api_router.get("/health")
async def health():
    return {"status": "ok", "service": "nano-api"}


@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)
    doc = status_obj.model_dump()
    doc["timestamp"] = doc["timestamp"].isoformat()
    await db.status_checks.insert_one(doc)
    return status_obj


@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    for check in status_checks:
        if isinstance(check["timestamp"], str):
            check["timestamp"] = datetime.fromisoformat(check["timestamp"])
    return status_checks


app.include_router(api_router)
app.include_router(auth_routes.router)
app.include_router(workspace_routes.router)
app.include_router(client_routes.router)
app.include_router(billing_routes.router)
app.include_router(billing_webhook_routes.router)
app.include_router(task_routes.router)
app.include_router(tasks_enhanced_routes.router)
app.include_router(chat_routes.router)
app.include_router(assistant_routes.router)
app.include_router(activities_routes.router)
app.include_router(dashboard_routes.router)
app.include_router(habit_routes.router)
app.include_router(payroll_routes.router)
app.include_router(finance_routes.router)
app.include_router(finance_hub_routes.router)
app.include_router(accounts_routes.router)
app.include_router(transactions_routes.router)
app.include_router(reports_routes.router)
app.include_router(open_finance_routes.router)
app.include_router(whatsapp_routes.router)
app.include_router(nano_ops_routes.router)


cors_allow_all = _env_flag("CORS_ALLOW_ALL", "false")
cors_origins = [
    origin.strip()
    for origin in os.environ.get("CORS_ORIGINS", "").split(",")
    if origin.strip()
]
if not cors_origins:
    cors_origins = [
        "http://localhost:3000",
        "https://seudominio.com.br",
    ]

cors_origin_regex = (
    os.environ.get(
        "CORS_ORIGIN_REGEX",
        r"^https://frontend-[a-z0-9-]+(?:-hstudio-clouds-projects)?\.vercel\.app$",
    ).strip()
    or None
)
compiled_cors_origin_regex = (
    re.compile(cors_origin_regex, re.IGNORECASE) if cors_origin_regex else None
)


def _is_origin_allowed(origin: str) -> bool:
    if not origin:
        return False
    if cors_allow_all:
        return True
    if origin in cors_origins:
        return True
    if compiled_cors_origin_regex and compiled_cors_origin_regex.match(origin):
        return True
    return False


def _attach_cors_headers(response: Response, origin: str) -> Response:
    if not origin or not _is_origin_allowed(origin):
        return response

    response.headers["Access-Control-Allow-Origin"] = "*" if cors_allow_all else origin
    response.headers["Access-Control-Allow-Methods"] = "GET,POST,PUT,PATCH,DELETE,OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "authorization,content-type,x-requested-with"
    response.headers["Access-Control-Expose-Headers"] = "*"
    if not cors_allow_all:
        response.headers["Access-Control-Allow-Credentials"] = "true"
    response.headers["Vary"] = "Origin"
    return response


@app.middleware("http")
async def ensure_cors_headers(request: Request, call_next):
    origin = request.headers.get("origin", "")

    if request.method == "OPTIONS":
        return _attach_cors_headers(Response(status_code=200), origin)

    try:
        response = await call_next(request)
    except Exception as exc:
        logger.exception("Unhandled request error: %s", exc)
        response = JSONResponse(
            status_code=500,
            content={"detail": "Erro interno no servidor"},
        )

    return _attach_cors_headers(response, origin)


if cors_allow_all:
    app.add_middleware(
        CORSMiddleware,
        allow_credentials=False,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["*"],
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_credentials=True,
        allow_origins=cors_origins,
        allow_origin_regex=cors_origin_regex,
        allow_methods=["*"],
        allow_headers=["*"],
    )
