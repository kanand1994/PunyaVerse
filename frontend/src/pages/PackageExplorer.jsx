import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { regionLabel, formatINR, REGIONS } from "@/lib/utils-app";
import { motion } from "framer-motion";

const CATS = [
  { v: "", l: "All" },
  { v: "pilgrimage", l: "Pilgrimage" },
  { v: "helicopter", l: "Helicopter" },
  { v: "trekking", l: "Trekking" },
];

export default function PackageExplorer() {
  const [pkgs, setPkgs] = useState([]);
  const [region, setRegion] = useState("");
  const [category, setCategory] = useState("");

  useEffect(() => {
    const params = {};
    if (region) params.region = region;
    if (category) params.category = category;
    api.get("/packages", { params }).then(({ data }) => setPkgs(data));
  }, [region, category]);

  return (
    <div className="mx-auto max-w-7xl px-5 lg:px-10 py-12">
      <p className="font-overline text-gold">Signature Packages</p>
      <h1 className="font-display text-4xl sm:text-5xl tracking-tight mt-3">Sacred journeys, planned to the last aarti</h1>
      <p className="text-muted-foreground mt-3 max-w-2xl">From quick weekend darshans to the 18-day Jyotirlinga circuit and the Kailash Helicopter Express.</p>

      <div className="mt-8 flex flex-wrap gap-2">
        <Button variant={region === "" ? "default" : "outline"} size="sm" onClick={() => setRegion("")} data-testid="pkg-region-all">All Regions</Button>
        {REGIONS.map((r) => (
          <Button key={r.value} size="sm" variant={region === r.value ? "default" : "outline"} onClick={() => setRegion(r.value)} data-testid={`pkg-region-${r.value}`}>{r.label}</Button>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {CATS.map((c) => (
          <Button key={c.v} size="sm" variant={category === c.v ? "default" : "outline"} onClick={() => setCategory(c.v)} data-testid={`pkg-cat-${c.v || "all"}`}>{c.l}</Button>
        ))}
      </div>

      <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {pkgs.map((p, i) => (
          <motion.div key={p.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: Math.min(i * 0.04, 0.4) }}>
            <Link to={`/packages/${p.slug}`} data-testid={`pkg-card-${p.slug}`}>
              <Card className="overflow-hidden border-border group h-full">
                <div className="aspect-[16/10] overflow-hidden relative">
                  <img src={p.hero_image} alt={p.title} className="h-full w-full object-cover group-hover:scale-105 transition duration-700" />
                  <div className="absolute top-3 right-3"><Badge className="bg-gold text-himalaya-900">{p.duration_days} days</Badge></div>
                </div>
                <div className="p-5">
                  <p className="font-overline text-muted-foreground">{regionLabel(p.region)} · {p.category}</p>
                  <h3 className="font-display text-xl mt-2 group-hover:text-gold transition">{p.title}</h3>
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{p.summary}</p>
                  <div className="mt-4 flex items-baseline justify-between">
                    <p className="font-display text-2xl">₹ {formatINR(p.base_price_inr)}</p>
                    {p.luxury_price_inr && <p className="text-xs text-muted-foreground">Luxury ₹ {formatINR(p.luxury_price_inr)}</p>}
                  </div>
                </div>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
