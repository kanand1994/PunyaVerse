"""Public catalog routes: temples, packages, transport compare, festivals, weather."""
from fastapi import APIRouter, HTTPException, Query, Depends
from typing import Optional, List
from db import db
from pricing import compare_transport, custom_trip_quote, dynamic_package_price
from models import (CustomTripRequest, CustomTripQuote,
                      TransportOption, TempleOut, PackageOut, PackageCreate, PackageUpdate, TempleCreate, TempleUpdate, new_id)
from auth import require_roles

router = APIRouter(prefix="/api", tags=["catalog"])


@router.get("/temples", response_model=List[TempleOut])
async def list_temples(region: Optional[str] = None, q: Optional[str] = None,
                       trekking: Optional[bool] = None, include_inactive: bool = False):
    query = {}
    if not include_inactive:
        query["is_active"] = {"$ne": False}
    if region:
        query["region"] = region
    if trekking is not None:
        query["requires_trek"] = trekking
    if q:
        query["$or"] = [
            {"name": {"$regex": q, "$options": "i"}},
            {"deity": {"$regex": q, "$options": "i"}},
            {"state_or_country": {"$regex": q, "$options": "i"}},
        ]
    rows = await db.temples.find(query, {"_id": 0}).to_list(500)
    return rows


@router.get("/temples/{slug}", response_model=TempleOut)
async def get_temple(slug: str):
    t = await db.temples.find_one({"slug": slug}, {"_id": 0})
    if not t:
        raise HTTPException(status_code=404, detail="Temple not found")
    return t


@router.get("/packages", response_model=List[PackageOut])
async def list_packages(region: Optional[str] = None, category: Optional[str] = None,
                        include_inactive: bool = False):
    query = {}
    if not include_inactive:
        query["is_active"] = {"$ne": False}
    if region:
        query["region"] = region
    if category:
        query["category"] = category
    rows = await db.packages.find(query, {"_id": 0}).to_list(200)
    return rows


@router.get("/packages/{slug}", response_model=PackageOut)
async def get_package(slug: str):
    p = await db.packages.find_one({"slug": slug}, {"_id": 0})
    if not p:
        raise HTTPException(status_code=404, detail="Package not found")
    return p


@router.get("/packages/{slug}/quote")
async def package_quote(slug: str, travelers: int = 2, luxury: bool = False,
                         departure_date: Optional[str] = None):
    p = await db.packages.find_one({"slug": slug}, {"_id": 0})
    if not p:
        raise HTTPException(status_code=404, detail="Package not found")
    quote = dynamic_package_price(
        base_price=p["base_price_inr"],
        luxury_tier=luxury,
        luxury_price=p.get("luxury_price_inr"),
        travelers=travelers,
        departure_date=departure_date,
    )
    return {"package": p, "quote": quote}


@router.post("/transport/compare", response_model=List[TransportOption])
async def transport_compare(payload: dict):
    origin = payload.get("origin", "")
    destination = payload.get("destination", "")
    if not origin or not destination:
        raise HTTPException(status_code=400, detail="origin and destination required")
    return compare_transport(origin, destination)


@router.get("/transport/routes")
async def list_transport_routes():
    from pricing import TRANSPORT_ROUTES
    return [{"key": k, "origin": k.split("-")[0].title(),
             "destination": " ".join(k.split("-")[1:]).title()} for k in TRANSPORT_ROUTES]


@router.post("/trip-builder/quote", response_model=CustomTripQuote)
async def trip_builder_quote(payload: CustomTripRequest):
    # Validate temples exist
    if not payload.temples:
        raise HTTPException(status_code=400, detail="Add at least one temple")
    temples = await db.temples.find({"id": {"$in": payload.temples}}, {"_id": 0}).to_list(100)
    if not temples:
        raise HTTPException(status_code=400, detail="No matching temples found")

    # Suggested order: group by region then by elevation ascending (acclimatisation)
    ordered = sorted(temples, key=lambda t: (t.get("region", "zz"), t.get("elevation_m") or 0))
    suggested = [t["id"] for t in ordered]

    quote = custom_trip_quote(
        temples_count=len(temples),
        transport=payload.transport,
        hotel_tier=payload.hotel_tier,
        days=max(payload.days, len(temples)),
        travelers=payload.travelers,
        senior_citizens=payload.senior_citizens,
        children=payload.children,
    )
    return CustomTripQuote(
        total_inr=quote["total_inr"],
        breakdown=quote["breakdown"],
        suggested_order=suggested,
        duration_days=quote["duration_days"],
        travelers=quote["travelers"],
    )


