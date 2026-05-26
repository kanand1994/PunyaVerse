"""Razorpay & VIP Darshan slot booking + WebSocket notifications router."""
import os
import hmac
import hashlib
import logging
from typing import List, Optional
from datetime import datetime, timezone
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

    # Notify user via WS
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


# ============ VIP DARSHAN INVENTORY ============
VIP_TEMPLES = ["tirupati-balaji", "kashi-vishwanath", "shirdi-sai-baba",
                "ujjain-mahakaleshwar", "vaishno-devi", "jagannath-puri",
                "siddhivinayak", "kailash-mansarovar"]

SLOT_TIMES = ["04:30 AM", "06:00 AM", "08:30 AM", "11:00 AM", "04:00 PM", "06:30 PM"]


@router.get("/vip-darshan/slots")
async def vip_slots(temple_slug: Optional[str] = None, date: Optional[str] = None):
    """List slots for a temple/date. Lazily seed today's slots."""
    today = date or datetime.now(timezone.utc).date().isoformat()
    if temple_slug:
        temples = [temple_slug] if temple_slug in VIP_TEMPLES else []
    else:
        temples = VIP_TEMPLES

    # Seed missing slots
    for tslug in temples:
        existing = await db.vip_slots.count_documents({"temple_slug": tslug, "date": today})
        if existing == 0:
            temple = await db.temples.find_one({"slug": tslug}, {"_id": 0})
            if not temple:
                continue
            base_price = 1500 if temple.get("vip_darshan") else 800
            for st in SLOT_TIMES:
                await db.vip_slots.insert_one({
                    "id": new_id(),
                    "temple_slug": tslug,
                    "temple_name": temple["name"],
                    "date": today,
                    "time": st,
                    "price_inr": base_price + (200 if st in ("04:30 AM", "06:30 PM") else 0),
                    "capacity": 30,
                    "booked": 0,
                    "created_at": utc_now_iso(),
                })

    query = {"date": today}
    if temple_slug:
        query["temple_slug"] = temple_slug
    rows = await db.vip_slots.find(query, {"_id": 0}).to_list(500)
    rows.sort(key=lambda r: (r["temple_slug"], r["time"]))
    return rows


@router.post("/vip-darshan/book")
async def vip_book(payload: dict, user=Depends(get_current_user)):
    slot_id = payload.get("slot_id")
    travelers = int(payload.get("travelers", 1))
    slot = await db.vip_slots.find_one({"id": slot_id}, {"_id": 0})
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found")
    if slot["booked"] + travelers > slot["capacity"]:
        raise HTTPException(status_code=400, detail="Slot full")

    await db.vip_slots.update_one(
        {"id": slot_id}, {"$inc": {"booked": travelers}}
    )
    booking = {
        "id": new_id(),
        "slot_id": slot_id,
        "user_id": user["id"],
        "user_name": user["name"],
        "user_email": user["email"],
        "temple_slug": slot["temple_slug"],
        "temple_name": slot["temple_name"],
        "date": slot["date"],
        "time": slot["time"],
        "travelers": travelers,
        "amount_inr": slot["price_inr"] * travelers,
        "status": "confirmed",
        "created_at": utc_now_iso(),
    }
    await db.vip_bookings.insert_one(booking)
    booking.pop("_id", None)
    await notify_user(user["id"], {
        "type": "vip_booked",
        "title": f"VIP Darshan booked · {slot['temple_name']}",
        "message": f"{slot['date']} at {slot['time']} for {travelers} pilgrim(s).",
    })
    return booking


@router.get("/vip-darshan/me")
async def vip_my_bookings(user=Depends(get_current_user)):
    rows = await db.vip_bookings.find({"user_id": user["id"]}, {"_id": 0}).to_list(200)
    rows.sort(key=lambda r: r["created_at"], reverse=True)
    return rows


# ============ WEBSOCKET NOTIFICATIONS ============
_active_connections: dict = {}  # user_id -> list[WebSocket]


async def notify_user(user_id: str, payload: dict):
    """Push payload to all active WS connections of a user."""
    conns = _active_connections.get(user_id, [])
    dead = []
    for ws in conns:
        try:
            await ws.send_json(payload)
        except Exception:  # noqa: BLE001
            dead.append(ws)
    for ws in dead:
        conns.remove(ws)
    # Also persist for retrieval if user offline
    await db.notifications.insert_one({
        "id": new_id(),
        "user_id": user_id,
        "payload": payload,
        "read": False,
        "created_at": utc_now_iso(),
    })


@router.websocket("/ws/notifications")
async def ws_notifications(websocket: WebSocket, token: str = ""):
    """Frontend connects with ?token=<jwt>."""
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
            # ping/keepalive
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


# ============ OSRM MULTI-STOP ROUTING ============
@router.post("/routes/optimize")
async def optimize_route(payload: dict):
    """Receive temple ids; return ordered lat/lng polyline coords for OSRM frontend rendering.
    We don't proxy OSRM here — frontend calls public OSRM. We just return ordered stops."""
    temple_ids = payload.get("temples", [])
    temples = await db.temples.find({"id": {"$in": temple_ids}}, {"_id": 0}).to_list(50)
    # Sort by region then elevation for acclimatisation
    temples.sort(key=lambda t: (t.get("region", "zz"), t.get("elevation_m") or 0))
    stops = [{"id": t["id"], "name": t["name"], "lat": t.get("lat"), "lng": t.get("lng")}
              for t in temples if t.get("lat") and t.get("lng")]
    return {"stops": stops}
