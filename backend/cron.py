"""Background cleanup tasks: run once an hour to archive expired data."""
import asyncio
import logging
from datetime import datetime, timezone, timedelta
from db import db

logger = logging.getLogger(__name__)

CLEAN_INTERVAL_SECONDS = 3600  # 1 hour


async def _cleanup_once():
    today = datetime.now(timezone.utc).date()
    keep_after = (today - timedelta(days=2)).isoformat()  # keep yesterday + today

    # 1. Archive vip_slots older than 2 days
    r1 = await db.vip_slots.delete_many({"date": {"$lt": keep_after}})

    # 2. Mark stale pending payment_transactions (>1h old) as expired
    one_hour_ago = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
    r2 = await db.payment_transactions.update_many(
        {"payment_status": "initiated", "created_at": {"$lt": one_hour_ago}},
        {"$set": {"payment_status": "expired"}},
    )

    # 3. Optional: clean notifications older than 30 days
    thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    r3 = await db.notifications.delete_many({"created_at": {"$lt": thirty_days_ago}})

    logger.info(
        "Cron cleanup: vip_slots removed=%d, payments expired=%d, notifications removed=%d",
        r1.deleted_count, r2.modified_count, r3.deleted_count,
    )


async def cron_loop():
    """Run cleanup every hour. Tolerate failures."""
    while True:
        try:
            await _cleanup_once()
        except Exception as e:  # noqa: BLE001
            logger.warning("Cron cleanup error: %s", e)
        await asyncio.sleep(CLEAN_INTERVAL_SECONDS)


def start_cron(loop_task_holder: list):
    """Start background cron task and stash handle so it can be cancelled on shutdown."""
    task = asyncio.create_task(cron_loop())
    loop_task_holder.append(task)
    return task
