from fastapi import FastAPI, Request, HTTPException, Response
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import hmac
import hashlib
import json
import time
import requests
import traceback
try:
    from .config import BOT_TOKEN, NOWPAYMENTS_API_KEY, ADMIN_IDS, ADMIN_BOT_TOKEN
    from .database import Database
except ImportError:  # Allow running as a script: `python bot/api.py`
    from config import BOT_TOKEN, NOWPAYMENTS_API_KEY, ADMIN_IDS, ADMIN_BOT_TOKEN
    from database import Database
import uvicorn
from datetime import datetime
import base64
import os
import secrets

app = FastAPI()
db = Database()

# --- ENHANCED CORS FOR VERCEL ---
# --- ERROR LOGGING MIDDLEWARE ---
@app.middleware("http")
async def log_errors(request: Request, call_next):
    try:
        return await call_next(request)
    except Exception as e:
        print(f"UNHANDLED ERROR: {traceback.format_exc()}")
        return JSONResponse(status_code=500, content={"detail": str(e)})

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- AUTH UTILS ---

def validate_telegram_data(init_data: str):
    if not init_data or "=" not in init_data: return False
    if not BOT_TOKEN:
        return False
    try:
        data_dict = dict(item.split('=') for item in init_data.split('&'))
        hash_val = data_dict.pop('hash')
        data_check_string = '\n'.join(f"{k}={v}" for k, v in sorted(data_dict.items()))
        secret_key = hmac.new(b"WebAppData", BOT_TOKEN.encode(), hashlib.sha256).digest()
        if hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest() == hash_val:
            return json.loads(data_dict.get('user', '{}'))
        return False
    except: return False

def _auth_secret() -> bytes:
    # Prefer a dedicated secret; fall back to BOT_TOKEN for convenience.
    secret = os.getenv("AUTH_SECRET") or BOT_TOKEN or "fallback_secret_key_change_in_production"
    return secret.encode()

def _b64url_encode(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).decode().rstrip("=")

def _b64url_decode(txt: str) -> bytes:
    padding = "=" * (-len(txt) % 4)
    return base64.urlsafe_b64decode((txt + padding).encode())

def sign_token(payload: dict, ttl_seconds: int = 60 * 60 * 24 * 7) -> str:
    now = int(time.time())
    body = {**payload, "iat": now, "exp": now + ttl_seconds, "v": 1}
    msg = json.dumps(body, separators=(",", ":"), sort_keys=True).encode()
    secret = _auth_secret()
    if not secret:
        # Still issue a token, but it won't validate across instances.
        secret = secrets.token_bytes(32)
    sig = hmac.new(secret, msg, hashlib.sha256).digest()
    return f"v1.{_b64url_encode(msg)}.{_b64url_encode(sig)}"

def verify_token(token: str) -> dict | None:
    if not token or not token.startswith("v1."):
        return None
    try:
        _, msg_b64, sig_b64 = token.split(".", 2)
        msg = _b64url_decode(msg_b64)
        sig = _b64url_decode(sig_b64)
        secret = _auth_secret()
        if not secret:
            return None
        expected = hmac.new(secret, msg, hashlib.sha256).digest()
        if not hmac.compare_digest(expected, sig):
            return None
        payload = json.loads(msg.decode())
        if int(payload.get("exp", 0)) < int(time.time()):
            return None
        return payload
    except Exception:
        return None

def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 200_000)
    return f"pbkdf2_sha256$200000${_b64url_encode(salt)}${_b64url_encode(dk)}"

def verify_password(password: str, stored: str | None) -> bool:
    if not stored:
        return False
    # Legacy plaintext support
    if not stored.startswith("pbkdf2_sha256$"):
        return secrets.compare_digest(stored, password)
    try:
        _, iters, salt_b64, dk_b64 = stored.split("$", 3)
        salt = _b64url_decode(salt_b64)
        dk = _b64url_decode(dk_b64)
        calc = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, int(iters))
        return hmac.compare_digest(calc, dk)
    except Exception:
        return False

async def get_current_user(request: Request):
    auth = request.headers.get("Authorization")
    if not auth: raise HTTPException(status_code=401)

    if auth.lower().startswith("bearer "):
        auth = auth[7:].strip()
    
    tg_user = validate_telegram_data(auth)
    if tg_user:
        # Return user data without requiring MongoDB user presence
        return {"user_id": tg_user['id'], "username": tg_user.get('username', 'User')}
    
    payload = verify_token(auth)
    if payload and payload.get("sub") == "user":
        return {"user_id": payload.get("user_id"), "username": payload.get("username", "User")}
        
    raise HTTPException(status_code=401, detail="Invalid Session")

def is_admin(user_id):
    return user_id in ADMIN_IDS

# --- ENDPOINTS ---

@app.post("/api/get-token")
async def get_local_token(data: dict):
    # Generates a secure token for local storage users without DB checks
    user_id = data.get("user_id")
    username = data.get("username", "User")
    if not user_id: 
        raise HTTPException(status_code=400, detail="user_id is required")
    
    token = sign_token({"sub": "user", "user_id": user_id, "username": username})
    return {"status": "ok", "token": token, "user_id": user_id}

@app.post("/api/register")
async def register(data: dict):
    # Deprecated: use local storage instead
    raise HTTPException(status_code=400, detail="Use local storage registration")

@app.post("/api/login")
async def login(data: dict):
    # Deprecated: use local storage instead
    raise HTTPException(status_code=400, detail="Use local storage login")

@app.get("/api/me")
async def get_me(request: Request):
    user = await get_current_user(request)
    user["_id"] = str(user["_id"])
    user["is_admin"] = is_admin(user["user_id"])
    return user

@app.get("/api/plans")
async def get_plans():
    try:
        plans = await db.get_all_plans()
        for p in plans: p["_id"] = str(p["_id"])
        return plans
    except Exception as e:
        print(f"PLANS ERROR: {e}")
        return []

@app.post("/api/create-payment")
async def create_payment(request: Request):
    user = await get_current_user(request)
    data = await request.json()
    amount = data.get("amount")
    network = data.get("network", "usdttrc20")
    
    r = requests.post("https://api.nowpayments.io/v1/invoice", json={
        "price_amount": float(amount),
        "price_currency": "usd",
        "pay_currency": network,
        "order_id": f"DEP_{user['user_id']}_{int(time.time())}"
    }, headers={"x-api-key": NOWPAYMENTS_API_KEY, "Content-Type": "application/json"})
    return r.json()

@app.get("/api/orders")
async def get_orders(request: Request):
    user = await get_current_user(request)
    orders = await db.get_user_orders(user["user_id"])
    for o in orders: o["_id"] = str(o["_id"])
    return orders

@app.get("/api/admin/stats")
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

@app.post("/api/system-log")
async def system_log(data: dict):
    username = data.get("username", "Unknown")
    action = data.get("action", "Activity")
    details = data.get("details", "")
    
    # Save to DB
    await db.add_log(username, action, details)
    
    # Notify Admin via Telegram
    msg = (
        f"🔔 <b>System Alert</b>\n"
        f"👤 <b>User:</b> {username}\n"
        f"⚡ <b>Action:</b> {action}\n"
        f"📝 <b>Details:</b> {details}\n"
    )
    
    for admin_id in ADMIN_IDS:
        try:
            requests.post(f"https://api.telegram.org/bot{ADMIN_BOT_TOKEN}/sendMessage", json={
                "chat_id": admin_id,
                "text": msg,
                "parse_mode": "HTML"
            })
        except: pass
        
    return {"status": "ok"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
