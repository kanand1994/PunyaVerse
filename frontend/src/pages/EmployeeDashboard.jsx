import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { formatINR } from "@/lib/utils-app";

export default function EmployeeDashboard() {
  const [bookings, setBookings] = useState([]);

  const load = () => api.get("/employee/bookings").then(({ data }) => setBookings(data));
  useEffect(() => { load(); }, []);

  const act = async (id, action) => {
    await api.post(`/employee/bookings/${id}/${action}`);
    toast.success(`Booking ${action}ed`);
    load();
  };

  return (
    <div className="mx-auto max-w-7xl px-5 lg:px-10 py-12">
      <p className="font-overline text-gold">Employee Console</p>
      <h1 className="font-display text-4xl tracking-tight mt-3">Bookings assigned to you</h1>
      <p className="text-muted-foreground mt-2">Confirm payments, process refunds and coordinate travel.</p>

      <div className="mt-8 grid sm:grid-cols-3 gap-4">
        <Card className="p-5"><p className="font-overline">Assigned</p><p className="font-display text-3xl mt-2">{bookings.length}</p></Card>
        <Card className="p-5"><p className="font-overline">Pending payment</p><p className="font-display text-3xl mt-2">{bookings.filter(b => b.status === "pending_payment").length}</p></Card>
        <Card className="p-5"><p className="font-overline">Confirmed</p><p className="font-display text-3xl mt-2">{bookings.filter(b => b.status === "confirmed").length}</p></Card>
      </div>

      <div className="mt-8 space-y-3">
        {bookings.length === 0 && <p className="text-muted-foreground">No bookings assigned yet.</p>}
        {bookings.map((b) => (
          <Card key={b.id} className="p-5" data-testid={`emp-booking-${b.id}`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <p className="font-display text-lg">{b.package_title}</p>
                <p className="text-sm text-muted-foreground">{b.user_name} · {b.user_email}</p>
                <p className="text-xs mt-1">{b.travelers} travelers · {b.luxury_tier ? "Luxury" : "Standard"} · ₹ {formatINR(b.total_amount_inr)}</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="capitalize">{b.status.replace("_", " ")}</Badge>
                <Button size="sm" onClick={() => act(b.id, "confirm")} className="bg-gold text-himalaya-900 hover:bg-gold-hover" data-testid={`confirm-${b.id}`}>Confirm</Button>
                <Button size="sm" variant="outline" onClick={() => act(b.id, "refund")} data-testid={`refund-${b.id}`}>Refund</Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
