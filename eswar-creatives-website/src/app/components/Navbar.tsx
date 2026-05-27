import { useState, useEffect, useRef } from "react";
import { Menu, X, ChevronDown } from "lucide-react";
import { Link, useLocation } from "react-router";
import eswarLogo from "../../imports/eswar-logo.svg";
import { PortfolioButton } from "./ui/portfolio-button";
import { ContactModal } from "./ContactModal"; // refreshed ref

interface NavChild {
  label: string;
  description?: string;
  href: string;
}

interface NavLink {
  label: string;
  href?: string;
  isRoute?: boolean;
  isModal?: boolean;
  isDropdown?: boolean;
  active?: boolean;
  children?: NavChild[];
}

const SERVICES_CHILDREN: NavChild[] = [
  {
    label: "Brand Identity",
    description: "Atelier — logos, guidelines, full identity systems.",
    href: "/services/branding",
  },
  {
    label: "Design Systems",
    description: "Atelier — tokens, components, governance for SaaS.",
    href: "/services/design-systems",
  },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const servicesRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const location = useLocation();
  const isHome = location.pathname === "/";
  const onServicesArea = location.pathname.startsWith("/services");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close mobile menu on route change.
  useEffect(() => {
    setMobileOpen(false);
    setServicesOpen(false);
  }, [location.pathname]);

  // Close dropdown when clicking outside.
  useEffect(() => {
    if (!servicesOpen) return;
    const onClickAway = (e: MouseEvent) => {
      if (servicesRef.current && !servicesRef.current.contains(e.target as Node)) {
        setServicesOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickAway);
    return () => document.removeEventListener("mousedown", onClickAway);
  }, [servicesOpen]);

  const navLinks: NavLink[] = isHome
    ? [
        { label: "Work", href: "#work" },
        { label: "Services", isDropdown: true, children: SERVICES_CHILDREN, active: onServicesArea },
        { label: "About", href: "/about", isRoute: true },
        { label: "Contact", isModal: true },
      ]
    : [
        { label: "Work", href: "/#work", isRoute: true },
        { label: "Services", isDropdown: true, children: SERVICES_CHILDREN, active: onServicesArea },
        { label: "About", href: "/about", isRoute: true, active: location.pathname === "/about" },
        { label: "Contact", isModal: true },
      ];

  const openDropdown = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setServicesOpen(true);
  };
  const scheduleClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setServicesOpen(false), 140);
  };

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
              if (link.isDropdown && link.children) {
                return (
                  <div
                    key={link.label}
                    ref={servicesRef}
                    className="relative"
                    onMouseEnter={openDropdown}
                    onMouseLeave={scheduleClose}
                  >
                    <button
                      type="button"
                      onClick={() => setServicesOpen((v) => !v)}
                      aria-haspopup="menu"
                      aria-expanded={servicesOpen}
                      className={`inline-flex items-center gap-1 px-4 py-2 rounded-xl transition-all duration-200 cursor-pointer ${
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
                      <ChevronDown
                        className={`w-3.5 h-3.5 transition-transform duration-200 ${
                          servicesOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                    {servicesOpen && (
                      <div
                        className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-72 rounded-xl bg-white shadow-xl shadow-black/10 border border-black/5 overflow-hidden"
                        role="menu"
                        onMouseEnter={openDropdown}
                        onMouseLeave={scheduleClose}
                      >
                        {link.children.map((child) => (
                          <Link
                            key={child.href}
                            to={child.href}
                            role="menuitem"
                            onClick={() => setServicesOpen(false)}
                            className="block px-4 py-3 hover:bg-black/[0.03] transition-colors"
                          >
                            <div
                              className="text-text-primary mb-0.5"
                              style={{
                                fontSize: "var(--typo-h7m-size)",
                                lineHeight: "var(--typo-h7m-line-height)",
                                fontWeight: "var(--typo-h7m-weight)",
                              }}
                            >
                              {child.label}
                            </div>
                            {child.description && (
                              <div
                                className="text-text-secondary"
                                style={{
                                  fontSize: "var(--typo-h8-size)",
                                  lineHeight: "var(--typo-h8-line-height)",
                                }}
                              >
                                {child.description}
                              </div>
                            )}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }

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
              if (link.isDropdown && link.children) {
                return (
                  <div key={link.label} className="pt-1">
                    <div
                      className="px-4 pt-2 pb-1 text-[11px] uppercase tracking-[0.10em] text-text-secondary"
                      style={{ fontWeight: 600 }}
                    >
                      {link.label}
                    </div>
                    {link.children.map((child) => (
                      <Link
                        key={child.href}
                        to={child.href}
                        onClick={() => setMobileOpen(false)}
                        className="block px-4 py-2.5 text-text-secondary hover:text-text-primary rounded-xl hover:bg-black/[0.04] transition-all"
                        style={{
                          fontSize: "var(--typo-h7-size)",
                          lineHeight: "var(--typo-h7-line-height)",
                          fontWeight: "var(--typo-h7-weight)",
                        }}
                        role="menuitem"
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                );
              }

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
