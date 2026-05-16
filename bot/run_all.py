import subprocess
import time
import sys
import os

def run_bots():
    print("🚀 Starting both bots (User Bot & Admin Bot)...")
    
    # Path to the bot directory
    bot_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Start User Bot
    print("⏳ Starting User Bot...")
    user_bot = subprocess.Popen([sys.executable, os.path.join(bot_dir, "bot.py")])
    
    # Start Admin Bot
    print("⏳ Starting Admin Bot...")
    admin_bot = subprocess.Popen([sys.executable, os.path.join(bot_dir, "admin_bot.py")])
    
    print("\n🚀 BOTH BOTS ARE NOW RUNNING!")
    print("---------------------------------------")
    print("🤖 User Bot: Handle Store & Customers")
    print("🛠 Admin Bot: Handle Logs & Management")
    print("---------------------------------------\n")
    
    try:
        while True:
            time.sleep(5)
            if user_bot.poll() is not None:
                print("⚠️ User Bot stopped. Restarting...")
                user_bot = subprocess.Popen([sys.executable, os.path.join(bot_dir, "bot.py")])
            if admin_bot.poll() is not None:
                print("⚠️ Admin Bot stopped. Restarting...")
                admin_bot = subprocess.Popen([sys.executable, os.path.join(bot_dir, "admin_bot.py")])
    except KeyboardInterrupt:
        print("\n🛑 Stopping both bots...")
        user_bot.terminate()
        admin_bot.terminate()

if __name__ == "__main__":
    run_bots()
