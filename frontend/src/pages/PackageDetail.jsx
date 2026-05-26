import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { regionLabel, formatINR } from "@/lib/utils-app";
import { Check, X as XIcon, Sparkles } from "lucide-react";

export default function PackageDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [pkg, setPkg] = useState(null);
  const [travelers, setTravelers] = useState(2);
  const [luxury, setLuxury] = useState(false);
  const [departureDate, setDepartureDate] = useState("");
  const [quote, setQuote] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get(`/packages/${slug}`).then(({ data }) => setPkg(data));
  }, [slug]);

  useEffect(() => {
    if (!pkg) return;
    const params = { travelers, luxury };
    if (departureDate) params.departure_date = departureDate;
    api.get(`/packages/${slug}/quote`, { params }).then(({ data }) => setQuote(data.quote));
  }, [pkg, travelers, luxury, departureDate, slug]);

  const startBooking = async () => {
    if (!user) {
      toast.error("Please login to book");
      navigate(`/login?next=/packages/${slug}`);
      return;
    }
    setSubmitting(true);
    try {
      const { data: booking } = await api.post("/bookings", {
        package_id: pkg.id,
        travelers,
        departure_date: departureDate || null,
        luxury_tier: luxury,
      });
      const { data: chk } = await api.post("/payments/checkout", {
        booking_id: booking.id,
        origin_url: window.location.origin,
      });
      window.location.href = chk.url;
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Booking failed");
    } finally { setSubmitting(false); }
  };

  if (!pkg) return <div className="flex justify-center py-24"><div className="mandala-loader" /></div>;

  return (
    <div>
      <section className="relative h-[55vh] min-h-[420px] isolate overflow-hidden">
        <img src={pkg.hero_image} alt={pkg.title} className="absolute inset-0 h-full w-full object-cover -z-10" />
        <div className="absolute inset-0 hero-overlay -z-10" />
        <div className="mx-auto max-w-7xl h-full px-5 lg:px-10 flex flex-col justify-end pb-12">
          <p className="font-overline text-gold-soft text-shadow-soft">{regionLabel(pkg.region)} · {pkg.duration_days} days · {pkg.category}</p>
          <h1 className="font-display text-white text-4xl sm:text-5xl lg:text-6xl tracking-tight text-shadow-soft mt-2">{pkg.title}</h1>
          <p className="text-parchment-100/95 mt-3 max-w-2xl text-shadow-soft">{pkg.summary}</p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 lg:px-10 py-12 grid lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-8">
          <Card className="p-6">
            <h3 className="font-display text-2xl">Highlights</h3>
            <div className="mt-4 grid sm:grid-cols-2 gap-2">
              {pkg.highlights.map((h, i) => (
                <div key={i} className="flex items-start gap-2 text-sm"><Sparkles className="h-4 w-4 text-gold mt-0.5" /> {h}</div>
              ))}
            </div>
          </Card>

          <Tabs defaultValue="inclusions">
            <TabsList>
              <TabsTrigger value="inclusions" data-testid="tab-inclusions">Inclusions</TabsTrigger>
              <TabsTrigger value="exclusions" data-testid="tab-exclusions">Exclusions</TabsTrigger>
              <TabsTrigger value="temples" data-testid="tab-temples">Temples</TabsTrigger>
              <TabsTrigger value="policy" data-testid="tab-policy">Policy</TabsTrigger>
            </TabsList>
            <TabsContent value="inclusions" className="mt-6">
              <Card className="p-6">
                <ul className="space-y-2 text-sm">
                  {pkg.inclusions.map((i, idx) => <li key={idx} className="flex gap-2"><Check className="h-4 w-4 text-gold mt-0.5" /> {i}</li>)}
                </ul>
              </Card>
            </TabsContent>
            <TabsContent value="exclusions" className="mt-6">
              <Card className="p-6">
                <ul className="space-y-2 text-sm">
                  {pkg.exclusions.map((i, idx) => <li key={idx} className="flex gap-2"><XIcon className="h-4 w-4 text-destructive mt-0.5" /> {i}</li>)}
                </ul>
              </Card>
            </TabsContent>
            <TabsContent value="temples" className="mt-6">
              <Card className="p-6">
                <div className="flex flex-wrap gap-2">
                  {pkg.temples_included.map((t) => <Badge key={t} variant="outline">{t}</Badge>)}
                </div>
              </Card>
            </TabsContent>
            <TabsContent value="policy" className="mt-6">
              <Card className="p-6 text-sm leading-relaxed">{pkg.cancellation_policy}</Card>
            </TabsContent>
          </Tabs>
        </div>

        <aside>
          <Card className="p-6 sticky top-24 mandala-bg">
            <p className="font-overline text-gold">Book this Yatra</p>
            <p className="font-display text-3xl mt-2">₹ {formatINR(quote?.total ?? pkg.base_price_inr * travelers)}</p>
            <p className="text-xs text-muted-foreground">incl. 5% GST · dynamic pricing</p>

            <div className="mt-6 space-y-4">
              <div>
                <Label>Travelers</Label>
                <Input type="number" min={1} max={20} value={travelers} onChange={(e) => setTravelers(parseInt(e.target.value || "1"))} data-testid="travelers-input" />
              </div>
              <div>
                <Label>Departure date (optional)</Label>
                <Input type="date" value={departureDate} onChange={(e) => setDepartureDate(e.target.value)} data-testid="departure-date" />
              </div>
              <div className="flex items-center justify-between">
                <Label>Luxury tier</Label>
                <Switch checked={luxury} onCheckedChange={setLuxury} data-testid="luxury-switch" />
              </div>

              {quote && (
                <div className="text-xs text-muted-foreground border-t pt-3 mt-3 space-y-1">
                  <p>Base / person: ₹ {formatINR(quote.base_per_person)}</p>
                  <p>Season multiplier: ×{quote.season_multiplier}</p>
                  {quote.group_discount_pct > 0 && <p>Group discount: -{quote.group_discount_pct}%</p>}
                  <p>GST (5%): ₹ {formatINR(quote.gst_5pct)}</p>
                </div>
              )}

              <Button onClick={startBooking} disabled={submitting} className="w-full bg-gold hover:bg-gold-hover text-himalaya-900" data-testid="book-now-btn">
                {submitting ? "Preparing checkout…" : "Book Now"}
              </Button>
              <p className="text-[11px] text-muted-foreground text-center">Free cancellation up to 30 days before departure.</p>
            </div>
          </Card>
        </aside>
      </section>
    </div>
  );
}
