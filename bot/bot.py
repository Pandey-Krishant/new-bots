import logging
import asyncio
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo
from telegram.ext import Application, CommandHandler, CallbackQueryHandler, ContextTypes
try:
    from .config import BOT_TOKEN, WEBAPP_URL, ADMIN_IDS
except ImportError:  # Allow running as a script: `python bot/bot.py`
    from config import BOT_TOKEN, WEBAPP_URL, ADMIN_IDS
from database import Database

# Enable logging
logging.basicConfig(format='%(asctime)s - %(name)s - %(levelname)s - %(message)s', level=logging.INFO)

db = Database()

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    user = update.effective_user
    logging.info(f"Start command received from {user.id}")
    
    # Run DB registration in background to keep the bot response FAST (Instant)
    asyncio.create_task(db.register_user(user.id, user.username or user.first_name))
    
    keyboard = [
        [InlineKeyboardButton("🚀 Launch Elite Store", web_app=WebAppInfo(url=WEBAPP_URL))],
        [
            InlineKeyboardButton("💳 Wallet", callback_data='my_wallet'),
            InlineKeyboardButton("📦 Orders", callback_data='my_orders')
        ],
        [
            InlineKeyboardButton("📞 Support", callback_data='support'),
            InlineKeyboardButton("ℹ️ About", callback_data='about')
        ]
    ]
    
    reply_markup = InlineKeyboardMarkup(keyboard)
    welcome_text = (
        f"<b>Welcome back, {user.first_name}!</b> 🚀\n\n"
        f"Welcome to the <b>Elite AI Store</b>. We provide premium AI subscriptions at the most competitive prices.\n\n"
        f"✦ <b>Instant Delivery</b>\n"
        f"✦ <b>Secure Payments</b>\n"
        f"✦ <b>24/7 Support</b>\n\n"
        f"Click the button below to browse our services!"
    )
    
    if update.message:
        await update.message.reply_text(welcome_text, reply_markup=reply_markup, parse_mode='HTML')
    else:
        await update.callback_query.message.edit_text(welcome_text, reply_markup=reply_markup, parse_mode='HTML')

async def button_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    await query.answer()
    
    if query.data == 'back_to_start':
        await start(update, context)
    elif query.data == 'my_wallet':
        user = await db.get_user(query.from_user.id)
        balance = user.get('balance', 0.0) if user else 0.0
        text = (
            "<b>💳 My Wallet</b>\n\n"
            f"💰 <b>Current Balance:</b> <code>${balance:.2f}</code>\n\n"
            "To add funds, please use the <b>🚀 Launch Elite Store</b> button below."
        )
        await query.edit_message_text(text, reply_markup=InlineKeyboardMarkup([[InlineKeyboardButton("⬅️ Back", callback_data='back_to_start')]]), parse_mode='HTML')
    elif query.data == 'my_orders':
        orders = await db.get_user_orders(query.from_user.id)
        if not orders:
            text = "<b>📦 My Orders</b>\n\nYou haven't made any purchases yet."
        else:
            text = "<b>📦 Your Recent Orders:</b>\n\n"
            for o in orders[:5]:
                status_icon = "✅" if o['status'] == 'Completed' else "⏳"
                text += f"{status_icon} <b>{o['plan_name']}</b>\n   └ Price: ${o['total_price']} | Status: {o['status']}\n\n"
        
        await query.edit_message_text(text, reply_markup=InlineKeyboardMarkup([[InlineKeyboardButton("⬅️ Back", callback_data='back_to_start')]]), parse_mode='HTML')
    elif query.data == 'support':
        text = (
            "<b>📞 Customer Support</b>\n\n"
            "Our team is available 24/7 to assist you with your orders or any questions you may have.\n\n"
            "Contact us: @YourSupportHandle"
        )
        await query.edit_message_text(text, reply_markup=InlineKeyboardMarkup([[InlineKeyboardButton("⬅️ Back", callback_data='back_to_start')]]), parse_mode='HTML')
    elif query.data == 'about':
        text = (
            "<b>ℹ️ About Elite AI Store</b>\n\n"
            "We are the #1 provider of private AI subscriptions. All our accounts are 100% private and come with full warranties.\n\n"
            "✦ <b>Version:</b> 2.0.0\n"
            "✦ <b>Reliability:</b> 99.9%"
        )
        await query.edit_message_text(text, reply_markup=InlineKeyboardMarkup([[InlineKeyboardButton("⬅️ Back", callback_data='back_to_start')]]), parse_mode='HTML')

if __name__ == "__main__":
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    
    application = Application.builder().token(BOT_TOKEN).build()
    application.add_handler(CommandHandler("start", start))
    application.add_handler(CallbackQueryHandler(button_handler))
    print("Bot started successfully...")
    application.run_polling(drop_pending_updates=True)
