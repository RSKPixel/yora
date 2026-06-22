import core.env  # noqa: F401

import hmac
import os
from datetime import datetime, timedelta, timezone
from typing import Optional

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

JWT_SECRET = os.environ.get("JWT_SECRET", "yora-dev-jwt-secret-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_HOURS = int(os.environ.get("JWT_EXPIRE_HOURS", "24"))

# Dev/Postman only — set AUTH_BYPASS=true locally; never in production
AUTH_BYPASS = os.environ.get("AUTH_BYPASS", "").lower() == "true"
AUTH_BYPASS_TOKEN = os.environ.get("AUTH_BYPASS_TOKEN", "yora-postman-local")
AUTH_BYPASS_USER_ID = os.environ.get("AUTH_BYPASS_USER_ID", "postman")
AUTH_BYPASS_USER_NAME = os.environ.get("AUTH_BYPASS_USER_NAME", "Postman Test")

security = HTTPBearer(auto_error=False)


def _normalize_bearer_token(token: str) -> str:
    """Accept raw JWT or values pasted as 'Bearer <token>' from Postman."""
    token = token.strip()
    if token.lower().startswith("bearer "):
        token = token[7:].strip()
    return token


def _bypass_user() -> dict:
    return {
        "user_id": AUTH_BYPASS_USER_ID,
        "name": AUTH_BYPASS_USER_NAME,
    }


def _is_bypass_token(token: str) -> bool:
    return AUTH_BYPASS and hmac.compare_digest(token, AUTH_BYPASS_TOKEN)


def create_access_token(user_id: str, name: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRE_HOURS)
    payload = {
        "sub": user_id,
        "name": name,
        "exp": expire,
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> dict:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = _normalize_bearer_token(credentials.credentials)

    if _is_bypass_token(token):
        return _bypass_user()

    if not AUTH_BYPASS and hmac.compare_digest(token, AUTH_BYPASS_TOKEN):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=(
                "Dev bypass token rejected (AUTH_BYPASS is off). "
                "Login via POST /auth/login/json and use data.access_token as Bearer."
            ),
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc
    except jwt.InvalidTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return {
        "user_id": user_id,
        "name": payload.get("name", user_id),
    }
