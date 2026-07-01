import json
import re
from typing import Optional, Tuple

from fastapi import APIRouter, Depends, Form
from sqlalchemy import text

from core.auth import get_current_user
from core.dependencies import engine_mysql
from core.passwords import hash_password, verify_password
from services.nav_menu import ensure_nav_menu_defaults

router = APIRouter()

QUICK_ACCESS_KEY = "quick_access"
MAX_PROFILE_PIC_BYTES = 1_048_576
_EMAIL_PATTERN = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
_PROFILE_PIC_PATTERN = re.compile(r"^data:image/(jpeg|jpg|png|webp);base64,", re.IGNORECASE)

DEFAULT_QUICK_ACCESS_PATHS = [
    "/transactions/purchase-order",
    "/transactions/purchase",
    "/transactions/sales",
    "/reports/stockposition",
]

MENU_STYLE_MODERN = "modern"
MENU_STYLE_LINUX_TREE = "linux_tree"
MENU_STYLE_VALUES = {MENU_STYLE_MODERN, MENU_STYLE_LINUX_TREE}

ROOT_FONT_SIZE_MIN = 15.0
ROOT_FONT_SIZE_MAX = 18.0
ROOT_FONT_SIZE_DEFAULT = 17.0
ROOT_FONT_SIZE_STEP = 0.5

DEFAULT_USER_PREFERENCES = {
    "menu_style": MENU_STYLE_MODERN,
    "root_font_size": ROOT_FONT_SIZE_DEFAULT,
    "dashboard_quick_access_visible": True,
    "dashboard_search_visible": True,
}


def _normalize_paths(raw) -> list[str]:
    if isinstance(raw, str):
        try:
            raw = json.loads(raw)
        except json.JSONDecodeError:
            return []

    if not isinstance(raw, list):
        return []

    return [
        path.strip()
        for path in raw
        if isinstance(path, str) and path.strip().startswith("/")
    ]


def _fetch_quick_access_paths(connection) -> list[str]:
    row = (
        connection.execute(
            text(
                """
                SELECT setting_value
                FROM yora_settings
                WHERE setting_key = :setting_key
                """
            ),
            {"setting_key": QUICK_ACCESS_KEY},
        )
        .mappings()
        .first()
    )

    if not row:
        return []

    paths = _normalize_paths(row["setting_value"])
    return paths


RETIRED_QUICK_ACCESS_PATHS = {"/masters/inventory", "/masters/ledger"}


def _ensure_quick_access_defaults(connection) -> list[str]:
    paths = _fetch_quick_access_paths(connection)
    if paths:
        cleaned = [path for path in paths if path not in RETIRED_QUICK_ACCESS_PATHS]
        if cleaned != paths:
            return _save_quick_access_paths(connection, cleaned)
        return paths

    connection.execute(
        text(
            """
            INSERT INTO yora_settings (setting_key, setting_value)
            VALUES (:setting_key, CAST(:setting_value AS JSON))
            """
        ),
        {
            "setting_key": QUICK_ACCESS_KEY,
            "setting_value": json.dumps(DEFAULT_QUICK_ACCESS_PATHS),
        },
    )
    return list(DEFAULT_QUICK_ACCESS_PATHS)


def _save_quick_access_paths(connection, paths: list[str]) -> list[str]:
    normalized = _normalize_paths(paths)

    connection.execute(
        text(
            """
            INSERT INTO yora_settings (setting_key, setting_value)
            VALUES (:setting_key, CAST(:setting_value AS JSON))
            ON DUPLICATE KEY UPDATE
                setting_value = VALUES(setting_value)
            """
        ),
        {
            "setting_key": QUICK_ACCESS_KEY,
            "setting_value": json.dumps(normalized),
        },
    )
    return normalized


def _serialize_profile(row) -> dict:
    return {
        "user_id": row["user_id"],
        "name": row["name"],
        "email": row["email"],
        "phone": row["phone"],
        "profile_pic": row["profile_pic"],
    }


def _fetch_user_profile(connection, user_id: str):
    return (
        connection.execute(
            text(
                """
                SELECT user_id, name, email, phone, profile_pic, password_hash
                FROM yora_users
                WHERE user_id = :user_id AND is_active = 1
                LIMIT 1
                """
            ),
            {"user_id": user_id},
        )
        .mappings()
        .first()
    )


