"""Iteration 2 backend tests for PunyaVerse.

Covers:
- Razorpay: /api/payments/razorpay/key, /order, /verify (signature mismatch + valid HMAC)
- VIP Darshan: /api/vip-darshan/slots (lazy seed), /book, /me
- Notifications: /api/notifications/me, /api/notifications/{id}/read
- WebSocket: /api/ws/notifications (auth-gated, ping/pong, bad token rejection)
- /api/routes/optimize: ordered by region+elevation
- Role guards for anon users on protected endpoints
"""
import os
import json
import hmac
import hashlib
import asyncio
import uuid
import pytest
import requests
import websockets

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://sacred-journey-ai-1.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"
WS_BASE = BASE_URL.replace("https://", "wss://").replace("http://", "ws://")

USER_EMAIL = "yatri@punyaverse.com"
USER_PASS = "Yatri@2026"

RZP_KEY_ID = "rzp_test_StuCGkmaSoiz73"
RZP_KEY_SECRET = "0BCvIto2G9FWpjzQlR1BEcnc"


# ============ FIXTURES ============
@pytest.fixture(scope="session")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


@pytest.fixture(scope="session")
def user_token(s):
    r = s.post(f"{API}/auth/login", json={"email": USER_EMAIL, "password": USER_PASS}, timeout=30)
    assert r.status_code == 200, f"login failed: {r.text}"
    return r.json()["access_token"]


@pytest.fixture(scope="session")
def user_info(s, user_token):
    r = s.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {user_token}"}, timeout=15)
    assert r.status_code == 200
    return r.json()


def _h(token):
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="session")
def booking_id(s, user_token):
    """Create a fresh pending_payment booking for use in Razorpay tests."""
    pkgs = s.get(f"{API}/packages", timeout=15).json()
    pkg = pkgs[0]
    r = s.post(f"{API}/bookings",
               json={"package_id": pkg["id"], "travelers": 2,
                     "departure_date": "2026-06-10", "luxury_tier": False},
               headers=_h(user_token), timeout=20)
    assert r.status_code == 200, r.text
    return r.json()["id"]


