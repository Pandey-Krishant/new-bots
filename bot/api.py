from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import requests
import json
from config import NOWPAYMENTS_API_KEY, NOWPAYMENTS_IPN_SECRET

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

NOWPAYMENTS_API_URL = "https://api.nowpayments.io/v1"

@app.post("/create-invoice")
async def create_invoice(data: dict):
    """
    Creates a real NOWPayments Invoice.
    Data: { "amount": 19.99, "order_id": "CH_123", "order_description": "ChatGPT Plus" }
    """
    headers = {
        "x-api-key": NOWPAYMENTS_API_KEY,
        "Content-Type": "application/json"
    }
    
    payload = {
        "price_amount": data.get("amount"),
        "price_currency": "usd",
        "order_id": data.get("order_id"),
        "order_description": data.get("order_description"),
        "ipn_callback_url": "https://your-domain.com/ipn", # Replace with your live domain
        "success_url": "https://new-bots.vercel.app/",
        "cancel_url": "https://new-bots.vercel.app/"
    }
    
    try:
        response = requests.post(f"{NOWPAYMENTS_API_URL}/invoice", headers=headers, json=payload)
        return response.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/ipn")
async def handle_ipn(request: Request):
    # This is where NOWPayments will notify your server when a payment is finished
    # You would then update the user's balance in MongoDB
    body = await request.json()
    print("IPN Received:", body)
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