# ============ FESTIVAL CALENDAR ============
FESTIVALS = [
    {"name": "Maha Shivaratri", "date": "2026-02-15", "temples": ["kashi-vishwanath", "kedarnath", "somnath", "ujjain-mahakaleshwar"], "description": "The great night of Shiva — all-night vigil and abhishek."},
    {"name": "Holi", "date": "2026-03-03", "temples": ["chitrakoot", "haridwar"], "description": "Festival of colours and arrival of spring."},
    {"name": "Ram Navami", "date": "2026-03-26", "temples": ["chitrakoot", "janakpur"], "description": "Birth of Lord Rama."},
    {"name": "Akshaya Tritiya — Char Dham Opening", "date": "2026-04-20", "temples": ["yamunotri", "gangotri", "kedarnath", "badrinath"], "description": "Auspicious opening of the Char Dham."},
    {"name": "Buddha Purnima", "date": "2026-05-01", "temples": ["lumbini", "boudhanath", "sanchi-stupa"], "description": "Birth, enlightenment and parinirvana of Buddha."},
    {"name": "Ganga Dussehra", "date": "2026-05-25", "temples": ["haridwar", "gangotri"], "description": "Celebrates the descent of the Ganga."},
    {"name": "Saga Dawa (Kailash)", "date": "2026-06-10", "temples": ["kailash-mansarovar"], "description": "Buddha's enlightenment day at sacred Kailash."},
    {"name": "Rath Yatra", "date": "2026-07-08", "temples": ["jagannath-puri"], "description": "Chariot festival of Lord Jagannath."},
    {"name": "Shravan Mela", "date": "2026-07-20", "temples": ["amarnath", "baidyanath-dham", "kashi-vishwanath"], "description": "Holy month of Shravan — Kanwar Yatra and Amarnath Yatra."},
    {"name": "Janmashtami", "date": "2026-08-26", "temples": ["dwarkadhish"], "description": "Birth of Lord Krishna."},
    {"name": "Ganesh Chaturthi", "date": "2026-09-04", "temples": ["siddhivinayak"], "description": "Welcome of Lord Ganesha."},
    {"name": "Navratri", "date": "2026-10-12", "temples": ["vaishno-devi", "kamakhya-temple", "kolkata-kali-temple"], "description": "Nine sacred nights of the Devi."},
    {"name": "Diwali", "date": "2026-11-08", "temples": ["haridwar", "chitrakoot"], "description": "Festival of lights and return of Lord Rama."},
    {"name": "Dev Deepawali", "date": "2026-11-23", "temples": ["kashi-vishwanath"], "description": "Diwali of the gods at Varanasi ghats."},
    {"name": "Kartik Purnima", "date": "2026-11-23", "temples": ["somnath", "omkareshwar"], "description": "Holy full moon of Kartik month."},
]


@router.get("/festivals")
async def list_festivals(year: Optional[int] = None):
    return FESTIVALS


# ============ WEATHER (mock smart forecast) ============
@router.get("/weather/{temple_slug}")
async def weather(temple_slug: str):
    """Lightweight weather snapshot keyed off elevation and current month."""
    from datetime import datetime
    t = await db.temples.find_one({"slug": temple_slug}, {"_id": 0})
    if not t:
        raise HTTPException(status_code=404, detail="Temple not found")
    elev = t.get("elevation_m") or 200
    month = datetime.utcnow().month
    if elev > 3000:
        if month in (12, 1, 2, 3):
            base_temp, condition, advice = -8, "Snowfall expected", "Yatra suspended in winter. Heavy snow gear required if visiting."
        elif month in (6, 7, 8):
            base_temp, condition, advice = 10, "Cool monsoon", "Carry rain protection. Risk of landslides."
        else:
            base_temp, condition, advice = 6, "Clear & cold", "Layered clothing, sunscreen, hydration."
    elif elev > 1000:
        base_temp, condition, advice = (18, "Pleasant", "Light woollens for evenings.")
    else:
        if month in (4, 5):
            base_temp, condition, advice = 36, "Hot summer", "Carry water, sun protection, ORS."
        elif month in (6, 7, 8, 9):
            base_temp, condition, advice = 28, "Monsoon", "Carry rain protection."
        else:
            base_temp, condition, advice = 24, "Pleasant", "Ideal weather for darshan."
    crowd = "High" if t.get("vip_darshan") and month in (10, 11, 12, 1) else "Moderate"
    return {
        "temple": t["name"],
        "elevation_m": elev,
        "temp_c": base_temp,
        "condition": condition,
        "advice": advice,
        "crowd_prediction": crowd,
        "month": month,
    }


