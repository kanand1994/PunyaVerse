"""Booking, AI planner, reviews, payments, user dashboard."""
import os
import logging
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends, Request
from db import db
from auth import get_current_user, require_roles
from models import (BookingCreate, BookingOut, AIPlanRequest, AIPlanResponse,
                      ReviewCreate, ReviewOut, CheckoutRequest,
                      CheckoutResponse, new_id, utc_now_iso)
from pricing import dynamic_package_price
from ai_service import generate_plan
from emergentintegrations.payments.stripe.checkout import (
    StripeCheckout, CheckoutSessionRequest,
)

router = APIRouter(prefix="/api", tags=["app"])
logger = logging.getLogger(__name__)

STRIPE_API_KEY = os.environ.get("STRIPE_API_KEY", "")


# ============ BOOKING ============
@router.post("/bookings", response_model=BookingOut)
async def create_booking(payload: BookingCreate, user=Depends(get_current_user)):
    p = await db.packages.find_one({"id": payload.package_id}, {"_id": 0})
    if not p:
        # try slug
        p = await db.packages.find_one({"slug": payload.package_id}, {"_id": 0})
    if not p:
        raise HTTPException(status_code=404, detail="Package not found")

    quote = dynamic_package_price(
        base_price=p["base_price_inr"],
        luxury_tier=payload.luxury_tier,
        luxury_price=p.get("luxury_price_inr"),
        travelers=payload.travelers,
        departure_date=payload.departure_date,
    )
    booking = {
        "id": new_id(),
        "user_id": user["id"],
        "user_name": user["name"],
        "user_email": user["email"],
        "package_id": p["id"],
        "package_title": p["title"],
        "travelers": payload.travelers,
        "departure_date": payload.departure_date,
        "luxury_tier": payload.luxury_tier,
        "total_amount_inr": quote["total"],
        "price_breakdown": quote,
        "status": "pending_payment",
        "payment_session_id": None,
        "assigned_employee_id": None,
        "notes": payload.notes,
        "created_at": utc_now_iso(),
    }
    await db.bookings.insert_one(booking)
    booking.pop("price_breakdown", None)
    return booking


@router.get("/bookings/me", response_model=List[BookingOut])
async def my_bookings(user=Depends(get_current_user)):
    rows = await db.bookings.find({"user_id": user["id"]}, {"_id": 0, "price_breakdown": 0}).to_list(200)
    rows.sort(key=lambda r: r["created_at"], reverse=True)
    return rows


