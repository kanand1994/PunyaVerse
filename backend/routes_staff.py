"""Employee, Admin and hidden SuperAdmin routes."""
import os
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Depends, Header
from db import db
from auth import require_roles, get_current_user, hash_password
from models import AdminUserUpdate, new_id, utc_now_iso

router = APIRouter(prefix="/api", tags=["staff"])

SUPERADMIN_PORTAL_PATH = os.environ.get("SUPERADMIN_PORTAL_PATH", "sanctum-portal-7821")


# ============ EMPLOYEE ============
@router.get("/employee/bookings")
async def employee_bookings(user=Depends(require_roles("employee", "admin", "superadmin"))):
    """Bookings assigned to this employee or all if admin."""
    if user["role"] == "employee":
        q = {"assigned_employee_id": user["id"]}
    else:
        q = {}
    rows = await db.bookings.find(q, {"_id": 0}).to_list(500)
    rows.sort(key=lambda r: r["created_at"], reverse=True)
    return rows


@router.post("/employee/bookings/{booking_id}/confirm")
async def employee_confirm(booking_id: str,
                            user=Depends(require_roles("employee", "admin", "superadmin"))):
    b = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not b:
        raise HTTPException(status_code=404, detail="Booking not found")
    await db.bookings.update_one({"id": booking_id},
                                   {"$set": {"status": "confirmed"}})
    try:
        from routes_extra import notify_user
        await notify_user(b["user_id"], {
            "type": "booking_confirmed",
            "title": "Booking confirmed",
            "message": f"Your booking has been confirmed by our team.",
            "booking_id": booking_id,
        })
    except Exception:  # noqa: BLE001
        pass
    return {"ok": True}


@router.post("/employee/bookings/{booking_id}/refund")
async def employee_refund(booking_id: str,
                           user=Depends(require_roles("employee", "admin", "superadmin"))):
    b = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not b:
        raise HTTPException(status_code=404, detail="Booking not found")
    await db.bookings.update_one({"id": booking_id},
                                   {"$set": {"status": "refunded"}})
    return {"ok": True}


# ============ ADMIN ============
@router.get("/admin/users")
async def admin_users(user=Depends(require_roles("admin", "superadmin"))):
    # Admins should NOT see SuperAdmins; SuperAdmin sees all
    if user["role"] == "admin":
        q = {"role": {"$nin": ["superadmin"]}}
    else:
        q = {}
    rows = await db.users.find(q, {"_id": 0, "password": 0}).to_list(1000)
    rows.sort(key=lambda r: r.get("created_at", ""), reverse=True)
    return rows


@router.patch("/admin/users/{user_id}")
async def admin_update_user(user_id: str, payload: AdminUserUpdate,
                              user=Depends(require_roles("admin", "superadmin"))):
    target = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    
    # 1. If target is admin or superadmin, only superadmin can modify
    if target["role"] in ("admin", "superadmin") and user["role"] != "superadmin":
        raise HTTPException(status_code=403, detail="Only superadmin can modify admin or superadmin accounts")
        
    # 2. If changing role to admin or superadmin, only superadmin can do so
    if payload.role in ("admin", "superadmin") and user["role"] != "superadmin":
        raise HTTPException(status_code=403, detail="Only superadmin can elevate users to admin or superadmin")
        
    # 3. Prevent modifying self-role
    if user_id == user["id"] and payload.role and payload.role != user["role"]:
        raise HTTPException(status_code=400, detail="Cannot change your own role")
        
    update = {k: v for k, v in payload.model_dump().items() if v is not None}
    if "email" in update:
        update["email"] = update["email"].lower().strip()
        existing = await db.users.find_one({"email": update["email"], "id": {"$ne": user_id}})
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")
            
    if update:
        await db.users.update_one({"id": user_id}, {"$set": update})
    return {"ok": True}


@router.post("/admin/users")
async def admin_create_user(payload: dict,
                            user=Depends(require_roles("admin", "superadmin"))):
    role = payload.get("role", "user")
    if role not in ("user", "employee", "admin", "superadmin"):
        raise HTTPException(status_code=400, detail="Invalid role")
    
    # Only superadmin can create admins/superadmins
    if role in ("admin", "superadmin") and user["role"] != "superadmin":
        raise HTTPException(status_code=403, detail="Only superadmin can create admin or superadmin accounts")
        
    email = payload.get("email", "").lower().strip()
    if not email or not payload.get("password") or not payload.get("name"):
        raise HTTPException(status_code=400, detail="name, email, and password are required")
        
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already in use")
        
    doc = {
        "id": new_id(),
        "name": payload["name"],
        "email": email,
        "password": hash_password(payload["password"]),
        "role": role,
        "is_active": payload.get("is_active", True),
        "created_at": utc_now_iso(),
    }
    await db.users.insert_one(doc)
    return {"id": doc["id"], "name": doc["name"], "email": doc["email"], "role": doc["role"], "is_active": doc["is_active"]}


