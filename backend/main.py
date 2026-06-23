import core.env  # noqa: F401 — load backend/.env before reading os.environ

import os

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from core.auth import AUTH_BYPASS, AUTH_BYPASS_TOKEN, get_current_user
from core.config import validate_security_config
from core.limiter import limiter
from routers import inventory, ledger, purchase, purchase_orders, sales
from routers import delivery, auth, masters
import uvicorn

validate_security_config()

_DEFAULT_CORS_ORIGINS = (
    "http://localhost:5173,"
    "http://127.0.0.1:5173,"
    "https://erp.yorapac.com"
)

CORS_ORIGINS = [
    origin.strip()
    for origin in os.environ.get("CORS_ORIGINS", _DEFAULT_CORS_ORIGINS).split(",")
    if origin.strip()
]

app = FastAPI()
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

if AUTH_BYPASS:
    print(
        f"[AUTH] Postman bypass ENABLED — use Bearer token: {AUTH_BYPASS_TOKEN}"
    )

require_auth = [Depends(get_current_user)]

# Inventory Routes
app.include_router(
    inventory.router,
    prefix="/inventory",
    tags=["inventory"],
    dependencies=require_auth,
)
app.include_router(
    ledger.router,
    prefix="/ledger",
    tags=["ledger"],
    dependencies=require_auth,
)
app.include_router(
    masters.router,
    prefix="/masters",
    tags=["masters"],
    dependencies=require_auth,
)
app.include_router(
    purchase.router,
    prefix="/purchases",
    tags=["purchases"],
    dependencies=require_auth,
)
app.include_router(
    purchase_orders.router,
    prefix="/purchase-orders",
    tags=["purchase-orders"],
    dependencies=require_auth,
)
app.include_router(
    sales.router,
    prefix="/sales",
    tags=["sales"],
    dependencies=require_auth,
)
app.include_router(
    delivery.router,
    prefix="/delivery",
    tags=["delivery"],
    dependencies=require_auth,
)
app.include_router(auth.router, prefix="/auth", tags=["auth"])

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", dependencies=require_auth)
async def root():
    return {"message": "Hello World"}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)
