import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-border/60 bg-background">
      <div className="mx-auto max-w-7xl px-5 lg:px-10 py-16 grid gap-10 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <img src="/punyaverse-logo.png" alt="PunyaVerse" className="h-9 w-9 object-contain" />
            <span className="font-display text-lg">PunyaVerse</span>
          </div>
          <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
            An AI-powered spiritual travel ecosystem for India, Nepal and the sacred Kailash region.
          </p>
        </div>
        <div>
          <p className="font-overline mb-3">Explore</p>
          <ul className="space-y-2 text-sm">
            <li><Link to="/temples" className="hover:text-gold">Temples</Link></li>
            <li><Link to="/packages" className="hover:text-gold">Packages</Link></li>
            <li><Link to="/trekking" className="hover:text-gold">Trekking</Link></li>
            <li><Link to="/festivals" className="hover:text-gold">Festival Calendar</Link></li>
          </ul>
        </div>
        <div>
          <p className="font-overline mb-3">AI & Tools</p>
          <ul className="space-y-2 text-sm">
            <li><Link to="/ai-planner" className="hover:text-gold">AI Spiritual Planner</Link></li>
            <li><Link to="/trip-builder" className="hover:text-gold">Custom Trip Builder</Link></li>
            <li><Link to="/transport" className="hover:text-gold">Compare Transport</Link></li>
          </ul>
        </div>
        <div>
          <p className="font-overline mb-3">Sacred Helpline</p>
          <p className="text-sm text-muted-foreground">24×7 emergency assistance during yatra.</p>
          <p className="mt-3 text-sm">📞 1800-SACRED-1</p>
          <p className="text-sm">✉ care@punyaverse.com</p>
        </div>
      </div>
      <div className="border-t border-border/60">
        <div className="mx-auto max-w-7xl px-5 lg:px-10 py-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} PunyaVerse · Connecting Every Sacred Path</p>
          <p className="font-overline">हर हर महादेव · ॐ नमः शिवाय</p>
        </div>
      </div>
    </footer>
  );
}
