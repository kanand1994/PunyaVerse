import { useEffect, useState, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import { CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";

export default function PaymentSuccess() {
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");
  const bookingId = params.get("booking_id");
  const [status, setStatus] = useState("polling");
  const [details, setDetails] = useState(null);
  const [attempts, setAttempts] = useState(0);

  const poll = useCallback(async () => {
    if (!sessionId) return;
    if (attempts >= 8) { setStatus("timeout"); return; }
    try {
      const { data } = await api.get(`/payments/status/${sessionId}`);
      setDetails(data);
      if (data.payment_status === "paid") setStatus("paid");
      else if (data.status === "expired") setStatus("expired");
      else setTimeout(() => setAttempts((a) => a + 1), 2000);
    } catch {
      setTimeout(() => setAttempts((a) => a + 1), 2000);
    }
  }, [sessionId, attempts]);

  useEffect(() => { poll(); }, [poll]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-5 mandala-bg">
      <Card className="max-w-lg w-full p-10 text-center" data-testid="payment-status-card">
        {status === "polling" && (
          <>
            <Loader2 className="h-10 w-10 text-gold animate-spin mx-auto" />
            <h1 className="font-display text-3xl mt-4">Confirming your booking…</h1>
            <p className="text-sm text-muted-foreground mt-2">Verifying with Stripe (attempt {attempts + 1}/8)</p>
          </>
        )}
        {status === "paid" && (
          <>
            <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
            <h1 className="font-display text-3xl mt-4">Yatra booked 🙏</h1>
            <p className="text-sm text-muted-foreground mt-3">Your sacred journey is confirmed. Our concierge will reach out within 24 hours.</p>
            {details && <p className="mt-4 text-xs text-muted-foreground">Booking · {bookingId?.slice(0, 8)}</p>}
            <div className="mt-6 flex gap-3 justify-center">
              <Link to="/dashboard"><Button className="bg-gold hover:bg-gold-hover text-himalaya-900" data-testid="go-dashboard-btn">Go to Dashboard</Button></Link>
              <Link to="/packages"><Button variant="outline">More packages</Button></Link>
            </div>
          </>
        )}
        {(status === "expired" || status === "timeout") && (
          <>
            <AlertTriangle className="h-10 w-10 text-destructive mx-auto" />
            <h1 className="font-display text-3xl mt-4">{status === "expired" ? "Session expired" : "Could not confirm"}</h1>
            <p className="text-sm text-muted-foreground mt-2">Please try the booking again or contact support.</p>
            <Link to="/packages" className="inline-block mt-6"><Button variant="outline">Back to packages</Button></Link>
          </>
        )}
      </Card>
    </div>
  );
}
