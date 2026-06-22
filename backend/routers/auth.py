import hashlib
import hmac

from fastapi import APIRouter, Depends, Form
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from core.auth import AUTH_BYPASS, AUTH_BYPASS_TOKEN, create_access_token, get_current_user
from core.dependencies import engine_mysql

router = APIRouter()


class LoginJson(BaseModel):
    user_id: str
    password: str


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def verify_password(password: str, password_hash: str) -> bool:
    return hmac.compare_digest(hash_password(password), password_hash)


def _login_success(row) -> dict:
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


def _authenticate(user_id: str, password: str):
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

    return _login_success(row)


@router.post("/login")
def login(user_id: str = Form(""), password: str = Form("")):
    return _authenticate(user_id, password)


@router.post("/login/json")
def login_json(body: LoginJson):
    """Postman-friendly login using raw JSON body."""
    return _authenticate(body.user_id, body.password)


@router.get("/me")
def me(current_user: dict = Depends(get_current_user)):
    """Use this to verify your Bearer token is working."""
    return {
        "status": "success",
        "message": "Authenticated.",
        "data": current_user,
    }


@router.get("/postman-help")
def postman_help():
    return {
        "status": "success",
        "message": "Postman setup guide",
        "data": {
            "login_form": "POST /auth/login — Body: form-data → user_id, password",
            "login_json": "POST /auth/login/json — Body: raw JSON → {\"user_id\":\"admin\",\"password\":\"admin123\"}",
            "verify_token": "GET /auth/me — Authorization: Bearer <access_token>",
            "protected_endpoints": "Use form-data (not raw JSON) for /sales, /purchases, etc.",
            "bearer_token": "Copy only access_token from login response — do not add 'Bearer' in the token field",
            "dev_bypass_enabled": AUTH_BYPASS,
            "dev_bypass_token": AUTH_BYPASS_TOKEN if AUTH_BYPASS else None,
            "important": (
                "AUTH_BYPASS is optional. Without it: POST /auth/login/json, "
                "copy data.access_token (starts with eyJ...), use as Bearer token."
            ),
            "dev_bypass_hint": (
                f"Optional shortcut only — start server with AUTH_BYPASS=true, "
                f"then Bearer token: {AUTH_BYPASS_TOKEN}"
                if AUTH_BYPASS
                else "Bypass is OFF (normal mode). Login first to get a JWT access_token."
            ),
        },
    }
