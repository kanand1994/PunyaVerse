import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Mountain, Sparkles, Map, Calendar, Shield, Compass, ArrowRight } from "lucide-react";
import api from "@/lib/api";
import { useEffect, useState } from "react";
import { formatINR, regionLabel } from "@/lib/utils-app";

const HERO = "https://static.prod-images.emergentagent.com/jobs/f355ee94-a200-4266-a0f3-acc9fe3f8abb/images/c7791aed8974f00ef30f95539103eed8b328065461f6982b5a997a649b12ae55.png";
const MANDALA = "https://static.prod-images.emergentagent.com/jobs/f355ee94-a200-4266-a0f3-acc9fe3f8abb/images/c15b3f8f3cb63fe252ad3bc7f8d87ba204c7be1da5b94277954829da10454e0e.png";

export default function LandingPage() {
  const [featured, setFeatured] = useState([]);
  const [popularTemples, setPopularTemples] = useState([]);

  useEffect(() => {
    api.get("/packages").then(({ data }) => setFeatured(data.slice(0, 3))).catch(() => {});
    api.get("/temples").then(({ data }) => setPopularTemples(data.slice(0, 6))).catch(() => {});
  }, []);

  return (
    <div>
      {/* HERO */}
      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <img src={HERO} alt="Himalayan dawn" className="h-full w-full object-cover" />
          <div className="absolute inset-0 hero-overlay" />
        </div>
        <div className="mx-auto max-w-7xl px-5 lg:px-10 py-28 lg:py-40">
          <motion.p
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
            className="font-overline text-gold-soft text-shadow-soft"
          >
            Bharat · Nepal · Kailash Mansarovar
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.1 }}
            className="font-display text-white text-5xl sm:text-6xl lg:text-7xl tracking-tight leading-[1.05] max-w-4xl text-shadow-soft mt-4"
          >
            Connecting every sacred path,
            <span className="block text-gold">walked with intelligence.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.3 }}
            className="mt-6 max-w-2xl text-parchment-100/95 text-base sm:text-lg text-shadow-soft"
          >
            AI-crafted pilgrimages, helicopter darshan, Char Dham, Kailash Parikrama and every Jyotirlinga — booked end-to-end with white-glove care.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.45 }}
            className="mt-10 flex flex-wrap gap-3"
          >
            <Link to="/ai-planner">
              <Button size="lg" className="bg-gold hover:bg-gold-hover text-himalaya-900 gap-2" data-testid="hero-ai-planner-btn">
                <Sparkles className="h-4 w-4" /> Plan with AI
              </Button>
            </Link>
            <Link to="/packages">
              <Button size="lg" variant="outline" className="bg-white/10 backdrop-blur border-white/40 text-white hover:bg-white/20" data-testid="hero-packages-btn">
                Explore Packages <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </motion.div>

          <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-3xl">
            {[
              { k: "43+", v: "Sacred Temples" },
              { k: "12", v: "Jyotirlingas" },
              { k: "8", v: "Curated Packages" },
              { k: "AI", v: "Spiritual Planner" },
            ].map((s) => (
              <div key={s.v} className="text-white">
                <p className="font-display text-3xl text-gold">{s.k}</p>
                <p className="font-overline text-parchment-100/80 mt-1">{s.v}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURE STRIP */}
      <section className="mx-auto max-w-7xl px-5 lg:px-10 py-20">
        <p className="font-overline text-gold">The Operating System of Sacred Travel</p>
        <h2 className="font-display text-3xl lg:text-5xl tracking-tight mt-3 max-w-3xl">
          One platform. Every Dham. Every devotee, every itinerary.
        </h2>
        <div className="mt-12 grid md:grid-cols-3 gap-6">
          {[
            { icon: Sparkles, t: "AI Spiritual Planner", d: "Tell us your prayers, parents and budget — we design day-wise yatras with darshan, hotels and aarti times." },
            { icon: Map, t: "Sacred Route Optimization", d: "Multi-temple journeys ordered by altitude, geography and acclimatisation." },
            { icon: Compass, t: "Trek + Helicopter Hybrid", d: "Choose Kedarnath by trek or helicopter; Kailash Parikrama with yak/porter support." },
            { icon: Calendar, t: "Festival Intelligence", d: "Time your visit with Mahashivratri, Saga Dawa, Kumbh & Rath Yatra." },
            { icon: Shield, t: "VIP Darshan & Emergency", d: "Skip-the-queue darshan, doctor on call, 24×7 helpline." },
            { icon: Mountain, t: "Train · Flight · Heli", d: "Live comparison so you choose the right way to reach every Dham." },
          ].map(({ icon: Icon, t, d }) => (
            <Card key={t} className="p-6 border-border/80 hover:-translate-y-1 transition group bg-card">
              <Icon className="h-7 w-7 text-gold" />
              <h3 className="font-display text-xl mt-4 group-hover:text-gold transition">{t}</h3>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{d}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* FEATURED PACKAGES */}
      <section className="mandala-bg">
        <div className="mx-auto max-w-7xl px-5 lg:px-10 py-20">
          <div className="flex items-end justify-between">
            <div>
              <p className="font-overline text-gold">Signature Yatras</p>
              <h2 className="font-display text-3xl lg:text-4xl tracking-tight mt-3">Curated by sages, perfected by engineers</h2>
            </div>
            <Link to="/packages" className="hidden sm:flex items-center gap-1 text-gold hover:underline">See all <ArrowRight className="h-4 w-4" /></Link>
          </div>
          <div className="mt-10 grid md:grid-cols-3 gap-6">
            {featured.map((p) => (
              <Link to={`/packages/${p.slug}`} key={p.id} data-testid={`featured-pkg-${p.slug}`}>
                <Card className="overflow-hidden border-border group">
                  <div className="aspect-[4/3] overflow-hidden">
                    <img src={p.hero_image} alt={p.title} className="h-full w-full object-cover group-hover:scale-105 transition duration-700" />
                  </div>
                  <div className="p-5">
                    <p className="font-overline text-muted-foreground">{regionLabel(p.region)} · {p.duration_days} days</p>
                    <h3 className="font-display text-xl mt-2 group-hover:text-gold transition">{p.title}</h3>
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{p.summary}</p>
                    <p className="mt-4 font-display text-2xl text-foreground">₹ {formatINR(p.base_price_inr)} <span className="text-xs text-muted-foreground font-body">/ person</span></p>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* POPULAR TEMPLES STRIP */}
      <section className="mx-auto max-w-7xl px-5 lg:px-10 py-20">
        <div className="flex items-end justify-between">
          <div>
            <p className="font-overline text-gold">Most-visited Shrines</p>
            <h2 className="font-display text-3xl lg:text-4xl tracking-tight mt-3">Begin with the temples that move millions</h2>
          </div>
          <Link to="/temples" className="hidden sm:flex items-center gap-1 text-gold hover:underline">All temples <ArrowRight className="h-4 w-4" /></Link>
        </div>
        <div className="mt-10 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {popularTemples.map((t) => (
            <Link to={`/temples/${t.slug}`} key={t.id} className="group" data-testid={`featured-temple-${t.slug}`}>
              <div className="aspect-square overflow-hidden rounded-md">
                <img src={t.image_url} alt={t.name} className="h-full w-full object-cover group-hover:scale-110 transition duration-700" />
              </div>
              <p className="font-display text-sm mt-2 group-hover:text-gold transition">{t.name}</p>
              <p className="text-xs text-muted-foreground">{regionLabel(t.region)}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* AI CTA */}
      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-0 -z-10 opacity-30">
          <img src={MANDALA} alt="Mandala" className="h-full w-full object-cover" />
        </div>
        <div className="mx-auto max-w-7xl px-5 lg:px-10 py-24 text-center">
          <p className="font-overline text-gold">Sacred travel, designed by AI</p>
          <h2 className="font-display text-3xl lg:text-5xl tracking-tight mt-4 max-w-3xl mx-auto">
            “Plan a 10-day Kedarnath & Badrinath yatra for elderly parents under ₹60,000.”
          </h2>
          <p className="mt-6 text-muted-foreground max-w-2xl mx-auto">
            Our planner blends GPT-5.2, Claude Sonnet 4.5 and Gemini 3 Flash with real temple data to craft your day-wise journey.
          </p>
          <Link to="/ai-planner" className="inline-block mt-8">
            <Button size="lg" className="bg-gold hover:bg-gold-hover text-himalaya-900 gap-2" data-testid="cta-ai-planner-btn">
              <Sparkles className="h-4 w-4" /> Try the AI Planner
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
