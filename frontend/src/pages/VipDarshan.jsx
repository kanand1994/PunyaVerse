import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { formatINR } from "@/lib/utils-app";
import { Crown, Calendar } from "lucide-react";

const VIP_TEMPLES = [
  { v: "tirupati-balaji", l: "Tirupati Balaji" },
  { v: "kashi-vishwanath", l: "Kashi Vishwanath" },
  { v: "shirdi-sai-baba", l: "Shirdi Sai Baba" },
  { v: "ujjain-mahakaleshwar", l: "Ujjain Mahakaleshwar" },
  { v: "vaishno-devi", l: "Vaishno Devi" },
  { v: "jagannath-puri", l: "Jagannath Puri" },
  { v: "siddhivinayak", l: "Siddhivinayak" },
  { v: "kailash-mansarovar", l: "Kailash Mansarovar" },
];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function VipDarshan() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [temple, setTemple] = useState("tirupati-balaji");
  const [date, setDate] = useState(todayISO());
  const [slots, setSlots] = useState([]);
  const [my, setMy] = useState([]);
  const [travelers, setTravelers] = useState(1);

  const load = async () => {
    const { data } = await api.get("/vip-darshan/slots", { params: { temple_slug: temple, date } });
    setSlots(data);
    if (user) {
      const r = await api.get("/vip-darshan/me");
      setMy(r.data);
    }
  };

  useEffect(() => { load(); /* eslint-disable-line react-hooks/exhaustive-deps */ }, [temple, date, user]);

  const book = async (slot) => {
    if (!user) { toast.error("Please login"); navigate("/login?next=/vip-darshan"); return; }
    if (slot.booked + travelers > slot.capacity) { toast.error("Not enough seats in this slot"); return; }
    try {
      await api.post("/vip-darshan/book", { slot_id: slot.id, travelers });
      toast.success("VIP slot booked 🙏");
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Booking failed");
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-5 lg:px-10 py-12">
      <p className="font-overline text-gold">VIP · Skip the Queue</p>
      <h1 className="font-display text-4xl sm:text-5xl tracking-tight mt-3 flex items-center gap-3">
        <Crown className="h-8 w-8 text-gold" /> {t("vip.title")}
      </h1>
      <p className="text-muted-foreground mt-3 max-w-2xl">{t("vip.subtitle")}</p>

      <Card className="mt-8 p-5 flex flex-wrap items-end gap-3">
        <div className="min-w-[200px]">
          <p className="font-overline mb-1">{t("vip.select_temple")}</p>
          <Select value={temple} onValueChange={setTemple}>
            <SelectTrigger data-testid="vip-temple-select"><SelectValue /></SelectTrigger>
            <SelectContent>
              {VIP_TEMPLES.map((tt) => <SelectItem key={tt.v} value={tt.v}>{tt.l}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <p className="font-overline mb-1">{t("vip.select_date")}</p>
          <input type="date" value={date} min={todayISO()} onChange={(e) => setDate(e.target.value)} className="rounded-md border border-input bg-background h-10 px-3" data-testid="vip-date" />
        </div>
        <div>
          <p className="font-overline mb-1">Travelers</p>
          <input type="number" min={1} max={10} value={travelers} onChange={(e) => setTravelers(parseInt(e.target.value || "1"))} className="rounded-md border border-input bg-background h-10 px-3 w-24" data-testid="vip-travelers" />
        </div>
      </Card>

      <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {slots.map((s) => {
          const left = s.capacity - s.booked;
          const full = left <= 0;
          return (
            <Card key={s.id} className="p-5" data-testid={`vip-slot-${s.id}`}>
              <div className="flex items-center justify-between">
                <p className="font-display text-xl">{s.time}</p>
                <Badge className="bg-gold text-himalaya-900">₹ {formatINR(s.price_inr)}</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><Calendar className="h-3 w-3" /> {s.date}</p>
              <p className="text-sm mt-3">{t("vip.capacity_left", { n: left, total: s.capacity })}</p>
              <Button disabled={full || travelers > left} onClick={() => book(s)} className="w-full mt-4 bg-gold hover:bg-gold-hover text-himalaya-900" data-testid={`vip-book-${s.id}`}>
                {full ? "Full" : t("vip.book_slot")}
              </Button>
            </Card>
          );
        })}
      </div>

      {user && my.length > 0 && (
        <div className="mt-16">
          <h2 className="font-display text-2xl">{t("vip.my_slots")}</h2>
          <div className="mt-4 grid sm:grid-cols-2 gap-3">
            {my.map((b) => (
              <Card key={b.id} className="p-5">
                <p className="font-display">{b.temple_name}</p>
                <p className="text-xs text-muted-foreground">{b.date} · {b.time} · {b.travelers} pilgrim(s)</p>
                <p className="mt-2 font-display">₹ {formatINR(b.amount_inr)}</p>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
