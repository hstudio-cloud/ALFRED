import os
from datetime import datetime, timedelta
from typing import Optional

import bcrypt
from jose import JWTError, jwt
from passlib.context import CryptContext


# JWT_SECRET is the preferred env var name.
# SECRET_KEY is kept for backward compatibility with previous deployments.
SECRET_KEY = (
    os.getenv("JWT_SECRET")
    or os.getenv("JWT_SECRET_KEY")
    or os.getenv("SECRET_KEY")
    or "alfred-secret-key-change-in-production"
)
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 7
pwd_context = CryptContext(schemes=["bcrypt", "pbkdf2_sha256", "argon2"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password hash with legacy compatibility."""
    if not plain_password or not hashed_password:
        return False

    # Prefer native bcrypt for the $2* hashes stored in Mongo.
    # This avoids passlib backend issues with the current bcrypt package.
    if hashed_password.startswith("$2"):
        try:
            return bcrypt.checkpw(
                plain_password.encode("utf-8"),
                hashed_password.encode("utf-8"),
            )
        except Exception:
            pass

    try:
        # Preferred path: passlib handles multiple hash formats used historically.
        if pwd_context.verify(plain_password, hashed_password):
            return True
    except Exception:
        pass

    try:
        # Fallback for legacy pure bcrypt records
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8"),
        )
    except Exception:
        # Last compatibility fallback for very old/plain records.
        return plain_password == hashed_password


def get_password_hash(password: str) -> str:
    """Hash password using native bcrypt for compatibility with stored records."""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def verify_token(token: str) -> Optional[dict]:
    """Verify and decode a JWT token."""
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None
