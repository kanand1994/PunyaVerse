import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Mountain } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get("next") || "/dashboard";

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(email, password);
      toast.success(`Welcome, ${user.name} 🙏`);
      if (user.role === "superadmin") navigate("/sanctum-portal-7821");
      else if (user.role === "admin") navigate("/admin");
      else if (user.role === "employee") navigate("/employee");
      else navigate(next);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Login failed");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-5 mandala-bg">
      <Card className="w-full max-w-md p-8">
        <Mountain className="h-7 w-7 text-gold" />
        <h1 className="font-display text-3xl mt-4">Welcome back</h1>
        <p className="text-sm text-muted-foreground mt-1">Continue your sacred journey.</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required data-testid="login-email" />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required data-testid="login-password" />
          </div>
          <Button type="submit" disabled={loading} className="w-full bg-gold hover:bg-gold-hover text-himalaya-900" data-testid="login-submit">
            {loading ? "Signing you in…" : "Login"}
          </Button>
        </form>
        <p className="mt-6 text-sm text-center text-muted-foreground">
          New to PunyaVerse? <Link to="/register" className="text-gold hover:underline">Begin your yatra</Link>
        </p>
      </Card>
    </div>
  );
}
