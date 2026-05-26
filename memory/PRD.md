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
### Backend (46/46 tests passed)
- 43 temples seeded across N/E/W/C/S India + Nepal + Kailash
- 8 signature packages incl. Char Dham, Kailash Heli Express, Do Dham, Jyotirlinga 12, Amarnath, Vaishno Devi, South India, Nepal
- Dynamic pricing engine (season + group discount + 5% GST)
- Train vs Flight vs Helicopter vs Bus comparison with 7 preset routes
- Custom Trip Builder with altitude-aware route optimization
- AI Spiritual Planner with **GPT-5.2 → Claude Sonnet 4.5 → Gemini 3 Flash** fallback chain
- Weather + Crowd prediction (elevation/month heuristic)
- Festival calendar (15 festivals for 2026)
- Bookings + Stripe checkout (INR → USD conversion, test key, webhook + polling)
- Reviews & Wishlist
- Employee/Admin/SuperAdmin role-segregated endpoints
- Hidden Sanctum portal guard via X-Sanctum-Portal header
- Audit logging for SuperAdmin actions
- Seeded demo accounts (see `/app/memory/test_credentials.md`)

### Frontend
- Landing page (cinematic Himalayan hero, mandala CTA section)
- Temple Explorer + Temple Detail (with map, weather, crowd, reviews, wishlist)
- Package Explorer + Package Detail (dynamic price preview, booking → Stripe)
- AI Planner (prompt + constraints, sample prompts, markdown render)
- Custom Trip Builder (add/remove temples, transport/hotel/days/travelers, live quote)
- Transport Compare (4-card layout with recommended highlighting)
- Trekking Explorer (filtered to trek-requiring temples)
- Festival Calendar
- Login / Register
- Payment Success (with polling) & Cancel
- User Dashboard (bookings, wishlist, AI itineraries)
- Employee Dashboard (assigned bookings, confirm/refund)
- Admin Dashboard (analytics charts, users, bookings, assign employees, create employee)
- Hidden SuperAdmin Dashboard at `/sanctum-portal-7821` (users, role mgmt, audit logs, payments, feature flags, system stats)
- Dark/light theme toggle, responsive nav with mobile drawer

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
