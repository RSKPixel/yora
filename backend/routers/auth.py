import hashlib
import hmac

from fastapi import APIRouter, Form
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from core.auth import create_access_token
from core.dependencies import engine_mysql

router = APIRouter()


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def verify_password(password: str, password_hash: str) -> bool:
    return hmac.compare_digest(hash_password(password), password_hash)


@router.post("/login")
def login(user_id: str = Form(""), password: str = Form("")):
    user_id = user_id.strip()

    if not user_id:
        return {"status": "error", "message": "User ID is required."}

    if not password:
        return {"status": "error", "message": "Password is required."}

    sql = text(
        """
        SELECT user_id, password_hash, name, is_active
        FROM yora_users
        WHERE user_id = :user_id
        LIMIT 1
        """
    )

    try:
        with engine_mysql.connect() as connection:
            row = connection.execute(sql, {"user_id": user_id}).mappings().first()
    except SQLAlchemyError:
        return {
            "status": "error",
            "message": "Unable to verify login. Please try again later.",
        }

    if not row or not verify_password(password, row["password_hash"]):
        return {
            "status": "error",
            "message": "Invalid user ID or password.",
        }

    if not row["is_active"]:
        return {
            "status": "error",
            "message": "This account is inactive.",
        }

    access_token = create_access_token(row["user_id"], row["name"])

    return {
        "status": "success",
        "message": "Login successful.",
        "data": {
            "user_id": row["user_id"],
            "name": row["name"],
            "access_token": access_token,
            "token_type": "bearer",
        },
    }
