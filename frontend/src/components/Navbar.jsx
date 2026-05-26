import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import { Sun, Moon, Mountain, Menu, X, User } from "lucide-react";
import { useState } from "react";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

const navItems = [
  { to: "/temples", label: "Temples" },
  { to: "/packages", label: "Packages" },
  { to: "/ai-planner", label: "AI Planner" },
  { to: "/trip-builder", label: "Build Trip" },
  { to: "/trekking", label: "Trekking" },
  { to: "/transport", label: "Compare Transport" },
  { to: "/festivals", label: "Festivals" },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const dashboardLink =
    user?.role === "superadmin" ? "/sanctum-portal-7821" :
    user?.role === "admin" ? "/admin" :
    user?.role === "employee" ? "/employee" :
    "/dashboard";

  return (
    <header className="sticky top-0 z-50 glass-light dark:glass-dark border-b border-border/60">
      <div className="mx-auto max-w-7xl px-5 lg:px-10 flex items-center justify-between h-16">
        <Link to="/" className="flex items-center gap-2 group" data-testid="nav-logo">
          <Mountain className="h-6 w-6 text-gold transition-transform group-hover:rotate-6" strokeWidth={1.6} />
          <span className="font-display text-xl tracking-tight">PunyaVerse</span>
          <span className="hidden md:inline font-overline text-muted-foreground ml-2">Sacred · AI · Travel</span>
        </Link>

        <nav className="hidden lg:flex items-center gap-1">
          {navItems.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              data-testid={`nav-${n.to.replace("/", "")}`}
              className={({ isActive }) =>
                `px-3 py-2 text-sm rounded-md transition hover:text-gold ${isActive ? "text-gold" : "text-foreground/80"}`
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggle}
            aria-label="Toggle theme"
            data-testid="theme-toggle"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          {!user ? (
            <>
              <Button variant="ghost" onClick={() => navigate("/login")} data-testid="nav-login-btn">Login</Button>
              <Button onClick={() => navigate("/register")} className="bg-gold hover:bg-gold-hover text-himalaya-900" data-testid="nav-register-btn">
                Begin Yatra
              </Button>
            </>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2" data-testid="nav-user-menu">
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">{user.name.split(" ")[0]}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel className="font-overline">{user.role}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate(dashboardLink)} data-testid="menu-dashboard">Dashboard</DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/dashboard/bookings")} data-testid="menu-bookings">My Bookings</DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/dashboard/wishlist")} data-testid="menu-wishlist">Wishlist</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => { logout(); navigate("/"); }} data-testid="menu-logout">Logout</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(!open)} data-testid="mobile-menu-toggle">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {open && (
        <div className="lg:hidden border-t border-border/60 px-5 py-4 grid gap-2 bg-background">
          {navItems.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              onClick={() => setOpen(false)}
              className="py-2 text-sm text-foreground/90 hover:text-gold"
            >
              {n.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
