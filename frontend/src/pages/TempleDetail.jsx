import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { regionLabel } from "@/lib/utils-app";
import SacredMap from "@/components/SacredMap";
import { Star, Heart, Plane, Train, CloudRain, Users, Calendar, Mountain } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

export default function TempleDetail() {
  const { slug } = useParams();
  const { user } = useAuth();
  const [t, setT] = useState(null);
  const [weather, setWeather] = useState(null);
  const [crowd, setCrowd] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [wishlist, setWishlist] = useState(false);

  useEffect(() => {
    api.get(`/temples/${slug}`).then(({ data }) => setT(data));
    api.get(`/weather/${slug}`).then(({ data }) => setWeather(data)).catch(() => {});
    api.get(`/crowd/${slug}`).then(({ data }) => setCrowd(data)).catch(() => {});
    api.get(`/reviews`, { params: { temple_id: slug } }).then(({ data }) => setReviews(data)).catch(() => {});
    if (user) {
      api.get("/wishlist").then(({ data }) => setWishlist(data.some((x) => x.slug === slug))).catch(() => {});
    }
  }, [slug, user]);

  const toggleWishlist = async () => {
    if (!user) { toast.error("Please login to save favourites"); return; }
    if (wishlist) {
      await api.delete(`/wishlist/${slug}`);
      setWishlist(false);
      toast("Removed from wishlist");
    } else {
      await api.post(`/wishlist/${slug}`);
      setWishlist(true);
      toast.success("Added to wishlist");
    }
  };

  const submitReview = async (e) => {
    e.preventDefault();
    if (!user) { toast.error("Please login to leave a review"); return; }
    await api.post("/reviews", { temple_id: slug, rating, comment });
    setComment("");
    const { data } = await api.get("/reviews", { params: { temple_id: slug } });
    setReviews(data);
    toast.success("Thank you for your darshan review 🙏");
  };

  if (!t) return <div className="flex justify-center py-24"><div className="mandala-loader" /></div>;

  return (
    <div>
      <section className="relative h-[55vh] min-h-[420px] isolate overflow-hidden">
        <img src={t.image_url} alt={t.name} className="absolute inset-0 h-full w-full object-cover -z-10" />
        <div className="absolute inset-0 hero-overlay -z-10" />
        <div className="mx-auto max-w-7xl h-full px-5 lg:px-10 flex flex-col justify-end pb-12">
          <p className="font-overline text-gold-soft text-shadow-soft">{regionLabel(t.region)} · {t.state_or_country}</p>
          <h1 className="font-display text-white text-4xl sm:text-5xl lg:text-6xl tracking-tight text-shadow-soft mt-2">{t.name}</h1>
          <p className="text-parchment-100/95 mt-2 text-shadow-soft">{t.deity}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button onClick={toggleWishlist} variant="outline" className="bg-white/10 text-white border-white/30 backdrop-blur gap-2" data-testid="wishlist-toggle">
              <Heart className={`h-4 w-4 ${wishlist ? "fill-red-500 text-red-500" : ""}`} />
              {wishlist ? "Saved" : "Save"}
            </Button>
            <Link to={`/trip-builder?temple=${t.slug}`}>
              <Button className="bg-gold text-himalaya-900 hover:bg-gold-hover gap-2" data-testid="add-to-trip-btn">
                <Mountain className="h-4 w-4" /> Add to my yatra
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 lg:px-10 py-12 grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Tabs defaultValue="about">
            <TabsList>
              <TabsTrigger value="about" data-testid="tab-about">About</TabsTrigger>
              <TabsTrigger value="map" data-testid="tab-map">Map</TabsTrigger>
              <TabsTrigger value="trek" data-testid="tab-trek">Trek</TabsTrigger>
              <TabsTrigger value="reviews" data-testid="tab-reviews">Reviews</TabsTrigger>
            </TabsList>

            <TabsContent value="about" className="mt-6 space-y-5">
              <Card className="p-6">
                <h3 className="font-display text-2xl">Sacred Significance</h3>
                <p className="mt-3 text-sm leading-relaxed">{t.significance}</p>
                {t.history && (<><h4 className="font-display text-xl mt-6">History</h4>
                <p className="mt-2 text-sm leading-relaxed">{t.history}</p></>)}
              </Card>

              <div className="grid sm:grid-cols-2 gap-4">
                {t.darshan_timings && (
                  <Card className="p-5">
                    <p className="font-overline">Darshan Timings</p>
                    <p className="mt-2 text-sm">{t.darshan_timings}</p>
                  </Card>
                )}
                {t.best_season && (
                  <Card className="p-5">
                    <p className="font-overline">Best Season</p>
                    <p className="mt-2 text-sm">{t.best_season}</p>
                  </Card>
                )}
                {t.nearest_airport && (
                  <Card className="p-5">
                    <p className="font-overline flex items-center gap-1"><Plane className="h-3 w-3" /> Airport</p>
                    <p className="mt-2 text-sm">{t.nearest_airport}</p>
                  </Card>
                )}
                {t.nearest_railway && (
                  <Card className="p-5">
                    <p className="font-overline flex items-center gap-1"><Train className="h-3 w-3" /> Railway</p>
                    <p className="mt-2 text-sm">{t.nearest_railway}</p>
                  </Card>
                )}
              </div>

              {t.festival_dates && t.festival_dates.length > 0 && (
                <Card className="p-5">
                  <p className="font-overline flex items-center gap-1"><Calendar className="h-3 w-3" /> Festivals</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {t.festival_dates.map((f, i) => <Badge variant="outline" key={i}>{f}</Badge>)}
                  </div>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="map" className="mt-6">
              <Card className="p-2 overflow-hidden">
                {t.lat && t.lng ? (
                  <SacredMap points={[t]} height={420} zoom={9} />
                ) : <p className="p-6 text-muted-foreground">Map coordinates unavailable.</p>}
              </Card>
            </TabsContent>

            <TabsContent value="trek" className="mt-6">
              <Card className="p-6">
                {t.requires_trek ? (
                  <>
                    <h3 className="font-display text-2xl">Trek Information</h3>
                    <div className="mt-4 grid sm:grid-cols-3 gap-4">
                      <div>
                        <p className="font-overline">Distance</p>
                        <p className="text-2xl font-display mt-1">{t.trek_distance_km} km</p>
                      </div>
                      <div>
                        <p className="font-overline">Difficulty</p>
                        <p className="text-2xl font-display mt-1 capitalize">{t.trek_difficulty}</p>
                      </div>
                      <div>
                        <p className="font-overline">Elevation</p>
                        <p className="text-2xl font-display mt-1">{t.elevation_m} m</p>
                      </div>
                    </div>
                    <ul className="mt-6 text-sm space-y-2 list-disc list-inside text-muted-foreground">
                      <li>Acclimatise for 2 nights below 3000m before ascending.</li>
                      <li>Carry oximeter, glucose, ORS and personal medication.</li>
                      <li>Drink 4-5 litres of water daily; avoid alcohol & sleeping pills.</li>
                      <li>Emergency rescue available through local SDRF. Call 112.</li>
                    </ul>
                  </>
                ) : (
                  <p className="text-muted-foreground">This temple does not require trekking.</p>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="reviews" className="mt-6 space-y-4">
              <Card className="p-6">
                <h3 className="font-display text-xl">Share your darshan</h3>
                <form onSubmit={submitReview} className="mt-4 space-y-3">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button key={n} type="button" onClick={() => setRating(n)} data-testid={`star-${n}`}>
                        <Star className={`h-6 w-6 ${rating >= n ? "fill-gold text-gold" : "text-muted-foreground"}`} />
                      </button>
                    ))}
                  </div>
                  <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Was your visit divine? Tell future pilgrims…" data-testid="review-comment" />
                  <Button type="submit" className="bg-gold hover:bg-gold-hover text-himalaya-900" data-testid="submit-review-btn">Post review</Button>
                </form>
              </Card>
              {reviews.length === 0 ? <p className="text-muted-foreground">Be the first to share your darshan.</p> : reviews.map((r) => (
                <Card key={r.id} className="p-5">
                  <div className="flex justify-between">
                    <p className="font-display">{r.user_name}</p>
                    <div className="flex">{[1,2,3,4,5].map(n => <Star key={n} className={`h-4 w-4 ${r.rating >= n ? "fill-gold text-gold" : "text-muted-foreground"}`} />)}</div>
                  </div>
                  <p className="text-sm mt-2 text-muted-foreground">{r.comment}</p>
                </Card>
              ))}
            </TabsContent>
          </Tabs>
        </div>

        <aside className="space-y-4">
          {weather && (
            <Card className="p-5">
              <p className="font-overline flex items-center gap-1"><CloudRain className="h-3 w-3" /> Live Forecast</p>
              <p className="mt-3 font-display text-3xl">{weather.temp_c}°C</p>
              <p className="text-sm">{weather.condition}</p>
              <p className="text-xs text-muted-foreground mt-3">{weather.advice}</p>
            </Card>
          )}
          {crowd && (
            <Card className="p-5">
              <p className="font-overline flex items-center gap-1"><Users className="h-3 w-3" /> Crowd</p>
              <p className="mt-3 font-display text-3xl">{crowd.current_load_pct}%</p>
              <p className="text-sm text-muted-foreground">Best window · {crowd.best_visit_window}</p>
              <p className="text-xs mt-2">≈ {crowd.expected_wait_minutes} min wait time</p>
            </Card>
          )}
          <Card className="p-5 mandala-bg">
            <p className="font-overline">VIP Darshan</p>
            <p className="mt-2 text-sm">{t.vip_darshan ? "Skip-the-queue darshan available with package bookings." : "Regular darshan only."}</p>
          </Card>
        </aside>
      </section>
    </div>
  );
}