def _validate_email(email: str) -> Optional[str]:
    email = email.strip()
    if not email:
        return None
    if len(email) > 255 or not _EMAIL_PATTERN.match(email):
        return "Enter a valid email address."
    return None


def _validate_phone(phone: str) -> Optional[str]:
    phone = phone.strip()
    if not phone:
        return None
    digits = re.sub(r"\D", "", phone)
    if len(digits) < 7 or len(digits) > 15:
        return "Enter a valid phone number."
    return None


def _validate_name(name: str) -> Optional[str]:
    name = name.strip()
    if not name:
        return "Name is required."
    if len(name) > 100:
        return "Name must be 100 characters or fewer."
    return None


def _validate_profile_pic(profile_pic: str) -> Tuple[Optional[str], Optional[str]]:
    profile_pic = profile_pic.strip()
    if not profile_pic:
        return None, None
    if profile_pic == "__REMOVE__":
        return "", None
    if not _PROFILE_PIC_PATTERN.match(profile_pic):
        return None, "Profile picture must be a JPEG, PNG, or WebP image."
    if len(profile_pic.encode("utf-8")) > MAX_PROFILE_PIC_BYTES:
        return None, "Profile picture must be 1 MB or smaller."
    return profile_pic, None


def _normalize_menu_style(value: Optional[str]) -> str:
    cleaned = (value or MENU_STYLE_MODERN).strip().lower()
    if cleaned not in MENU_STYLE_VALUES:
        return MENU_STYLE_MODERN
    return cleaned


def _normalize_root_font_size(value) -> float:
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        parsed = ROOT_FONT_SIZE_DEFAULT

    stepped = round(parsed / ROOT_FONT_SIZE_STEP) * ROOT_FONT_SIZE_STEP
    return float(min(ROOT_FONT_SIZE_MAX, max(ROOT_FONT_SIZE_MIN, stepped)))


def _normalize_bool(value, default: bool) -> bool:
    if value is None:
        return default
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return bool(value)
    cleaned = str(value).strip().lower()
    if cleaned in {"1", "true", "yes", "on"}:
        return True
    if cleaned in {"0", "false", "no", "off"}:
        return False
    return default


def _serialize_user_preferences(row) -> dict:
    return {
        "menu_style": _normalize_menu_style(row["menu_style"]),
        "root_font_size": _normalize_root_font_size(row["root_font_size"]),
        "dashboard_quick_access_visible": _normalize_bool(
            row["dashboard_quick_access_visible"],
            DEFAULT_USER_PREFERENCES["dashboard_quick_access_visible"],
        ),
        "dashboard_search_visible": _normalize_bool(
            row["dashboard_search_visible"],
            DEFAULT_USER_PREFERENCES["dashboard_search_visible"],
        ),
    }


def _fetch_user_preferences(connection, user_id: str):
    return (
        connection.execute(
            text(
                """
                SELECT
                    menu_style,
                    root_font_size,
                    dashboard_quick_access_visible,
                    dashboard_search_visible
                FROM yora_user_preferences
                WHERE user_id = :user_id
                LIMIT 1
                """
            ),
            {"user_id": user_id},
        )
        .mappings()
        .first()
    )


def _ensure_user_preferences(connection, user_id: str) -> dict:
    row = _fetch_user_preferences(connection, user_id)
    if row:
        return _serialize_user_preferences(row)

    connection.execute(
        text(
            """
            INSERT INTO yora_user_preferences (
                user_id,
                menu_style,
                root_font_size,
                dashboard_quick_access_visible,
                dashboard_search_visible
            )
            VALUES (
                :user_id,
                :menu_style,
                :root_font_size,
                :dashboard_quick_access_visible,
                :dashboard_search_visible
            )
            """
        ),
        {"user_id": user_id, **DEFAULT_USER_PREFERENCES},
    )
    created = _fetch_user_preferences(connection, user_id)
    return _serialize_user_preferences(created)


