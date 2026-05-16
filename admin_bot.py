import logging, asyncio
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ApplicationBuilder, CommandHandler, CallbackQueryHandler, MessageHandler, filters, ContextTypes
from config import ADMIN_BOT_TOKEN, ADMIN_IDS, DIVIDER, SUCCESS_EMOJI, PENDING_EMOJI, DENIED_EMOJI
from database import db
import bson

# Enable logging
logging.basicConfig(format='%(asctime)s - %(name)s - %(levelname)s - %(message)s', level=logging.INFO)

def is_admin(user_id):
    return user_id in ADMIN_IDS

async def admin_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    if not is_admin(user.id):
        await update.message.reply_text("❌ Access Denied. You are not an authorized admin.")
        return

    text = (
        f"<b>🛡 Admin Control Panel</b>\n"
        f"{DIVIDER}\n"
        f"Welcome, Admin. Select an option below to manage the store:"
    )
    
    keyboard = [
        [InlineKeyboardButton("📦 Manage Orders", callback_data="admin_orders")],
        [InlineKeyboardButton("🤖 Manage Plans", callback_data="admin_plans")],
        [InlineKeyboardButton("💳 Manage Wallets", callback_data="admin_wallets")],
        [InlineKeyboardButton("👤 User Search", callback_data="admin_users")]
    ]
    
    reply_markup = InlineKeyboardMarkup(keyboard)
    if update.callback_query:
        await update.callback_query.edit_message_text(text, reply_markup=reply_markup, parse_mode='HTML')
    else:
        await update.message.reply_text(text, reply_markup=reply_markup, parse_mode='HTML')

async def manage_orders(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    
    # Only show pending orders for management
    orders = await db.orders.find({"status": "Pending"}).to_list(length=20)
    
    if not orders:
        text = "✅ No pending orders found."
        keyboard = [[InlineKeyboardButton("🏠 Back to Admin", callback_data="admin_home")]]
    else:
        text = f"<b>{PENDING_EMOJI} Pending Orders</b>\n{DIVIDER}\n"
        keyboard = []
        for order in orders:
            keyboard.append([InlineKeyboardButton(f"Order #{str(order['_id'])[-6:]} | ${order['total_price']}", callback_data=f"view_order_{order['_id']}")])
        keyboard.append([InlineKeyboardButton("🏠 Back to Admin", callback_data="admin_home")])
    
    await query.edit_message_text(text, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode='HTML')

async def view_order(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    
    order_id_str = query.data.split("_")[2]
    order = await db.orders.find_one({"_id": bson.ObjectId(order_id_str)})
    
    if not order:
        await query.edit_message_text("❌ Order not found.")
        return

    text = (
        f"<b>📄 Order Details</b>\n"
        f"{DIVIDER}\n"
        f"<b>User ID:</b> <code>{order['user_id']}</code> (@{order['username']})\n"
        f"<b>Plan:</b> {order['plan_name']} x{order['quantity']}\n"
        f"<b>Total:</b> ${order['total_price']}\n"
        f"<b>Network:</b> {order['crypto_network']}\n"
        f"<b>TxID:</b> <code>{order['txid']}</code>\n"
        f"<b>Time:</b> {order['timestamp'].strftime('%Y-%m-%d %H:%M')}\n"
        f"{DIVIDER}\n"
        f"Select Action:"
    )
    
    keyboard = [
        [InlineKeyboardButton("✅ Deliver Plan", callback_data=f"order_action_Delivered_{order['_id']}")],
        [InlineKeyboardButton("❌ Deny Order", callback_data=f"order_action_Denied_{order['_id']}")],
        [InlineKeyboardButton("🔙 Back to Orders", callback_data="admin_orders")]
    ]
    
    await query.edit_message_text(text, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode='HTML')

async def process_order_action(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    
    # format: order_action_Status_ID
    parts = query.data.split("_")
    status = parts[2]
    order_id = bson.ObjectId(parts[3])
    
    await db.orders.update_one({"_id": order_id}, {"$set": {"status": status}})
    
    await query.edit_message_text(f"✅ Order status updated to: <b>{status}</b>", parse_mode='HTML', 
                                 reply_markup=InlineKeyboardMarkup([[InlineKeyboardButton("🔙 Back to Orders", callback_data="admin_orders")]]))

async def manage_wallets(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    
    wallets = await db.get_all_wallets()
    text = f"<b>💳 Manage Crypto Wallets</b>\n{DIVIDER}\n"
    keyboard = []
    for wallet in wallets:
        text += f"• <b>{wallet['network']}:</b>\n<code>{wallet['address']}</code>\n\n"
        keyboard.append([InlineKeyboardButton(f"Edit {wallet['network']}", callback_data=f"edit_wallet_{wallet['network']}")])
    
    keyboard.append([InlineKeyboardButton("🏠 Back to Admin", callback_data="admin_home")])
    await query.edit_message_text(text, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode='HTML')

async def edit_wallet(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    
    network = query.data.replace("edit_wallet_", "")
    context.user_data['edit_wallet_network'] = network
    context.user_data['state'] = 'AWAITING_WALLET_ADDRESS'
    
    await query.edit_message_text(f"Please send the new address for <b>{network}</b>:", parse_mode='HTML')

async def handle_admin_text(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    if not is_admin(user_id):
        return

    state = context.user_data.get('state')
    
    if state == 'AWAITING_WALLET_ADDRESS':
        new_address = update.message.text
        network = context.user_data['edit_wallet_network']
        
        await db.wallets.update_one({"network": network}, {"$set": {"address": new_address}})
        context.user_data['state'] = None
        
        await update.message.reply_text(f"✅ Address for <b>{network}</b> updated successfully!", parse_mode='HTML',
                                       reply_markup=InlineKeyboardMarkup([[InlineKeyboardButton("💳 Back to Wallets", callback_data="admin_wallets")]]))

async def main():
    application = ApplicationBuilder().token(ADMIN_BOT_TOKEN).build()
    
    application.add_handler(CommandHandler("start", admin_start))
    application.add_handler(CallbackQueryHandler(admin_start, pattern="^admin_home$"))
    application.add_handler(CallbackQueryHandler(manage_orders, pattern="^admin_orders$"))
    application.add_handler(CallbackQueryHandler(view_order, pattern="^view_order_"))
    application.add_handler(CallbackQueryHandler(process_order_action, pattern="^order_action_"))
    application.add_handler(CallbackQueryHandler(manage_wallets, pattern="^admin_wallets$"))
    application.add_handler(CallbackQueryHandler(edit_wallet, pattern="^edit_wallet_"))
    
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_admin_text))
    
    print("Admin Bot is running...")
    async with application:
        await application.initialize()
        await application.start()
        await application.updater.start_polling()
        # Keep the bot running
        await asyncio.Event().wait()

if __name__ == '__main__':
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
