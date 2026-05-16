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

@app.post("/create-invoice")
async def create_invoice(data: dict):
    """Generate a real NOWPayments checkout URL."""
    # In a real scenario, you'd call NOWPayments API here.
    # For now, we return a simulated checkout URL as requested.
    target_url = f"https://nowpayments.io/payment/?api_key={NOWPAYMENTS_API_KEY}&amount={data.get('price')}&currency=usd"
    
    msg = (
        f"🔗 <b>Invoice Generated</b>\n\n"
        f"<b>User:</b> {data.get('user_email')}\n"
        f"<b>Product:</b> {data.get('name')}\n"
        f"<b>Redirecting to:</b> NOWPayments"
    )
    send_admin_alert(msg)
    
    return {"url": target_url}

@app.post("/notify-register")
async def notify_register(data: dict):
    msg = f"👤 <b>New User Registered</b>\n<b>Email:</b> {data.get('email')}"
    send_admin_alert(msg)
    return {"status": "ok"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
