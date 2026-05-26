"""Background cleanup + dunning email tasks.
Runs every hour via FastAPI lifespan-managed asyncio task.
"""
import asyncio
import logging
from datetime import datetime, timezone, timedelta
from db import db
from email_service import send_email, expired_payment_html, expired_payment_text

logger = logging.getLogger(__name__)

CLEAN_INTERVAL_SECONDS = 3600  # 1 hour
PUBLIC_URL = "https://punyaverse.com"  # used in resume_url placeholder


async def _drop_vip_collections_once():
    """One-time hard cleanup: drop deprecated VIP collections if present."""
    for coll in ("vip_slots", "vip_bookings"):
        try:
            await db.drop_collection(coll)
            logger.info("Dropped collection %s", coll)
        except Exception as e:  # noqa: BLE001
            logger.debug("Drop %s: %s", coll, e)


async def _expire_stale_payments_and_dun():
    """Mark stale 'initiated' payments as 'expired' and send dunning email exactly once."""
    one_hour_ago = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
    cursor = db.payment_transactions.find(
        {"payment_status": "initiated", "created_at": {"$lt": one_hour_ago}}, {"_id": 0}
    )
    expired_count = 0
    emailed_count = 0
    async for tx in cursor:
        # Atomically flip to expired only if still initiated
        updated = await db.payment_transactions.find_one_and_update(
            {"session_id": tx["session_id"], "payment_status": "initiated"},
            {"$set": {"payment_status": "expired", "expired_at": datetime.now(timezone.utc).isoformat()}},
        )
        if not updated:
            continue
        expired_count += 1

        # Fetch booking info for email
        booking = await db.bookings.find_one({"id": tx["booking_id"]}, {"_id": 0})
        if not booking:
            continue
        # Skip if a dunning email was already sent (idempotency)
        if tx.get("dunning_sent"):
            continue

        resume_url = f"{PUBLIC_URL}/packages/{booking['package_id']}"
        html = expired_payment_html(
            name=booking["user_name"],
            package_title=booking["package_title"],
            amount_inr=float(booking["total_amount_inr"]),
            resume_url=resume_url,
        )
        text = expired_payment_text(
            name=booking["user_name"],
            package_title=booking["package_title"],
            amount_inr=float(booking["total_amount_inr"]),
            resume_url=resume_url,
        )
        email_id = await send_email(
            to=tx["user_email"],
            subject=f"🙏 Your {booking['package_title']} booking is one tap away",
            html=html,
            text=text,
        )
        if email_id:
            emailed_count += 1
            await db.payment_transactions.update_one(
                {"session_id": tx["session_id"]},
                {"$set": {"dunning_sent": True, "dunning_email_id": email_id,
                          "dunning_sent_at": datetime.now(timezone.utc).isoformat()}},
            )

    return expired_count, emailed_count


async def _cleanup_once():
    # Notifications older than 30 days
    thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    r1 = await db.notifications.delete_many({"created_at": {"$lt": thirty_days_ago}})

    # Expire stale payments + send dunning emails
    expired, emailed = await _expire_stale_payments_and_dun()

    logger.info(
        "Cron cleanup: notifications removed=%d, payments expired=%d, dunning emails sent=%d",
        r1.deleted_count, expired, emailed,
    )


async def cron_loop():
    # Run VIP cleanup once at boot
    await _drop_vip_collections_once()
    while True:
        try:
            await _cleanup_once()
        except Exception as e:  # noqa: BLE001
            logger.warning("Cron cleanup error: %s", e)
        await asyncio.sleep(CLEAN_INTERVAL_SECONDS)


def start_cron(loop_task_holder: list):
    task = asyncio.create_task(cron_loop())
    loop_task_holder.append(task)
    return task
