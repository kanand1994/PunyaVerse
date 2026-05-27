"""Pytest configuration and global session teardown database cleanups."""
import os
import asyncio
import pytest
from motor.motor_asyncio import AsyncIOMotorClient
from pathlib import Path
from dotenv import load_dotenv

@pytest.fixture(scope="session", autouse=True)
def cleanup_after_tests():
    # Let all tests run first
    yield
    
    # Session teardown: clean up dummy data after tests complete
    try:
        import threading
        load_dotenv(Path(__file__).parent.parent / ".env")
        
        def run_cleanup():
            client = AsyncIOMotorClient(os.environ["MONGO_URL"])
            db = client[os.environ["DB_NAME"]]
            
            async def do_cleanup():
                sa_email = "sanctum@punyaverse.internal"
                demo_seeds = [
                    "admin@punyaverse.com",
                    "employee@punyaverse.com",
                    "yatri@punyaverse.com",
                ]
                allowed = {sa_email.lower()}
                for email in demo_seeds:
                    allowed.add(email.lower())
                    
                # Purge test accounts, bookings, payments, and logs
                u_res = await db.users.delete_many({"email": {"$nin": list(allowed)}})
                b_res = await db.bookings.delete_many({})
                p_res = await db.payment_transactions.delete_many({})
                l_res = await db.audit_logs.delete_many({})
                r_res = await db.reviews.delete_many({})
                i_res = await db.ai_itineraries.delete_many({})
                n_res = await db.notifications.delete_many({})
                
                print(f"\n[Teardown] Database cleaned up successfully.")
                print(f"  - Users deleted: {u_res.deleted_count}")
                print(f"  - Bookings deleted: {b_res.deleted_count}")
                print(f"  - Payments deleted: {p_res.deleted_count}")
                print(f"  - Logs deleted: {l_res.deleted_count}")
                print(f"  - Reviews deleted: {r_res.deleted_count}")
                print(f"  - Itineraries deleted: {i_res.deleted_count}")
                print(f"  - Notifications deleted: {n_res.deleted_count}")
                
            new_loop = asyncio.new_event_loop()
            asyncio.set_event_loop(new_loop)
            try:
                new_loop.run_until_complete(do_cleanup())
            finally:
                new_loop.close()
                
        # Execute synchronously in a separate thread so it doesn't conflict with any active loop in the main thread
        thread = threading.Thread(target=run_cleanup)
        thread.start()
        thread.join()
    except Exception as e:
        print(f"\n[Teardown Error] Failed to clean up database: {e}")


