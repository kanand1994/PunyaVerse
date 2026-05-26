"""Resend transactional email service."""
import os
import asyncio
import logging
import resend

logger = logging.getLogger(__name__)

RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "onboarding@resend.dev")
SENDER_NAME = "PunyaVerse"

if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY


async def send_email(*, to: str, subject: str, html: str, text: str | None = None) -> str | None:
    """Returns Resend email id on success, None on failure (never raises)."""
    if not RESEND_API_KEY:
        logger.warning("Resend not configured; skipping email to %s", to)
        return None
    params: dict = {
        "from": f"{SENDER_NAME} <{SENDER_EMAIL}>",
        "to": [to],
        "subject": subject,
        "html": html,
    }
    if text:
        params["text"] = text
    try:
        result = await asyncio.to_thread(resend.Emails.send, params)
        eid = result.get("id") if isinstance(result, dict) else None
        logger.info("Email sent to %s id=%s subject=%s", to, eid, subject)
        return eid
    except Exception as e:  # noqa: BLE001
        logger.warning("Email failed to %s: %s", to, e)
        return None


# ============== TEMPLATES ==============
LOGO_URL = "https://customer-assets.emergentagent.com/job_sacred-journey-ai-1/artifacts/ll6agzho_PunyaVerse16.9.png"


def _wrap(inner_html: str, cta_url: str | None = None, cta_label: str = "Resume booking") -> str:
    cta = ""
    if cta_url:
        cta = f"""
        <tr><td align="center" style="padding:24px 0 8px;">
          <a href="{cta_url}" style="background:#D4AF37;color:#0B132B;text-decoration:none;padding:14px 28px;border-radius:8px;font-family:Georgia,serif;font-size:15px;font-weight:600;display:inline-block;">{cta_label}</a>
        </td></tr>
        """
    return f"""\
<!doctype html><html><body style="margin:0;padding:0;background:#F9F6F0;font-family:'Helvetica Neue',Arial,sans-serif;color:#0B132B;">
  <table role="presentation" align="center" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;margin:32px auto;background:#FFFCF6;border-radius:12px;overflow:hidden;border:1px solid #E5E0D8;">
    <tr><td style="padding:28px 32px 16px;text-align:center;border-bottom:1px solid #E5E0D8;">
      <img src="{LOGO_URL}" alt="PunyaVerse" width="64" height="64" style="display:inline-block;" />
      <p style="margin:8px 0 0;font-family:Georgia,serif;font-size:22px;letter-spacing:-0.01em;">PunyaVerse</p>
      <p style="margin:2px 0 0;font-size:11px;letter-spacing:0.22em;color:#7A6F5F;text-transform:uppercase;">Connecting Every Sacred Path</p>
    </td></tr>
    <tr><td style="padding:28px 32px;font-size:15px;line-height:1.65;">
      {inner_html}
    </td></tr>
    {cta}
    <tr><td style="padding:24px 32px;border-top:1px solid #E5E0D8;background:#F9F6F0;text-align:center;font-size:11px;color:#7A6F5F;">
      <p style="margin:0;">Need help? Reach our 24×7 concierge at <a href="mailto:care@punyaverse.com" style="color:#B3922E;">care@punyaverse.com</a></p>
      <p style="margin:8px 0 0;font-family:Georgia,serif;">हर हर महादेव · ॐ नमः शिवाय</p>
    </td></tr>
  </table>
</body></html>
"""


def expired_payment_html(*, name: str, package_title: str, amount_inr: float, resume_url: str) -> str:
    inner = f"""
      <p style="margin:0 0 12px;font-family:Georgia,serif;font-size:22px;">Namaste {name} 🙏</p>
      <p style="margin:0 0 12px;">We noticed your booking for <strong>{package_title}</strong> was almost complete — but the payment session expired before it could be confirmed.</p>
      <p style="margin:0 0 12px;">Your sacred journey is just one tap away. We've held your tentative slot, and the total of <strong>₹ {amount_inr:,.0f}</strong> still applies.</p>
      <p style="margin:0 0 12px;color:#7A6F5F;font-size:13px;">If you'd prefer a different package, our concierge is happy to help craft an alternative within your budget.</p>
    """
    return _wrap(inner, cta_url=resume_url, cta_label="Resume booking →")


def expired_payment_text(*, name: str, package_title: str, amount_inr: float, resume_url: str) -> str:
    return f"""\
Namaste {name},

We noticed your booking for {package_title} was almost complete — but the payment session expired before it could be confirmed.

Your sacred journey is just one tap away. The total of ₹ {amount_inr:,.0f} still applies.

Resume your booking: {resume_url}

Need help? Reach our 24×7 concierge at care@punyaverse.com

— PunyaVerse
"""
