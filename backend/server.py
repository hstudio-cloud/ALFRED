from fastapi import FastAPI, APIRouter, Request, Response
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import re
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List
import uuid
from datetime import datetime, timezone
from contextlib import asynccontextmanager  # Adicionado para gerenciar o Lifespan

# Import routes
from routes import (
    accounts_routes,
    assistant_routes,
    auth_routes,
    task_routes,
    chat_routes,
    dashboard_routes,
    finance_hub_routes,
    habit_routes,
    payroll_routes,
    finance_routes,
    reports_routes,
    transactions_routes,
    whatsapp_routes,
    workspace_routes,
    client_routes,
    tasks_enhanced_routes,
)
from database import users_collection
from auth import get_password_hash
from models import User

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# MongoDB connection
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


# --- NOVO GERENCIADOR DE LIFESPAN ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database with admin user and default workspace on startup, and close DB on shutdown."""
    logger.info("Starting Nano API...")

    # Create admin user if not exists
    admin_email = "admin@alfred.com"
    existing_admin = await users_collection.find_one({"email": admin_email})

    if not existing_admin:
        admin_user = User(
            email=admin_email,
            password=get_password_hash("Admin@123456"),
            name="Admin",
            role="admin",
        )
        await users_collection.insert_one(admin_user.dict())
        logger.info(f"✅ Admin user created: {admin_email} / Admin@123456")

        # Create default workspace for admin
        from models_extended import Workspace

        default_workspace = Workspace(
            name="Minha Empresa",
            subdomain="default",
            description="Workspace padrão",
            owner_id=admin_user.id,
            members=[admin_user.id],
        )
        await db.workspaces.insert_one(default_workspace.dict())
        logger.info(f"✅ Default workspace created for admin")
    else:
        logger.info("ℹ️  Admin user already exists")

    # A aplicação roda enquanto está pausada neste yield
    yield

    # --- LÓGICA DE SHUTDOWN (Após o yield) ---
    client.close()
    logger.info("Nano API shutdown")


# Create the main app sem prefixo, injetando o lifespan
app = FastAPI(title="Nano API", version="1.0.0", lifespan=lifespan)

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class StatusCheckCreate(BaseModel):
    client_name: str


# Add your routes to the router
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
    _ = await db.status_checks.insert_one(doc)
    return status_obj


@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    for check in status_checks:
        if isinstance(check["timestamp"], str):
            check["timestamp"] = datetime.fromisoformat(check["timestamp"])
    return status_checks


# Include the router in the main app
app.include_router(api_router)

# Include all feature routers
app.include_router(auth_routes.router)
app.include_router(workspace_routes.router)
app.include_router(client_routes.router)
app.include_router(task_routes.router)
app.include_router(tasks_enhanced_routes.router)
app.include_router(chat_routes.router)
app.include_router(assistant_routes.router)
app.include_router(dashboard_routes.router)
app.include_router(habit_routes.router)
app.include_router(payroll_routes.router)
app.include_router(finance_routes.router)
app.include_router(finance_hub_routes.router)
app.include_router(accounts_routes.router)
app.include_router(transactions_routes.router)
app.include_router(reports_routes.router)
app.include_router(whatsapp_routes.router)

# CORS configuration:
# - Keep explicit allowlist via CORS_ORIGINS for fixed domains.
# - Support Vercel preview deployments for this frontend project via regex.
cors_allow_all = os.environ.get("CORS_ALLOW_ALL", "true").strip().lower() == "true"
cors_origins = [
    origin.strip()
    for origin in os.environ.get("CORS_ORIGINS", "").split(",")
    if origin.strip()
]
if not cors_origins:
    cors_origins = [
        "http://localhost:3000",
        "https://frontend-six-woad-fz102b0vy8.vercel.app",
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
    """
    Defensive CORS layer:
    - answers OPTIONS preflight even if another layer fails;
    - ensures CORS headers are present on error responses as well.
    """
    origin = request.headers.get("origin", "")

    if request.method == "OPTIONS":
        # Return explicit preflight response for browser CORS checks.
        return _attach_cors_headers(Response(status_code=200), origin)

    response = await call_next(request)
    return _attach_cors_headers(response, origin)

if cors_allow_all:
    # Beta mode: liberamos CORS geral para evitar bloqueio em previews do Vercel.
    # Authorization via Bearer header continua exigida em todas as rotas protegidas.
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