def _save_user_preferences(connection, user_id: str, updates: dict) -> dict:
    current = _ensure_user_preferences(connection, user_id)
    merged = {**current, **updates}

    connection.execute(
        text(
            """
            INSERT INTO yora_user_preferences (
                user_id,
                menu_style,
                root_font_size,
                dashboard_quick_access_visible,
                dashboard_search_visible
            )
            VALUES (
                :user_id,
                :menu_style,
                :root_font_size,
                :dashboard_quick_access_visible,
                :dashboard_search_visible
            )
            ON DUPLICATE KEY UPDATE
                menu_style = VALUES(menu_style),
                root_font_size = VALUES(root_font_size),
                dashboard_quick_access_visible = VALUES(dashboard_quick_access_visible),
                dashboard_search_visible = VALUES(dashboard_search_visible)
            """
        ),
        {"user_id": user_id, **merged},
    )

    saved = _fetch_user_preferences(connection, user_id)
    return _serialize_user_preferences(saved)


@router.post("/preferences")
def get_preferences(current_user: dict = Depends(get_current_user)):
    try:
        with engine_mysql.begin() as connection:
            preferences = _ensure_user_preferences(connection, current_user["user_id"])

        return {
            "status": "success",
            "message": "User preferences fetched successfully!",
            "data": preferences,
        }
    except Exception as e:
        print(e.args)
        return {
            "status": "error",
            "message": f"Unable to load user preferences: {e}",
            "data": None,
        }


@router.post("/preferences/update")
def update_preferences(
    current_user: dict = Depends(get_current_user),
    menu_style: Optional[str] = Form(None),
    root_font_size: Optional[str] = Form(None),
    dashboard_quick_access_visible: Optional[str] = Form(None),
    dashboard_search_visible: Optional[str] = Form(None),
):
    updates = {}

    if menu_style is not None and menu_style.strip() != "":
        updates["menu_style"] = _normalize_menu_style(menu_style)

    if root_font_size is not None and root_font_size.strip() != "":
        updates["root_font_size"] = _normalize_root_font_size(root_font_size)

    if dashboard_quick_access_visible is not None and dashboard_quick_access_visible.strip() != "":
        updates["dashboard_quick_access_visible"] = _normalize_bool(
            dashboard_quick_access_visible,
            DEFAULT_USER_PREFERENCES["dashboard_quick_access_visible"],
        )

    if dashboard_search_visible is not None and dashboard_search_visible.strip() != "":
        updates["dashboard_search_visible"] = _normalize_bool(
            dashboard_search_visible,
            DEFAULT_USER_PREFERENCES["dashboard_search_visible"],
        )

    if not updates:
        return {
            "status": "error",
            "message": "No preference changes were provided.",
            "data": None,
        }

    try:
        with engine_mysql.begin() as connection:
            saved = _save_user_preferences(connection, current_user["user_id"], updates)

        return {
            "status": "success",
            "message": "User preferences saved successfully!",
            "data": saved,
        }
    except Exception as e:
        print(e.args)
        return {
            "status": "error",
            "message": f"Unable to save user preferences: {e}",
            "data": None,
        }


@router.post("/profile")
def get_profile(current_user: dict = Depends(get_current_user)):
    try:
        with engine_mysql.connect() as connection:
            row = _fetch_user_profile(connection, current_user["user_id"])

        if not row:
            return {
                "status": "error",
                "message": "User profile not found.",
                "data": None,
            }

        return {
            "status": "success",
            "message": "Profile fetched successfully!",
            "data": _serialize_profile(row),
        }
    except Exception as e:
        print(e.args)
        return {
            "status": "error",
            "message": f"Unable to load profile: {e}",
            "data": None,
        }


