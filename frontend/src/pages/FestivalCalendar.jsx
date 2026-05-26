import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "lucide-react";

export default function FestivalCalendar() {
  const [festivals, setFestivals] = useState([]);
  useEffect(() => { api.get("/festivals").then(({ data }) => setFestivals(data)); }, []);

  return (
    <div className="mx-auto max-w-5xl px-5 lg:px-10 py-12">
      <p className="font-overline text-gold">Festival Calendar</p>
      <h1 className="font-display text-4xl sm:text-5xl tracking-tight mt-3">Plan your yatra around the heavens</h1>
      <p className="text-muted-foreground mt-3 max-w-2xl">Major Hindu, Buddhist and Sikh festivals across our sacred geography. Tap each to see linked temples.</p>

      <div className="mt-10 space-y-4">
        {festivals.map((f) => (
          <Card key={f.name + f.date} className="p-5 flex flex-col md:flex-row md:items-center gap-4">
            <div className="md:w-40 flex md:flex-col items-center md:items-start gap-2">
              <Calendar className="h-5 w-5 text-gold" />
              <p className="font-display text-2xl">{new Date(f.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</p>
              <p className="font-overline text-muted-foreground">{new Date(f.date).getFullYear()}</p>
            </div>
            <div className="flex-1">
              <h3 className="font-display text-xl">{f.name}</h3>
              <p className="text-sm text-muted-foreground mt-1">{f.description}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {f.temples.map((t) => <Badge key={t} variant="outline">{t}</Badge>)}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
