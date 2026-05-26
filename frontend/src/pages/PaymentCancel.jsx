import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { XCircle } from "lucide-react";

export default function PaymentCancel() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-5">
      <Card className="max-w-lg w-full p-10 text-center">
        <XCircle className="h-10 w-10 text-muted-foreground mx-auto" />
        <h1 className="font-display text-3xl mt-4">Booking cancelled</h1>
        <p className="text-sm text-muted-foreground mt-2">You can retry whenever you are ready. Your seat is held briefly.</p>
        <Link to="/packages" className="inline-block mt-6">
          <Button className="bg-gold hover:bg-gold-hover text-himalaya-900" data-testid="retry-packages-btn">Browse packages</Button>
        </Link>
      </Card>
    </div>
  );
}
