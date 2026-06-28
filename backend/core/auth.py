import core.env  # noqa: F401

import hmac
from datetime import datetime, timedelta, timezone
from typing import Optional

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from core.config import (
    AUTH_BYPASS,
    AUTH_BYPASS_TOKEN,
    AUTH_BYPASS_USER_ID,
    AUTH_BYPASS_USER_NAME,
    JWT_ALGORITHM,
    JWT_EXPIRE_HOURS,
    JWT_SECRET,
)
from core.dependencies import engine_mysql

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


def fetch_active_user(user_id: str) -> Optional[dict]:
    sql = text(
        """
        SELECT user_id, name, email, phone, profile_pic, is_active
        FROM yora_users
        WHERE user_id = :user_id
        LIMIT 1
        """
    )
    try:
        with engine_mysql.connect() as connection:
            row = connection.execute(sql, {"user_id": user_id}).mappings().first()
    except SQLAlchemyError:
        return None

    if not row or not row["is_active"]:
        return None

    return {
        "user_id": row["user_id"],
        "name": row["name"],
        "email": row["email"],
        "phone": row["phone"],
        "profile_pic": row["profile_pic"],
    }


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

    user = fetch_active_user(user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or inactive account",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user
