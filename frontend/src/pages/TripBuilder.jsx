import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import SacredMap from "@/components/SacredMap";
import { formatINR, regionLabel } from "@/lib/utils-app";
import { Plus, X, Minus } from "lucide-react";

export default function TripBuilder() {
  const [allTemples, setAllTemples] = useState([]);
  const [selected, setSelected] = useState([]);
  const [transport, setTransport] = useState("train");
  const [hotel, setHotel] = useState("standard");
  const [days, setDays] = useState(7);
  const [travelers, setTravelers] = useState(2);
  const [seniors, setSeniors] = useState(0);
  const [children, setChildren] = useState(0);
  const [quote, setQuote] = useState(null);
  const [region, setRegion] = useState("");

  useEffect(() => {
    api.get("/temples").then(({ data }) => setAllTemples(data));
  }, []);

  useEffect(() => {
    const sel = new URLSearchParams(window.location.search).get("temple");
    if (sel) setSelected([sel]);
  }, []);

  const filtered = allTemples.filter((t) => (!region || t.region === region) && !selected.includes(t.id));

  const selectedTempleObjs = selected
    .map((id) => allTemples.find((t) => t.id === id))
    .filter((t) => t && t.lat && t.lng);

  const computeQuote = async () => {
    if (selected.length === 0) return;
    const { data } = await api.post("/trip-builder/quote", {
      temples: selected, transport, hotel_tier: hotel,
      days, travelers, senior_citizens: seniors, children,
    });
    setQuote(data);
  };

  return (
    <div className="mx-auto max-w-7xl px-5 lg:px-10 py-12">
      <p className="font-overline text-gold">Custom Trip Builder</p>
      <h1 className="font-display text-4xl sm:text-5xl tracking-tight mt-3">Compose your own pilgrimage</h1>
      <p className="text-muted-foreground mt-3 max-w-2xl">Add temples, choose how to travel, pick your hotel tier — our engine sequences and prices your sacred journey.</p>

      <div className="mt-10 grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-2xl">Choose your temples</h3>
              <Select value={region || "all"} onValueChange={(v) => setRegion(v === "all" ? "" : v)}>
                <SelectTrigger className="w-44" data-testid="filter-region-select"><SelectValue placeholder="All regions" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All regions</SelectItem>
                  <SelectItem value="north_india">North India</SelectItem>
                  <SelectItem value="south_india">South India</SelectItem>
                  <SelectItem value="east_india">East India</SelectItem>
                  <SelectItem value="west_india">West India</SelectItem>
                  <SelectItem value="central_india">Central India</SelectItem>
                  <SelectItem value="nepal">Nepal</SelectItem>
                  <SelectItem value="kailash">Kailash</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-96 overflow-y-auto pr-1">
              {filtered.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelected((s) => [...s, t.id])}
                  className="flex items-center gap-2 p-2 rounded-md border border-border hover:border-gold text-left transition"
                  data-testid={`add-temple-${t.slug}`}
                >
                  <Plus className="h-4 w-4 text-gold" />
                  <div className="min-w-0">
                    <p className="text-sm truncate">{t.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{regionLabel(t.region)}</p>
                  </div>
                </button>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-display text-2xl">Your itinerary</h3>
            {selected.length === 0 ? (
              <p className="text-sm text-muted-foreground mt-3">No temples added yet. Pick from the list above.</p>
            ) : (
              <ol className="mt-4 space-y-2">
                {selected.map((id, idx) => {
                  const t = allTemples.find((x) => x.id === id);
                  if (!t) return null;
                  return (
                    <li key={id} className="flex items-center justify-between p-3 rounded-md border border-border">
                      <div className="flex items-center gap-3">
                        <span className="font-display text-xl text-gold w-8">{idx + 1}.</span>
                        <div>
                          <p className="font-medium">{t.name}</p>
                          <p className="text-xs text-muted-foreground">{regionLabel(t.region)}{t.elevation_m ? ` · ${t.elevation_m}m` : ""}</p>
                        </div>
                      </div>
                      <Button size="icon" variant="ghost" onClick={() => setSelected((s) => s.filter((x) => x !== id))} data-testid={`remove-temple-${t.slug}`}>
                        <X className="h-4 w-4" />
                      </Button>
                    </li>
                  );
                })}
              </ol>
            )}
          </Card>

          {selectedTempleObjs.length > 0 && (
            <Card className="p-4">
              <p className="font-overline mb-2">Route preview (OSRM)</p>
              <SacredMap points={selectedTempleObjs} height={400} zoom={5} withRoute />
            </Card>
          )}
        </div>

        <Card className="p-6 lg:sticky lg:top-24 self-start space-y-5 mandala-bg">
          <h3 className="font-display text-xl">Preferences</h3>
          <div>
            <Label>Transport</Label>
            <Select value={transport} onValueChange={setTransport}>
              <SelectTrigger data-testid="transport-select"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="train">Train</SelectItem>
                <SelectItem value="flight">Flight</SelectItem>
                <SelectItem value="helicopter">Helicopter</SelectItem>
                <SelectItem value="bus">Bus</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Hotel tier</Label>
            <Select value={hotel} onValueChange={setHotel}>
              <SelectTrigger data-testid="hotel-select"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="budget">Budget</SelectItem>
                <SelectItem value="standard">Standard</SelectItem>
                <SelectItem value="luxury">Luxury</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <NumField label="Days" value={days} setValue={setDays} min={1} max={30} testId="days-field" />
            <NumField label="Travelers" value={travelers} setValue={setTravelers} min={1} max={20} testId="travelers-field" />
            <NumField label="Seniors" value={seniors} setValue={setSeniors} min={0} max={travelers} testId="seniors-field" />
            <NumField label="Children" value={children} setValue={setChildren} min={0} max={travelers} testId="children-field" />
          </div>
          <Button onClick={computeQuote} className="w-full bg-gold hover:bg-gold-hover text-himalaya-900" data-testid="compute-quote-btn">
            Calculate yatra cost
          </Button>

          {quote && (
            <div className="border-t pt-4 space-y-2 text-sm" data-testid="quote-result">
              <p className="font-display text-3xl">₹ {formatINR(quote.total_inr)}</p>
              <p className="text-xs text-muted-foreground">incl. 5% GST · {quote.duration_days} days · {quote.travelers} travelers</p>
              <div className="space-y-1 text-xs mt-2">
                {Object.entries(quote.breakdown).map(([k, v]) => (
                  <div key={k} className="flex justify-between text-muted-foreground">
                    <span className="capitalize">{k.replaceAll("_", " ")}</span>
                    <span>₹ {formatINR(v)}</span>
                  </div>
                ))}
              </div>
              <Badge variant="outline" className="mt-2">Suggested order optimised by altitude</Badge>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function NumField({ label, value, setValue, min, max, testId }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="flex items-center mt-1">
        <Button size="icon" variant="outline" className="h-9 w-9" onClick={() => setValue(Math.max(min, value - 1))}>
          <Minus className="h-3 w-3" />
        </Button>
        <Input value={value} onChange={(e) => setValue(parseInt(e.target.value || "0"))} className="text-center mx-1" data-testid={testId} />
        <Button size="icon" variant="outline" className="h-9 w-9" onClick={() => setValue(Math.min(max, value + 1))}>
          <Plus className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
