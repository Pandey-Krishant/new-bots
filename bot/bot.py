import logging
import asyncio
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo
from telegram.ext import Application, CommandHandler, CallbackQueryHandler, ContextTypes, MessageHandler, filters, ConversationHandler
from config import BOT_TOKEN, WEBAPP_URL
from database import Database

# Enable logging
logging.basicConfig(format='%(asctime)s - %(name)s - %(levelname)s - %(message)s', level=logging.INFO)

db = Database()
ADMIN_ID = 1661187898

# States for Conversation
ADD_NAME, ADD_PRICE, ADD_DESC, ADD_IMAGE = range(4)

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
    
    if update.effective_user.id == ADMIN_ID:
        keyboard.append([InlineKeyboardButton("🛠 Admin Panel", callback_data='admin_panel')])

    reply_markup = InlineKeyboardMarkup(keyboard)
    welcome_text = "<b>Welcome to AI Premium Store</b>\nSelect an option:"
    
    if update.message:
        await update.message.reply_text(welcome_text, reply_markup=reply_markup, parse_mode='HTML')
    else:
        await update.callback_query.message.edit_text(welcome_text, reply_markup=reply_markup, parse_mode='HTML')

# --- ADMIN PRODUCT MANAGEMENT (CONVERSATION) ---
async def start_add_product(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.effective_user.id != ADMIN_ID: return
    await update.message.reply_text("📦 Enter Product Name:")
    return ADD_NAME

async def get_name(update: Update, context: ContextTypes.DEFAULT_TYPE):
    context.user_data['p_name'] = update.message.text
    await update.message.reply_text("💰 Enter Price (e.g., 19.99):")
    return ADD_PRICE

async def get_price(update: Update, context: ContextTypes.DEFAULT_TYPE):
    context.user_data['p_price'] = update.message.text
    await update.message.reply_text("📝 Enter Description:")
    return ADD_DESC

async def get_desc(update: Update, context: ContextTypes.DEFAULT_TYPE):
    context.user_data['p_desc'] = update.message.text
    await update.message.reply_text("🖼 Send Product Image (Photo) or type 'skip':")
    return ADD_IMAGE

async def get_image(update: Update, context: ContextTypes.DEFAULT_TYPE):
    image_url = None
    if update.message.photo:
        file = await context.bot.get_file(update.message.photo[-1].file_id)
        image_url = file.file_path
    
    name = context.user_data['p_name']
    price = context.user_data['p_price']
    desc = context.user_data['p_desc']
    
    await db.add_plan(name, price, desc, image_url=image_url)
    await update.message.reply_text(f"✅ <b>Item Added Successfully!</b>\n\n<b>Name:</b> {name}\n<b>Price:</b> ${price}", parse_mode='HTML')
    return ConversationHandler.END

async def cancel(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("❌ Action cancelled.")
    return ConversationHandler.END

# --- REMOVE PRODUCT ---
async def remove_product(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.effective_user.id != ADMIN_ID: return
    name = " ".join(context.args).strip()
    if not name:
        await update.message.reply_text("❌ Use: /removeproduct Name")
        return
    await db.delete_plan(name)
    await update.message.reply_text(f"🗑 <b>Item Deleted!</b>\nProduct: {name}", parse_mode='HTML')

# --- CALLBACK HANDLERS ---
async def button_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    await query.answer()
    
    if query.data == 'admin_panel':
        text = "<b>🛠 Admin Panel</b>\n\nCommands:\n/addproduct - Add with Photo\n/removeproduct Name - Delete item"
        await query.edit_message_text(text, reply_markup=InlineKeyboardMarkup([[InlineKeyboardButton("⬅️ Back", callback_data='back_to_start')]]), parse_mode='HTML')
    elif query.data == 'back_to_start':
        await start(update, context)
    # ... other handlers ...

async def run_bot() -> None:
    application = Application.builder().token(BOT_TOKEN).build()
    
    # Conversation Handler for adding product
    add_conv = ConversationHandler(
        entry_points=[CommandHandler("addproduct", start_add_product)],
        states={
            ADD_NAME: [MessageHandler(filters.TEXT & ~filters.COMMAND, get_name)],
            ADD_PRICE: [MessageHandler(filters.TEXT & ~filters.COMMAND, get_price)],
            ADD_DESC: [MessageHandler(filters.TEXT & ~filters.COMMAND, get_desc)],
            ADD_IMAGE: [MessageHandler(filters.PHOTO | filters.Regex('^skip$'), get_image)],
        },
        fallbacks=[CommandHandler("cancel", cancel)]
    )
    
    application.add_handler(add_conv)
    application.add_handler(CommandHandler("start", start))
    application.add_handler(CommandHandler("removeproduct", remove_product))
    application.add_handler(CallbackQueryHandler(button_handler))
    
    print(f"Bot with Image Support starting...")
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
