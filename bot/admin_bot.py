import logging
import asyncio
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, ContextTypes, MessageHandler, filters, ConversationHandler
from config import ADMIN_BOT_TOKEN, ADMIN_CHAT_ID
from database import Database

# Enable logging
logging.basicConfig(format='%(asctime)s - %(name)s - %(levelname)s - %(message)s', level=logging.INFO)

db = Database()
# Blueprint States
ADD_NAME, ADD_PRICE, ADD_DESC, ADD_IMAGE = range(4)

async def start_admin(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if str(update.effective_user.id) != str(ADMIN_CHAT_ID): return
    await update.message.reply_text(
        "<b>🛡 Welcome to Admin Control Bot</b>\n\n"
        "Commands:\n"
        "• /addproduct - Add new tool to store\n"
        "• /removeproduct Name - Delete a tool",
        parse_mode='HTML'
    )

# --- ADD PRODUCT CONVERSATION ---
async def start_add(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if str(update.effective_user.id) != str(ADMIN_CHAT_ID): return
    blueprint = (
        "<b>🛠 Product Addition Blueprint</b>\n\n"
        "1️⃣ <b>Name:</b> Enter Tool Name\n"
        "2️⃣ <b>Price:</b> Numbers only\n"
        "3️⃣ <b>Description:</b> Tool details\n"
        "4️⃣ <b>Image:</b> Send a Photo\n\n"
        "<b>Step 1: Enter Product Name:</b>"
    )
    await update.message.reply_text(blueprint, parse_mode='HTML')
    return ADD_NAME

async def get_name(update: Update, context: ContextTypes.DEFAULT_TYPE):
    context.user_data['p_name'] = update.message.text
    await update.message.reply_text("💰 <b>Step 2: Enter Price:</b>", parse_mode='HTML')
    return ADD_PRICE

async def get_price(update: Update, context: ContextTypes.DEFAULT_TYPE):
    context.user_data['p_price'] = update.message.text
    await update.message.reply_text("📝 <b>Step 3: Enter Description:</b>", parse_mode='HTML')
    return ADD_DESC

async def get_desc(update: Update, context: ContextTypes.DEFAULT_TYPE):
    context.user_data['p_desc'] = update.message.text
    await update.message.reply_text("🖼 <b>Step 4: Send Product Image (Photo):</b>", parse_mode='HTML')
    return ADD_IMAGE

async def get_image(update: Update, context: ContextTypes.DEFAULT_TYPE):
    image_url = None
    if update.message.photo:
        file = await context.bot.get_file(update.message.photo[-1].file_id)
        image_url = file.file_path
    
    await db.add_plan(
        context.user_data['p_name'],
        context.user_data['p_price'],
        context.user_data['p_desc'],
        image_url=image_url
    )
    
    await update.message.reply_text("✅ <b>Product Added & Live!</b>", parse_mode='HTML')
    return ConversationHandler.END

async def cancel(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("❌ Cancelled.")
    return ConversationHandler.END

# --- REMOVE PRODUCT ---
async def remove_product(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if str(update.effective_user.id) != str(ADMIN_CHAT_ID): return
    name = " ".join(context.args).strip()
    if not name:
        await update.message.reply_text("❌ Use: /removeproduct Name")
        return
    await db.delete_plan(name)
    await update.message.reply_text(f"🗑 <b>Deleted:</b> {name}", parse_mode='HTML')

async def main():
    application = Application.builder().token(ADMIN_BOT_TOKEN).build()
    
    conv_handler = ConversationHandler(
        entry_points=[CommandHandler("addproduct", start_add)],
        states={
            ADD_NAME: [MessageHandler(filters.TEXT & ~filters.COMMAND, get_name)],
            ADD_PRICE: [MessageHandler(filters.TEXT & ~filters.COMMAND, get_price)],
            ADD_DESC: [MessageHandler(filters.TEXT & ~filters.COMMAND, get_desc)],
            ADD_IMAGE: [MessageHandler(filters.PHOTO | filters.Regex('^skip$'), get_image)],
        },
        fallbacks=[CommandHandler("cancel", cancel)]
    )
    
    application.add_handler(conv_handler)
    application.add_handler(CommandHandler("start", start_admin))
    application.add_handler(CommandHandler("removeproduct", remove_product))
    
    print("Admin Control Bot (2nd Bot) is running...")
    async with application:
        await application.initialize()
        await application.start()
        await application.updater.start_polling()
        while True:
            await asyncio.sleep(3600)

if __name__ == "__main__":
    asyncio.run(main())
