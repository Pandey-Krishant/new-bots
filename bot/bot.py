import logging
import asyncio
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo
from telegram.ext import Application, CommandHandler, CallbackQueryHandler, ContextTypes
from config import BOT_TOKEN, WEBAPP_URL
from database import Database

# Enable logging
logging.basicConfig(format='%(asctime)s - %(name)s - %(levelname)s - %(message)s', level=logging.INFO)

db = Database()

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    keyboard = [
        [InlineKeyboardButton("🚀 Open Mini App", web_app=WebAppInfo(url=WEBAPP_URL))],
        [InlineKeyboardButton("🛒 Browse Plans", callback_data='browse_plans')],
        [
            InlineKeyboardButton("👤 My Account", callback_data='my_account'),
            InlineKeyboardButton("💳 My Wallet", callback_data='my_wallet')
        ],
        [
            InlineKeyboardButton("📦 My Orders", callback_data='my_orders'),
            InlineKeyboardButton("📞 Support", callback_data='support')
        ]
    ]
    
    reply_markup = InlineKeyboardMarkup(keyboard)
    welcome_text = (
        "<b>Welcome to AI Premium Store</b>\n"
        "Your one-stop destination for premium AI subscriptions at the best prices.\n\n"
        "Select an option below to get started:"
    )
    
    if update.message:
        await update.message.reply_text(welcome_text, reply_markup=reply_markup, parse_mode='HTML')
    else:
        await update.callback_query.message.edit_text(welcome_text, reply_markup=reply_markup, parse_mode='HTML')

# --- CALLBACK HANDLERS (USER ONLY) ---
async def button_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    await query.answer()
    
    if query.data == 'back_to_start':
        await start(update, context)
    elif query.data == 'support':
        text = "<b>📞 Support Center</b>\n\nNeed help? Contact our support team directly:\n\nTelegram: @YourSupportUser"
        await query.edit_message_text(text, reply_markup=InlineKeyboardMarkup([[InlineKeyboardButton("⬅️ Back", callback_data='back_to_start')]]), parse_mode='HTML')
    # Add other simple user-facing responses here

async def run_bot() -> None:
    application = Application.builder().token(BOT_TOKEN).build()
    
    application.add_handler(CommandHandler("start", start))
    application.add_handler(CallbackQueryHandler(button_handler))
    
    print(f"User-Facing Bot is running...")
    async with application:
        await application.initialize()
        await application.start()
        await application.updater.start_polling()
        while True:
            await asyncio.sleep(3600)

if __name__ == "__main__":
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        loop.run_until_complete(run_bot())
    except (KeyboardInterrupt, SystemExit):
        pass
