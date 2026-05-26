"""Auth & user routes."""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
from db import db
from models import UserRegister, UserLogin, TokenOut, UserOut, new_id, utc_now_iso
from auth import hash_password, verify_password, create_token, get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=TokenOut)
async def register(payload: UserRegister):
    existing = await db.users.find_one({"email": payload.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user_doc = {
        "id": new_id(),
        "name": payload.name,
        "email": payload.email.lower(),
        "password": hash_password(payload.password),
        "role": "user",
        "is_active": True,
        "created_at": utc_now_iso(),
    }
    await db.users.insert_one(user_doc)
    token = create_token(user_doc["id"], user_doc["role"])
    user_out = UserOut(
        id=user_doc["id"], name=user_doc["name"], email=user_doc["email"],
        role=user_doc["role"], created_at=user_doc["created_at"],
    )
    return TokenOut(access_token=token, user=user_out)


@router.post("/login", response_model=TokenOut)
async def login(payload: UserLogin):
    user = await db.users.find_one({"email": payload.email.lower()})
    if not user or not verify_password(payload.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not user.get("is_active", True):
        raise HTTPException(status_code=403, detail="Account disabled")
    token = create_token(user["id"], user["role"])
    return TokenOut(
        access_token=token,
        user=UserOut(
            id=user["id"], name=user["name"], email=user["email"],
            role=user["role"], created_at=user.get("created_at", utc_now_iso()),
        ),
    )


@router.get("/me", response_model=UserOut)
async def me(user=Depends(get_current_user)):
    return UserOut(
        id=user["id"], name=user["name"], email=user["email"],
        role=user["role"], created_at=user.get("created_at", utc_now_iso()),
    )
