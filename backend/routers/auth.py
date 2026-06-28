from fastapi import APIRouter, Depends, Form, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from core.auth import AUTH_BYPASS, create_access_token, get_current_user
from core.config import IS_PRODUCTION
from core.dependencies import engine_mysql
from core.limiter import limiter
from core.login_guard import check_login_allowed, clear_failed_logins, record_failed_login
from core.passwords import hash_password, is_legacy_hash, verify_password

router = APIRouter()

_LOGIN_ERROR = "Invalid user ID or password."
_LOGIN_RATE = "10/minute"


class LoginJson(BaseModel):
    user_id: str
    password: str


def _login_success(row) -> dict:
    access_token = create_access_token(row["user_id"], row["name"])
    return {
        "status": "success",
        "message": "Login successful.",
        "data": {
            "user_id": row["user_id"],
            "name": row["name"],
            "email": row["email"],
            "phone": row["phone"],
            "profile_pic": row["profile_pic"],
            "access_token": access_token,
            "token_type": "bearer",
        },
    }


def _upgrade_password_hash(connection, user_id: str, password: str) -> None:
    connection.execute(
        text(
            """
            UPDATE yora_users
            SET password_hash = :password_hash
            WHERE user_id = :user_id
            """
        ),
        {"user_id": user_id, "password_hash": hash_password(password)},
    )


def _authenticate(user_id: str, password: str):
    user_id = user_id.strip()

    if not user_id:
        return {"status": "error", "message": "User ID is required."}

    if not password:
        return {"status": "error", "message": "Password is required."}

    lock_message = check_login_allowed(user_id)
    if lock_message:
        return {"status": "error", "message": lock_message}

    sql = text(
        """
        SELECT user_id, password_hash, name, email, phone, profile_pic, is_active
        FROM yora_users
        WHERE user_id = :user_id
        LIMIT 1
        """
    )

    try:
        with engine_mysql.begin() as connection:
            row = connection.execute(sql, {"user_id": user_id}).mappings().first()

            if (
                not row
                or not row["is_active"]
                or not verify_password(password, row["password_hash"])
            ):
                record_failed_login(user_id)
                return {"status": "error", "message": _LOGIN_ERROR}

            if is_legacy_hash(row["password_hash"]):
                _upgrade_password_hash(connection, user_id, password)

            clear_failed_logins(user_id)
            return _login_success(row)
    except SQLAlchemyError:
        return {
            "status": "error",
            "message": "Unable to verify login. Please try again later.",
        }


@router.post("/login")
@limiter.limit(_LOGIN_RATE)
def login(
    request: Request,
    user_id: str = Form(""),
    password: str = Form(""),
):
    return _authenticate(user_id, password)


@router.post("/login/json")
@limiter.limit(_LOGIN_RATE)
def login_json(request: Request, body: LoginJson):
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
    if IS_PRODUCTION:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Not found",
        )

    return {
        "status": "success",
        "message": "Postman setup guide",
        "data": {
            "login_form": "POST /auth/login — Body: form-data → user_id, password",
            "login_json": 'POST /auth/login/json — Body: raw JSON → {"user_id":"<id>","password":"<password>"}',
            "verify_token": "GET /auth/me — Authorization: Bearer <access_token>",
            "protected_endpoints": "Use form-data (not raw JSON) for /sales, /purchases, etc.",
            "bearer_token": "Copy only access_token from login response — do not add 'Bearer' in the token field",
            "dev_bypass_enabled": AUTH_BYPASS,
            "important": (
                "Login via POST /auth/login/json, copy data.access_token "
                "(starts with eyJ...), and use it as the Bearer token."
            ),
            "dev_bypass_hint": (
                "Optional local shortcut only — start server with AUTH_BYPASS=true "
                "and YORA_ENV=development, then use the AUTH_BYPASS_TOKEN value."
                if AUTH_BYPASS
                else "Bypass is OFF. Login first to get a JWT access_token."
            ),
        },
    }