@router.post("/profile/update")
def update_profile(
    current_user: dict = Depends(get_current_user),
    name: str = Form(""),
    email: str = Form(""),
    phone: str = Form(""),
    profile_pic: str = Form(""),
):
    name_error = _validate_name(name)
    if name_error:
        return {"status": "error", "message": name_error, "data": None}

    email_error = _validate_email(email)
    if email_error:
        return {"status": "error", "message": email_error, "data": None}

    phone_error = _validate_phone(phone)
    if phone_error:
        return {"status": "error", "message": phone_error, "data": None}

    pic_value, pic_error = _validate_profile_pic(profile_pic)
    if pic_error:
        return {"status": "error", "message": pic_error, "data": None}

    normalized_name = name.strip()
    normalized_email = email.strip() or None
    normalized_phone = phone.strip() or None

    try:
        with engine_mysql.begin() as connection:
            row = _fetch_user_profile(connection, current_user["user_id"])
            if not row:
                return {
                    "status": "error",
                    "message": "User profile not found.",
                    "data": None,
                }

            params = {
                "user_id": current_user["user_id"],
                "name": normalized_name,
                "email": normalized_email,
                "phone": normalized_phone,
            }

            if pic_value is not None:
                connection.execute(
                    text(
                        """
                        UPDATE yora_users
                        SET name = :name,
                            email = :email,
                            phone = :phone,
                            profile_pic = :profile_pic
                        WHERE user_id = :user_id
                        """
                    ),
                    {**params, "profile_pic": pic_value or None},
                )
            else:
                connection.execute(
                    text(
                        """
                        UPDATE yora_users
                        SET name = :name,
                            email = :email,
                            phone = :phone
                        WHERE user_id = :user_id
                        """
                    ),
                    params,
                )

            updated = _fetch_user_profile(connection, current_user["user_id"])

        return {
            "status": "success",
            "message": "Profile updated successfully!",
            "data": _serialize_profile(updated),
        }
    except Exception as e:
        print(e.args)
        return {
            "status": "error",
            "message": f"Unable to update profile: {e}",
            "data": None,
        }


@router.post("/profile/password")
def update_password(
    current_user: dict = Depends(get_current_user),
    current_password: str = Form(""),
    new_password: str = Form(""),
):
    if not current_password:
        return {
            "status": "error",
            "message": "Current password is required.",
            "data": None,
        }

    if not new_password:
        return {
            "status": "error",
            "message": "New password is required.",
            "data": None,
        }

    if len(new_password) < 6:
        return {
            "status": "error",
            "message": "New password must be at least 6 characters.",
            "data": None,
        }

    try:
        with engine_mysql.begin() as connection:
            row = _fetch_user_profile(connection, current_user["user_id"])
            if not row:
                return {
                    "status": "error",
                    "message": "User profile not found.",
                    "data": None,
                }

            if not verify_password(current_password, row["password_hash"]):
                return {
                    "status": "error",
                    "message": "Current password is incorrect.",
                    "data": None,
                }

            connection.execute(
                text(
                    """
                    UPDATE yora_users
                    SET password_hash = :password_hash
                    WHERE user_id = :user_id
                    """
                ),
                {
                    "user_id": current_user["user_id"],
                    "password_hash": hash_password(new_password),
                },
            )

        return {
            "status": "success",
            "message": "Password updated successfully!",
            "data": None,
        }
    except Exception as e:
        print(e.args)
        return {
            "status": "error",
            "message": f"Unable to update password: {e}",
            "data": None,
        }


@router.post("/nav-menu")
def get_nav_menu():
    try:
        with engine_mysql.begin() as connection:
            menu = ensure_nav_menu_defaults(connection)

        return {
            "status": "success",
            "message": "Navigation menu fetched successfully!",
            "data": menu,
        }
    except Exception as e:
        print(e.args)
        return {
            "status": "error",
            "message": f"Unable to load navigation menu: {e}",
            "data": None,
        }


@router.post("/quick-access")
def get_quick_access():
    try:
        with engine_mysql.begin() as connection:
            paths = _ensure_quick_access_defaults(connection)

        return {
            "status": "success",
            "message": "Quick access settings fetched successfully!",
            "data": paths,
        }
    except Exception as e:
        print(e.args)
        return {
            "status": "error",
            "message": f"Unable to load quick access settings: {e}",
            "data": None,
        }


@router.post("/quick-access/update")
def update_quick_access(paths: str = Form(...)):
    try:
        parsed = json.loads(paths)
    except json.JSONDecodeError:
        return {
            "status": "error",
            "message": "Invalid quick access payload.",
            "data": None,
        }

    if not isinstance(parsed, list):
        return {
            "status": "error",
            "message": "Quick access must be a list of module paths.",
            "data": None,
        }

    try:
        with engine_mysql.begin() as connection:
            saved_paths = _save_quick_access_paths(connection, parsed)

        return {
            "status": "success",
            "message": "Quick access settings saved successfully!",
            "data": saved_paths,
        }
    except Exception as e:
        print(e.args)
        return {
            "status": "error",
            "message": f"Unable to save quick access settings: {e}",
            "data": None,
        }