# ============ CROWD PREDICTION ============
@router.get("/crowd/{temple_slug}")
async def crowd_prediction(temple_slug: str):
    t = await db.temples.find_one({"slug": temple_slug}, {"_id": 0})
    if not t:
        raise HTTPException(status_code=404, detail="Temple not found")
    from datetime import datetime
    month = datetime.utcnow().month
    base = 60
    if t.get("vip_darshan"):
        base += 20
    if month in (10, 11, 12, 1, 4, 5):
        base += 10
    base = min(base, 98)
    return {
        "temple": t["name"],
        "current_load_pct": base,
        "weekend_load_pct": min(base + 10, 99),
        "best_visit_window": "Early morning 4-7 AM",
        "expected_wait_minutes": int(base * 1.8),
    }


# ============ PACKAGES CRUD ============
@router.post("/packages", response_model=PackageOut)
async def create_package(payload: PackageCreate,
                         user=Depends(require_roles("admin", "superadmin"))):
    existing = await db.packages.find_one({"slug": payload.slug})
    if existing:
        raise HTTPException(status_code=400, detail="Package slug already exists")
    
    doc = payload.model_dump()
    doc["id"] = new_id()
    await db.packages.insert_one(doc)
    
    doc.pop("_id", None)
    return doc


@router.patch("/packages/{package_id}", response_model=PackageOut)
async def update_package(package_id: str, payload: PackageUpdate,
                         user=Depends(require_roles("admin", "superadmin"))):
    pkg = await db.packages.find_one({"id": package_id})
    if not pkg:
        raise HTTPException(status_code=404, detail="Package not found")
        
    update = {k: v for k, v in payload.model_dump().items() if v is not None}
    if "slug" in update:
        existing = await db.packages.find_one({"slug": update["slug"], "id": {"$ne": package_id}})
        if existing:
            raise HTTPException(status_code=400, detail="Package slug already in use")
            
    if update:
        await db.packages.update_one({"id": package_id}, {"$set": update})
        
    updated = await db.packages.find_one({"id": package_id}, {"_id": 0})
    return updated


@router.delete("/packages/{package_id}")
async def delete_package(package_id: str,
                         user=Depends(require_roles("admin", "superadmin"))):
    pkg = await db.packages.find_one({"id": package_id})
    if not pkg:
        raise HTTPException(status_code=404, detail="Package not found")
        
    await db.packages.delete_one({"id": package_id})
    return {"ok": True}


# ============ TEMPLES CRUD ============
@router.post("/temples", response_model=TempleOut)
async def create_temple(payload: TempleCreate,
                        user=Depends(require_roles("admin", "superadmin"))):
    existing = await db.temples.find_one({"slug": payload.slug})
    if existing:
        raise HTTPException(status_code=400, detail="Temple slug already exists")
    
    doc = payload.model_dump()
    doc["id"] = new_id()
    await db.temples.insert_one(doc)
    
    doc.pop("_id", None)
    return doc


@router.patch("/temples/{temple_id}", response_model=TempleOut)
async def update_temple(temple_id: str, payload: TempleUpdate,
                        user=Depends(require_roles("admin", "superadmin"))):
    t = await db.temples.find_one({"id": temple_id})
    if not t:
        raise HTTPException(status_code=404, detail="Temple not found")
        
    update = {k: v for k, v in payload.model_dump().items() if v is not None}
    if "slug" in update:
        existing = await db.temples.find_one({"slug": update["slug"], "id": {"$ne": temple_id}})
        if existing:
            raise HTTPException(status_code=400, detail="Temple slug already in use")
            
    if update:
        await db.temples.update_one({"id": temple_id}, {"$set": update})
        
    updated = await db.temples.find_one({"id": temple_id}, {"_id": 0})
    return updated


@router.delete("/temples/{temple_id}")
async def delete_temple(temple_id: str,
                        user=Depends(require_roles("admin", "superadmin"))):
    t = await db.temples.find_one({"id": temple_id})
    if not t:
        raise HTTPException(status_code=404, detail="Temple not found")
        
    await db.temples.delete_one({"id": temple_id})
    return {"ok": True}
