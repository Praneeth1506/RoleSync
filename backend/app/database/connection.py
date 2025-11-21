import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URL = os.getenv("MONGO_URL")
DB_NAME = os.getenv("DB_NAME")

if not MONGO_URL:
    raise RuntimeError("MONGO_URL not set in .env")

client = MongoClient(MONGO_URL)
db = client[DB_NAME]


