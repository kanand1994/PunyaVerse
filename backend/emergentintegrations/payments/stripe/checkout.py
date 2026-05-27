"""Mock StripeCheckout and CheckoutSessionRequest classes to allow the backend to run on localhost."""
import uuid

class CheckoutSessionRequest:
    def __init__(self, amount: float, currency: str, success_url: str, cancel_url: str, metadata: dict = None):
        self.amount = amount
        self.currency = currency
        self.success_url = success_url
        self.cancel_url = cancel_url
        self.metadata = metadata or {}

class StripeCheckoutResponse:
    def __init__(self, session_id: str, url: str):
        self.session_id = session_id
        self.url = url

class StripeCheckoutStatus:
    def __init__(self, session_id: str, status: str, payment_status: str, amount_total: float, currency: str):
        self.session_id = session_id
        self.status = status
        self.payment_status = payment_status
        self.amount_total = amount_total
        self.currency = currency

class StripeCheckout:
    def __init__(self, api_key: str, webhook_url: str):
        self.api_key = api_key
        self.webhook_url = webhook_url

    async def create_checkout_session(self, request: CheckoutSessionRequest) -> StripeCheckoutResponse:
        session_id = f"cs_test_{uuid.uuid4().hex}"
        # Return a mock Stripe checkout URL (real stripe.com link as requested by tests)
        checkout_url = f"https://checkout.stripe.com/pay/{session_id}"
        return StripeCheckoutResponse(session_id=session_id, url=checkout_url)

    async def get_checkout_status(self, session_id: str) -> StripeCheckoutStatus:
        # Mock successful payment
        return StripeCheckoutStatus(
            session_id=session_id,
            status="complete",
            payment_status="paid",
            amount_total=100.0,
            currency="usd"
        )

    async def handle_webhook(self, body: bytes, signature: str) -> StripeCheckoutStatus:
        return StripeCheckoutStatus(
            session_id="cs_test_webhook",
            status="complete",
            payment_status="paid",
            amount_total=100.0,
            currency="usd"
        )
