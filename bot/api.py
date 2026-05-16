from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import requests
import hmac
import hashlib
import json
from config import NOWPAYMENTS_API_KEY, NOWPAYMENTS_IPN_SECRET
from database import db

app = FastAPI()

# Enable CORS for the WebApp
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

NOWPAYMENTS_API_URL = "https://api.nowpayments.io/v1"

@app.get("/")
async def root():
    return {"status": "AI Store API is running"}

@app.post("/create-payment")
async def create_payment(data: dict):
    """
    Creates a payment request via NOWPayments.
    Expected data: { "amount": 19.99, "currency": "usd", "pay_currency": "ton", "order_id": "123", "order_description": "ChatGPT Pro" }
    """
    headers = {
        "x-api-key": NOWPAYMENTS_API_KEY,
        "Content-Type": "application/json"
    }
    
    payload = {
        "price_amount": data.get("amount"),
        "price_currency": "usd",
        "pay_currency": data.get("pay_currency", "ton"),
        "order_id": data.get("order_id"),
        "order_description": data.get("order_description"),
        "ipn_callback_url": "https://your-api-domain.com/ipn" # Replace with your live API URL
    }
    
    response = requests.post(f"{NOWPAYMENTS_API_URL}/payment", headers=headers, json=payload)
    return response.json()

@app.post("/ipn")
async def nowpayments_ipn(request: Request):
    """
    Handles Instant Payment Notifications (IPN) from NOWPayments.
    Verifies the signature to ensure authenticity.
    """
    # Get the NOWPayments signature from headers
    signature = request.headers.get("x-nowpayments-sig")
    if not signature:
        raise HTTPException(status_code=400, detail="Missing signature")
    
    # Get raw body
    body = await request.body()
    
    # Verify HMAC signature
    # NOWPayments sorts the JSON keys alphabetically for signing
    data = json.loads(body)
    sorted_data = json.dumps(data, sort_keys=True, separators=(',', ':'))
    
    hmac_check = hmac.new(
        key=NOWPAYMENTS_IPN_SECRET.encode(),
        msg=sorted_data.encode(),
        digestmod=hashlib.sha512
    ).hexdigest()
    
    if hmac_check != signature:
        raise HTTPException(status_code=401, detail="Invalid signature")
    
    # Handle the payment status
    payment_status = data.get("payment_status")
    order_id = data.get("order_id")
    
    if payment_status == "finished":
        # Update order in DB
        print(f"Payment SUCCESS for Order {order_id}")
        # await db.update_order_status(order_id, "Delivered")
    
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
