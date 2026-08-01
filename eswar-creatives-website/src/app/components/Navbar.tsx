import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router";
import { ECButton } from "../../components/marketing/ECButton";
import { BrandLogoNav } from "../../components/marketing/BrandLogoNav";
import { ContactModal } from "./ContactModal"; // refreshed ref

interface NavLink {
  label: string;
  href: string;
  isRoute?: boolean;
  isModal?: boolean;
}

// Figma component set "Navbar - Site & Landing pages" — Page=Brand Studio /
// SaaS / Portfolio. One shared component for all three marketing surfaces
// (previously split across this file and the now-retired LandingNav.tsx).
export type NavPage = "brand-studio" | "saas" | "portfolio";

function detectPage(pathname: string): NavPage {
  if (pathname.startsWith("/branding")) return "brand-studio";
  if (pathname.startsWith("/design-systems") || pathname.startsWith("/services/design-systems")) return "saas";
  return "portfolio";
}

// CTA and logo destination differ per page — sourced from what each surface
// already used before consolidation (LandingNav's WhatsApp CTA + /branding
// logo link for Brand Studio; this file's Calendly CTA + home logo link for
// SaaS/Portfolio). Not something to unify further without a content decision.
const CTA_BY_PAGE: Record<NavPage, { label: string; href: string }> = {
  "brand-studio": { label: "Let's talk →", href: "https://wa.me/919841085484" },
  saas: { label: "Book a call →", href: "https://calendly.com/eswarcreatives/25-min-intro-call" },
  portfolio: { label: "Book a call →", href: "https://calendly.com/eswarcreatives/25-min-intro-call" },
};
const LOGO_HREF_BY_PAGE: Record<NavPage, string> = {
  "brand-studio": "/branding",
  saas: "/design-systems",
  portfolio: "/",
};

interface NavbarProps {
  // Optional override — normally auto-detected from the route so existing
  // `<Navbar />` call sites across the portfolio/design-systems pages don't
  // need to change.
  page?: NavPage;
}

export function Navbar({ page: pageProp }: NavbarProps = {}) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const page = pageProp ?? detectPage(location.pathname);
  const isHome = location.pathname === "/";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Same-page hash links (e.g. "How it works" → #how-it-works) default to an
  // instant jump; intercept and scroll smoothly instead when the target
  // section is already on the current page.
  function handleAnchorClick(e: React.MouseEvent, href: string) {
    const [path, hash] = href.split("#");
    if (!hash || (path && path !== location.pathname)) return;
    const target = document.getElementById(hash);
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const navLinks: NavLink[] =
    page === "brand-studio"
      ? [
          { label: "Work", href: "/branding/work", isRoute: true },
          { label: "Services", href: "/branding", isRoute: true },
          { label: "About", href: "/about", isRoute: true },
        ]
      : page === "saas"
      ? [
          { label: "How it works", href: "/design-systems#how-it-works" },
          { label: "Case study", href: "/design-systems/case-study", isRoute: true },
          { label: "Pricing", href: "/services/design-systems", isRoute: true },
        ]
      : isHome
      ? [
          { label: "Work", href: "#work" },
          { label: "About", href: "/about", isRoute: true },
          { label: "Contact", href: "#contact", isModal: true },
        ]
      : [
          { label: "Work", href: "/#work", isRoute: true },
          { label: "About", href: "/about", isRoute: true },
          { label: "Contact", href: "#contact", isModal: true },
        ];

  const cta = CTA_BY_PAGE[page];

  return (
    <>
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 w-full border-b border-[rgba(28,24,45,0.1)] ${
        scrolled
          ? "bg-white/80 backdrop-blur-xl shadow-lg shadow-black/5"
          : "bg-white/60 backdrop-blur-md"
      }`}
    >
      <div className="flex items-center justify-between px-6 py-3 max-w-6xl mx-auto">
        {/* Logo — Figma EC Brand Logo - Top Nav (node 4448:13972) */}
        <Link
          to={LOGO_HREF_BY_PAGE[page]}
          className="flex items-center"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        >
          <BrandLogoNav variant={page} />
        </Link>

        {/* Desktop Links — Figma Buttons/EC-Button, Size=md, Hierarchy=Tertiary gray */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <ECButton
              key={link.label}
              hierarchy="tertiary-gray"
              size="md"
              label={link.label}
              href={link.href}
              onClick={
                link.isModal
                  ? (e) => {
                      e.preventDefault();
                      setContactOpen(true);
                    }
                  : link.isRoute
                  ? (e) => {
                      e.preventDefault();
                      navigate(link.href);
                    }
                  : (e) => handleAnchorClick(e, link.href)
              }
            />
          ))}
        </div>

        <div className="hidden md:flex">
          <ECButton hierarchy="primary" size="md" label={cta.label} href={cta.href} target="_blank" />
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden p-2 rounded-xl hover:bg-black/5 transition-colors"
          aria-expanded={mobileOpen}
          aria-controls="mobile-nav-menu"
          aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Dropdown */}
      {mobileOpen && (
        <div
          id="mobile-nav-menu"
          className="md:hidden border-t border-black/[0.08] px-4 pb-4 pt-2 space-y-1 max-w-6xl mx-auto"
          role="menu"
          aria-label="Navigation menu"
        >
          {navLinks.map((link) =>
            link.isModal ? (
              <button
                key={link.label}
                onClick={() => {
                  setContactOpen(true);
                  setMobileOpen(false);
                }}
                className="block w-full text-left px-4 py-2.5 text-text-secondary hover:text-text-primary rounded-xl hover:bg-black/[0.04] transition-all cursor-pointer"
                style={{
                  fontSize: "var(--ds-text-md)",
                  lineHeight: "var(--typo-h7-line-height)",
                  fontWeight: "var(--typo-h7-weight)",
                }}
                role="menuitem"
              >
                {link.label}
              </button>
            ) : link.isRoute ? (
              <Link
                key={link.label}
                to={link.href}
                onClick={() => setMobileOpen(false)}
                className="block px-4 py-2.5 rounded-xl transition-all text-text-secondary hover:text-text-primary hover:bg-black/[0.04]"
                style={{
                  fontSize: "var(--ds-text-md)",
                  lineHeight: "var(--typo-h7-line-height)",
                  fontWeight: "var(--typo-h7-weight)",
                }}
                role="menuitem"
              >
                {link.label}
              </Link>
            ) : (
              <a
                key={link.label}
                href={link.href}
                onClick={(e) => {
                  handleAnchorClick(e, link.href);
                  setMobileOpen(false);
                }}
                className="block px-4 py-2.5 text-text-secondary hover:text-text-primary rounded-xl hover:bg-black/[0.04] transition-all"
                style={{
                  fontSize: "var(--ds-text-md)",
                  lineHeight: "var(--typo-h7-line-height)",
                  fontWeight: "var(--typo-h7-weight)",
                }}
                role="menuitem"
              >
                {link.label}
              </a>
            )
          )}
          <div className="mt-2">
            <ECButton hierarchy="primary" size="md" label={cta.label} href={cta.href} target="_blank" role="menuitem" />
          </div>
        </div>
      )}
    </nav>

    <ContactModal open={contactOpen} onOpenChange={setContactOpen} />
    </>
  );
}