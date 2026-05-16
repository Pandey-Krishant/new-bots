import motor.motor_asyncio
from datetime import datetime

try:
    from .config import MONGO_URI, DB_NAME
except ImportError:  # Allow running as a script
    from config import MONGO_URI, DB_NAME

class Database:
    def __init__(self):
        self.client = motor.motor_asyncio.AsyncIOMotorClient(
            MONGO_URI,
            serverSelectionTimeoutMS=5000,
            connectTimeoutMS=5000,
            socketTimeoutMS=5000
        )
        self.db = self.client[DB_NAME]
        self.users = self.db.users
        self.plans = self.db.plans
        self.orders = self.db.orders
        self.wallets = self.db.wallets
        print('Connected to MongoDB')

    # User Methods
    async def get_user(self, user_id):
        return await self.users.find_one({"user_id": user_id})

    async def register_user(self, user_id, username, email=None, password=None):
        user = await self.get_user(user_id) if user_id else await self.users.find_one({"email": email})
        if not user:
            await self.users.insert_one({
                "user_id": user_id,
                "username": username,
                "email": email,
                "password": password,
                "balance": 0.0,
                "joined_at": datetime.utcnow()
            })

    async def get_user_by_email_or_username(self, identifier):
        return await self.users.find_one({"$or": [{"email": identifier}, {"username": identifier}]})

    async def update_balance(self, user_id, amount):
        await self.users.update_one({"user_id": user_id}, {"$inc": {"balance": amount}})

    # Plan Methods
    async def add_plan(self, name, price, description, icon="🤖", image_url=None):
        plan = {
            "name": name,
            "price": float(price),
            "description": description,
            "icon": icon,
            "image_url": image_url,
            "is_active": True,
            "created_at": datetime.now()
        }
        return await self.plans.insert_one(plan)

    async def get_all_plans(self):
        return await self.plans.find({"is_active": True}).to_list(length=100)

    async def delete_plan(self, name):
        return await self.plans.delete_one({"name": name})

    async def update_plan(self, plan_id, name, price, description, image_url=None):
        from bson import ObjectId
        update_data = {
            "name": name,
            "price": float(price),
            "description": description,
            "image_url": image_url
        }
        return await self.plans.update_one({"_id": ObjectId(plan_id)}, {"$set": update_data})

    async def get_plan_by_id(self, plan_id):
        return await self.plans.find_one({"_id": plan_id})

    # Order Methods
    async def create_order(self, user_id, username, plan_id, plan_name, quantity, price, crypto_network, txid):
        order = {
            "user_id": user_id,
            "username": username,
            "plan_id": plan_id,
            "plan_name": plan_name,
            "quantity": quantity,
            "total_price": price * quantity,
            "crypto_network": crypto_network,
            "txid": txid,
            "status": "Pending",
            "timestamp": datetime.utcnow()
        }
        result = await self.orders.insert_one(order)
        return result.inserted_id

    async def get_user_orders(self, user_id):
        return await self.orders.find({"user_id": user_id}).sort("timestamp", -1).to_list(length=50)

    # Admin Methods
    async def get_all_users(self):
        return await self.users.find().sort("joined_at", -1).to_list(length=100)

    async def get_all_orders(self):
        return await self.orders.find().sort("timestamp", -1).to_list(length=100)

    async def add_log(self, user_id, action, details=""):
        log = {
            "user_id": user_id,
            "action": action,
            "details": details,
            "timestamp": datetime.utcnow()
        }
        await self.db.logs.insert_one(log)

    async def get_logs(self):
        return await self.db.logs.find().sort("timestamp", -1).to_list(length=100)

