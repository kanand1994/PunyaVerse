import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { formatINR, regionLabel } from "@/lib/utils-app";

export default function UserDashboard() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [itins, setItins] = useState([]);

  useEffect(() => {
    api.get("/bookings/me").then(({ data }) => setBookings(data));
    api.get("/wishlist").then(({ data }) => setWishlist(data));
    api.get("/ai/itineraries/me").then(({ data }) => setItins(data));
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-5 lg:px-10 py-12">
      <p className="font-overline text-gold">Yatri Dashboard</p>
      <h1 className="font-display text-4xl tracking-tight mt-3">Namaste, {user?.name}</h1>
      <p className="text-muted-foreground mt-2">Your bookings, wishlist and AI itineraries — all in one sacred place.</p>

      <div className="mt-8 grid sm:grid-cols-3 gap-4">
        <Stat label="Bookings" value={bookings.length} />
        <Stat label="Saved Temples" value={wishlist.length} />
        <Stat label="AI Itineraries" value={itins.length} />
      </div>

      <Tabs defaultValue="bookings" className="mt-10">
        <TabsList>
          <TabsTrigger value="bookings" data-testid="user-tab-bookings">Bookings</TabsTrigger>
          <TabsTrigger value="wishlist" data-testid="user-tab-wishlist">Wishlist</TabsTrigger>
          <TabsTrigger value="ai" data-testid="user-tab-ai">AI Itineraries</TabsTrigger>
        </TabsList>

        <TabsContent value="bookings" className="mt-6 space-y-3">
          {bookings.length === 0 && <p className="text-muted-foreground">No bookings yet. <Link to="/packages" className="text-gold underline">Explore packages</Link></p>}
          {bookings.map((b) => (
            <Card key={b.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4" data-testid={`booking-row-${b.id}`}>
              <div>
                <p className="font-display text-lg">{b.package_title}</p>
                <p className="text-xs text-muted-foreground">{b.travelers} travelers · {b.luxury_tier ? "Luxury" : "Standard"}</p>
                <p className="text-xs text-muted-foreground">Booked · {new Date(b.created_at).toLocaleDateString()}</p>
              </div>
              <div className="text-right">
                <Badge variant={b.status === "confirmed" ? "default" : "outline"} className={b.status === "confirmed" ? "bg-gold text-himalaya-900" : ""}>
                  {b.status.replace("_", " ")}
                </Badge>
                <p className="font-display text-lg mt-2">₹ {formatINR(b.total_amount_inr)}</p>
              </div>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="wishlist" className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {wishlist.length === 0 && <p className="text-muted-foreground">No saved temples yet.</p>}
          {wishlist.map((t) => (
            <Link to={`/temples/${t.slug}`} key={t.id}>
              <Card className="overflow-hidden group h-full">
                <div className="aspect-[16/10] overflow-hidden"><img src={t.image_url} alt={t.name} className="h-full w-full object-cover group-hover:scale-105 transition" /></div>
                <div className="p-4">
                  <p className="font-display">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{regionLabel(t.region)}</p>
                </div>
              </Card>
            </Link>
          ))}
        </TabsContent>

        <TabsContent value="ai" className="mt-6 space-y-3">
          {itins.length === 0 && <p className="text-muted-foreground">No AI itineraries yet. <Link to="/ai-planner" className="text-gold underline">Generate one</Link></p>}
          {itins.map((it) => (
            <Card key={it.id} className="p-5">
              <p className="text-xs text-muted-foreground font-overline">{it.model_used} · {new Date(it.created_at).toLocaleString()}</p>
              <p className="font-display mt-2">{it.prompt}</p>
              <details className="mt-3">
                <summary className="text-sm cursor-pointer text-gold">View plan</summary>
                <article className="mt-3 text-sm whitespace-pre-wrap leading-relaxed">{it.plan_markdown}</article>
              </details>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <Card className="p-5">
      <p className="font-overline">{label}</p>
      <p className="font-display text-3xl mt-2">{value}</p>
    </Card>
  );
}
