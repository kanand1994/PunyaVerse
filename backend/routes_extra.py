"""VIP-related routes/data have been REMOVED per product decision.
Trips are now run in batches with fixed time-slots — no VIP slot inventory.

This module now contains only the non-VIP extras: Razorpay, WebSocket notifications,
notifications API, and route optimization.
"""
import os
import hmac
import hashlib
import logging
from fastapi import APIRouter, HTTPException, Depends, Request, WebSocket, WebSocketDisconnect
import razorpay
from db import db
from auth import get_current_user, decode_token
from models import new_id, utc_now_iso

router = APIRouter(prefix="/api", tags=["extra"])
logger = logging.getLogger(__name__)

RZP_KEY_ID = os.environ.get("RAZORPAY_KEY_ID", "")
RZP_KEY_SECRET = os.environ.get("RAZORPAY_KEY_SECRET", "")
_rzp_client = razorpay.Client(auth=(RZP_KEY_ID, RZP_KEY_SECRET)) if RZP_KEY_ID and RZP_KEY_SECRET else None


# ============ RAZORPAY ============
@router.get("/payments/razorpay/key")
async def razorpay_public_key():
    if not RZP_KEY_ID:
        raise HTTPException(status_code=500, detail="Razorpay not configured")
    return {"key_id": RZP_KEY_ID}


@router.post("/payments/razorpay/order")
async def razorpay_create_order(payload: dict, user=Depends(get_current_user)):
    if not _rzp_client:
        raise HTTPException(status_code=500, detail="Razorpay not configured")
    booking_id = payload.get("booking_id")
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking["user_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Forbidden")

    amount_paise = int(round(float(booking["total_amount_inr"]) * 100))
    receipt = f"pv_{booking_id[:30]}"
    rzp_order = _rzp_client.order.create({
        "amount": amount_paise,
        "currency": "INR",
        "receipt": receipt,
        "notes": {"booking_id": booking_id, "user_id": user["id"]},
    })

    await db.payment_transactions.insert_one({
        "id": new_id(),
        "gateway": "razorpay",
        "session_id": rzp_order["id"],
        "booking_id": booking_id,
        "user_id": user["id"],
        "user_email": user["email"],
        "amount_inr": booking["total_amount_inr"],
        "currency": "INR",
        "payment_status": "initiated",
        "metadata": {"booking_id": booking_id},
        "created_at": utc_now_iso(),
    })
    await db.bookings.update_one({"id": booking_id},
                                   {"$set": {"payment_session_id": rzp_order["id"]}})
    return {
        "order_id": rzp_order["id"],
        "amount": amount_paise,
        "currency": "INR",
        "key_id": RZP_KEY_ID,
        "prefill_name": user["name"],
        "prefill_email": user["email"],
    }


@router.post("/payments/razorpay/verify")
async def razorpay_verify(payload: dict, user=Depends(get_current_user)):
    if not _rzp_client:
        raise HTTPException(status_code=500, detail="Razorpay not configured")
    order_id = payload.get("razorpay_order_id")
    payment_id = payload.get("razorpay_payment_id")
    signature = payload.get("razorpay_signature")
    if not all([order_id, payment_id, signature]):
        raise HTTPException(status_code=400, detail="Missing fields")

    expected = hmac.new(
        RZP_KEY_SECRET.encode(),
        f"{order_id}|{payment_id}".encode(),
        hashlib.sha256,
    ).hexdigest()
    if not hmac.compare_digest(expected, signature):
        await db.payment_transactions.update_one(
            {"session_id": order_id}, {"$set": {"payment_status": "failed"}}
        )
        raise HTTPException(status_code=400, detail="Signature mismatch")

    tx = await db.payment_transactions.find_one({"session_id": order_id}, {"_id": 0})
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")

    await db.payment_transactions.update_one(
        {"session_id": order_id},
        {"$set": {"payment_status": "paid", "payment_id": payment_id}},
    )
    await db.bookings.update_one(
        {"id": tx["booking_id"]}, {"$set": {"status": "confirmed"}}
    )

    await notify_user(tx["user_id"], {
        "type": "booking_confirmed",
        "title": "Yatra confirmed 🙏",
        "message": "Your payment was successful. Booking is now confirmed.",
        "booking_id": tx["booking_id"],
    })
    return {"ok": True, "booking_id": tx["booking_id"]}


@router.post("/webhook/razorpay")
async def razorpay_webhook(request: Request):
    body = await request.body()
    signature = request.headers.get("X-Razorpay-Signature", "")
    secret = os.environ.get("RAZORPAY_WEBHOOK_SECRET", RZP_KEY_SECRET)
    expected = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, signature):
        logger.warning("Razorpay webhook signature mismatch")
        return {"received": False}
    return {"received": True}


# ============ WEBSOCKET NOTIFICATIONS ============
_active_connections: dict = {}


async def notify_user(user_id: str, payload: dict):
    """Push payload to all active WS connections of a user + persist."""
    conns = _active_connections.get(user_id, [])
    dead = []
    for ws in conns:
        try:
            await ws.send_json(payload)
        except Exception:  # noqa: BLE001
            dead.append(ws)
    for ws in dead:
        conns.remove(ws)
    await db.notifications.insert_one({
        "id": new_id(),
        "user_id": user_id,
        "payload": payload,
        "read": False,
        "created_at": utc_now_iso(),
    })


@router.websocket("/ws/notifications")
async def ws_notifications(websocket: WebSocket, token: str = ""):
    await websocket.accept()
    try:
        payload = decode_token(token)
        user_id = payload["sub"]
    except Exception:
        await websocket.send_json({"error": "auth_failed"})
        await websocket.close()
        return

    _active_connections.setdefault(user_id, []).append(websocket)
    try:
        await websocket.send_json({"type": "connected", "user_id": user_id})
        while True:
            msg = await websocket.receive_text()
            if msg == "ping":
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        pass
    except Exception as e:  # noqa: BLE001
        logger.warning("WS error: %s", e)
    finally:
        if user_id in _active_connections and websocket in _active_connections[user_id]:
            _active_connections[user_id].remove(websocket)


@router.get("/notifications/me")
async def my_notifications(user=Depends(get_current_user)):
    rows = await db.notifications.find({"user_id": user["id"]}, {"_id": 0}).to_list(200)
    rows.sort(key=lambda r: r["created_at"], reverse=True)
    return rows


@router.post("/notifications/{nid}/read")
async def mark_read(nid: str, user=Depends(get_current_user)):
    await db.notifications.update_one(
        {"id": nid, "user_id": user["id"]}, {"$set": {"read": True}}
    )
    return {"ok": True}


# ============ OSRM ROUTE ORDERING ============
@router.post("/routes/optimize")
async def optimize_route(payload: dict):
    temple_ids = payload.get("temples", [])
    temples = await db.temples.find({"id": {"$in": temple_ids}}, {"_id": 0}).to_list(50)
    temples.sort(key=lambda t: (t.get("region", "zz"), t.get("elevation_m") or 0))
    stops = [{"id": t["id"], "name": t["name"], "lat": t.get("lat"), "lng": t.get("lng")}
              for t in temples if t.get("lat") and t.get("lng")]
    return {"stops": stops}
