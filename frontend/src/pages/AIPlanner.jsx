import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { Sparkles, Wand2 } from "lucide-react";
import { toast } from "sonner";

const SAMPLE_PROMPTS = [
  "Plan a 10-day Kedarnath and Badrinath yatra for elderly parents under ₹60,000.",
  "Design a 7-day Kailash Mansarovar helicopter package from Delhi.",
  "Create a 5-day South India Jyotirlinga tour with luxury hotels.",
  "Plan a Nepal spiritual circuit with Pashupatinath, Muktinath and Lumbini in 8 days.",
];

export default function AIPlanner() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState("");
  const [days, setDays] = useState("");
  const [travelers, setTravelers] = useState(2);
  const [budget, setBudget] = useState("");
  const [elderly, setElderly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const submit = async () => {
    if (!user) { toast.error("Please login to use AI Planner"); navigate("/login?next=/ai-planner"); return; }
    if (!prompt.trim()) { toast.error("Tell us about your yatra"); return; }
    setLoading(true);
    setResult(null);
    try {
      const { data } = await api.post("/ai/plan", {
        prompt,
        days: days ? parseInt(days) : null,
        travelers: parseInt(travelers || "1"),
        budget_inr: budget ? parseFloat(budget) : null,
        elderly,
      });
      setResult(data);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "AI planner failed, please try again");
    } finally { setLoading(false); }
  };

  return (
    <div className="mx-auto max-w-5xl px-5 lg:px-10 py-12">
      <p className="font-overline text-gold">AI Spiritual Planner</p>
      <h1 className="font-display text-4xl sm:text-5xl tracking-tight mt-3 flex items-center gap-3">
        <Sparkles className="h-8 w-8 text-gold" /> Compose your sacred itinerary
      </h1>
      <p className="text-muted-foreground mt-3 max-w-2xl">Powered by GPT-5.2, Claude Sonnet 4.5 and Gemini 3 Flash with intelligent fallback. Trained on temple lore, altitudes, festivals and crowd patterns.</p>

      <Card className="mt-8 p-6">
        <Label>Your prompt</Label>
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Plan a 12-day Char Dham yatra for senior parents leaving from Mumbai in late May…"
          rows={4}
          className="mt-2"
          data-testid="ai-prompt-input"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          {SAMPLE_PROMPTS.map((p) => (
            <button key={p} onClick={() => setPrompt(p)} className="text-xs px-3 py-1 rounded-full border border-border hover:border-gold hover:text-gold transition" data-testid="sample-prompt">
              {p}
            </button>
          ))}
        </div>
        <div className="mt-6 grid sm:grid-cols-4 gap-4">
          <div>
            <Label>Days</Label>
            <Input value={days} onChange={(e) => setDays(e.target.value)} type="number" placeholder="10" data-testid="ai-days" />
          </div>
          <div>
            <Label>Travelers</Label>
            <Input value={travelers} onChange={(e) => setTravelers(e.target.value)} type="number" data-testid="ai-travelers" />
          </div>
          <div>
            <Label>Budget (₹)</Label>
            <Input value={budget} onChange={(e) => setBudget(e.target.value)} type="number" placeholder="60000" data-testid="ai-budget" />
          </div>
          <div className="flex items-end justify-between">
            <div>
              <Label className="block">With elderly</Label>
              <Switch checked={elderly} onCheckedChange={setElderly} data-testid="ai-elderly" />
            </div>
          </div>
        </div>
        <Button onClick={submit} disabled={loading} className="mt-6 bg-gold hover:bg-gold-hover text-himalaya-900 gap-2" data-testid="ai-submit-btn">
          {loading ? "Generating sacred plan…" : <><Wand2 className="h-4 w-4" /> Generate Itinerary</>}
        </Button>
      </Card>

      {loading && <div className="flex justify-center py-16"><div className="mandala-loader" /></div>}

      {result && (
        <Card className="mt-8 p-8 mandala-bg" data-testid="ai-result">
          <div className="flex items-center gap-2 mb-4">
            <Badge className="bg-gold text-himalaya-900">{result.model_used}</Badge>
            <p className="text-xs text-muted-foreground">Session {result.session_id.slice(0,8)}</p>
          </div>
          <article className="prose prose-sm max-w-none whitespace-pre-wrap font-body text-foreground leading-relaxed">
            {result.plan}
          </article>
        </Card>
      )}
    </div>
  );
}
