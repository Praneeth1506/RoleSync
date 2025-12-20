import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URL = "mongoURL"

if not MONGO_URL:
    raise Exception("❌ MONGO_URL missing in .env")

try:
    client = MongoClient(MONGO_URL)
    db = client["rolesync"]
except Exception as e:
    raise Exception(f"❌ MongoDB connection failed: {e}")
