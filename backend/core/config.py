import core.env  # noqa: F401

import os

YORA_ENV = os.environ.get("YORA_ENV", "development").strip().lower()
IS_PRODUCTION = YORA_ENV == "production"

_DEFAULT_JWT_SECRET = "yora-dev-jwt-secret-change-in-production"
JWT_SECRET = os.environ.get("JWT_SECRET", _DEFAULT_JWT_SECRET)
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_HOURS = int(os.environ.get("JWT_EXPIRE_HOURS", "8"))

AUTH_BYPASS_REQUESTED = os.environ.get("AUTH_BYPASS", "").lower() == "true"
AUTH_BYPASS = AUTH_BYPASS_REQUESTED and not IS_PRODUCTION
AUTH_BYPASS_TOKEN = os.environ.get("AUTH_BYPASS_TOKEN", "yora-postman-local")
AUTH_BYPASS_USER_ID = os.environ.get("AUTH_BYPASS_USER_ID", "postman")
AUTH_BYPASS_USER_NAME = os.environ.get("AUTH_BYPASS_USER_NAME", "Postman Test")


def validate_security_config() -> None:
    if IS_PRODUCTION and JWT_SECRET == _DEFAULT_JWT_SECRET:
        raise RuntimeError(
            "JWT_SECRET must be set to a strong random value when YORA_ENV=production."
        )
    if IS_PRODUCTION and AUTH_BYPASS_REQUESTED:
        raise RuntimeError(
            "AUTH_BYPASS cannot be enabled when YORA_ENV=production."
        )