@router.get("/bookings/{booking_id}", response_model=BookingOut)
async def get_booking(booking_id: str, user=Depends(get_current_user)):
    b = await db.bookings.find_one({"id": booking_id}, {"_id": 0, "price_breakdown": 0})
    if not b:
        raise HTTPException(status_code=404, detail="Booking not found")
    if user["role"] == "user" and b["user_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    return b


# ============ AI PLANNER ============
@router.post("/ai/plan", response_model=AIPlanResponse)
async def ai_plan(payload: AIPlanRequest, user=Depends(get_current_user)):
    session_id = payload.session_id or new_id()
    full_prompt = payload.prompt
    extras = []
    if payload.days:
        extras.append(f"Trip duration: {payload.days} days")
    if payload.travelers:
        extras.append(f"Travelers: {payload.travelers}")
    if payload.budget_inr:
        extras.append(f"Budget: ₹{payload.budget_inr:,.0f}")
    if payload.elderly:
        extras.append("Includes elderly travelers — design accessibility & medical buffers.")
    if extras:
        full_prompt += "\n\nConstraints: " + " | ".join(extras)

    result = await generate_plan(full_prompt, session_id)

    # Store itinerary
    itin = {
        "id": new_id(),
        "user_id": user["id"],
        "session_id": session_id,
        "prompt": payload.prompt,
        "plan_markdown": result["plan"],
        "model_used": result["model_used"],
        "created_at": utc_now_iso(),
    }
    await db.ai_itineraries.insert_one(itin)
    return AIPlanResponse(
        plan=result["plan"],
        model_used=result["model_used"],
        session_id=session_id,
        fallback_chain=result["fallback_chain"],
    )


@router.get("/ai/itineraries/me")
async def my_itineraries(user=Depends(get_current_user)):
    rows = await db.ai_itineraries.find({"user_id": user["id"]}, {"_id": 0}).to_list(100)
    rows.sort(key=lambda r: r["created_at"], reverse=True)
    return rows


# ============ REVIEWS ============
@router.post("/reviews", response_model=ReviewOut)
async def create_review(payload: ReviewCreate, user=Depends(get_current_user)):
    if not payload.temple_id and not payload.package_id:
        raise HTTPException(status_code=400, detail="temple_id or package_id required")
    review = {
        "id": new_id(),
        "user_id": user["id"],
        "user_name": user["name"],
        "temple_id": payload.temple_id,
        "package_id": payload.package_id,
        "rating": payload.rating,
        "comment": payload.comment,
        "created_at": utc_now_iso(),
    }
    await db.reviews.insert_one(review)
    return review


@router.get("/reviews", response_model=List[ReviewOut])
async def list_reviews(temple_id: Optional[str] = None, package_id: Optional[str] = None):
    q = {}
    if temple_id:
        q["temple_id"] = temple_id
    if package_id:
        q["package_id"] = package_id
    rows = await db.reviews.find(q, {"_id": 0}).to_list(200)
    rows.sort(key=lambda r: r["created_at"], reverse=True)
    return rows


# ============ WISHLIST ============
@router.post("/wishlist/{temple_slug}")
async def add_wishlist(temple_slug: str, user=Depends(get_current_user)):
    await db.users.update_one({"id": user["id"]}, {"$addToSet": {"wishlist": temple_slug}})
    return {"ok": True}


@router.delete("/wishlist/{temple_slug}")
async def remove_wishlist(temple_slug: str, user=Depends(get_current_user)):
    await db.users.update_one({"id": user["id"]}, {"$pull": {"wishlist": temple_slug}})
    return {"ok": True}


@router.get("/wishlist")
async def get_wishlist(user=Depends(get_current_user)):
    u = await db.users.find_one({"id": user["id"]}, {"_id": 0, "wishlist": 1})
    slugs = u.get("wishlist", []) if u else []
    temples = await db.temples.find({"slug": {"$in": slugs}}, {"_id": 0}).to_list(200)
    return temples


# ============ PAYMENT ============
@router.post("/payments/checkout", response_model=CheckoutResponse)
async def create_checkout(payload: CheckoutRequest, request: Request,
                            user=Depends(get_current_user)):
    booking = await db.bookings.find_one({"id": payload.booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking["user_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Forbidden")

    if not STRIPE_API_KEY:
        raise HTTPException(status_code=500, detail="Payments not configured")

    # Convert INR → USD approx for stripe test (1 USD ≈ 83 INR)
    usd_amount = round(float(booking["total_amount_inr"]) / 83.0, 2)
    if usd_amount < 0.5:
        usd_amount = 0.5

    host_url = str(request.base_url).rstrip("/")
    webhook_url = f"{host_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)

    success_url = f"{payload.origin_url}/payment/success?session_id={{CHECKOUT_SESSION_ID}}&booking_id={booking['id']}"
    cancel_url = f"{payload.origin_url}/payment/cancel?booking_id={booking['id']}"

    req = CheckoutSessionRequest(
        amount=usd_amount,
        currency="usd",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "booking_id": booking["id"],
            "user_id": user["id"],
            "package_id": booking["package_id"],
            "inr_total": str(booking["total_amount_inr"]),
        },
    )
    session = await stripe_checkout.create_checkout_session(req)

    await db.payment_transactions.insert_one({
        "id": new_id(),
        "session_id": session.session_id,
        "booking_id": booking["id"],
        "user_id": user["id"],
        "user_email": user["email"],
        "amount_usd": usd_amount,
        "amount_inr": booking["total_amount_inr"],
        "currency": "usd",
        "payment_status": "initiated",
        "metadata": {"booking_id": booking["id"], "package_id": booking["package_id"]},
        "created_at": utc_now_iso(),
    })
    await db.bookings.update_one({"id": booking["id"]},
                                   {"$set": {"payment_session_id": session.session_id}})
    return CheckoutResponse(url=session.url, session_id=session.session_id)


@router.get("/payments/status/{session_id}")
async def payment_status(session_id: str, request: Request,
                          user=Depends(get_current_user)):
    if not STRIPE_API_KEY:
        raise HTTPException(status_code=500, detail="Payments not configured")
    tx = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")

    host_url = str(request.base_url).rstrip("/")
    webhook_url = f"{host_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)

    status = await stripe_checkout.get_checkout_status(session_id)

    # Update only if not finalized
    if tx["payment_status"] != "paid":
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {"payment_status": status.payment_status, "status": status.status}},
        )
        if status.payment_status == "paid":
            await db.bookings.update_one(
                {"id": tx["booking_id"]},
                {"$set": {"status": "confirmed"}},
            )

    return {
        "session_id": session_id,
        "status": status.status,
        "payment_status": status.payment_status,
        "amount_total": status.amount_total,
        "currency": status.currency,
        "booking_id": tx["booking_id"],
    }


@router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    if not STRIPE_API_KEY:
        return {"received": False}
    host_url = str(request.base_url).rstrip("/")
    webhook_url = f"{host_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    body = await request.body()
    try:
        result = await stripe_checkout.handle_webhook(
            body, request.headers.get("Stripe-Signature")
        )
        if result.payment_status == "paid":
            tx = await db.payment_transactions.find_one({"session_id": result.session_id})
            if tx and tx.get("payment_status") != "paid":
                await db.payment_transactions.update_one(
                    {"session_id": result.session_id},
                    {"$set": {"payment_status": "paid"}},
                )
                await db.bookings.update_one(
                    {"id": tx["booking_id"]},
                    {"$set": {"status": "confirmed"}},
                )
        return {"received": True}
    except Exception as e:  # noqa: BLE001
        logger.exception("Stripe webhook error: %s", e)
        return {"received": False, "error": str(e)}
