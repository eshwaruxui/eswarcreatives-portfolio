import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { Link, useLocation } from "react-router";
import eswarLogo from "../../imports/eswar-logo.svg";
import { PortfolioButton } from "./ui/portfolio-button";
import { ContactModal } from "./ContactModal"; // refreshed ref

interface NavLink {
  label: string;
  href?: string;
  isRoute?: boolean;
  isModal?: boolean;
  active?: boolean;
}

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const location = useLocation();
  const isHome = location.pathname === "/";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close mobile menu on route change.
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const navLinks: NavLink[] = isHome
    ? [
        { label: "Work", href: "#work" },
        { label: "About", href: "/about", isRoute: true },
        { label: "Contact", isModal: true },
      ]
    : [
        { label: "Work", href: "/#work", isRoute: true },
        { label: "About", href: "/about", isRoute: true, active: location.pathname === "/about" },
        { label: "Contact", isModal: true },
      ];

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 w-full ${
          scrolled
            ? "bg-white/80 backdrop-blur-xl shadow-lg shadow-black/5 border-b border-black/5"
            : "bg-white/60 backdrop-blur-md border-b border-black/[0.03]"
        }`}
      >
        <div className="flex items-center justify-between px-6 py-3 max-w-6xl mx-auto">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <img src={eswarLogo} alt="Eswar logo" className="w-8 h-8 group-hover:scale-105 transition-transform" />
            <span
              className="tracking-tight"
              style={{
                fontSize: "var(--typo-ol-body-semi-size)",
                lineHeight: "var(--typo-ol-body-semi-line-height)",
                fontWeight: "var(--typo-ol-body-semi-weight)",
              }}
            >
              Eswar
            </span>
          </Link>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              if (link.isModal) {
                return (
                  <button
                    key={link.label}
                    onClick={() => setContactOpen(true)}
                    className="px-4 py-2 text-text-secondary hover:text-text-primary rounded-xl hover:bg-black/[0.04] transition-all duration-200 cursor-pointer"
                    style={{
                      fontSize: "var(--typo-h7-size)",
                      lineHeight: "var(--typo-h7-line-height)",
                      fontWeight: "var(--typo-h7-weight)",
                    }}
                  >
                    {link.label}
                  </button>
                );
              }

              if (link.isRoute && link.href) {
                return (
                  <Link
                    key={link.label}
                    to={link.href}
                    className={`px-4 py-2 rounded-xl transition-all duration-200 ${
                      link.active
                        ? "text-text-primary bg-black/[0.04]"
                        : "text-text-secondary hover:text-text-primary hover:bg-black/[0.04]"
                    }`}
                    style={{
                      fontSize: "var(--typo-h7-size)",
                      lineHeight: "var(--typo-h7-line-height)",
                      fontWeight: "var(--typo-h7-weight)",
                    }}
                  >
                    {link.label}
                  </Link>
                );
              }

              return (
                <a
                  key={link.label}
                  href={link.href}
                  className="px-4 py-2 text-text-secondary hover:text-text-primary rounded-xl hover:bg-black/[0.04] transition-all duration-200"
                  style={{
                    fontSize: "var(--typo-h7-size)",
                    lineHeight: "var(--typo-h7-line-height)",
                    fontWeight: "var(--typo-h7-weight)",
                  }}
                >
                  {link.label}
                </a>
              );
            })}
          </div>

          {/* TODO: replace with real Calendly URL before sharing with outreach contacts */}
          <PortfolioButton
            href="https://calendly.com/eswarcreatives/25-min-intro-call"
            target="_blank"
            rel="noopener noreferrer"
            variant="primary"
            size="md"
            className="hidden md:flex px-4 py-2"
          >
            Book a call →
          </PortfolioButton>

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
            className="md:hidden border-t border-black/5 px-4 pb-4 pt-2 space-y-1 max-w-6xl mx-auto"
            role="menu"
            aria-label="Navigation menu"
          >
            {navLinks.map((link) => {
              if (link.isModal) {
                return (
                  <button
                    key={link.label}
                    onClick={() => {
                      setContactOpen(true);
                      setMobileOpen(false);
                    }}
                    className="block w-full text-left px-4 py-2.5 text-text-secondary hover:text-text-primary rounded-xl hover:bg-black/[0.04] transition-all cursor-pointer"
                    style={{
                      fontSize: "var(--typo-h7-size)",
                      lineHeight: "var(--typo-h7-line-height)",
                      fontWeight: "var(--typo-h7-weight)",
                    }}
                    role="menuitem"
                  >
                    {link.label}
                  </button>
                );
              }

              if (link.isRoute && link.href) {
                return (
                  <Link
                    key={link.label}
                    to={link.href}
                    onClick={() => setMobileOpen(false)}
                    className={`block px-4 py-2.5 rounded-xl transition-all ${
                      link.active
                        ? "text-text-primary bg-black/[0.04]"
                        : "text-text-secondary hover:text-text-primary hover:bg-black/[0.04]"
                    }`}
                    style={{
                      fontSize: "var(--typo-h7-size)",
                      lineHeight: "var(--typo-h7-line-height)",
                      fontWeight: "var(--typo-h7-weight)",
                    }}
                    role="menuitem"
                  >
                    {link.label}
                  </Link>
                );
              }

              return (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="block px-4 py-2.5 text-text-secondary hover:text-text-primary rounded-xl hover:bg-black/[0.04] transition-all"
                  style={{
                    fontSize: "var(--typo-h7-size)",
                    lineHeight: "var(--typo-h7-line-height)",
                    fontWeight: "var(--typo-h7-weight)",
                  }}
                  role="menuitem"
                >
                  {link.label}
                </a>
              );
            })}
            {/* TODO: replace with real Calendly URL before sharing with outreach contacts */}
            <PortfolioButton
              href="https://calendly.com/eswarcreatives/25-min-intro-call"
              target="_blank"
              rel="noopener noreferrer"
              variant="primary"
              size="md"
              className="mt-2 px-4 py-2.5"
              role="menuitem"
            >
              Book a call →
            </PortfolioButton>
          </div>
        )}
      </nav>

      <ContactModal open={contactOpen} onOpenChange={setContactOpen} />
    </>
  );
}
