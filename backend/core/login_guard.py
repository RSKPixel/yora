import threading
import time
from typing import Optional

MAX_FAILED_ATTEMPTS = 5
LOCKOUT_SECONDS = 15 * 60

_lock = threading.Lock()
_failed_attempts: dict[str, int] = {}
_locked_until: dict[str, float] = {}


def _prune_locked(now: float) -> None:
    expired = [user_id for user_id, until in _locked_until.items() if until <= now]
    for user_id in expired:
        _locked_until.pop(user_id, None)
        _failed_attempts.pop(user_id, None)


def check_login_allowed(user_id: str) -> Optional[str]:
    key = user_id.strip().lower()
    if not key:
        return None

    now = time.time()
    with _lock:
        _prune_locked(now)
        locked_until = _locked_until.get(key)
        if locked_until and locked_until > now:
            minutes_left = max(1, int((locked_until - now + 59) // 60))
            return (
                "Too many failed login attempts. "
                f"Try again in about {minutes_left} minute(s)."
            )
    return None


def record_failed_login(user_id: str) -> None:
    key = user_id.strip().lower()
    if not key:
        return

    now = time.time()
    with _lock:
        _prune_locked(now)
        attempts = _failed_attempts.get(key, 0) + 1
        _failed_attempts[key] = attempts
        if attempts >= MAX_FAILED_ATTEMPTS:
            _locked_until[key] = now + LOCKOUT_SECONDS


def clear_failed_logins(user_id: str) -> None:
    key = user_id.strip().lower()
    if not key:
        return

    with _lock:
        _failed_attempts.pop(key, None)
        _locked_until.pop(key, None)
