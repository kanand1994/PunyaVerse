import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mountain } from "lucide-react";
import { regionLabel } from "@/lib/utils-app";

export default function TrekkingExplorer() {
  const [treks, setTreks] = useState([]);
  useEffect(() => {
    api.get("/temples", { params: { trekking: true } }).then(({ data }) => setTreks(data));
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-5 lg:px-10 py-12">
      <p className="font-overline text-gold">Sacred Trekking</p>
      <h1 className="font-display text-4xl sm:text-5xl tracking-tight mt-3">Walk the mountain to the divine</h1>
      <p className="text-muted-foreground mt-3 max-w-2xl">Kedarnath, Amarnath, Kailash, Muktinath, Hemkund Sahib and more — every trek with altitude, distance and difficulty mapped.</p>

      <div className="mt-10 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {treks.map((t) => (
          <Link key={t.id} to={`/temples/${t.slug}`} data-testid={`trek-card-${t.slug}`}>
            <Card className="overflow-hidden border-border group h-full">
              <div className="aspect-[16/10] overflow-hidden">
                <img src={t.image_url} alt={t.name} className="h-full w-full object-cover group-hover:scale-105 transition duration-700" />
              </div>
              <div className="p-5">
                <div className="flex items-center gap-2"><Mountain className="h-4 w-4 text-gold" /> <p className="font-overline">{regionLabel(t.region)}</p></div>
                <h3 className="font-display text-xl mt-2 group-hover:text-gold transition">{t.name}</h3>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                  <div><p className="font-overline">Distance</p><p className="font-display text-lg mt-1">{t.trek_distance_km} km</p></div>
                  <div><p className="font-overline">Elev</p><p className="font-display text-lg mt-1">{t.elevation_m} m</p></div>
                  <div><p className="font-overline">Level</p><p className="font-display text-lg mt-1 capitalize">{t.trek_difficulty}</p></div>
                </div>
                {t.trek_difficulty === "hard" && <Badge variant="destructive" className="mt-3">High altitude · Oxygen required</Badge>}
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
