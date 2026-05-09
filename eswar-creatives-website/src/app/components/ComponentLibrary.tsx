import { ArrowRight, Download, MessageCircle, Phone, Mail, MapPin } from "lucide-react";
import { Tag } from "./ui/tag";
import { PortfolioButton } from "./ui/portfolio-button";
import { BulletItem } from "./ui/bullet-item";
import { ContactRow } from "./ui/contact-row";
import { InfoRow } from "./ui/info-row";
import { AccentBar } from "./ui/accent-bar";
import { SectionLabel } from "./ui/section-label";

/* ═══════════════════════════════════════════════════════════════════════
   COMPONENT LIBRARY — live showcase of 7 extracted primitives
   ═══════════════════════════════════════════════════════════════════════ */

function ShowcaseCard({
  title,
  subtitle,
  instances,
  children,
}: {
  title: string;
  subtitle: string;
  instances: number;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-gray-100 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
        <div>
          <h3 className="text-[14px] text-text-primary" style={{ fontWeight: 600 }}>
            {title}
          </h3>
          <p className="text-[11px] text-gray-400 mt-0.5" style={{ fontWeight: 400 }}>
            {subtitle}
          </p>
        </div>
        <span
          className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full tabular-nums"
          style={{ fontWeight: 500 }}
        >
          {instances} instances
        </span>
      </div>
      {/* Content */}
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}

function VariantRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="text-[10px] text-gray-400 uppercase tracking-wider block mb-2" style={{ fontWeight: 600 }}>
        {label}
      </span>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

export function ComponentLibrary() {
  return (
    <div className="flex-1">
      {/* Page header */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 pt-8 pb-4">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] text-gray-400 tracking-[0.08em] uppercase" style={{ fontWeight: 600 }}>
                Components
              </span>
              <span className="text-gray-200">&middot;</span>
              <span className="text-[11px] text-gray-400" style={{ fontWeight: 400 }}>
                7 primitives &middot; extracted from audit
              </span>
            </div>
            <p className="text-[13px] text-gray-400 mt-1" style={{ fontWeight: 400 }}>
              Repeating UI patterns identified across 12 component files and unified into reusable primitives with
              variants, sizes, and consistent design tokens.
            </p>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-50 border border-green-200 shrink-0">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
            <span className="text-[11px] text-green-700" style={{ fontWeight: 600 }}>
              All refactored
            </span>
          </div>
        </div>
      </div>

      {/* Component cards grid */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 pb-8">
        <div className="grid md:grid-cols-2 gap-6">
          {/* ── Tag ── */}
          <ShowcaseCard title="Tag" subtitle="Tag / Pill — 5 variants × 3 sizes" instances={15}>
            <VariantRow label="subtle (hero tags)">
              <Tag variant="subtle" size="lg">#enterprise</Tag>
              <Tag variant="subtle" size="lg">#design systems</Tag>
            </VariantRow>
            <VariantRow label="outlined (case study tags)">
              <Tag variant="outlined" size="md">Enterprise SaaS</Tag>
              <Tag variant="outlined" size="sm">Cybersecurity</Tag>
            </VariantRow>
            <VariantRow label="filled (sidebar tags)">
              <Tag variant="filled" size="sm">Mobile Design</Tag>
              <Tag variant="filled" size="sm">Product Design</Tag>
            </VariantRow>
            <VariantRow label="overlay-dark (image badge)">
              <Tag variant="overlay-dark" size="md">Flagship</Tag>
            </VariantRow>
            <VariantRow label="overlay-light (card badge)">
              <Tag variant="overlay-light" size="md">Flagship</Tag>
            </VariantRow>
          </ShowcaseCard>

          {/* ── PortfolioButton ── */}
          <ShowcaseCard title="PortfolioButton" subtitle="4 variants × 3 sizes" instances={8}>
            <VariantRow label="primary (CTA)">
              <PortfolioButton href="#" variant="primary" size="lg">
                View Flagship Case
                <ArrowRight className="w-4 h-4" />
              </PortfolioButton>
              <PortfolioButton href="#" variant="primary" size="md">
                <MessageCircle className="w-3.5 h-3.5" />
                WhatsApp
              </PortfolioButton>
            </VariantRow>
            <VariantRow label="secondary (ghost outline)">
              <PortfolioButton href="#" variant="secondary" size="lg">
                <Download className="w-4 h-4" />
                Download Resume
              </PortfolioButton>
              <PortfolioButton href="#" variant="secondary" size="sm">
                View case study
                <ArrowRight className="w-3 h-3" />
              </PortfolioButton>
            </VariantRow>
            <VariantRow label="inverse (dark surface)">
              <div className="bg-surface-inverse rounded-xl px-4 py-3">
                <PortfolioButton href="#" variant="inverse" size="md">
                  Read full profile →
                </PortfolioButton>
              </div>
            </VariantRow>
          </ShowcaseCard>

          {/* ── BulletItem ── */}
          <ShowcaseCard title="BulletItem" subtitle="Dot-prefixed list row" instances={4}>
            <ul className="space-y-1.5">
              <BulletItem>
                Merged 3 tools into a single incident view aligned to analyst mental model.
              </BulletItem>
              <BulletItem>
                –32% time-to-triage critical alerts.
              </BulletItem>
            </ul>
          </ShowcaseCard>

          {/* ── SectionLabel ── */}
          <ShowcaseCard title="SectionLabel" subtitle="Overline label — 2 surfaces" instances={6}>
            <VariantRow label="light surface">
              <SectionLabel>Flagship Case Study</SectionLabel>
            </VariantRow>
            <VariantRow label="inverse surface">
              <div className="bg-surface-inverse rounded-xl px-4 py-3">
                <SectionLabel surface="inverse">Contact</SectionLabel>
              </div>
            </VariantRow>
          </ShowcaseCard>

          {/* ── AccentBar ── */}
          <ShowcaseCard title="AccentBar" subtitle="Vertical 3px indicator — 2 states" instances={7}>
            <VariantRow label="active vs default">
              <div className="flex gap-6 items-stretch h-16">
                <div className="relative group">
                  <AccentBar active />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] text-gray-500 whitespace-nowrap" style={{ fontWeight: 500 }}>
                    Active
                  </span>
                </div>
                <div className="relative group">
                  <AccentBar active={false} />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] text-gray-400 whitespace-nowrap" style={{ fontWeight: 400 }}>
                    Default (hover to preview)
                  </span>
                </div>
              </div>
            </VariantRow>
          </ShowcaseCard>

          {/* ── ContactRow ── */}
          <ShowcaseCard title="ContactRow" subtitle="Key-value row with icon (inverse surface)" instances={4}>
            <div className="bg-surface-inverse rounded-xl px-4 py-2">
              <ContactRow icon={<Phone />} label="Mobile no" href="tel:+919841085484" value="+91 98410 85484" />
              <ContactRow icon={<Mail />} label="Email" href="mailto:hello@example.com" value="hello@example.com" />
              <ContactRow icon={<MessageCircle />} label="WhatsApp" href="#" value="Message / Call" external isLink isLast />
            </div>
          </ShowcaseCard>

          {/* ── InfoRow ── */}
          <ShowcaseCard title="InfoRow" subtitle="Icon + text meta row" instances={3}>
            <div className="bg-surface-inverse rounded-xl px-4 py-4 space-y-3">
              <InfoRow icon={<MapPin />}>Based in Chennai, okay to relocate</InfoRow>
              <InfoRow icon={<MessageCircle />}>Designing for security-sensitive products</InfoRow>
            </div>
          </ShowcaseCard>
        </div>
      </div>

      {/* Sticky footer */}
      <div className="sticky bottom-0 bg-white/90 backdrop-blur-xl border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 md:py-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-[13px] text-gray-900" style={{ fontWeight: 600 }}>
                Design System &middot; Component Library
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5" style={{ fontWeight: 400 }}>
                7 primitives &middot; 5 + 4 + 3 + 2 + 2 + 2 + 2 variants &middot; 47+ usage sites
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {["Tag", "PortfolioButton", "BulletItem", "SectionLabel", "AccentBar", "ContactRow", "InfoRow"].map(name => (
                <span
                  key={name}
                  className="px-3 py-1 rounded-full text-[11px] border border-gray-200 text-gray-600 bg-white"
                  style={{ fontWeight: 500 }}
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
