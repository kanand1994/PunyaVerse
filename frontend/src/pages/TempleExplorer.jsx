import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Mountain, Star } from "lucide-react";
import { REGIONS, regionLabel } from "@/lib/utils-app";
import { motion } from "framer-motion";

export default function TempleExplorer() {
  const [temples, setTemples] = useState([]);
  const [q, setQ] = useState("");
  const [region, setRegion] = useState("");
  const [trekking, setTrekking] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const params = {};
    if (q) params.q = q;
    if (region) params.region = region;
    if (trekking) params.trekking = true;
    const { data } = await api.get("/temples", { params });
    setTemples(data);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [region, trekking]);

  return (
    <div className="mx-auto max-w-7xl px-5 lg:px-10 py-12">
      <p className="font-overline text-gold">Temple Discovery</p>
      <h1 className="font-display text-4xl sm:text-5xl tracking-tight mt-3">Every Sacred Shrine, mapped & ready</h1>
      <p className="text-muted-foreground mt-3 max-w-2xl">Search across 43+ temples from Char Dham, Jyotirlingas, Shakti Peethas, Nepal and Kailash Mansarovar.</p>

      <div className="mt-8 grid md:grid-cols-12 gap-3">
        <div className="md:col-span-5 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load()}
            placeholder="Search by temple, deity or state…"
            className="pl-9"
            data-testid="temple-search-input"
          />
        </div>
        <div className="md:col-span-4 flex gap-2 flex-wrap">
          <Button variant={region === "" ? "default" : "outline"} size="sm" onClick={() => setRegion("")} data-testid="region-all">All Regions</Button>
          {REGIONS.map((r) => (
            <Button
              key={r.value}
              size="sm"
              variant={region === r.value ? "default" : "outline"}
              onClick={() => setRegion(r.value)}
              data-testid={`region-${r.value}`}
            >
              {r.label}
            </Button>
          ))}
        </div>
        <div className="md:col-span-3 flex items-center gap-2">
          <Button
            size="sm"
            variant={trekking ? "default" : "outline"}
            onClick={() => setTrekking((v) => !v)}
            className="gap-2"
            data-testid="filter-trekking"
          >
            <Mountain className="h-4 w-4" /> Trekking only
          </Button>
          <Button size="sm" onClick={load} className="bg-gold hover:bg-gold-hover text-himalaya-900" data-testid="apply-filters">Search</Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-24"><div className="mandala-loader" /></div>
      ) : temples.length === 0 ? (
        <p className="text-center py-24 text-muted-foreground">No temples found for these filters.</p>
      ) : (
        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {temples.map((t, idx) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: Math.min(idx * 0.03, 0.4) }}
            >
              <Link to={`/temples/${t.slug}`} data-testid={`temple-card-${t.slug}`}>
                <Card className="group overflow-hidden border-border">
                  <div className="aspect-[16/10] overflow-hidden">
                    <img src={t.image_url} alt={t.name} className="h-full w-full object-cover group-hover:scale-105 transition duration-700" />
                  </div>
                  <div className="p-5">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <Badge variant="outline" className="font-overline">{regionLabel(t.region)}</Badge>
                      {t.requires_trek && <Badge variant="secondary" className="gap-1"><Mountain className="h-3 w-3" /> Trek</Badge>}
                      {t.vip_darshan && <Badge className="bg-gold text-himalaya-900 hover:bg-gold-hover">VIP</Badge>}
                    </div>
                    <h3 className="font-display text-xl group-hover:text-gold transition">{t.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{t.deity}</p>
                    <p className="text-xs text-muted-foreground mt-2">{t.state_or_country}</p>
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center gap-1 text-sm">
                        <Star className="h-4 w-4 text-gold" />
                        <span>{t.avg_rating?.toFixed?.(1) || t.avg_rating}</span>
                      </div>
                      {t.elevation_m ? (
                        <span className="text-xs text-muted-foreground font-overline">{t.elevation_m} m</span>
                      ) : null}
                    </div>
                  </div>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
