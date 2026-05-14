import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import {
  Mail,
  Linkedin,
  CalendarClock,
  MapPin,
  ShieldCheck,
  Clock,
  Quote,
} from "lucide-react";
import { PortfolioButton } from "./ui/portfolio-button";
import { BulletItem } from "./ui/bullet-item";

interface ContactModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ContactModal({ open, onOpenChange }: ContactModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideCloseButton
        className="sm:max-w-[540px] max-h-[90vh] overflow-y-auto rounded-2xl border-black/[0.06] p-0 gap-0"
        style={{
          background: "#f8f8f7",
          boxShadow: "0 8px 30px rgba(0,0,0,0.12), 0 24px 60px rgba(0,0,0,0.15), 0 1px 3px rgba(0,0,0,0.08)",
        }}
      >
        {/* Header */}
        <DialogHeader className="px-7 pt-7 pb-0 text-left">
          <DialogTitle
            className="text-text-primary mb-1"
            style={{
              fontSize: "var(--typo-h3-size)",
              lineHeight: "var(--typo-h3-line-height)",
              fontWeight: "var(--typo-h3-weight)",
              letterSpacing: "var(--typo-h3-letter-spacing)",
            }}
          >
            Get in touch
          </DialogTitle>
          {/* Subheading */}
          <p
            className="text-text-quaternary mb-2"
            style={{
              fontSize: "var(--typo-caption-m-size)",
              lineHeight: "var(--typo-caption-m-line-height)",
              fontWeight: "var(--typo-caption-m-weight)",
            }}
          >
            20+ year Senior Product Designer specializing in complex SaaS, AI,
            and cybersecurity workflows.
          </p>
          <DialogDescription
            className="text-text-tertiary"
            style={{
              fontSize: "var(--typo-p-base-size)",
              lineHeight: "var(--typo-p-base-line-height)",
              fontWeight: "var(--typo-p-base-weight)",
            }}
          >
            Building complex enterprise products? Let's discuss how 20+ years
            solving SaaS/AI workflows can accelerate your team.
          </DialogDescription>
        </DialogHeader>

        {/* Primary CTAs — grouped by commitment level */}
        <div className="px-7 pt-6 pb-2">
          {/* High-commitment: Email + LinkedIn (related actions, tight gap) */}
          <div className="space-y-2.5">
            <PortfolioButton
              href="mailto:eswar@eswarcreatives.in?subject=Design%20Inquiry%20%E2%80%94%20via%20Portfolio&body=Hi%20Eswar%2C%0A%0AI%20came%20across%20your%20portfolio%20and%20would%20love%20to%20discuss%20a%20potential%20collaboration.%0A%0A%E2%80%94%20Company%2FTeam%3A%20%0A%E2%80%94%20Role%2FProject%3A%20%0A%E2%80%94%20Timeline%3A%20%0A%0ALooking%20forward%20to%20hearing%20from%20you!"
              variant="primary"
              size="lg"
              fullWidth
              className="rounded-xl bg-interactive-primary text-text-primary hover:bg-interactive-primary-hover"
            >
              <Mail className="w-4 h-4" />
              Start a Conversation
            </PortfolioButton>

            <PortfolioButton
              href="https://www.linkedin.com/in/eswaruxui/"
              target="_blank"
              rel="noopener noreferrer"
              variant="secondary"
              size="lg"
              fullWidth
              className="rounded-xl"
            >
              <Linkedin className="w-4 h-4" />
              View Full Profile
            </PortfolioButton>
          </div>

          {/* Low-commitment: Book call — separated with more space */}
          <div className="mt-5 flex justify-center">
            <PortfolioButton
              href="https://calendly.com/eswarcreatives/25-min-intro-call"
              target="_blank"
              rel="noopener noreferrer"
              variant="ghost"
              size="md"
              className="text-text-tertiary hover:text-text-primary"
            >
              <CalendarClock className="w-3.5 h-3.5" />
              Book a 25 min intro call
            </PortfolioButton>
          </div>
        </div>

        {/* Divider */}
        <div className="mx-7 my-5 border-t border-black/[0.06]" />

        {/* Bottom info grid */}
        <div className="px-7 pb-4 grid sm:grid-cols-2 gap-6">
          {/* Left — How collaboration starts */}
          <div>
            <h3
              className="text-text-primary mb-3"
              style={{
                fontSize: "var(--typo-h7-size)",
                lineHeight: "var(--typo-h7-line-height)",
                fontWeight: "var(--typo-h7-weight)",
              }}
            >
              Ideal first contact includes
            </h3>
            <ul className="space-y-2">
              <BulletItem>
                Team context, product domain, and specific design challenges
                you're facing.
              </BulletItem>
              <BulletItem>
                Links to a JD, roadmap, or existing product flows if available.
              </BulletItem>
              <BulletItem>
                For consulting or advisory work, a rough timeline and decision
                date.
              </BulletItem>
            </ul>
          </div>

          {/* Right — Availability & recruiter note */}
          <div className="space-y-4">
            {/* Availability */}
            <div className="flex gap-2.5 items-start">
              <div className="w-8 h-8 rounded-lg bg-interactive-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <MapPin className="w-4 h-4 text-interactive-primary" />
              </div>
              <div>
                <h4
                  className="text-text-primary mb-0.5"
                  style={{
                    fontSize: "var(--typo-h8m-size)",
                    lineHeight: "var(--typo-h8m-line-height)",
                    fontWeight: "var(--typo-h8m-weight)",
                  }}
                >
                  Location & timezone
                </h4>
                <p
                  className="text-text-tertiary"
                  style={{
                    fontSize: "var(--typo-caption-r-size)",
                    lineHeight: "var(--typo-caption-r-line-height)",
                    fontWeight: "var(--typo-caption-r-weight)",
                  }}
                >
                  Chennai (GMT+5:30) / Bengaluru · Open to remote and hybrid
                  roles across US, EU, and APAC time zones.
                </p>
              </div>
            </div>

            {/* Response time */}
            <div className="flex gap-2.5 items-start">
              <div className="w-8 h-8 rounded-lg bg-interactive-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <Clock className="w-4 h-4 text-interactive-primary" />
              </div>
              <div>
                <h4
                  className="text-text-primary mb-0.5"
                  style={{
                    fontSize: "var(--typo-h8m-size)",
                    lineHeight: "var(--typo-h8m-line-height)",
                    fontWeight: "var(--typo-h8m-weight)",
                  }}
                >
                  Response time
                </h4>
                <p
                  className="text-text-tertiary"
                  style={{
                    fontSize: "var(--typo-caption-r-size)",
                    lineHeight: "var(--typo-caption-r-line-height)",
                    fontWeight: "var(--typo-caption-r-weight)",
                  }}
                >
                  Typically within 1–2 business days.
                </p>
              </div>
            </div>

            {/* Recruiter note */}
            <div className="rounded-xl bg-black/[0.02] border border-black/[0.05] p-3.5">
              <div className="flex items-center gap-1.5 mb-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-text-quaternary" />
                <span
                  className="text-text-secondary"
                  style={{
                    fontSize: "var(--typo-h8m-size)",
                    lineHeight: "var(--typo-h8m-line-height)",
                    fontWeight: "var(--typo-h8m-weight)",
                  }}
                >
                  For hiring teams
                </span>
              </div>
              <p
                className="text-text-tertiary"
                style={{
                  fontSize: "var(--typo-caption-r-size)",
                  lineHeight: "var(--typo-caption-r-line-height)",
                  fontWeight: "var(--typo-caption-r-weight)",
                }}
              >
                This portfolio can be safely shared; contact options visible
                throughout for direct outreach.
              </p>
            </div>
          </div>
        </div>

        {/* Testimonial snippet */}
        <div className="mx-7 border-t border-black/[0.06]" />
        <div className="px-7 pt-4 pb-4">
          <div className="flex gap-3 items-start">
            <Quote className="w-4 h-4 text-text-disabled shrink-0 mt-0.5" />
            <div>
              <p
                className="text-text-secondary italic"
                style={{
                  fontSize: "var(--typo-caption-r-size)",
                  lineHeight: "var(--typo-caption-r-line-height)",
                  fontWeight: "var(--typo-caption-r-weight)",
                }}
              >
                "Eswar scaled our cybersecurity design system across 3 platforms
                in 6 months."
              </p>
              <p
                className="text-text-quaternary mt-1"
                style={{
                  fontSize: "var(--typo-p-xs-size)",
                  lineHeight: "var(--typo-p-xs-line-height)",
                  fontWeight: "var(--typo-p-xs-weight)",
                }}
              >
                Kevin Gaffney, CTO — CYGNVS
              </p>
            </div>
          </div>
        </div>

        {/* "Maybe later" dismiss link — replaces X close button */}
        <div className="px-7 pb-6 pt-1">
          <DialogClose asChild>
            <button
              className="text-text-quaternary hover:text-text-tertiary transition-colors cursor-pointer bg-transparent border-none p-0"
              style={{
                fontSize: "var(--typo-caption-r-size)",
                lineHeight: "var(--typo-caption-r-line-height)",
                fontWeight: "var(--typo-caption-r-weight)",
              }}
            >
              Maybe later
            </button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}