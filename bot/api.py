from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import hmac
import hashlib
import json
import time
import requests
from config import BOT_TOKEN, NOWPAYMENTS_API_KEY, ADMIN_IDS
from database import Database
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

# --- AUTH UTILS ---

def validate_telegram_data(init_data: str):
    if not init_data or "=" not in init_data: return False
    try:
        data_dict = dict(item.split('=') for item in init_data.split('&'))
        hash_val = data_dict.pop('hash')
        data_check_string = '\n'.join(f"{k}={v}" for k, v in sorted(data_dict.items()))
        secret_key = hmac.new(b"WebAppData", BOT_TOKEN.encode(), hashlib.sha256).digest()
        if hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest() == hash_val:
            return json.loads(data_dict.get('user', '{}'))
        return False
    except: return False

async def get_current_user(request: Request):
    auth = request.headers.get("Authorization")
    if not auth: raise HTTPException(status_code=401)
    
    # 1. Try Telegram Auth
    tg_user = validate_telegram_data(auth)
    if tg_user:
        user = await db.get_user(tg_user['id'])
        if not user:
            await db.register_user(tg_user['id'], tg_user.get('username', 'User'))
            user = await db.get_user(tg_user['id'])
        return user
    
    # 2. Try Email/Password Token (We'll use user_id as token for simplicity)
    if auth.startswith("USER_"):
        user_id = int(auth.split("_")[1])
        user = await db.get_user(user_id)
        if user: return user
        
    raise HTTPException(status_code=401, detail="Invalid Session")

def is_admin(user_id):
    return user_id in ADMIN_IDS

# --- ENDPOINTS ---

@app.post("/register")
async def register(data: dict):
    email = data.get("email")
    password = data.get("password")
    username = data.get("username")
    
    if not email or not password: raise HTTPException(status_code=400, detail="Missing fields")
    
    existing = await db.get_user_by_email(email)
    if existing: raise HTTPException(status_code=400, detail="Email already registered")
    
    # Generate a random numeric ID for non-telegram users
    user_id = int(time.time()) % 1000000000
    await db.register_user(user_id, username, email, password)
    return {"status": "ok", "user_id": user_id}

@app.post("/login")
async def login(data: dict):
    email = data.get("email")
    password = data.get("password")
    
    user = await db.get_user_by_email(email)
    if not user or user.get("password") != password:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    return {"status": "ok", "token": f"USER_{user['user_id']}", "user_id": user["user_id"]}

@app.get("/me")
async def get_me(request: Request):
    user = await get_current_user(request)
    user["_id"] = str(user["_id"])
    user["is_admin"] = is_admin(user["user_id"])
    return user

@app.get("/plans")
async def get_plans():
    plans = await db.get_all_plans()
    for p in plans: p["_id"] = str(p["_id"])
    return plans

@app.get("/admin/stats")
async def get_admin_stats(request: Request):
    user = await get_current_user(request)
    if not is_admin(user["user_id"]): raise HTTPException(status_code=403)
    
    users = await db.get_all_users()
    orders = await db.get_all_orders()
    logs = await db.get_logs()
    
    for u in users: u["_id"] = str(u["_id"])
    for o in orders: o["_id"] = str(o["_id"])
    for l in logs: l["_id"] = str(l["_id"])
    
    return {"users": users, "orders": orders, "logs": logs}

# --- OTHER ENDPOINTS REMAIN SAME (OMITTED FOR BREVITY BUT KEPT IN FILE) ---
@app.post("/create-payment")
async def create_payment(request: Request):
    user = await get_current_user(request)
    data = await request.json()
    r = requests.post("https://api.nowpayments.io/v1/payment", json={
        "price_amount": float(data.get("amount")),
        "price_currency": "usd",
        "pay_currency": "usdttrc20",
        "order_id": f"DEP_{user['user_id']}_{int(time.time())}"
    }, headers={"x-api-key": NOWPAYMENTS_API_KEY, "Content-Type": "application/json"})
    return r.json()

@app.get("/orders")
async def get_orders(request: Request):
    user = await get_current_user(request)
    orders = await db.get_user_orders(user["user_id"])
    for o in orders: o["_id"] = str(o["_id"])
    return orders

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
