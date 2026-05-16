import os
from dotenv import load_dotenv

load_dotenv()

# Bot Configuration
BOT_TOKEN = os.getenv("BOT_TOKEN")
# YOUR NEW ADMIN BOT TOKEN
ADMIN_BOT_TOKEN = "8728790870:AAGZZqVttTR3mQZFfXMtR3sdRlcVSbTHiRc"
ADMIN_CHAT_ID = "1661187898" # Your Telegram ID

# WebApp URL
WEBAPP_URL = os.getenv("WEBAPP_URL", "https://new-bots.vercel.app/")

# Database Configuration
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")

# NOWPayments Configuration
NOWPAYMENTS_API_KEY = os.getenv("NOWPAYMENTS_API_KEY")
NOWPAYMENTS_IPN_SECRET = os.getenv("NOWPAYMENTS_IPN_SECRET")