@router.delete("/admin/users/{user_id}")
async def admin_delete_user(user_id: str,
                            user=Depends(require_roles("admin", "superadmin"))):
    if user_id == user["id"]:
        raise HTTPException(status_code=400, detail="Cannot delete self")
        
    target = await db.users.find_one({"id": user_id})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
        
    # If target is admin or superadmin, only superadmin can delete
    if target["role"] in ("admin", "superadmin") and user["role"] != "superadmin":
        raise HTTPException(status_code=403, detail="Only superadmin can delete admin or superadmin accounts")
        
    await db.users.delete_one({"id": user_id})
    
    # Log audit event
    await db.audit_logs.insert_one({
        "id": new_id(),
        "actor_id": user["id"],
        "actor_email": user["email"],
        "action": "delete_user",
        "target_user_id": user_id,
        "created_at": utc_now_iso(),
    })
    return {"ok": True}


@router.post("/admin/employees")
async def admin_create_employee(payload: dict,
                                  user=Depends(require_roles("admin", "superadmin"))):
    email = payload.get("email", "").lower()
    if not email or not payload.get("password") or not payload.get("name"):
        raise HTTPException(status_code=400, detail="name, email, password required")
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already in use")
    doc = {
        "id": new_id(),
        "name": payload["name"],
        "email": email,
        "password": hash_password(payload["password"]),
        "role": "employee",
        "is_active": True,
        "created_at": utc_now_iso(),
    }
    await db.users.insert_one(doc)
    return {"id": doc["id"], "name": doc["name"], "email": doc["email"], "role": "employee"}


@router.post("/admin/bookings/{booking_id}/assign/{employee_id}")
async def admin_assign(booking_id: str, employee_id: str,
                         user=Depends(require_roles("admin", "superadmin"))):
    emp = await db.users.find_one({"id": employee_id, "role": "employee"})
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    await db.bookings.update_one({"id": booking_id},
                                   {"$set": {"assigned_employee_id": employee_id,
                                              "status": "assigned"}})
    return {"ok": True}


@router.get("/admin/bookings")
async def admin_bookings(user=Depends(require_roles("admin", "superadmin"))):
    rows = await db.bookings.find({}, {"_id": 0}).to_list(2000)
    rows.sort(key=lambda r: r["created_at"], reverse=True)
    return rows


@router.get("/admin/analytics")
async def admin_analytics(user=Depends(require_roles("admin", "superadmin"))):
    users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(5000)
    bookings = await db.bookings.find({}, {"_id": 0}).to_list(5000)
    packages = await db.packages.find({}, {"_id": 0}).to_list(500)

    total_users = sum(1 for u in users if u["role"] == "user")
    total_employees = sum(1 for u in users if u["role"] == "employee")
    total_admins = sum(1 for u in users if u["role"] == "admin")
    total_revenue = sum(b["total_amount_inr"] for b in bookings if b["status"] in ("confirmed", "assigned"))

    bookings_by_status: dict = {}
    revenue_by_region: dict = {}
    package_count: dict = {}
    for b in bookings:
        bookings_by_status[b["status"]] = bookings_by_status.get(b["status"], 0) + 1
        package_count[b["package_id"]] = package_count.get(b["package_id"], 0) + 1
        if b["status"] in ("confirmed", "assigned"):
            pkg = next((p for p in packages if p["id"] == b["package_id"]), None)
            if pkg:
                revenue_by_region[pkg["region"]] = revenue_by_region.get(pkg["region"], 0) + b["total_amount_inr"]

    top_packages = sorted(package_count.items(), key=lambda kv: kv[1], reverse=True)[:5]
    top = []
    for pid, cnt in top_packages:
        pkg = next((p for p in packages if p["id"] == pid), None)
        if pkg:
            top.append({"title": pkg["title"], "bookings": cnt, "id": pid})

    return {
        "total_users": total_users,
        "total_employees": total_employees,
        "total_admins": total_admins,
        "total_bookings": len(bookings),
        "total_revenue_inr": round(total_revenue, 2),
        "bookings_by_status": bookings_by_status,
        "revenue_by_region": {k: round(v, 2) for k, v in revenue_by_region.items()},
        "top_packages": top,
    }


