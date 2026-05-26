"""End-to-end backend pytest suite for PunyaVerse.

Covers:
- Health, temples, packages, transport, trip-builder, festivals, weather, crowd
- Auth (register/login/me)
- Bookings + Stripe checkout + payment status
- AI Plan (GPT-5.2 with fallback)
- Reviews, Wishlist
- Employee / Admin / SuperAdmin role-based endpoints
- Role hierarchy: admin can't see superadmin user, employee can't access admin, user can't access employee
- Hidden sanctum portal header guard
"""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://sacred-journey-ai-1.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

USER_EMAIL = "yatri@punyaverse.com"
USER_PASS = "Yatri@2026"
EMP_EMAIL = "employee@punyaverse.com"
EMP_PASS = "Employee@2026"
ADMIN_EMAIL = "admin@punyaverse.com"
ADMIN_PASS = "Admin@2026"
SA_EMAIL = "sanctum@punyaverse.internal"
SA_PASS = "K@ilash#Sanctum2026!"

SANCTUM_PATH = "sanctum-portal-7821"


# ============ FIXTURES ============
@pytest.fixture(scope="session")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


def _login(s, email, pwd):
    r = s.post(f"{API}/auth/login", json={"email": email, "password": pwd}, timeout=30)
    return r


@pytest.fixture(scope="session")
def user_token(s):
    r = _login(s, USER_EMAIL, USER_PASS)
    assert r.status_code == 200, f"user login failed: {r.status_code} {r.text}"
    return r.json()["access_token"]


@pytest.fixture(scope="session")
def emp_token(s):
    r = _login(s, EMP_EMAIL, EMP_PASS)
    assert r.status_code == 200, f"emp login failed: {r.status_code} {r.text}"
    return r.json()["access_token"]


@pytest.fixture(scope="session")
def admin_token(s):
    r = _login(s, ADMIN_EMAIL, ADMIN_PASS)
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    return r.json()["access_token"]


@pytest.fixture(scope="session")
def sa_token(s):
    r = _login(s, SA_EMAIL, SA_PASS)
    assert r.status_code == 200, f"superadmin login failed: {r.status_code} {r.text}"
    return r.json()["access_token"]


def _h(token):
    return {"Authorization": f"Bearer {token}"}


# ============ HEALTH & CATALOG ============
class TestHealth:
    def test_root(self, s):
        r = s.get(f"{API}/", timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["app"] == "PunyaVerse"
        assert d["status"] == "ok"


class TestTemples:
    def test_list_temples_count(self, s):
        r = s.get(f"{API}/temples", timeout=20)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) >= 43, f"expected 43 temples, got {len(data)}"

    def test_temple_filter_region(self, s):
        r = s.get(f"{API}/temples", params={"region": "north_india"}, timeout=20)
        assert r.status_code == 200
        for t in r.json():
            assert t["region"] == "north_india"

    def test_temple_filter_trekking(self, s):
        r = s.get(f"{API}/temples", params={"trekking": "true"}, timeout=20)
        assert r.status_code == 200
        for t in r.json():
            assert t["requires_trek"] is True

    def test_temple_search_q(self, s):
        r = s.get(f"{API}/temples", params={"q": "shiva"}, timeout=20)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_temple_get_slug(self, s):
        r = s.get(f"{API}/temples", timeout=20)
        slug = r.json()[0]["slug"]
        r2 = s.get(f"{API}/temples/{slug}", timeout=15)
        assert r2.status_code == 200
        assert r2.json()["slug"] == slug

    def test_temple_404(self, s):
        r = s.get(f"{API}/temples/does-not-exist-xyz", timeout=15)
        assert r.status_code == 404


