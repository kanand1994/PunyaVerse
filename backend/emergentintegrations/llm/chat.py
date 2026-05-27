"""Mock LlmChat and UserMessage classes to allow the backend to run on localhost."""
import logging

logger = logging.getLogger(__name__)

class UserMessage:
    def __init__(self, text: str):
        self.text = text

class LlmChat:
    def __init__(self, api_key: str, session_id: str, system_message: str):
        self.api_key = api_key
        self.session_id = session_id
        self.system_message = system_message
        self.provider = "openai"
        self.model = "gpt-5.2"

    def with_model(self, provider: str, model: str):
        self.provider = provider
        self.model = model
        return self

    async def send_message(self, message: UserMessage) -> str:
        prompt = message.text
        logger.info("Mock LLM receiving prompt: %s (using %s/%s)", prompt, self.provider, self.model)
        
        # Craft a highly premium, customized spiritual yatra plan matching the prompt
        return f"""# 🕉️ PunyaVerse Sacred Pilgrimage Plan

Thank you for choosing PunyaVerse to craft your sacred journey. We have designed a beautiful itinerary for your requested trip: *"{prompt}"*.

## 1. **Trip Snapshot**
*   **Duration:** 3 Days / 2 Nights
*   **Total Budget Estimate:** ₹ 45,000 - ₹ 65,000 (INR) per traveler
*   **Best Season:** May to June, and September to November
*   **Sacred Energy Focus:** Himalayan High-Altitude Devotional Trek

---

## 2. **Day-by-Day Itinerary**

### **Day 1: Arrival and Ascent to the Holy Foothills**
*   **Morning:** Arrive at Dehradun (Jolly Grant Airport) or Haridwar Railway Station. Board our private luxury SUV for a scenic drive along the Ganges toward Guptkashi.
*   **Afternoon:** Stop for a satvik lunch at Srinagar (Garhwal). Check-in to your luxury alpine cottage with panoramic mountain views.
*   **Evening:** Visit the ancient **Kashi Vishwanath Temple** in Guptkashi for the evening sandhya aarti. Participate in the peaceful chants and receive blessings. Return to resort for dinner.
*   **Transport:** Private SUV (Toyota Innova Crysta).
*   **Hotel Suggestion:** PunyaVerse Himalayan Heights Resort (Luxury Cottages).

### **Day 2: The Sacred Trek to Kedarnath Dham**
*   **Morning:** Early morning transfer to Sonprayag/Gaurikund. Begin the sacred 16 km trek to Kedarnath, or board the VIP helicopter shuttle from Phata/Sersi helicords.
*   **Afternoon:** Reach the Kedarnath plateau. Check-in to our premium Swiss camp. Enjoy hot ginger tea and rest to acclimatize to 11,755 ft.
*   **Evening:** Witness the divine evening aarti at the majestic **Kedarnath Temple**, surrounded by snow-capped Himalayan peaks. The chants of *Har Har Mahadev* fill the valley.
*   **Transport:** Helicopter or trekking/mule service.
*   **Hotel Suggestion:** PunyaVerse Sacred Camps (Premium Swiss Tents).

### **Day 3: Return Journey and Departure**
*   **Morning:** Participate in the Abhishek Puja inside the sanctum sanctorum of Kedarnath at dawn. Descend back to Gaurikund.
*   **Afternoon:** Drive back toward Rishikesh. Stop at Devprayag to witness the sacred confluence (Sangam) of Bhagirathi and Alaknanda rivers forming the holy Ganga.
*   **Evening:** Attend the world-famous Ganga Aarti at Triveni Ghat in Rishikesh. Transfer to Dehradun Airport or Haridwar station for your onward journey.
*   **Transport:** Private SUV transfer.

---

## 3. **Budget Breakdown (INR)**
*   **Transport (SUV + Helicopter):** ₹ 25,000 per person
*   **Hotels & Premium Camps:** ₹ 12,000 per person
*   **Meals (All Satvik organic):** ₹ 4,000 per person
*   **VIP Darshan & Pujas:** ₹ 3,000 per person
*   **Misc / Travel Insurance:** ₹ 1,000 per person
*   **Total Estimate:** ₹ 45,000 per person

---

## 4. **Sacred Insights**
*   **Kedarnath Temple:** One of the twelve sacred Jyotirlingas of Lord Shiva. Built of massive grey stone slabs, it stands as a testament to eternal resilience and pure devotion.
*   **Guptkashi Kashi Vishwanath:** The hidden temple where Lord Shiva secretly resided to avoid the Pandavas. Its energy is deeply meditative and calm.

---

## 5. **Travel Tips**
*   **Weather:** Highly unpredictable. Temperatures drop to 2-5°C at night even in May.
*   **Altitude:** 3,584m (11,755 ft) at Kedarnath. Drink plenty of water and avoid over-exertion.
*   **Packing:** Heavy woolens, thermals, windcheater, sturdy waterproof trekking shoes.
*   **Dress Code:** Traditional, respectful clothing (avoid shorts and bright flashy colors inside temples).

---

## 6. **Senior / Family Notes**
*   For elderly family members, we highly recommend the **PunyaVerse Helicopter Charter** to avoid the strenuous 16 km uphill trek.
*   Keep portable oxygen cylinders handy, which our on-ground concierge coordinates prior to departure.

---

## 7. **Safety & Emergency**
*   **Medical Center:** Gaurikund First Aid Post & Kedarnath Government Medical Camp (24x7 doctor on-site).
*   **Helpline:** Uttarakhand Travel Helpline (1364 / 112) or PunyaVerse 24x7 Concierge Hotline.
"""
