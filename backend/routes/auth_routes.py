from fastapi import APIRouter, HTTPException, Depends, Header
from typing import Optional
from models import UserCreate, UserLogin, UserResponse, User
from auth import get_password_hash, verify_password, create_access_token, verify_token
from database import users_collection
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/auth", tags=["auth"])

async def get_current_user(authorization: Optional[str] = Header(None)) -> dict:
    """Dependency to get current user from JWT token"""
    if not authorization:
        raise HTTPException(status_code=401, detail="Não autenticado")
    
    try:
        token = authorization.replace("Bearer ", "")
        payload = verify_token(token)
        if not payload:
            raise HTTPException(status_code=401, detail="Token inválido")
        
        user = await users_collection.find_one({"id": payload.get("sub")})
        if not user:
            raise HTTPException(status_code=404, detail="Usuário não encontrado")
        
        return user
    except Exception as e:
        logger.error(f"Error getting current user: {e}")
        raise HTTPException(status_code=401, detail="Não autenticado")

@router.post("/register", response_model=dict)
async def register(user_data: UserCreate):
    """Registrar novo usuário"""
    try:
        # Check if user already exists
        existing_user = await users_collection.find_one({"email": user_data.email})
        if existing_user:
            raise HTTPException(status_code=400, detail="Email já cadastrado")
        
        # Create new user
        user = User(
            email=user_data.email,
            password=get_password_hash(user_data.password),
            name=user_data.name,
            role="user"
        )
        
        await users_collection.insert_one(user.dict())
        
        # Create token
        token = create_access_token(data={"sub": user.id, "email": user.email})
        
        return {
            "token": token,
            "user": UserResponse(
                id=user.id,
                email=user.email,
                name=user.name,
                role=user.role,
                created_at=user.created_at
            )
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error registering user: {e}")
        raise HTTPException(status_code=500, detail="Erro ao registrar usuário")

@router.post("/login", response_model=dict)
async def login(credentials: UserLogin):
    """Login de usuário"""
    try:
        # Find user
        user = await users_collection.find_one({"email": credentials.email})
        if not user:
            raise HTTPException(status_code=401, detail="Email ou senha incorretos")
        
        # Verify password
        if not verify_password(credentials.password, user["password"]):
            raise HTTPException(status_code=401, detail="Email ou senha incorretos")
        
        # Create token
        token = create_access_token(data={"sub": user["id"], "email": user["email"]})
        
        return {
            "token": token,
            "user": UserResponse(
                id=user["id"],
                email=user["email"],
                name=user["name"],
                role=user["role"],
                created_at=user["created_at"]
            )
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error logging in: {e}")
        raise HTTPException(status_code=500, detail="Erro ao fazer login")

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    """Obter usuário atual"""
    return UserResponse(
        id=current_user["id"],
        email=current_user["email"],
        name=current_user["name"],
        role=current_user["role"],
        created_at=current_user["created_at"]
    )
