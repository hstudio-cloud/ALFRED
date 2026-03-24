from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Collections
users_collection = db.users
tasks_collection = db.tasks
habits_collection = db.habits
projects_collection = db.projects
reminders_collection = db.reminders
transactions_collection = db.transactions
chat_messages_collection = db.chat_messages
