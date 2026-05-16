from fastapi import FastAPI, Request, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
import hmac
import hashlib
import json
import time
import requests
from config import BOT_TOKEN, NOWPAYMENTS_API_KEY, NOWPAYMENTS_IPN_SECRET, ADMIN_IDS
from database import Database
from bson import ObjectId
import uvicorn
from datetime import datetime

app = FastAPI()
db = Database()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- UTILS ---
def validate_telegram_data(init_data: str):
    if not init_data or init_data in ["null", "undefined", ""]:
        return False
    
    try:
        data_dict = dict(item.split('=') for item in init_data.split('&'))
        hash_val = data_dict.pop('hash')
        data_check_string = '\n'.join(f"{k}={v}" for k, v in sorted(data_dict.items()))
        
        secret_key = hmac.new(b"WebAppData", BOT_TOKEN.encode(), hashlib.sha256).digest()
        calculated_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()
        
        if calculated_hash == hash_val:
            return json.loads(data_dict.get('user', '{}'))
        return False
    except:
        return False

async def get_user_from_request(request: Request):
    auth_header = request.headers.get("Authorization")
    user_data = validate_telegram_data(auth_header)
    
    # If no telegram data, we check for a custom token/login (simulated for browser testing)
    if not user_data:
        # For browser testing, we'll allow a special 'Admin-Token' for now 
        # or require Telegram. In a real app, you'd use JWT here.
        if auth_header == "ADMIN_DEV_BYPASS":
            return {"user_id": ADMIN_IDS[0], "username": "AdminDev"}
        raise HTTPException(status_code=401, detail="Authentication required via Telegram")
    
    user_id = user_data.get('id')
    user = await db.get_user(user_id)
    if not user:
        await db.register_user(user_id, user_data.get('username', 'User'))
        await db.add_log(user_id, "User Registered", f"New user {user_data.get('username')}")
        user = await db.get_user(user_id)
    
    return user

def is_admin(user_id):
    return user_id in ADMIN_IDS

# --- USER ENDPOINTS ---

@app.get("/me")
async def get_me(request: Request):
    user = await get_user_from_request(request)
    user["_id"] = str(user["_id"])
    user["is_admin"] = is_admin(user["user_id"])
    return user

@app.get("/plans")
async def get_plans():
    plans = await db.get_all_plans()
    for p in plans:
        p["_id"] = str(p["_id"])
    return plans

@app.post("/create-payment")
async def create_payment(request: Request):
    user = await get_user_from_request(request)
    data = await request.json()
    amount = data.get("amount")
    
    if not amount or float(amount) < 1:
        raise HTTPException(status_code=400, detail="Min deposit is $1")

    headers = {"x-api-key": NOWPAYMENTS_API_KEY, "Content-Type": "application/json"}
    payload = {
        "price_amount": float(amount),
        "price_currency": "usd",
        "pay_currency": "usdttrc20",
        "ipn_callback_url": f"https://{request.base_url.hostname}/webhook/nowpayments",
        "order_id": f"DEP_{user['user_id']}_{int(time.time())}"
    }
    
    try:
        r = requests.post("https://api.nowpayments.io/v1/payment", json=payload, headers=headers)
        res = r.json()
        await db.add_log(user["user_id"], "Payment Initiated", f"Amount: ${amount}")
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/orders")
async def get_orders(request: Request):
    user = await get_user_from_request(request)
    orders = await db.get_user_orders(user["user_id"])
    for o in orders:
        o["_id"] = str(o["_id"])
    return orders

# --- ADMIN ENDPOINTS (STRICT) ---

@app.get("/admin/stats")
async def get_admin_stats(request: Request):
    user = await get_user_from_request(request)
    if not is_admin(user["user_id"]): raise HTTPException(status_code=403)
    
    users = await db.get_all_users()
    orders = await db.get_all_orders()
    logs = await db.get_logs()
    
    for u in users: u["_id"] = str(u["_id"])
    for o in orders: o["_id"] = str(o["_id"])
    for l in logs: l["_id"] = str(l["_id"])
    
    return {
        "users": users,
        "orders": orders,
        "logs": logs,
        "total_revenue": sum(o["total_price"] for o in orders if o["status"] == "Finished")
    }

@app.post("/admin/add-plan")
async def admin_add_plan(request: Request):
    user = await get_user_from_request(request)
    if not is_admin(user["user_id"]): raise HTTPException(status_code=403)
    data = await request.json()
    await db.add_plan(data.get('name'), data.get('price'), data.get('description'), image_url=data.get('image_url'))
    await db.add_log(user["user_id"], "Plan Added", f"Name: {data.get('name')}")
    return {"status": "ok"}

@app.post("/admin/delete-plan")
async def admin_delete_plan(request: Request):
    user = await get_user_from_request(request)
    if not is_admin(user["user_id"]): raise HTTPException(status_code=403)
    data = await request.json()
    await db.delete_plan(data.get('name'))
    await db.add_log(user["user_id"], "Plan Deleted", f"Name: {data.get('name')}")
    return {"status": "ok"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
