"""Pydantic models for PunyaVerse."""
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, EmailStr, ConfigDict
import uuid


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_id() -> str:
    return str(uuid.uuid4())


# ============== AUTH ==============
class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(min_length=6)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    name: str
    email: str
    role: str  # user | employee | admin | superadmin
    created_at: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ============== TEMPLE ==============
class TempleBase(BaseModel):
    name: str
    region: str  # north_india | east_india | west_india | central_india | south_india | nepal | kailash
    state_or_country: str
    deity: Optional[str] = None
    significance: Optional[str] = None
    history: Optional[str] = None
    best_season: Optional[str] = None
    darshan_timings: Optional[str] = None
    vip_darshan: bool = False
    elevation_m: Optional[int] = None
    nearest_airport: Optional[str] = None
    nearest_railway: Optional[str] = None
    image_url: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    requires_trek: bool = False
    trek_distance_km: Optional[float] = None
    trek_difficulty: Optional[str] = None
    avg_rating: float = 4.5
    festival_dates: List[str] = Field(default_factory=list)
    is_active: bool = True


class TempleOut(TempleBase):
    id: str
    slug: str


class TempleCreate(BaseModel):
    name: str
    slug: str
    region: str
    state_or_country: str
    deity: Optional[str] = None
    significance: Optional[str] = None
    history: Optional[str] = None
    best_season: Optional[str] = None
    darshan_timings: Optional[str] = None
    vip_darshan: Optional[bool] = False
    elevation_m: Optional[int] = None
    nearest_airport: Optional[str] = None
    nearest_railway: Optional[str] = None
    image_url: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    requires_trek: Optional[bool] = False
    trek_distance_km: Optional[float] = None
    trek_difficulty: Optional[str] = None
    avg_rating: Optional[float] = 4.5
    festival_dates: List[str] = Field(default_factory=list)
    is_active: Optional[bool] = True


class TempleUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    region: Optional[str] = None
    state_or_country: Optional[str] = None
    deity: Optional[str] = None
    significance: Optional[str] = None
    history: Optional[str] = None
    best_season: Optional[str] = None
    darshan_timings: Optional[str] = None
    vip_darshan: Optional[bool] = None
    elevation_m: Optional[int] = None
    nearest_airport: Optional[str] = None
    nearest_railway: Optional[str] = None
    image_url: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    requires_trek: Optional[bool] = None
    trek_distance_km: Optional[float] = None
    trek_difficulty: Optional[str] = None
    avg_rating: Optional[float] = None
    festival_dates: Optional[List[str]] = None
    is_active: Optional[bool] = None


# ============== PACKAGE ==============
class PackageBase(BaseModel):
    title: str
    slug: str
    summary: str
    duration_days: int
    base_price_inr: float
    luxury_price_inr: Optional[float] = None
    region: str
    transport_modes: List[str] = Field(default_factory=list)  # train, flight, bus, helicopter
    temples_included: List[str] = Field(default_factory=list)
    inclusions: List[str] = Field(default_factory=list)
    exclusions: List[str] = Field(default_factory=list)
    cancellation_policy: str = "Free cancellation up to 30 days before departure."
    hero_image: Optional[str] = None
    highlights: List[str] = Field(default_factory=list)
    difficulty: str = "easy"
    category: str = "pilgrimage"  # pilgrimage | trekking | helicopter
    is_active: bool = True


class PackageOut(PackageBase):
    id: str


# ============== BOOKING ==============
class BookingCreate(BaseModel):
    package_id: str
    travelers: int = 1
    departure_date: Optional[str] = None
    luxury_tier: bool = False
    notes: Optional[str] = None


class BookingOut(BaseModel):
    id: str
    user_id: str
    user_name: str
    user_email: str
    package_id: str
    package_title: str
    travelers: int
    departure_date: Optional[str]
    luxury_tier: bool
    total_amount_inr: float
    status: str  # pending_payment | confirmed | cancelled | refunded | assigned
    payment_session_id: Optional[str] = None
    assigned_employee_id: Optional[str] = None
    notes: Optional[str] = None
    created_at: str


# ============== TRIP BUILDER ==============
class CustomTripRequest(BaseModel):
    temples: List[str]  # temple ids in order
    transport: str = "train"  # train | flight | helicopter | bus
    hotel_tier: str = "standard"  # budget | standard | luxury
    days: int = 7
    travelers: int = 2
    senior_citizens: int = 0
    children: int = 0
    notes: Optional[str] = None


class CustomTripQuote(BaseModel):
    total_inr: float
    breakdown: Dict[str, float]
    suggested_order: List[str]
    duration_days: int
    travelers: int


# ============== AI PLANNER ==============
class AIPlanRequest(BaseModel):
    prompt: str
    budget_inr: Optional[float] = None
    days: Optional[int] = None
    travelers: Optional[int] = None
    elderly: bool = False
    session_id: Optional[str] = None


class AIPlanResponse(BaseModel):
    plan: str
    model_used: str
    session_id: str
    fallback_chain: List[str]


# ============== TRANSPORT COMPARE ==============
class TransportCompareRequest(BaseModel):
    origin: str
    destination: str


class TransportOption(BaseModel):
    mode: str  # train | flight | helicopter | bus
    price_inr: float
    duration: str
    comfort: str
    recommended: bool = False
    notes: Optional[str] = None


# ============== REVIEW ==============
class ReviewCreate(BaseModel):
    temple_id: Optional[str] = None
    package_id: Optional[str] = None
    rating: int = Field(ge=1, le=5)
    comment: str


class ReviewOut(BaseModel):
    id: str
    user_id: str
    user_name: str
    temple_id: Optional[str]
    package_id: Optional[str]
    rating: int
    comment: str
    created_at: str


# ============== PAYMENT ==============
class CheckoutRequest(BaseModel):
    booking_id: str
    origin_url: str


class CheckoutResponse(BaseModel):
    url: str
    session_id: str


# ============== ADMIN ==============
class AdminUserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None


class PackageCreate(BaseModel):
    title: str
    slug: str
    summary: str
    duration_days: int
    base_price_inr: float
    luxury_price_inr: Optional[float] = None
    region: str
    transport_modes: List[str] = Field(default_factory=list)
    temples_included: List[str] = Field(default_factory=list)
    inclusions: List[str] = Field(default_factory=list)
    exclusions: List[str] = Field(default_factory=list)
    cancellation_policy: Optional[str] = "Free cancellation up to 30 days before departure."
    hero_image: Optional[str] = None
    highlights: List[str] = Field(default_factory=list)
    difficulty: Optional[str] = "easy"
    category: Optional[str] = "pilgrimage"
    is_active: Optional[bool] = True


class PackageUpdate(BaseModel):
    title: Optional[str] = None
    slug: Optional[str] = None
    summary: Optional[str] = None
    duration_days: Optional[int] = None
    base_price_inr: Optional[float] = None
    luxury_price_inr: Optional[float] = None
    region: Optional[str] = None
    transport_modes: Optional[List[str]] = None
    temples_included: Optional[List[str]] = None
    inclusions: Optional[List[str]] = None
    exclusions: Optional[List[str]] = None
    cancellation_policy: Optional[str] = None
    hero_image: Optional[str] = None
    highlights: Optional[List[str]] = None
    difficulty: Optional[str] = None
    category: Optional[str] = None
    is_active: Optional[bool] = None


class AnalyticsOut(BaseModel):
    total_users: int
    total_employees: int
    total_admins: int
    total_bookings: int
    total_revenue_inr: float
    bookings_by_status: Dict[str, int]
    revenue_by_region: Dict[str, float]
    top_packages: List[Dict[str, Any]]
