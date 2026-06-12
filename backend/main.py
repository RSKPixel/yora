from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import inventory, ledger, purchase, sales
import uvicorn

app = FastAPI()

# Inventory Routes
app.include_router(inventory.router, prefix="/inventory", tags=["inventory"])
app.include_router(ledger.router, prefix="/ledger", tags=["ledger"])
app.include_router(purchase.router, prefix="/purchases", tags=["purchases"])
app.include_router(sales.router, prefix="/sales", tags=["sales"])

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {"message": "Hello World"}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
