import os

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.auth import get_current_user
from routers import inventory, ledger, purchase, sales
from routers import delivery, auth
import uvicorn

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
    purchase.router,
    prefix="/purchases",
    tags=["purchases"],
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
