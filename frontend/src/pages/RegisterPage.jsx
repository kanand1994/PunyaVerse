import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Mountain } from "lucide-react";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(name, email, password);
      toast.success("Welcome to PunyaVerse 🙏");
      navigate("/dashboard");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Registration failed");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-5 mandala-bg">
      <Card className="w-full max-w-md p-8">
        <Mountain className="h-7 w-7 text-gold" />
        <h1 className="font-display text-3xl mt-4">Begin your yatra</h1>
        <p className="text-sm text-muted-foreground mt-1">Save itineraries, book darshans, manage bookings.</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <Label>Full name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required data-testid="register-name" />
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required data-testid="register-email" />
          </div>
          <div>
            <Label>Password (min 6 chars)</Label>
            <Input type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required data-testid="register-password" />
          </div>
          <Button type="submit" disabled={loading} className="w-full bg-gold hover:bg-gold-hover text-himalaya-900" data-testid="register-submit">
            {loading ? "Creating account…" : "Create account"}
          </Button>
        </form>
        <p className="mt-6 text-sm text-center text-muted-foreground">
          Already have an account? <Link to="/login" className="text-gold hover:underline">Sign in</Link>
        </p>
      </Card>
    </div>
  );
}
