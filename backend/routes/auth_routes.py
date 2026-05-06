import logging
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException

from auth import create_access_token, get_password_hash, verify_password, verify_token
from database import users_collection
from models import User, UserCreate, UserLogin, UserResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/auth", tags=["auth"])


def _normalize_email(email: str) -> str:
    return (email or "").strip().lower()


async def get_current_user(authorization: Optional[str] = Header(None)) -> dict:
    """Dependency to resolve the authenticated user from JWT token."""
    if not authorization:
        raise HTTPException(status_code=401, detail="Nao autenticado")

    try:
        token = authorization.replace("Bearer ", "").strip()
        payload = verify_token(token)
        if not payload:
            raise HTTPException(status_code=401, detail="Token invalido")

        user = await users_collection.find_one({"id": payload.get("sub")})
        if not user:
            raise HTTPException(status_code=404, detail="Usuario nao encontrado")

        return user
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Error getting current user: %s", exc)
        raise HTTPException(status_code=401, detail="Nao autenticado")


@router.post("/register", response_model=dict)
async def register(user_data: UserCreate):
    """Register a new user."""
    try:
        normalized_email = _normalize_email(user_data.email)

        existing_user = await users_collection.find_one({"email": normalized_email})
        if existing_user:
            logger.info("Register blocked: email already exists for %s", normalized_email)
            raise HTTPException(status_code=400, detail="Email ja cadastrado")

        user = User(
            email=normalized_email,
            password=get_password_hash(user_data.password),
            name=user_data.name,
            role="user",
        )
        await users_collection.insert_one(user.dict())

        token = create_access_token(data={"sub": user.id, "email": user.email})
        return {
            "token": token,
            "user": UserResponse(
                id=user.id,
                email=user.email,
                name=user.name,
                role=user.role,
                created_at=user.created_at,
            ),
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Error registering user: %s", exc)
        raise HTTPException(status_code=500, detail="Erro ao registrar usuario")


@router.post("/login", response_model=dict)
async def login(credentials: UserLogin):
    """User login with compatibility-safe password verification."""
    try:
        normalized_email = _normalize_email(credentials.email)
        user = await users_collection.find_one({"email": normalized_email})
        if not user:
            logger.info("Login failed: user not found for %s", normalized_email)
            raise HTTPException(status_code=401, detail="Email ou senha incorretos")

        password_ok = verify_password(credentials.password, user.get("password", ""))
        if not password_ok:
            logger.info(
                "Login failed: password mismatch for %s hash_prefix=%s",
                normalized_email,
                (user.get("password", "") or "")[:7],
            )
            raise HTTPException(status_code=401, detail="Email ou senha incorretos")

        logger.info("Login success for %s", normalized_email)

        token = create_access_token(data={"sub": user["id"], "email": user["email"]})
        return {
            "token": token,
            "user": UserResponse(
                id=user["id"],
                email=user["email"],
                name=user["name"],
                role=user.get("role", "user"),
                created_at=user["created_at"],
            ),
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Error logging in: %s", exc)
        raise HTTPException(status_code=500, detail="Erro ao fazer login")


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    """Get current authenticated user."""
    return UserResponse(
        id=current_user["id"],
        email=current_user["email"],
        name=current_user["name"],
        role=current_user.get("role", "user"),
        created_at=current_user["created_at"],
    )
