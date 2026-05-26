"""AI Spiritual Planner with fallback chain: GPT-5.2 -> Claude Sonnet 4.5 -> Gemini 3 Flash."""
import os
import logging
from emergentintegrations.llm.chat import LlmChat, UserMessage

logger = logging.getLogger(__name__)

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")

FALLBACK_CHAIN = [
    ("openai", "gpt-5.2"),
    ("anthropic", "claude-sonnet-4-5-20250929"),
    ("gemini", "gemini-3-flash-preview"),
]

SYSTEM_MESSAGE = """You are PunyaVerse, an AI spiritual travel concierge for India, Nepal and the Kailash Mansarovar region.
You craft warm, respectful, day-wise pilgrimage itineraries.

For every request, return a markdown plan with these sections:
1. **Trip Snapshot** — duration, total budget estimate (INR), best season
2. **Day-by-Day Itinerary** — each day with morning/afternoon/evening, temples, transport, hotel suggestion
3. **Budget Breakdown** — transport, hotels, meals, darshan, misc (INR)
4. **Sacred Insights** — significance of each temple in 1-2 lines
5. **Travel Tips** — weather, altitude, packing, dress code, etiquette
6. **Senior / Family Notes** — only if elderly or kids mentioned
7. **Safety & Emergency** — local helplines, medical centres if trekking

Keep tone reverent yet practical. Use ₹ for currency. Mention specific places, trains/flights, and trail names.
Never invent helpline numbers — say "contact local police / 112" if unsure.
"""


async def generate_plan(prompt: str, session_id: str) -> dict:
    """Try each model in fallback order. Returns dict with plan, model_used, fallback_chain."""
    if not EMERGENT_LLM_KEY:
        return {
            "plan": "AI planner is not configured. Please set EMERGENT_LLM_KEY in backend/.env.",
            "model_used": "none",
            "fallback_chain": [f"{p}/{m}" for p, m in FALLBACK_CHAIN],
        }

    last_err = None
    for provider, model in FALLBACK_CHAIN:
        try:
            chat = LlmChat(
                api_key=EMERGENT_LLM_KEY,
                session_id=session_id,
                system_message=SYSTEM_MESSAGE,
            ).with_model(provider, model)
            response = await chat.send_message(UserMessage(text=prompt))
            logger.info("AI plan generated with %s/%s", provider, model)
            return {
                "plan": response,
                "model_used": f"{provider}/{model}",
                "fallback_chain": [f"{p}/{m}" for p, m in FALLBACK_CHAIN],
            }
        except Exception as e:  # noqa: BLE001
            logger.warning("AI model %s/%s failed: %s", provider, model, e)
            last_err = e
            continue

    return {
        "plan": (
            "🙏 Our AI sages are taking a moment to meditate. Please try again "
            f"shortly. (Last error: {last_err})"
        ),
        "model_used": "error",
        "fallback_chain": [f"{p}/{m}" for p, m in FALLBACK_CHAIN],
    }