class TestPackages:
    def test_list_packages_count(self, s):
        r = s.get(f"{API}/packages", timeout=20)
        assert r.status_code == 200
        data = r.json()
        assert len(data) >= 8, f"expected 8 packages, got {len(data)}"

    def test_package_quote(self, s):
        r = s.get(f"{API}/packages", timeout=20)
        slug = r.json()[0]["slug"]
        r2 = s.get(f"{API}/packages/{slug}/quote",
                  params={"travelers": 3, "luxury": "true", "departure_date": "2026-05-01"},
                  timeout=20)
        assert r2.status_code == 200
        d = r2.json()
        assert "package" in d and "quote" in d
        assert d["quote"]["total"] > 0


class TestTransport:
    def test_compare(self, s):
        r = s.post(f"{API}/transport/compare",
                   json={"origin": "delhi", "destination": "kedarnath"},
                   timeout=20)
        assert r.status_code == 200
        opts = r.json()
        assert isinstance(opts, list) and len(opts) > 0
        modes = {o["mode"] for o in opts}
        # Expect a mix; at least one of these
        assert modes & {"train", "flight", "helicopter", "bus"}

    def test_compare_missing(self, s):
        r = s.post(f"{API}/transport/compare", json={}, timeout=15)
        assert r.status_code == 400


class TestTripBuilder:
    def test_quote(self, s):
        temples = s.get(f"{API}/temples", timeout=20).json()
        ids = [t["id"] for t in temples[:3]]
        r = s.post(f"{API}/trip-builder/quote",
                   json={"temples": ids, "transport": "train",
                         "hotel_tier": "standard", "days": 7, "travelers": 2},
                   timeout=20)
        assert r.status_code == 200
        d = r.json()
        assert d["total_inr"] > 0
        assert "breakdown" in d
        assert len(d["suggested_order"]) == len(ids)


