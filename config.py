import os
from dotenv import load_dotenv

load_dotenv()

# Telegram Bot Tokens
BOT_TOKEN = os.getenv("BOT_TOKEN")
ADMIN_BOT_TOKEN = "8728790870:AAGZZqVttTR3mQZFfXMtR3sdRlcVSbTHiRc"
ADMIN_CHAT_ID = "1661187898"

# MongoDB Connection
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "ai_subscription_bot")

# Admin Settings
ADMIN_IDS = [1661187898] + [int(id) for id in os.getenv("ADMIN_IDS", "0").split(",") if id.isdigit()]

# NOWPayments Credentials
NOWPAYMENTS_API_KEY = os.getenv("NOWPAYMENTS_API_KEY", "Z2CZBVX-CZH4SJ1-K6CB517-4FFJ8PG")
NOWPAYMENTS_IPN_SECRET = os.getenv("NOWPAYMENTS_IPN_SECRET", "OUd42EvuYBD/uCr2RC/6kS8+ZE2uzJ/m")

# WebApp Settings
WEBAPP_URL = os.getenv("WEBAPP_URL", "https://new-bots.vercel.app/")
