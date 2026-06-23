import hashlib
import hmac
import re

import bcrypt

_BCRYPT_PREFIX = "$2"
_LEGACY_SHA256_HEX = re.compile(r"^[a-f0-9]{64}$")


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def is_legacy_hash(password_hash: str) -> bool:
    return bool(_LEGACY_SHA256_HEX.match(password_hash))


def _verify_legacy(password: str, password_hash: str) -> bool:
    digest = hashlib.sha256(password.encode()).hexdigest()
    return hmac.compare_digest(digest, password_hash)


def verify_password(password: str, password_hash: str) -> bool:
    if password_hash.startswith(_BCRYPT_PREFIX):
        try:
            return bcrypt.checkpw(password.encode(), password_hash.encode())
        except ValueError:
            return False
    if is_legacy_hash(password_hash):
        return _verify_legacy(password, password_hash)
    return False
