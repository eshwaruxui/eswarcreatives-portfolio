import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router";
import { Palette } from "lucide-react";
import { Navbar } from "./Navbar"; // refreshed
import { HeroSection } from "./HeroSection";
import { FlagshipCase } from "./FlagshipCase";
import { Testimonials } from "./Testimonials";
import { SelectedWorks } from "./SelectedWorks";
import { Principles } from "./Principles";
import { FooterSection } from "./FooterSection";
import eswarLogo from "../../imports/eswar-logo.svg";

function DevFloatingButton() {
  const [hovered, setHovered] = useState(false);

  return (
    <Link
      to="/design-system"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="fixed bottom-6 right-6 z-[9999] flex items-center gap-2 px-3 py-2.5 rounded-full bg-gray-900/80 text-white backdrop-blur-sm shadow-lg transition-all duration-300 opacity-[0.15] hover:opacity-100 hover:bg-gray-900 hover:shadow-xl"
      style={{ fontFamily: "'Inter', sans-serif" }}
      title="Design System (Internal)"
      aria-label="Open Design System page"
    >
      <Palette className="w-4 h-4" />
      {hovered && (
        <span
          className="pr-1 whitespace-nowrap"
          style={{
            fontSize: "var(--typo-label-m-size)",
            lineHeight: "var(--typo-label-m-line-height)",
            fontWeight: "var(--typo-label-m-weight)",
          }}
        >
          Design System
        </span>
      )}
    </Link>
  );
}

export function PortfolioHome() {
  useEffect(() => {
    let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.type = "image/svg+xml";
    link.href = eswarLogo;

    const viewport = document.querySelector<HTMLMetaElement>(
      "meta[name='viewport']"
    );
    if (viewport) {
      viewport.content =
        viewport.content.replace(/,?\s*viewport-fit=\w+/, "") +
        ", viewport-fit=cover";
    }

    const existingMeta = document.querySelector<HTMLMetaElement>(
      "meta[name='theme-color']"
    );
    if (existingMeta) existingMeta.remove();

    const bg = "#ffffff";
    document.documentElement.style.background = bg;
    document.body.style.background = "transparent";
  }, []);

  return (
    <>
      <Helmet>
        <title>Eswar Maheswaran — Enterprise SaaS Design Systems Architect</title>
        <meta property="og:title" content="Eswar Maheswaran — Enterprise SaaS Design Systems Architect" />
        <meta property="og:description" content="Enterprise SaaS Design Systems Architect. HFI-CUA Certified. Web, iOS, Android." />
        <meta property="og:image" content="https://www.eswarcreatives.in/og-portfolio.png" />
        <meta property="og:url" content="https://www.eswarcreatives.in/" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Eswar Creatives" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Eswar Maheswaran — Enterprise SaaS Design Systems Architect" />
        <meta name="twitter:description" content="Enterprise SaaS Design Systems Architect. HFI-CUA Certified. Web, iOS, Android." />
        <meta name="twitter:image" content="https://www.eswarcreatives.in/og-portfolio.png" />
      </Helmet>
      <div
        className="min-h-screen w-full bg-bg-page"
        style={{
          fontFamily: "var(--font-body)",
      }}
    >
      <Navbar />
      <HeroSection />
      <FlagshipCase />
      <Testimonials />
      <SelectedWorks />
      <Principles />
      <FooterSection />
      <DevFloatingButton />
    </div>
    </>
  );
}