# ============ HIDDEN SUPERADMIN ============
@router.get("/__sanctum/ping")
async def sanctum_ping(x_sanctum_portal: Optional[str] = Header(default=None)):
    """Used by frontend to validate that the hidden portal path exists.
    Returns 200 only if header matches."""
    if x_sanctum_portal != SUPERADMIN_PORTAL_PATH:
        raise HTTPException(status_code=404, detail="Not found")
    return {"ok": True}


@router.get("/superadmin/users")
async def sa_users(user=Depends(require_roles("superadmin"))):
    rows = await db.users.find({}, {"_id": 0, "password": 0}).to_list(5000)
    rows.sort(key=lambda r: r.get("created_at", ""), reverse=True)
    return rows


@router.post("/superadmin/users/{user_id}/role")
async def sa_set_role(user_id: str, payload: dict,
                       user=Depends(require_roles("superadmin"))):
    new_role = payload.get("role")
    if new_role not in ("user", "employee", "admin", "superadmin"):
        raise HTTPException(status_code=400, detail="invalid role")
    await db.users.update_one({"id": user_id}, {"$set": {"role": new_role}})
    await db.audit_logs.insert_one({
        "id": new_id(),
        "actor_id": user["id"],
        "actor_email": user["email"],
        "action": "set_role",
        "target_user_id": user_id,
        "new_role": new_role,
        "created_at": utc_now_iso(),
    })
    return {"ok": True}


@router.delete("/superadmin/users/{user_id}")
async def sa_delete(user_id: str, user=Depends(require_roles("superadmin"))):
    if user_id == user["id"]:
        raise HTTPException(status_code=400, detail="Cannot delete self")
    await db.users.delete_one({"id": user_id})
    await db.audit_logs.insert_one({
        "id": new_id(),
        "actor_id": user["id"],
        "actor_email": user["email"],
        "action": "delete_user",
        "target_user_id": user_id,
        "created_at": utc_now_iso(),
    })
    return {"ok": True}


@router.get("/superadmin/audit-logs")
async def sa_audit(user=Depends(require_roles("superadmin"))):
    rows = await db.audit_logs.find({}, {"_id": 0}).to_list(1000)
    rows.sort(key=lambda r: r["created_at"], reverse=True)
    return rows


@router.get("/admin/audit-logs")
async def admin_audit(user=Depends(require_roles("admin", "superadmin"))):
    rows = await db.audit_logs.find({}, {"_id": 0}).to_list(1000)
    rows.sort(key=lambda r: r["created_at"], reverse=True)
    return rows


@router.get("/superadmin/system")
async def sa_system(user=Depends(require_roles("superadmin"))):
    return {
        "feature_flags": {
            "ai_planner": True,
            "stripe_payments": bool(os.environ.get("STRIPE_API_KEY")),
            "emergent_llm": bool(os.environ.get("EMERGENT_LLM_KEY")),
            "leaflet_maps": True,
        },
        "ai_fallback_chain": ["openai/gpt-5.2", "anthropic/claude-sonnet-4-5", "gemini/gemini-3-flash-preview"],
        "collections": {
            "users": await db.users.count_documents({}),
            "temples": await db.temples.count_documents({}),
            "packages": await db.packages.count_documents({}),
            "bookings": await db.bookings.count_documents({}),
            "payment_transactions": await db.payment_transactions.count_documents({}),
            "reviews": await db.reviews.count_documents({}),
            "ai_itineraries": await db.ai_itineraries.count_documents({}),
            "audit_logs": await db.audit_logs.count_documents({}),
        },
    }


@router.get("/superadmin/payments")
async def sa_payments(user=Depends(require_roles("superadmin"))):
    rows = await db.payment_transactions.find({}, {"_id": 0}).to_list(5000)
    rows.sort(key=lambda r: r["created_at"], reverse=True)
    return rows


@router.get("/admin/payments")
async def admin_payments(user=Depends(require_roles("admin", "superadmin"))):
    rows = await db.payment_transactions.find({}, {"_id": 0}).to_list(5000)
    rows.sort(key=lambda r: r["created_at"], reverse=True)
    return rows

