# PunyaVerse — Product Requirements Document

## Original Problem Statement
Build an enterprise-grade AI-powered spiritual travel ecosystem platform — "Connecting Every Sacred Path" — covering temple discovery, AI pilgrimage planning, trekking, dynamic pricing, booking engine, payments, hotel recommendations, train/flight/helicopter comparison, sacred route optimization, plus User / Employee / Admin / hidden SuperAdmin dashboards, weather intelligence, crowd prediction, festival calendar, VIP darshan, emergency assistance, reviews, AI recommendations and analytics — for India, Nepal and the Kailash Mansarovar region.

User-confirmed stack (initial): React + FastAPI + MongoDB, GPT-5.2 with fallback to Claude Sonnet 4.5 → Gemini 3 Flash, Stripe (test key), JWT email/password, Leaflet maps.

## Architecture
- **Frontend**: React 19 (CRA + Craco), Tailwind, shadcn/ui, framer-motion, react-leaflet, recharts. Fonts: Marcellus (display), Tenor Sans (subhead), Manrope (body). Light parchment (#F9F6F0) + dark Himalayan (#0B132B), gold (#D4AF37) & saffron (#FF9933) accents.
- **Backend**: FastAPI (modular) — `routes_auth`, `routes_catalog`, `routes_app`, `routes_staff`. Stripe + LLM via `emergentintegrations`. All routes under `/api`.
- **DB**: MongoDB. Collections — users, temples, packages, bookings, payment_transactions, reviews, ai_itineraries, audit_logs.
- **Auth**: JWT (HS256, 14-day). Roles user / employee / admin / superadmin. Hidden portal at `/sanctum-portal-7821`.

## User Personas
1. **Yatri (Pilgrim)** — browses temples, builds custom yatras, books packages, saves wishlist, generates AI itineraries.
2. **Employee** — confirms/refunds bookings assigned to them, coordinates with yatris.
3. **Admin** — manages users, employees, packages, bookings, sees analytics & assigns staff. Cannot see SuperAdmins.
4. **SuperAdmin** — hidden portal; full control, audit logs, feature flags, payments overview.

## Implemented (May 2026)
### Iteration 1 (Backend 46/46 + Frontend MVP)
- 43 temples + 8 packages seeded
- AI Planner with GPT-5.2 → Claude Sonnet 4.5 → Gemini 3 Flash fallback
- Stripe checkout, dynamic pricing, custom trip builder
- All 4 dashboards (User/Employee/Admin/SuperAdmin)
- Reviews, wishlist, weather + crowd prediction, festival calendar

### Iteration 2 (Backend 70/70 — 24 new + 46 regression)
- **Razorpay/UPI payments** (real test keys) alongside Stripe — gateway selector on package detail
- **VIP Darshan Inventory** — 8 VIP temples × 6 daily slots × 30 capacity (lazy-seeded per UTC date)
- **WebSocket notifications** — JWT-authenticated `/api/ws/notifications`; real-time toasts on booking confirm
- **Notification persistence** — `/api/notifications/me` for offline retrieval
- **OSRM multi-stop polyline** — Trip Builder shows golden road route between selected temples
- **Multilingual UI** — English + हिन्दी via i18next; globe-icon language switcher in navbar
- **"Sample fares" disclaimer** on Transport Compare
- ESLint hook-deps warnings resolved
- Bug fix: VIP booking response leaked Mongo `_id` (testing agent found + fixed)

### Iteration 4 (VIP Cleanup + Dunning Emails)
- **VIP Darshan fully removed** — endpoints, slot lazy-seeding, capacity logic, and the two MongoDB collections (`vip_slots`, `vip_bookings`) all gone. One-time drop runs on backend startup via cron. Verified 404 on all `/api/vip-darshan/*` paths.
- **Resend transactional emails** — `email_service.py` with branded PunyaVerse HTML template (parchment + gold, mandala logo). Async-safe via `asyncio.to_thread`. Returns `None` on failure (never raises).
- **Expired-payment dunning flow** — hourly cron atomically flips `payment_status: initiated → expired` for sessions older than 1h, sends a "Resume booking" email exactly once (idempotent via `dunning_sent` flag). Verified end-to-end with a seeded 2-hour-old session: 1st run sent email (real Resend id stored), 2nd run was a no-op.
- **Brand identity** — PunyaVerse oval logo (dark navy + gold mandala) wired into navbar + footer; PV letter-mark logo set as favicon + apple-touch-icon
- **Page title** updated to "PunyaVerse · Connecting Every Sacred Path"
- **Emergent badge removed** via MutationObserver-backed React component (resilient to re-injection)
- **Atomic VIP slot capacity** — replaced two-step check/increment with single `find_one_and_update` + `$expr` capacity guard (no race window)
- **Background cron** — runs every hour, prunes vip_slots older than 2 days, expires `initiated` payment_transactions older than 1 hour, deletes notifications older than 30 days
- **Razorpay webhook secret** placeholder added to `.env` for production rotation

## Backlog
### P0 (blocking polish)
- ESLint warnings in TempleExplorer & TransportCompare (hooks deps)

### P1 (next iteration)
- Real-time WebSocket notifications
- Coupon/offer engine + EMI/partial payment
- Razorpay/UPI alongside Stripe
- Hotel inventory recommendation engine (currently abstracted in package inclusions)
- Live flight/train API integration (currently static route table)
- Google Maps Directions API (currently single-point Leaflet)
- Emergency assistance live chat
- SMS/email notifications (SendGrid + Twilio)
- Trip share / public itinerary URLs

### P2 (longer term)
- Multilingual (Hindi/Sanskrit/Nepali/Tamil)
- VIP darshan slot inventory & live booking
- Astrology/Muhurta engine for trip start dates
- Cab/local guide marketplace
- React Native mobile app
- Kubernetes + CI/CD pipeline (currently single-container preview)

## Test Coverage
- Backend: 46/46 pytest cases (see `/app/backend/tests/test_punyaverse_backend.py`)
- Frontend: visually verified landing; testing agent skipped per first-finish protocol.

## Credentials
See `/app/memory/test_credentials.md`.
