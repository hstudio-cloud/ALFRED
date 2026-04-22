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
categories_collection = db.financial_categories
bills_collection = db.financial_bills
accounts_collection = db.financial_accounts
cards_collection = db.credit_cards
subscriptions_collection = db.saas_subscriptions
payments_collection = db.billing_payments
automation_logs_collection = db.automation_logs
user_memories_collection = db.user_memories
statement_imports_collection = db.statement_imports
employees_collection = db.employees
attendance_collection = db.attendance_records
payroll_runs_collection = db.payroll_runs
open_finance_connections_collection = db.open_finance_connections
open_finance_accounts_collection = db.open_finance_accounts
open_finance_transactions_collection = db.open_finance_transactions
