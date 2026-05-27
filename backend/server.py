"""Main FastAPI server for PunyaVerse."""
import os
import logging
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env", override=True)

# Trigger hot-reload of env variables
from db import db  # noqa: E402
from routes_auth import router as auth_router  # noqa: E402
from routes_catalog import router as catalog_router  # noqa: E402
from routes_app import router as app_router  # noqa: E402
from routes_staff import router as staff_router  # noqa: E402
from routes_extra import router as extra_router  # noqa: E402
from auth import hash_password  # noqa: E402
from seed_data import build_temples, build_packages  # noqa: E402
from models import new_id, utc_now_iso  # noqa: E402
from cron import start_cron  # noqa: E402

logging.basicConfig(level=logging.INFO,
                    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


async def seed_db():
    """Seed temples, packages, and admin/superadmin accounts."""
    # Temples
    count = await db.temples.count_documents({})
    if count == 0:
        await db.temples.insert_many(build_temples())
        logger.info("Seeded %d temples", await db.temples.count_documents({}))
    # Packages
    pcount = await db.packages.count_documents({})
    if pcount == 0:
        pkgs = build_packages()
        for p in pkgs:
            p["id"] = p["slug"]
        await db.packages.insert_many(pkgs)
        logger.info("Seeded %d packages", await db.packages.count_documents({}))

    # SuperAdmin (idempotent upsert)
    sa_email = os.environ.get("SUPERADMIN_EMAIL", "sanctum@punyaverse.internal").lower()
    sa_password = os.environ.get("SUPERADMIN_PASSWORD", "ChangeMe!123")
    existing_sa = await db.users.find_one({"email": sa_email})
    if not existing_sa:
        await db.users.insert_one({
            "id": new_id(),
            "name": "PunyaVerse Sanctum",
            "email": sa_email,
            "password": hash_password(sa_password),
            "role": "superadmin",
            "is_active": True,
            "created_at": utc_now_iso(),
        })
        logger.info("Seeded SuperAdmin: %s", sa_email)

    # Demo admin & employee for testing
    demo_seeds = [
        ("Admin Devi", "admin@punyaverse.com", "Admin@2026", "admin"),
        ("Employee Arjun", "employee@punyaverse.com", "Employee@2026", "employee"),
        ("Yatri Demo", "yatri@punyaverse.com", "Yatri@2026", "user"),
    ]
    for name, email, pwd, role in demo_seeds:
        if not await db.users.find_one({"email": email.lower()}):
            await db.users.insert_one({
                "id": new_id(),
                "name": name,
                "email": email.lower(),
                "password": hash_password(pwd),
                "role": role,
                "is_active": True,
                "created_at": utc_now_iso(),
            })
            logger.info("Seeded %s account: %s", role, email)

    # Cleanup any dummy/excess users to keep the dashboard pristine
    allowed_emails = {sa_email.lower()}
    for _, email, _, _ in demo_seeds:
        allowed_emails.add(email.lower())
    
    del_result = await db.users.delete_many({"email": {"$nin": list(allowed_emails)}})
    if del_result.deleted_count > 0:
        logger.info("Cleaned up %d dummy users", del_result.deleted_count)

    # Wipe all old booking, payment, audit logs, reviews, itineraries, and notifications dummy data for clean startup
    await db.bookings.delete_many({})
    await db.payment_transactions.delete_many({})
    await db.audit_logs.delete_many({})
    await db.reviews.delete_many({})
    await db.ai_itineraries.delete_many({})
    await db.notifications.delete_many({})
    logger.info("Wiped dummy bookings, payment transactions, audit logs, reviews, itineraries, and notifications")


@asynccontextmanager
async def lifespan(app: FastAPI):
    await seed_db()
    cron_tasks: list = []
    start_cron(cron_tasks)
    logger.info("Background cron started")
    try:
        yield
    finally:
        for t in cron_tasks:
            t.cancel()


app = FastAPI(title="PunyaVerse API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/")
async def root():
    return {"app": "PunyaVerse", "tagline": "Connecting Every Sacred Path", "status": "ok"}


app.include_router(auth_router)
app.include_router(catalog_router)
app.include_router(app_router)
app.include_router(staff_router)
app.include_router(extra_router)
