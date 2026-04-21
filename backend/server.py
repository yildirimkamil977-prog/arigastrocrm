"""ArıCRM - FastAPI backend"""
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import logging
from datetime import datetime, timezone

from fastapi import FastAPI, APIRouter
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient

from auth import hash_password, verify_password
from models import uid
from routes.auth_routes import build_auth_router
from routes.users import build_users_router
from routes.customers import build_customers_router
from routes.products import build_products_router
from routes.quotes import build_quotes_router, build_public_pdf_router
from routes.settings import build_settings_router, get_settings_doc
from feed_sync import start_daily_scheduler

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# MongoDB
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

app = FastAPI(title="ArıCRM API")

api_router = APIRouter(prefix="/api")


@api_router.get("/")
async def root():
    return {"service": "ArıCRM", "status": "ok"}


# register routers
api_router.include_router(build_auth_router(db))
api_router.include_router(build_users_router(db))
api_router.include_router(build_customers_router(db))
api_router.include_router(build_products_router(db))
api_router.include_router(build_quotes_router(db))
api_router.include_router(build_public_pdf_router(db))
api_router.include_router(build_settings_router(db))

app.include_router(api_router)

# CORS
cors_origins_raw = os.environ.get("CORS_ORIGINS", "*")
cors_origins = ["*"] if cors_origins_raw.strip() == "*" else cors_origins_raw.split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_origin_regex=r"https?://.*",
    allow_methods=["*"],
    allow_headers=["*"],
)


async def seed_admin():
    email = os.environ.get("ADMIN_EMAIL", "admin@arigastro.com").lower().strip()
    password = os.environ.get("ADMIN_PASSWORD", "admin123")
    name = os.environ.get("ADMIN_NAME", "Sistem Yöneticisi")
    existing = await db.users.find_one({"email": email})
    now = datetime.now(timezone.utc).isoformat()
    if existing is None:
        await db.users.insert_one({
            "id": uid(),
            "email": email,
            "name": name,
            "role": "admin",
            "password_hash": hash_password(password),
            "created_at": now,
        })
        logger.info(f"Admin user seeded: {email}")
    else:
        if not verify_password(password, existing.get("password_hash", "")):
            await db.users.update_one(
                {"email": email},
                {"$set": {"password_hash": hash_password(password), "role": "admin", "name": name}},
            )
            logger.info("Admin password updated from .env")


@app.on_event("startup")
async def startup():
    # indexes
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    await db.customers.create_index("id", unique=True)
    await db.customers.create_index("company_name")
    await db.customers.create_index("tax_number")
    await db.products.create_index("id", unique=True)
    await db.products.create_index("code")
    await db.products.create_index([("title", "text"), ("code", "text")])
    await db.quotes.create_index("id", unique=True)
    await db.quotes.create_index("quote_no", unique=True)
    await db.quotes.create_index("customer_id")
    await db.quotes.create_index("status")
    await db.quotes.create_index("created_at")

    await seed_admin()
    # ensure default settings
    await get_settings_doc(db)
    # start daily feed sync
    await start_daily_scheduler(db)
    logger.info("ArıCRM API started")


@app.on_event("shutdown")
async def shutdown():
    client.close()
