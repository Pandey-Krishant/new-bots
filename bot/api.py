from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import requests
from config import ADMIN_BOT_TOKEN, ADMIN_CHAT_ID, NOWPAYMENTS_API_KEY
from database import Database
import uvicorn

app = FastAPI()
db = Database()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

def send_admin_alert(message: str):
    url = f"https://api.telegram.org/bot{ADMIN_BOT_TOKEN}/sendMessage"
    payload = {"chat_id": ADMIN_CHAT_ID, "text": message, "parse_mode": "HTML"}
    try:
        requests.post(url, json=payload)
    except Exception as e:
        print(f"Admin Alert Failed: {e}")

@app.get("/plans")
async def get_plans():
    plans = await db.get_all_plans()
    for p in plans:
        p["_id"] = str(p["_id"])
    return plans

@app.post("/add-plan")
async def add_plan(data: dict):
    await db.add_plan(
        name=data.get('name'),
        price=data.get('price'),
        description=data.get('description'),
        image_url=data.get('image_url')
    )
    send_admin_alert(f"🚀 <b>New Product Added via Frontend!</b>\nName: {data.get('name')}\nPrice: ${data.get('price')}")
    return {"status": "ok"}

@app.post("/update-plan")
async def update_plan(data: dict):
    await db.update_plan(
        plan_id=data.get('id'),
        name=data.get('name'),
        price=data.get('price'),
        description=data.get('description'),
        image_url=data.get('image_url')
    )
    send_admin_alert(f"📝 <b>Product Updated via Frontend!</b>\nName: {data.get('name')}")
    return {"status": "ok"}

@app.post("/delete-plan")
async def delete_plan(data: dict):
    await db.delete_plan(name=data.get('name'))
    send_admin_alert(f"🗑 <b>Product Deleted via Frontend!</b>\nName: {data.get('name')}")
    return {"status": "ok"}

@app.post("/create-invoice")
async def create_invoice(data: dict):
    target_url = f"https://nowpayments.io/payment/?api_key={NOWPAYMENTS_API_KEY}&amount={data.get('price')}&currency=usd"
    return {"url": target_url}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
