import os
from dotenv import load_dotenv

load_dotenv()

# Telegram Bot Tokens
BOT_TOKEN = os.getenv("BOT_TOKEN", "YOUR_BOT_TOKEN_HERE")
ADMIN_BOT_TOKEN = os.getenv("ADMIN_BOT_TOKEN", "YOUR_ADMIN_BOT_TOKEN_HERE")

# MongoDB Atlas Connection String
MONGO_URI = os.getenv("MONGO_URI", "YOUR_MONGO_URI_HERE")
DB_NAME = os.getenv("DB_NAME", "ai_subscription_bot")

# Admin IDs (List of integers)
ADMIN_IDS = [int(id) for id in os.getenv("ADMIN_IDS", "0").split(",") if id.isdigit()]

# NOWPayments Credentials
NOWPAYMENTS_API_KEY = os.getenv("NOWPAYMENTS_API_KEY", "Z2CZBVX-CZH4SJ1-K6CB517-4FFJ8PG")
NOWPAYMENTS_IPN_SECRET = os.getenv("NOWPAYMENTS_IPN_SECRET", "OUd42EvuYBD/uCr2RC/6kS8+ZE2uzJ/m")

# WebApp Settings
WEBAPP_URL = os.getenv("WEBAPP_URL", "https://new-bots.vercel.app/")

# Premium Formatting Elements
DIVIDER = "────────────"
BULLET = "✦"
SUCCESS_EMOJI = "✅"
PENDING_EMOJI = "⏳"
DENIED_EMOJI = "❌"
WALLET_EMOJI = "💳"
ORDER_EMOJI = "📦"
PLAN_EMOJI = "🤖"
SUPPORT_EMOJI = "📞"
ABOUT_EMOJI = "ℹ️"
APP_EMOJI = "🚀"
