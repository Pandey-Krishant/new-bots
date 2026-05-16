import logging, asyncio
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo
from telegram.ext import ApplicationBuilder, CommandHandler, CallbackQueryHandler, MessageHandler, filters, ContextTypes
from config import BOT_TOKEN, DIVIDER, BULLET, SUCCESS_EMOJI, PENDING_EMOJI, DENIED_EMOJI, WALLET_EMOJI, ORDER_EMOJI, PLAN_EMOJI, SUPPORT_EMOJI, ABOUT_EMOJI, WEBAPP_URL, APP_EMOJI
from database import db
import bson

# Enable logging
logging.basicConfig(format='%(asctime)s - %(name)s - %(levelname)s - %(message)s', level=logging.INFO)

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    await db.register_user(user.id, user.username)
    
    text = (
        f"<b>Welcome to AI Premium Store</b>\n"
        f"{DIVIDER}\n"
        f"Browse and purchase premium AI tool subscriptions instantly using Crypto! 🚀\n"
        f"{DIVIDER}\n"
        f"Select an option below to get started:"
    )
    
    keyboard = [
        [InlineKeyboardButton(f"{APP_EMOJI} Open Mini App", web_app=WebAppInfo(url=WEBAPP_URL))],
        [InlineKeyboardButton(f"🛒 Browse Plans", callback_data="browse_plans")],
        [InlineKeyboardButton(f"👤 My Account", callback_data="my_account"), InlineKeyboardButton(f"💳 My Wallet", callback_data="my_wallet")],
        [InlineKeyboardButton(f"📦 My Orders", callback_data="my_orders"), InlineKeyboardButton(f"📞 Support", callback_data="support")],
        [InlineKeyboardButton(f"ℹ️ About", callback_data="about")]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    if update.callback_query:
        await update.callback_query.edit_message_text(text, reply_markup=reply_markup, parse_mode='HTML')
    else:
        await update.message.reply_text(text, reply_markup=reply_markup, parse_mode='HTML')

async def browse_plans(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    
    plans = await db.get_all_plans()
    
    if not plans:
        text = "❌ No active plans available at the moment. Please check back later!"
        keyboard = [[InlineKeyboardButton("🔙 Back to Home", callback_data="home")]]
    else:
        text = (
            f"<b>{PLAN_EMOJI} Available AI Subscriptions</b>\n"
            f"{DIVIDER}\n"
            f"Select a plan below to view details:"
        )
        keyboard = []
        for plan in plans:
            keyboard.append([InlineKeyboardButton(f"{PLAN_EMOJI} {plan['name']}", callback_data=f"plan_{plan['_id']}")])
        keyboard.append([InlineKeyboardButton("🔙 Back to Home", callback_data="home")])
    
    await query.edit_message_text(text, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode='HTML')

async def plan_details(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    
    plan_id_str = query.data.split("_")[1]
    plan_id = bson.ObjectId(plan_id_str)
    plan = await db.get_plan_by_id(plan_id)
    
    if not plan:
        await query.edit_message_text("❌ Plan not found.", reply_markup=InlineKeyboardMarkup([[InlineKeyboardButton("🔙 Back", callback_data="browse_plans")]]))
        return

    text = (
        f"<b>{BULLET} Plan Name:</b> {plan['name']}\n"
        f"<b>{BULLET} Duration:</b> {plan['duration']}\n"
        f"<b>{BULLET} Price:</b> ${plan['price']}\n"
        f"<b>{BULLET} Delivery:</b> {plan['delivery_time']}\n"
        f"{DIVIDER}\n"
        f"<b>Description:</b>\n{plan['description']}\n"
        f"{DIVIDER}\n"
        f"Click below to purchase this subscription!"
    )
    
    keyboard = [
        [InlineKeyboardButton("✅ Buy Now", callback_data=f"buy_{plan_id}")],
        [InlineKeyboardButton("🔙 Back", callback_data="browse_plans"), InlineKeyboardButton("🏠 Home", callback_data="home")]
    ]
    
    await query.edit_message_text(text, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode='HTML')

async def select_quantity(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    
    plan_id_str = query.data.split("_")[1]
    context.user_data['purchase_plan_id'] = plan_id_str
    
    text = (
        f"<b>Step 1 — Select Quantity</b>\n"
        f"{DIVIDER}\n"
        f"How many subscriptions would you like to purchase?"
    )
    
    keyboard = [
        [InlineKeyboardButton("x1", callback_data="qty_1"), InlineKeyboardButton("x2", callback_data="qty_2")],
        [InlineKeyboardButton("x3", callback_data="qty_3"), InlineKeyboardButton("x4", callback_data="qty_4")],
        [InlineKeyboardButton("Custom", callback_data="qty_custom")],
        [InlineKeyboardButton("🔙 Back", callback_data=f"plan_{plan_id_str}")]
    ]
    
    await query.edit_message_text(text, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode='HTML')

async def select_network(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    
    if "qty_" in query.data:
        qty = query.data.split("_")[1]
        if qty == "custom":
            # Handle custom quantity input (not implemented in this simplified flow for now)
            qty = 1 
        context.user_data['purchase_qty'] = int(qty)

    text = (
        f"<b>Step 2 — Select Crypto Network</b>\n"
        f"{DIVIDER}\n"
        f"Select your preferred payment network:"
    )
    
    wallets = await db.get_all_wallets()
    keyboard = []
    # Create grid of 2
    for i in range(0, len(wallets), 2):
        row = [InlineKeyboardButton(wallets[i]['network'], callback_data=f"net_{wallets[i]['network']}")]
        if i + 1 < len(wallets):
            row.append(InlineKeyboardButton(wallets[i+1]['network'], callback_data=f"net_{wallets[i+1]['network']}"))
        keyboard.append(row)
    
    keyboard.append([InlineKeyboardButton("🔙 Back", callback_data=f"buy_{context.user_data['purchase_plan_id']}")])
    
    await query.edit_message_text(text, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode='HTML')

async def order_summary(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    
    network = query.data.split("_")[1]
    context.user_data['purchase_network'] = network
    
    plan_id = bson.ObjectId(context.user_data['purchase_plan_id'])
    plan = await db.get_plan_by_id(plan_id)
    qty = context.user_data['purchase_qty']
    total = plan['price'] * qty
    address = await db.get_wallet_address(network)
    
    text = (
        f"━━━━━━━━━━━━━━━━━━━━\n"
        f"🧾 <b>ORDER SUMMARY</b>\n"
        f"━━━━━━━━━━━━━━━━━━━━\n"
        f"<b>{ORDER_EMOJI} Item:</b> {plan['name']} x{qty}\n"
        f"<b>💰 Total:</b> ${total:.2f}\n"
        f"<b>🔗 Network:</b> {network}\n"
        f"━━━━━━━━━━━━━━━━━━━━\n"
        f"⚠️ Send EXACTLY <b>${total:.2f}</b> worth of {network} to:\n\n"
        f"<code>{address}</code>\n\n"
        f"<i>(Tap to copy address)</i>\n\n"
        f"⚠️ <b>NOTE:</b> Send on the correct network or funds will be lost.\n\n"
        f"After payment, click below:"
    )
    
    keyboard = [
        [InlineKeyboardButton("✅ I Have Paid — Submit TxID", callback_data="submit_txid")],
        [InlineKeyboardButton("🔙 Cancel", callback_data="home")]
    ]
    
    await query.edit_message_text(text, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode='HTML')

async def ask_txid(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    
    context.user_data['state'] = 'AWAITING_TXID'
    
    text = (
        f"<b>Step 4 — TxID Submission</b>\n"
        f"{DIVIDER}\n"
        f"Please send your <b>Transaction ID (TxID)</b> below for verification.\n\n"
        f"Our team will manually verify the payment."
    )
    
    await query.edit_message_text(text, parse_mode='HTML')

async def handle_txid(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if context.user_data.get('state') != 'AWAITING_TXID':
        return

    txid = update.message.text
    user = update.effective_user
    
    plan_id = bson.ObjectId(context.user_data['purchase_plan_id'])
    plan = await db.get_plan_by_id(plan_id)
    qty = context.user_data['purchase_qty']
    network = context.user_data['purchase_network']
    
    await db.create_order(
        user_id=user.id,
        username=user.username,
        plan_id=plan_id,
        plan_name=plan['name'],
        quantity=qty,
        price=plan['price'],
        crypto_network=network,
        txid=txid
    )
    
    context.user_data['state'] = None
    
    text = (
        f"<b>{SUCCESS_EMOJI} Payment submitted!</b>\n"
        f"{DIVIDER}\n"
        f"Your order has been received. Our team will verify it within 1–6 hours.\n\n"
        f"You can track status in <b>'My Orders'</b>."
    )
    
    keyboard = [[InlineKeyboardButton("🏠 Home", callback_data="home")]]
    await update.message.reply_text(text, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode='HTML')

async def my_account(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    
    user_data = await db.get_user(update.effective_user.id)
    
    text = (
        f"<b>👤 My Account</b>\n"
        f"{DIVIDER}\n"
        f"<b>Username:</b> @{user_data['username']}\n"
        f"<b>User ID:</b> <code>{user_data['user_id']}</code>\n"
        f"<b>Balance:</b> ${user_data['balance']:.2f}\n"
        f"<b>Joined:</b> {user_data['joined_at'].strftime('%Y-%m-%d')}\n"
        f"{DIVIDER}"
    )
    
    keyboard = [[InlineKeyboardButton("🔙 Back to Home", callback_data="home")]]
    await query.edit_message_text(text, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode='HTML')

async def my_wallet(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    
    user_data = await db.get_user(update.effective_user.id)
    
    text = (
        f"<b>{WALLET_EMOJI} My Wallet</b>\n"
        f"{DIVIDER}\n"
        f"💳 Your Wallet Balance: <b>${user_data['balance']:.2f}</b>\n\n"
        f"Add funds to your wallet for instant plan activation!"
    )
    
    keyboard = [
        [InlineKeyboardButton("➕ Add Funds", callback_data="add_funds")],
        [InlineKeyboardButton("📋 Transactions", callback_data="transactions")],
        [InlineKeyboardButton("🔙 Back to Home", callback_data="home")]
    ]
    await query.edit_message_text(text, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode='HTML')

async def my_orders(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    
    orders = await db.get_user_orders(update.effective_user.id)
    
    if not orders:
        text = "📦 You haven't placed any orders yet."
    else:
        text = f"<b>{ORDER_EMOJI} Your Order History</b>\n{DIVIDER}\n"
        for order in orders:
            status_emoji = SUCCESS_EMOJI if order['status'] == 'Delivered' else PENDING_EMOJI if order['status'] == 'Pending' else DENIED_EMOJI
            text += f"{ORDER_EMOJI} Order | {order['plan_name']} x{order['quantity']} | STATUS: {status_emoji} {order['status']}\n"
    
    keyboard = [[InlineKeyboardButton("🏠 Home", callback_data="home")]]
    await query.edit_message_text(text, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode='HTML')

async def support(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    
    text = (
        f"<b>{SUPPORT_EMOJI} Customer Support</b>\n"
        f"{DIVIDER}\n"
        f"Need help or have questions?\n\n"
        f"Reach out to our support team:\n"
        f"👤 <b>Admin:</b> @YourSupportHandle\n"
        f"⏰ <b>Hours:</b> 10 AM - 10 PM IST"
    )
    
    keyboard = [[InlineKeyboardButton("🔙 Back to Home", callback_data="home")]]
    await query.edit_message_text(text, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode='HTML')

async def about(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    
    text = (
        f"<b>{ABOUT_EMOJI} About AI Premium Store</b>\n"
        f"{DIVIDER}\n"
        f"We provide verified premium accounts for top AI tools at competitive prices.\n\n"
        f"✦ Fast Delivery\n"
        f"✦ Secure Crypto Payments\n"
        f"✦ 24/7 Reliability\n"
        f"{DIVIDER}"
    )
    
    keyboard = [[InlineKeyboardButton("🔙 Back to Home", callback_data="home")]]
    await query.edit_message_text(text, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode='HTML')

async def main():
    application = ApplicationBuilder().token(BOT_TOKEN).build()
    
    application.add_handler(CommandHandler("start", start))
    application.add_handler(CallbackQueryHandler(start, pattern="^home$"))
    application.add_handler(CallbackQueryHandler(browse_plans, pattern="^browse_plans$"))
    application.add_handler(CallbackQueryHandler(plan_details, pattern="^plan_"))
    application.add_handler(CallbackQueryHandler(select_quantity, pattern="^buy_"))
    application.add_handler(CallbackQueryHandler(select_network, pattern="^qty_"))
    application.add_handler(CallbackQueryHandler(order_summary, pattern="^net_"))
    application.add_handler(CallbackQueryHandler(ask_txid, pattern="^submit_txid$"))
    application.add_handler(CallbackQueryHandler(my_account, pattern="^my_account$"))
    application.add_handler(CallbackQueryHandler(my_wallet, pattern="^my_wallet$"))
    application.add_handler(CallbackQueryHandler(my_orders, pattern="^my_orders$"))
    application.add_handler(CallbackQueryHandler(support, pattern="^support$"))
    application.add_handler(CallbackQueryHandler(about, pattern="^about$"))
    
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_txid))
    
    print("Bot is running...")
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
