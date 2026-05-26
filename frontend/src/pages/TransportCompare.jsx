import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { formatINR } from "@/lib/utils-app";
import { Plane, Train, Bus, Mountain, Info } from "lucide-react";
import { useTranslation } from "react-i18next";

const ICONS = { flight: Plane, train: Train, bus: Bus, helicopter: Mountain };

const PRESETS = [
  { o: "delhi", d: "kedarnath" },
  { o: "delhi", d: "badrinath" },
  { o: "delhi", d: "vaishno devi" },
  { o: "delhi", d: "amarnath" },
  { o: "mumbai", d: "tirupati" },
  { o: "kathmandu", d: "muktinath" },
  { o: "delhi", d: "kailash mansarovar" },
];

export default function TransportCompare() {
  const { t } = useTranslation();
  const [origin, setOrigin] = useState("delhi");
  const [destination, setDestination] = useState("kedarnath");
  const [results, setResults] = useState([]);

  const compare = useCallback(async () => {
    const { data } = await api.post("/transport/compare", { origin, destination });
    setResults(data);
  }, [origin, destination]);

  useEffect(() => { compare(); }, [compare]);

  return (
    <div className="mx-auto max-w-6xl px-5 lg:px-10 py-12">
      <p className="font-overline text-gold">Train vs Flight vs Helicopter</p>
      <h1 className="font-display text-4xl sm:text-5xl tracking-tight mt-3">Compare every way to reach the dham</h1>

      <Card className="mt-6 p-4 flex items-start gap-3 border-dashed border-gold/40 bg-gold/5">
        <Info className="h-5 w-5 text-gold flex-shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground">{t("common.sample_fares")}</p>
      </Card>

      <Card className="mt-6 p-6">
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <Label>Origin</Label>
            <Input value={origin} onChange={(e) => setOrigin(e.target.value)} data-testid="transport-origin" />
          </div>
          <div>
            <Label>Destination</Label>
            <Input value={destination} onChange={(e) => setDestination(e.target.value)} data-testid="transport-destination" />
          </div>
          <div className="flex items-end">
            <Button onClick={compare} className="w-full bg-gold hover:bg-gold-hover text-himalaya-900" data-testid="compare-btn">Compare</Button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {PRESETS.map((p, i) => (
            <button key={i} onClick={() => { setOrigin(p.o); setDestination(p.d); }} className="text-xs px-3 py-1 rounded-full border hover:border-gold hover:text-gold transition" data-testid={`preset-${p.o}-${p.d.replace(/ /g, '-')}`}>
              {p.o} → {p.d}
            </button>
          ))}
        </div>
      </Card>

      <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {results.map((r) => {
          const Icon = ICONS[r.mode] || Plane;
          return (
            <Card key={r.mode} className={`p-6 border ${r.recommended ? "border-gold shadow-[0_0_0_2px_rgba(212,175,55,0.25)]" : "border-border"}`} data-testid={`mode-${r.mode}`}>
              <Icon className="h-7 w-7 text-gold" />
              <p className="font-overline mt-3 capitalize">{r.mode}</p>
              <p className="font-display text-3xl mt-2">₹ {formatINR(r.price_inr)}</p>
              <p className="text-xs text-muted-foreground mt-2">{r.duration}</p>
              <p className="text-xs mt-1">Comfort · {r.comfort}</p>
              {r.recommended && <Badge className="mt-3 bg-gold text-himalaya-900">Recommended</Badge>}
              {r.notes && <p className="text-xs text-muted-foreground mt-2">{r.notes}</p>}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
