import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { useNotifications } from "@/lib/notifications";
import { Button } from "@/components/ui/button";
import { Sun, Moon, Menu, X, User, Bell, Globe } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

export default function Navbar() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const { t, i18n } = useTranslation();
  const { notifications } = useNotifications();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const navItems = [
    { to: "/temples", label: t("nav.temples") },
    { to: "/packages", label: t("nav.packages") },
    { to: "/ai-planner", label: t("nav.ai_planner") },
    { to: "/trip-builder", label: t("nav.trip_builder") },
    { to: "/trekking", label: t("nav.trekking") },
    { to: "/transport", label: t("nav.transport") },
    { to: "/festivals", label: t("nav.festivals") },
  ];

  const dashboardLink =
    user?.role === "superadmin" ? "/sanctum-portal-7821" :
    user?.role === "admin" ? "/admin" :
    user?.role === "employee" ? "/employee" :
    "/dashboard";

  const changeLang = (lng) => { i18n.changeLanguage(lng); };

  return (
    <header className="sticky top-0 z-50 glass-light dark:glass-dark border-b border-border/60">
      <div className="mx-auto max-w-7xl px-5 lg:px-10 flex items-center justify-between h-16">
        <Link to="/" className="flex items-center gap-2 group" data-testid="nav-logo">
          <img
            src="/punyaverse-logo.png"
            alt="PunyaVerse"
            className="h-10 w-10 object-contain transition-transform group-hover:scale-105 drop-shadow"
          />
          <span className="font-display text-xl tracking-tight hidden sm:inline">PunyaVerse</span>
        </Link>

        <nav className="hidden xl:flex items-center gap-1">
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

        <div className="flex items-center gap-1">
          {/* Language switcher */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Language" data-testid="lang-toggle">
                <Globe className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-32">
              <DropdownMenuItem onClick={() => changeLang("en")} data-testid="lang-en">English</DropdownMenuItem>
              <DropdownMenuItem onClick={() => changeLang("hi")} data-testid="lang-hi">हिन्दी</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="ghost" size="icon"
            onClick={toggle}
            aria-label="Toggle theme"
            data-testid="theme-toggle"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative" data-testid="notif-toggle">
                  <Bell className="h-4 w-4" />
                  {notifications.length > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 text-[10px] rounded-full bg-gold text-himalaya-900 flex items-center justify-center font-bold">
                      {notifications.length}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel className="font-overline">{t("nav.notifications")}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {notifications.length === 0 ? (
                  <p className="text-xs text-muted-foreground p-3">No new notifications.</p>
                ) : notifications.slice(0, 6).map((n) => (
                  <div key={n._id} className="px-3 py-2 border-b border-border last:border-0">
                    <p className="text-sm font-medium">{n.title}</p>
                    <p className="text-xs text-muted-foreground">{n.message}</p>
                  </div>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {!user ? (
            <>
              <Button variant="ghost" onClick={() => navigate("/login")} data-testid="nav-login-btn">{t("nav.login")}</Button>
              <Button onClick={() => navigate("/register")} className="bg-gold hover:bg-gold-hover text-himalaya-900" data-testid="nav-register-btn">
                {t("nav.begin")}
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
                <DropdownMenuItem onClick={() => navigate(dashboardLink)} data-testid="menu-dashboard">{t("nav.dashboard")}</DropdownMenuItem>
                {user.role === "superadmin" && (
                  <DropdownMenuItem onClick={() => navigate("/admin")} data-testid="menu-operations">Operations Console</DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => navigate("/dashboard")} data-testid="menu-bookings">{t("nav.my_bookings")}</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => { logout(); navigate("/"); }} data-testid="menu-logout">{t("nav.logout")}</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <Button variant="ghost" size="icon" className="xl:hidden" onClick={() => setOpen(!open)} data-testid="mobile-menu-toggle">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {open && (
        <div className="xl:hidden border-t border-border/60 px-5 py-4 grid gap-2 bg-background">
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