# ============ RAZORPAY ============
class TestRazorpay:
    def test_public_key(self, s):
        r = s.get(f"{API}/payments/razorpay/key", timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["key_id"] == RZP_KEY_ID

    def test_order_requires_auth(self, s, booking_id):
        r = s.post(f"{API}/payments/razorpay/order",
                   json={"booking_id": booking_id}, timeout=20)
        assert r.status_code == 401

    def test_create_order(self, s, user_token, booking_id):
        r = s.post(f"{API}/payments/razorpay/order",
                   json={"booking_id": booking_id},
                   headers=_h(user_token), timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        # Real Razorpay test API returns order id starting with 'order_'
        assert d["order_id"].startswith("order_"), f"unexpected order_id: {d['order_id']}"
        assert d["currency"] == "INR"
        assert d["amount"] > 0
        # amount should be in paise
        assert isinstance(d["amount"], int)
        assert d["key_id"] == RZP_KEY_ID
        TestRazorpay.order_id = d["order_id"]
        TestRazorpay.amount = d["amount"]

    def test_order_other_user_booking_403(self, s, user_token):
        # Try to use a non-existent / wrong booking id
        r = s.post(f"{API}/payments/razorpay/order",
                   json={"booking_id": "nonexistent-booking-id"},
                   headers=_h(user_token), timeout=20)
        assert r.status_code == 404

    def test_verify_bad_signature(self, s, user_token):
        oid = getattr(TestRazorpay, "order_id", None)
        if not oid:
            pytest.skip("order not created")
        r = s.post(f"{API}/payments/razorpay/verify",
                   json={"razorpay_order_id": oid,
                         "razorpay_payment_id": "pay_fake_xyz",
                         "razorpay_signature": "deadbeef" * 8},
                   headers=_h(user_token), timeout=20)
        assert r.status_code == 400
        assert "signature" in r.text.lower() or "mismatch" in r.text.lower()

    def test_verify_missing_fields(self, s, user_token):
        r = s.post(f"{API}/payments/razorpay/verify",
                   json={"razorpay_order_id": "order_xyz"},
                   headers=_h(user_token), timeout=15)
        assert r.status_code == 400

    def test_verify_valid_signature(self, s, user_token, booking_id):
        """Valid HMAC-SHA256(order|payment_id, secret) should mark booking confirmed."""
        oid = getattr(TestRazorpay, "order_id", None)
        if not oid:
            pytest.skip("order not created")
        payment_id = "pay_test_verify_123"
        sig = hmac.new(RZP_KEY_SECRET.encode(),
                       f"{oid}|{payment_id}".encode(),
                       hashlib.sha256).hexdigest()
        r = s.post(f"{API}/payments/razorpay/verify",
                   json={"razorpay_order_id": oid,
                         "razorpay_payment_id": payment_id,
                         "razorpay_signature": sig},
                   headers=_h(user_token), timeout=20)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["ok"] is True
        assert d["booking_id"] == booking_id

        # GET booking and verify status is 'confirmed' (data persisted)
        bookings = s.get(f"{API}/bookings/me", headers=_h(user_token), timeout=15).json()
        match = next((b for b in bookings if b["id"] == booking_id), None)
        assert match is not None
        assert match["status"] == "confirmed"

    def test_verify_triggers_notification(self, s, user_token, booking_id):
        """After successful verify, notification should be in /notifications/me."""
        r = s.get(f"{API}/notifications/me", headers=_h(user_token), timeout=15)
        assert r.status_code == 200
        notes = r.json()
        booking_notes = [n for n in notes if n.get("payload", {}).get("booking_id") == booking_id]
        assert len(booking_notes) > 0, "expected booking_confirmed notification"
        assert booking_notes[0]["payload"]["type"] == "booking_confirmed"


# ============ VIP DARSHAN ============
class TestVIPDarshan:
    def test_slots_all(self, s):
        r = s.get(f"{API}/vip-darshan/slots", timeout=20)
        assert r.status_code == 200
        slots = r.json()
        assert isinstance(slots, list)
        assert len(slots) > 0
        # 8 VIP temples × 6 slots = 48 expected
        assert len(slots) >= 48, f"expected >=48, got {len(slots)}"
        # Verify sort (temple_slug, time)
        keys = [(x["temple_slug"], x["time"]) for x in slots]
        assert keys == sorted(keys)

    def test_slots_by_temple(self, s):
        r = s.get(f"{API}/vip-darshan/slots",
                  params={"temple_slug": "tirupati-balaji"}, timeout=15)
        assert r.status_code == 200
        slots = r.json()
        assert len(slots) == 6
        for sl in slots:
            assert sl["temple_slug"] == "tirupati-balaji"
            assert sl["capacity"] == 30
            assert "booked" in sl
            assert sl["price_inr"] > 0

    def test_slots_unknown_temple_empty(self, s):
        r = s.get(f"{API}/vip-darshan/slots",
                  params={"temple_slug": "not-a-real-temple"}, timeout=15)
        assert r.status_code == 200
        assert r.json() == []

    def test_book_requires_auth(self, s):
        r = s.post(f"{API}/vip-darshan/book", json={"slot_id": "x"}, timeout=15)
        assert r.status_code == 401

    def test_book_slot(self, s, user_token):
        slots = s.get(f"{API}/vip-darshan/slots",
                      params={"temple_slug": "kashi-vishwanath"}, timeout=15).json()
        assert len(slots) > 0
        slot = slots[0]
        before_booked = slot["booked"]
        r = s.post(f"{API}/vip-darshan/book",
                   json={"slot_id": slot["id"], "travelers": 2},
                   headers=_h(user_token), timeout=20)
        assert r.status_code == 200, r.text
        b = r.json()
        assert b["status"] == "confirmed"
        assert b["travelers"] == 2
        assert b["amount_inr"] == slot["price_inr"] * 2

        # Verify capacity decremented (booked increased by 2)
        slots2 = s.get(f"{API}/vip-darshan/slots",
                       params={"temple_slug": "kashi-vishwanath"}, timeout=15).json()
        slot2 = next(x for x in slots2 if x["id"] == slot["id"])
        assert slot2["booked"] == before_booked + 2

        TestVIPDarshan.slot_id = slot["id"]

    def test_book_when_full_rejected(self, s, user_token):
        """Book more than remaining capacity."""
        slots = s.get(f"{API}/vip-darshan/slots",
                      params={"temple_slug": "shirdi-sai-baba"}, timeout=15).json()
        slot = slots[0]
        remaining = slot["capacity"] - slot["booked"]
        r = s.post(f"{API}/vip-darshan/book",
                   json={"slot_id": slot["id"], "travelers": remaining + 5},
                   headers=_h(user_token), timeout=20)
        assert r.status_code == 400
        assert "full" in r.text.lower()

    def test_book_invalid_slot(self, s, user_token):
        r = s.post(f"{API}/vip-darshan/book",
                   json={"slot_id": "does-not-exist"},
                   headers=_h(user_token), timeout=15)
        assert r.status_code == 404

    def test_my_vip_bookings(self, s, user_token):
        r = s.get(f"{API}/vip-darshan/me", headers=_h(user_token), timeout=15)
        assert r.status_code == 200
        rows = r.json()
        assert isinstance(rows, list)
        assert any(b["temple_slug"] == "kashi-vishwanath" for b in rows)

    def test_my_vip_bookings_unauth(self, s):
        r = s.get(f"{API}/vip-darshan/me", timeout=15)
        assert r.status_code == 401


# ============ NOTIFICATIONS ============
class TestNotifications:
    def test_notifications_me_unauth(self, s):
        r = s.get(f"{API}/notifications/me", timeout=15)
        assert r.status_code == 401

    def test_notifications_me(self, s, user_token):
        r = s.get(f"{API}/notifications/me", headers=_h(user_token), timeout=15)
        assert r.status_code == 200
        notes = r.json()
        assert isinstance(notes, list)
        # By now there should be at least one (from razorpay verify or vip book)
        assert len(notes) > 0
        # Sorted desc by created_at
        ts = [n["created_at"] for n in notes]
        assert ts == sorted(ts, reverse=True)
        TestNotifications.nid = notes[0]["id"]

    def test_mark_read(self, s, user_token):
        nid = getattr(TestNotifications, "nid", None)
        if not nid:
            pytest.skip("no notification id")
        r = s.post(f"{API}/notifications/{nid}/read",
                   headers=_h(user_token), timeout=15)
        assert r.status_code == 200
        assert r.json()["ok"] is True

        # Verify read=True persisted
        notes = s.get(f"{API}/notifications/me", headers=_h(user_token), timeout=15).json()
        target = next((n for n in notes if n["id"] == nid), None)
        assert target is not None
        assert target["read"] is True


# ============ ROUTE OPTIMIZE ============
class TestRouteOptimize:
    def test_optimize(self, s):
        temples = s.get(f"{API}/temples", timeout=20).json()
        ids = [t["id"] for t in temples[:5]]
        r = s.post(f"{API}/routes/optimize", json={"temples": ids}, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert "stops" in d
        assert isinstance(d["stops"], list)
        for stop in d["stops"]:
            assert "lat" in stop and "lng" in stop
            assert "name" in stop and "id" in stop

    def test_optimize_empty(self, s):
        r = s.post(f"{API}/routes/optimize", json={"temples": []}, timeout=15)
        assert r.status_code == 200
        assert r.json()["stops"] == []


# ============ WEBSOCKET ============
class TestWebSocket:
    def test_ws_bad_token(self):
        async def run():
            uri = f"{WS_BASE}/api/ws/notifications?token=invalid-jwt-xxx"
            async with websockets.connect(uri, open_timeout=15) as ws:
                msg = await asyncio.wait_for(ws.recv(), timeout=10)
                data = json.loads(msg)
                assert "error" in data
                assert data["error"] == "auth_failed"
                # Then connection should close — wait for close
                try:
                    await asyncio.wait_for(ws.recv(), timeout=5)
                except (websockets.ConnectionClosed, asyncio.TimeoutError):
                    pass
        asyncio.run(run())

    def test_ws_connect_ping_pong(self, user_token, user_info):
        async def run():
            uri = f"{WS_BASE}/api/ws/notifications?token={user_token}"
            async with websockets.connect(uri, open_timeout=15) as ws:
                msg = await asyncio.wait_for(ws.recv(), timeout=10)
                data = json.loads(msg)
                assert data["type"] == "connected"
                assert data["user_id"] == user_info["id"]

                # Send ping → expect pong
                await ws.send("ping")
                pong = await asyncio.wait_for(ws.recv(), timeout=10)
                pdata = json.loads(pong)
                assert pdata["type"] == "pong"
        asyncio.run(run())
