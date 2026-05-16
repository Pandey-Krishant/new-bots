import os
from dotenv import load_dotenv

load_dotenv()

# Telegram Bot Tokens
BOT_TOKEN = os.getenv("BOT_TOKEN")
ADMIN_BOT_TOKEN = os.getenv("ADMIN_BOT_TOKEN")

# MongoDB Connection
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "ai_subscription_bot")

# Admin Settings
# Add your Telegram User ID here
ADMIN_IDS = [1661187898] + [int(id) for id in os.getenv("ADMIN_IDS", "0").split(",") if id.isdigit()]

# NOWPayments Credentials
NOWPAYMENTS_API_KEY = os.getenv("NOWPAYMENTS_API_KEY")
NOWPAYMENTS_IPN_SECRET = os.getenv("NOWPAYMENTS_IPN_SECRET")

# WebApp Settings
WEBAPP_URL = os.getenv("WEBAPP_URL", "https://new-bots.vercel.app/")

# Formatting
SUCCESS_EMOJI = "✅"
ERROR_EMOJI = "❌"
PENDING_EMOJI = "⏳"
