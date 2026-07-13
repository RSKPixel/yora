import core.env  # noqa: F401

import os

YORA_ENV = os.environ.get("YORA_ENV", "development").strip().lower()
IS_PRODUCTION = YORA_ENV == "production"

_DEFAULT_JWT_SECRET = "yora-dev-jwt-secret-change-in-production"
JWT_SECRET = os.environ.get("JWT_SECRET", _DEFAULT_JWT_SECRET)
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_HOURS = int(os.environ.get("JWT_EXPIRE_HOURS", "8"))


def validate_security_config() -> None:
    if IS_PRODUCTION and JWT_SECRET == _DEFAULT_JWT_SECRET:
        raise RuntimeError(
            "JWT_SECRET must be set to a strong random value when YORA_ENV=production."
        )