class TestFestivalsWeather:
    def test_festivals(self, s):
        r = s.get(f"{API}/festivals", timeout=15)
        assert r.status_code == 200
        assert len(r.json()) >= 10

    def test_weather(self, s):
        r = s.get(f"{API}/weather/kedarnath", timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert "temp_c" in d and "advice" in d

    def test_crowd(self, s):
        r = s.get(f"{API}/crowd/kedarnath", timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert "current_load_pct" in d


# ============ AUTH ============
class TestAuth:
    def test_login_user(self, s):
        r = _login(s, USER_EMAIL, USER_PASS)
        assert r.status_code == 200
        d = r.json()
        assert d["user"]["role"] == "user"
        assert d["access_token"]

    def test_login_invalid(self, s):
        r = _login(s, USER_EMAIL, "wrong-pass")
        assert r.status_code == 401

    def test_register_and_me(self, s):
        email = f"TEST_user_{uuid.uuid4().hex[:8]}@punyaversetest.com"
        r = s.post(f"{API}/auth/register",
                   json={"name": "Test User", "email": email, "password": "Secret@123"},
                   timeout=15)
        assert r.status_code == 200, r.text
        token = r.json()["access_token"]
        r2 = s.get(f"{API}/auth/me", headers=_h(token), timeout=15)
        assert r2.status_code == 200
        assert r2.json()["email"] == email.lower()

    def test_register_duplicate(self, s):
        r = s.post(f"{API}/auth/register",
                   json={"name": "Yatri", "email": USER_EMAIL, "password": USER_PASS},
                   timeout=15)
        assert r.status_code == 400

    def test_me_unauth(self, s):
        r = s.get(f"{API}/auth/me", timeout=15)
        assert r.status_code == 401


# ============ BOOKINGS & PAYMENT ============
class TestBookingsPayment:
    booking_id = None

    def test_create_booking(self, s, user_token):
        pkgs = s.get(f"{API}/packages", timeout=15).json()
        pkg = pkgs[0]
        r = s.post(f"{API}/bookings",
                   json={"package_id": pkg["id"], "travelers": 2,
                         "departure_date": "2026-05-15", "luxury_tier": False},
                   headers=_h(user_token), timeout=20)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["status"] == "pending_payment"
        assert d["total_amount_inr"] > 0
        TestBookingsPayment.booking_id = d["id"]

    def test_my_bookings(self, s, user_token):
        r = s.get(f"{API}/bookings/me", headers=_h(user_token), timeout=15)
        assert r.status_code == 200
        rows = r.json()
        assert any(b["id"] == TestBookingsPayment.booking_id for b in rows)

    def test_bookings_unauth(self, s):
        r = s.get(f"{API}/bookings/me", timeout=15)
        assert r.status_code == 401

    def test_checkout(self, s, user_token):
        assert TestBookingsPayment.booking_id, "booking not created"
        r = s.post(f"{API}/payments/checkout",
                   json={"booking_id": TestBookingsPayment.booking_id,
                         "origin_url": BASE_URL},
                   headers=_h(user_token), timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["session_id"]
        assert "stripe.com" in d["url"]
        TestBookingsPayment.session_id = d["session_id"]

    def test_payment_status(self, s, user_token):
        sid = getattr(TestBookingsPayment, "session_id", None)
        if not sid:
            pytest.skip("no session id")
        r = s.get(f"{API}/payments/status/{sid}",
                  headers=_h(user_token), timeout=20)
        assert r.status_code == 200
        d = r.json()
        assert d["session_id"] == sid
        assert "payment_status" in d


# ============ AI PLAN ============
class TestAIPlan:
    def test_plan(self, s, user_token):
        r = s.post(f"{API}/ai/plan",
                   json={"prompt": "Quick 3-day Char Dham yatra in May for two",
                         "days": 3, "travelers": 2, "budget_inr": 80000},
                   headers=_h(user_token), timeout=90)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["plan"] and len(d["plan"]) > 50
        assert d["model_used"]
        assert isinstance(d["fallback_chain"], list)

    def test_my_itineraries(self, s, user_token):
        r = s.get(f"{API}/ai/itineraries/me", headers=_h(user_token), timeout=20)
        assert r.status_code == 200
        assert isinstance(r.json(), list)


# ============ REVIEWS & WISHLIST ============
class TestReviewsWishlist:
    def test_create_review(self, s, user_token):
        temples = s.get(f"{API}/temples", timeout=15).json()
        tid = temples[0]["id"]
        r = s.post(f"{API}/reviews",
                   json={"temple_id": tid, "rating": 5, "comment": "TEST_review divine"},
                   headers=_h(user_token), timeout=15)
        assert r.status_code == 200, r.text
        assert r.json()["rating"] == 5

    def test_list_reviews(self, s):
        r = s.get(f"{API}/reviews", timeout=15)
        assert r.status_code == 200

    def test_wishlist_flow(self, s, user_token):
        slug = "kedarnath"
        r1 = s.post(f"{API}/wishlist/{slug}", headers=_h(user_token), timeout=15)
        assert r1.status_code == 200
        r2 = s.get(f"{API}/wishlist", headers=_h(user_token), timeout=15)
        assert r2.status_code == 200
        assert any(t["slug"] == slug for t in r2.json())
        r3 = s.delete(f"{API}/wishlist/{slug}", headers=_h(user_token), timeout=15)
        assert r3.status_code == 200


# ============ STAFF: EMPLOYEE / ADMIN / SUPERADMIN ============
class TestRoles:
    def test_employee_bookings(self, s, emp_token):
        r = s.get(f"{API}/employee/bookings", headers=_h(emp_token), timeout=15)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_user_cannot_access_employee(self, s, user_token):
        r = s.get(f"{API}/employee/bookings", headers=_h(user_token), timeout=15)
        assert r.status_code == 403

    def test_employee_cannot_access_admin(self, s, emp_token):
        r = s.get(f"{API}/admin/users", headers=_h(emp_token), timeout=15)
        assert r.status_code == 403

    def test_admin_users_excludes_superadmin(self, s, admin_token):
        r = s.get(f"{API}/admin/users", headers=_h(admin_token), timeout=20)
        assert r.status_code == 200
        users = r.json()
        roles = {u["role"] for u in users}
        assert "superadmin" not in roles, "admin should NOT see superadmin"

    def test_admin_bookings(self, s, admin_token):
        r = s.get(f"{API}/admin/bookings", headers=_h(admin_token), timeout=20)
        assert r.status_code == 200

    def test_admin_analytics(self, s, admin_token):
        r = s.get(f"{API}/admin/analytics", headers=_h(admin_token), timeout=20)
        assert r.status_code == 200
        d = r.json()
        for k in ("total_users", "total_employees", "total_admins", "total_bookings",
                  "total_revenue_inr", "bookings_by_status", "revenue_by_region",
                  "top_packages"):
            assert k in d

    def test_admin_create_employee_and_assign(self, s, admin_token):
        email = f"TEST_emp_{uuid.uuid4().hex[:8]}@punyaversetest.com"
        r = s.post(f"{API}/admin/employees",
                   json={"name": "Test Emp", "email": email, "password": "Pass@1234"},
                   headers=_h(admin_token), timeout=15)
        assert r.status_code == 200, r.text
        emp_id = r.json()["id"]

        # Need a booking to assign
        bookings = s.get(f"{API}/admin/bookings", headers=_h(admin_token), timeout=20).json()
        if bookings:
            bid = bookings[0]["id"]
            r2 = s.post(f"{API}/admin/bookings/{bid}/assign/{emp_id}",
                        headers=_h(admin_token), timeout=15)
            assert r2.status_code == 200

    def test_superadmin_users_includes_all(self, s, sa_token):
        r = s.get(f"{API}/superadmin/users", headers=_h(sa_token), timeout=20)
        assert r.status_code == 200
        users = r.json()
        roles = {u["role"] for u in users}
        assert "superadmin" in roles
        assert "admin" in roles

    def test_admin_cannot_access_superadmin(self, s, admin_token):
        r = s.get(f"{API}/superadmin/users", headers=_h(admin_token), timeout=15)
        assert r.status_code == 403

    def test_superadmin_system(self, s, sa_token):
        r = s.get(f"{API}/superadmin/system", headers=_h(sa_token), timeout=20)
        assert r.status_code == 200
        d = r.json()
        assert "feature_flags" in d
        assert "ai_fallback_chain" in d
        assert "collections" in d

    def test_superadmin_audit_logs(self, s, sa_token):
        r = s.get(f"{API}/superadmin/audit-logs", headers=_h(sa_token), timeout=15)
        assert r.status_code == 200

    def test_superadmin_payments(self, s, sa_token):
        r = s.get(f"{API}/superadmin/payments", headers=_h(sa_token), timeout=15)
        assert r.status_code == 200

    def test_superadmin_set_role(self, s, sa_token):
        # Create a throwaway user, then upgrade their role
        email = f"TEST_role_{uuid.uuid4().hex[:8]}@punyaversetest.com"
        rr = requests.post(f"{API}/auth/register",
                           json={"name": "Role T", "email": email, "password": "Pass@1234"},
                           timeout=15)
        uid = rr.json()["user"]["id"]
        r = s.post(f"{API}/superadmin/users/{uid}/role",
                   json={"role": "employee"},
                   headers=_h(sa_token), timeout=15)
        assert r.status_code == 200


# ============ HIDDEN SANCTUM PORTAL ============
class TestSanctum:
    def test_no_header_returns_404(self, s):
        r = s.get(f"{API}/__sanctum/ping", timeout=15)
        assert r.status_code == 404

    def test_wrong_header_404(self, s):
        r = s.get(f"{API}/__sanctum/ping",
                  headers={"X-Sanctum-Portal": "wrong"}, timeout=15)
        assert r.status_code == 404

    def test_correct_header_ok(self, s):
        r = s.get(f"{API}/__sanctum/ping",
                  headers={"X-Sanctum-Portal": SANCTUM_PATH}, timeout=15)
        assert r.status_code == 200
        assert r.json()["ok"] is True
