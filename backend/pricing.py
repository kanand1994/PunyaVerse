"""Dynamic pricing engine for packages and transport comparison."""
from datetime import datetime
from typing import Dict


def dynamic_package_price(base_price: float, luxury_tier: bool,
                          luxury_price: float | None,
                          travelers: int,
                          departure_date: str | None) -> Dict:
    """Apply seasonal & demand multipliers."""
    price = (luxury_price if luxury_tier and luxury_price else base_price)
    season_mult = 1.0
    demand_mult = 1.0
    group_discount = 0.0

    # Seasonal premium for peak months (May-Jul, Oct-Nov)
    if departure_date:
        try:
            month = datetime.fromisoformat(departure_date).month
            if month in (5, 6, 7, 10, 11):
                season_mult = 1.15
            elif month in (1, 2, 8):
                season_mult = 0.92
        except Exception:
            pass

    if travelers >= 6:
        group_discount = 0.10
    elif travelers >= 4:
        group_discount = 0.05

    subtotal = price * travelers * season_mult * demand_mult
    discount_amt = subtotal * group_discount
    gst = (subtotal - discount_amt) * 0.05  # 5% GST on tour packages
    total = subtotal - discount_amt + gst

    return {
        "base_per_person": price,
        "travelers": travelers,
        "subtotal": round(subtotal, 2),
        "season_multiplier": season_mult,
        "group_discount_pct": group_discount * 100,
        "group_discount_amount": round(discount_amt, 2),
        "gst_5pct": round(gst, 2),
        "total": round(total, 2),
    }


# Distance + base fares to compute transport comparison
TRANSPORT_ROUTES = {
    "delhi-kedarnath": {
        "train": (3500.0, "18 hours", "Standard"),
        "flight": (12000.0, "3 hours via Dehradun", "Comfortable"),
        "helicopter": (45000.0, "45 minutes via Phata", "Premium"),
        "bus": (1800.0, "22 hours", "Basic"),
    },
    "delhi-badrinath": {
        "train": (3200.0, "16 hours", "Standard"),
        "flight": (11500.0, "3.5 hours via Dehradun", "Comfortable"),
        "helicopter": (52000.0, "50 minutes", "Premium"),
        "bus": (1500.0, "20 hours", "Basic"),
    },
    "mumbai-tirupati": {
        "train": (2400.0, "20 hours", "Standard"),
        "flight": (6500.0, "1.5 hours", "Comfortable"),
        "bus": (1900.0, "26 hours", "Basic"),
    },
    "delhi-vaishno-devi": {
        "train": (1500.0, "10 hours", "Standard"),
        "flight": (5500.0, "1.5 hours via Jammu", "Comfortable"),
        "helicopter": (38000.0, "Katra-Sanjichhat 8 minutes", "Premium"),
        "bus": (1100.0, "12 hours", "Basic"),
    },
    "delhi-kailash-mansarovar": {
        "flight": (45000.0, "Delhi - Kathmandu - Simikot", "Comfortable"),
        "helicopter": (185000.0, "Simikot - Hilsa heli", "Premium"),
    },
    "kathmandu-muktinath": {
        "flight": (15500.0, "Kathmandu-Pokhara-Jomsom", "Comfortable"),
        "helicopter": (52000.0, "Pokhara - Muktinath", "Premium"),
        "bus": (3200.0, "14 hours via jeep", "Basic"),
    },
    "delhi-amarnath": {
        "flight": (9500.0, "Delhi - Srinagar", "Comfortable"),
        "helicopter": (32000.0, "Baltal - Panjtarni", "Premium"),
        "bus": (2200.0, "24 hours", "Basic"),
    },
}


def compare_transport(origin: str, destination: str):
    key = f"{origin.lower().replace(' ', '-')}-{destination.lower().replace(' ', '-')}"
    options_raw = TRANSPORT_ROUTES.get(key)
    if not options_raw:
        # Generic fallback estimate
        options_raw = {
            "train": (2500.0, "Estimated 14-18 hours", "Standard"),
            "flight": (7500.0, "Estimated 2-3 hours", "Comfortable"),
            "bus": (1400.0, "Estimated 18-22 hours", "Basic"),
        }
    cheapest = min(options_raw.items(), key=lambda kv: kv[1][0])[0]
    fastest = min(options_raw.items(), key=lambda kv: hours_from(kv[1][1]))[0]
    out = []
    for mode, (price, dur, comfort) in options_raw.items():
        recommended = mode == fastest if "helicopter" in options_raw else mode == cheapest
        out.append({
            "mode": mode,
            "price_inr": price,
            "duration": dur,
            "comfort": comfort,
            "recommended": recommended,
            "notes": "Fastest" if mode == fastest else ("Cheapest" if mode == cheapest else None),
        })
    return out


def hours_from(text: str) -> float:
    """Crude hours extraction."""
    import re
    m = re.search(r"(\d+(?:\.\d+)?)\s*hour", text)
    if m:
        return float(m.group(1))
    m = re.search(r"(\d+)\s*minutes?", text)
    if m:
        return float(m.group(1)) / 60
    return 999.0


def custom_trip_quote(temples_count: int, transport: str, hotel_tier: str,
                      days: int, travelers: int, senior_citizens: int, children: int) -> Dict:
    transport_rates = {"train": 2200, "bus": 1400, "flight": 7500, "helicopter": 28000}
    hotel_rates = {"budget": 1500, "standard": 3500, "luxury": 8500}
    meal_rate = {"budget": 600, "standard": 1100, "luxury": 2200}.get(hotel_tier, 1100)

    transport_total = transport_rates.get(transport, 2200) * (temples_count + 1) * travelers
    hotel_total = hotel_rates.get(hotel_tier, 3500) * days * (travelers // 2 + travelers % 2)
    meals_total = meal_rate * days * travelers
    darshan_total = 250 * temples_count * travelers
    guide_total = 2500 * days
    senior_assist = 1500 * senior_citizens * days
    child_total = 800 * children * days

    subtotal = transport_total + hotel_total + meals_total + darshan_total + guide_total + senior_assist + child_total
    gst = subtotal * 0.05
    total = subtotal + gst

    return {
        "total_inr": round(total, 2),
        "breakdown": {
            "transport": round(transport_total, 2),
            "hotels": round(hotel_total, 2),
            "meals": round(meals_total, 2),
            "darshan_fees": round(darshan_total, 2),
            "guide": round(guide_total, 2),
            "senior_assistance": round(senior_assist, 2),
            "children_addon": round(child_total, 2),
            "gst_5pct": round(gst, 2),
        },
        "duration_days": days,
        "travelers": travelers,
    }
