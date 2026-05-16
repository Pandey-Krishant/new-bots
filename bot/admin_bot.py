import logging
import asyncio
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, ContextTypes, MessageHandler, filters, ConversationHandler
try:
    from .config import ADMIN_BOT_TOKEN, ADMIN_IDS
except ImportError:
    from config import ADMIN_BOT_TOKEN, ADMIN_IDS
from database import Database

# Enable logging
logging.basicConfig(format='%(asctime)s - %(name)s - %(levelname)s - %(message)s', level=logging.INFO)
logger = logging.getLogger(__name__)

db = Database()

async def start_admin(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    if user_id not in ADMIN_IDS:
        await update.message.reply_text("❌ Access Denied. This bot is for Admins only.")
        return
    
    keyboard = [
        [InlineKeyboardButton("📊 View Stats", callback_data='admin_stats')],
        [InlineKeyboardButton("📜 View Logs", callback_data='admin_logs')]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)

    await update.message.reply_text(
        "<b>🛡 Welcome to Admin Control Bot</b>\n\n"
        "Use the buttons below to manage your store in real-time.",
        reply_markup=reply_markup,
        parse_mode='HTML'
    )

async def admin_button_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    await query.answer()
    
    if query.data == 'admin_stats':
        await get_stats(update, context)
    elif query.data == 'admin_logs':
        await get_logs(update, context)

async def get_stats(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    if user_id not in ADMIN_IDS: return
    
    users = await db.get_all_users()
    orders = await db.get_all_orders()
    
    text = (
        "<b>📊 Store Statistics</b>\n\n"
        f"👥 <b>Total Users:</b> {len(users)}\n"
        f"📦 <b>Total Orders:</b> {len(orders)}\n"
        f"💰 <b>Total Revenue:</b> ${sum(o['total_price'] for o in orders):.2f}\n\n"
        "Click /start to return."
    )
    
    if update.message:
        await update.message.reply_text(text, parse_mode='HTML')
    else:
        await update.callback_query.message.edit_text(text, parse_mode='HTML')

async def get_logs(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    if user_id not in ADMIN_IDS: return
    
    logs = await db.get_logs()
    if not logs:
        text = "No logs found."
    else:
        text = "<b>📜 Recent System Logs:</b>\n\n"
        for l in logs[:15]:
            time_str = l['timestamp'].strftime('%H:%M:%S')
            text += f"• <code>[{time_str}]</code> <b>{l['action']}</b>: {l.get('details', '')}\n"
    
    if update.message:
        await update.message.reply_text(text, parse_mode='HTML')
    else:
        await update.callback_query.message.edit_text(text, parse_mode='HTML')

def main():
    if not ADMIN_BOT_TOKEN:
        print("❌ Error: ADMIN_BOT_TOKEN not found in .env")
        return

    application = Application.builder().token(ADMIN_BOT_TOKEN).build()
    
    application.add_handler(CommandHandler("start", start_admin))
    application.add_handler(CommandHandler("stats", get_stats))
    application.add_handler(CommandHandler("logs", get_logs))
    application.add_handler(CallbackQueryHandler(admin_button_handler))
    
    print("Admin Control Bot (2nd Bot) is starting...")
    application.run_polling(drop_pending_updates=True)

if __name__ == "__main__":
    main()
