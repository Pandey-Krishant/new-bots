import asyncio
import motor.motor_asyncio
from config import MONGO_URI, DB_NAME

async def init_db():
    client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URI)
    db = client[DB_NAME]
    
    # Sample Plans
    plans = [
        {
            "name": "ChatGPT Pro",
            "duration": "1 Month",
            "price": 19.99,
            "delivery_time": "Within 24 hours",
            "description": "Full access to GPT-4o, DALL·E, plugins, and early access to new features. ✦ Private Login ✦ No shared access.",
            "is_active": True
        },
        {
            "name": "Midjourney",
            "duration": "1 Month",
            "price": 29.99,
            "delivery_time": "Within 12 hours",
            "description": "Premium access to the world's most advanced AI image generator. ✦ High-quality renders ✦ Fast GPU hours.",
            "is_active": True
        },
        {
            "name": "Claude Pro",
            "duration": "1 Month",
            "price": 20.00,
            "delivery_time": "Within 24 hours",
            "description": "Unlock Claude 3.5 Sonnet and Opus with higher limits and early access to new features.",
            "is_active": True
        },
        {
            "name": "Gemini Ultra",
            "duration": "1 Month",
            "price": 19.99,
            "delivery_time": "Within 24 hours",
            "description": "Google's most capable AI model for highly complex tasks. ✦ Advanced reasoning ✦ Multimodal capabilities.",
            "is_active": True
        },
        {
            "name": "Perplexity Pro",
            "duration": "1 Month",
            "price": 20.00,
            "delivery_time": "Within 12 hours",
            "description": "Pro Search, file uploads, and choice of AI models (Claude/GPT). ✦ Accurate answers ✦ Citations included.",
            "is_active": True
        },
        {
            "name": "Canva Pro",
            "duration": "1 Month",
            "price": 12.99,
            "delivery_time": "Instant Delivery",
            "description": "Unlimited premium content, Magic Studio, and brand tools. ✦ Design anything ✦ Collaborative tools.",
            "is_active": True
        }
    ]
    
    await db.plans.delete_many({}) # Clear existing
    await db.plans.insert_many(plans)
    
    # Sample Wallets
    wallets = [
        {"network": "USDT TRC-20", "address": "TRC20_WALLET_ADDRESS_HERE"},
        {"network": "Bitcoin BTC", "address": "BTC_WALLET_ADDRESS_HERE"},
        {"network": "Solana SOL", "address": "SOL_WALLET_ADDRESS_HERE"},
        {"network": "TON Coin", "address": "TON_WALLET_ADDRESS_HERE"},
        {"network": "Litecoin LTC", "address": "LTC_WALLET_ADDRESS_HERE"}
    ]
    
    await db.wallets.delete_many({}) # Clear existing
    await db.wallets.insert_many(wallets)
    
    print("✅ Sample data initialized successfully!")

if __name__ == "__main__":
    asyncio.run(init_db())
