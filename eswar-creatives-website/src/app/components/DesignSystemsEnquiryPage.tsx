import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { motion } from "motion/react";
import { Navbar } from "./Navbar";
import { PortfolioButton } from "./ui/portfolio-button";

const FORMSPREE_ENDPOINT = "https://formspree.io/f/maqvagwj";
const GENERIC_ERROR = "Something went wrong. Please try again, or email eswar@eswarcreatives.in directly.";
const SERIF = "'Fraunces', Georgia, 'Times New Roman', serif";

const PLATFORMS = ["Web", "iOS", "Android"] as const;
const TEAM_SIZES = ["1 to 10 engineers", "11 to 50", "51 to 150", "150+"] as const;
const FUNDING_STAGES = ["Pre-seed", "Seed", "Series A", "Series B", "Series C+"] as const;
const TIMELINES = ["Immediately", "Within 30 days", "Within 90 days", "Exploring"] as const;

const labelClass = "block text-sm font-medium text-text-primary mb-1.5";
const legendClass = "text-sm font-medium text-text-primary mb-2";
const optionClass = "flex items-center gap-2 rounded-lg border border-border-default bg-bg-surface px-3.5 py-2 text-sm text-text-secondary cursor-pointer has-[:checked]:border-border-brand has-[:checked]:text-text-primary has-[:checked]:bg-bg-tint-1";
const radioInputClass = "accent-teal-500 size-4 shrink-0";
const errorTextClass = "mt-1.5 text-sm text-text-error";

function fieldClass(hasError: boolean) {
  return [
    "w-full rounded-lg border bg-bg-surface px-4 py-2.5 text-text-primary placeholder:text-text-muted outline-none transition-colors focus:ring-2",
    hasError
      ? "border-border-error focus:border-border-error focus:ring-border-error/20"
      : "border-border-default focus:border-border-focus focus:ring-border-focus/20",
  ].join(" ");
}

export function DesignSystemsEnquiryPage() {
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [platformError, setPlatformError] = useState(false);
  const [problem, setProblem] = useState("");
  const [problemError, setProblemError] = useState(false);
  const [firstNameError, setFirstNameError] = useState(false);
  const [companyNameError, setCompanyNameError] = useState(false);
  const [companyUrlError, setCompanyUrlError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    document.title = "Design Systems Enquiry | Eswar Creatives";
    document.documentElement.style.background = "var(--bg-subtle)";
    document.body.style.background = "transparent";
    return () => {
      document.documentElement.style.background = "";
      document.body.style.background = "";
    };
  }, []);

  function togglePlatform(name: string) {
    setPlatforms((prev) => (prev.includes(name) ? prev.filter((p) => p !== name) : [...prev, name]));
    setPlatformError(false);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);

    const hasFirstNameError = ((data.get("firstName") as string) || "").trim() === "";
    const hasCompanyNameError = ((data.get("companyName") as string) || "").trim() === "";
    const hasCompanyUrlError = ((data.get("companyUrl") as string) || "").trim() === "";
    const hasPlatformError = platforms.length === 0;
    const hasProblemError = problem.length < 50;

    setFirstNameError(hasFirstNameError);
    setCompanyNameError(hasCompanyNameError);
    setCompanyUrlError(hasCompanyUrlError);
    setPlatformError(hasPlatformError);
    setProblemError(hasProblemError);

    if (hasFirstNameError || hasCompanyNameError || hasCompanyUrlError || hasPlatformError || hasProblemError) {
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch(FORMSPREE_ENDPOINT, {
        method: "POST",
        body: data,
        headers: { Accept: "application/json" },
      });
      if (res.ok) {
        setSubmitted(true);
      } else {
        setSubmitError(GENERIC_ERROR);
      }
    } catch {
      setSubmitError(GENERIC_ERROR);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex flex-col bg-bg-subtle" style={{ fontFamily: "var(--font-family-primary)" }}>
      <Navbar />

      <main className="flex-1 flex items-start justify-center px-4 sm:px-6 pt-24 pb-16 sm:pt-28">
        <div className="w-full max-w-2xl">
          {submitted ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="text-center rounded-2xl border border-border-default bg-bg-surface p-10 sm:p-12 shadow-sm"
            >
              <CheckCircle2 className="w-10 h-10 mx-auto mb-5 text-icon-brand" />
              <h1 className="mb-3 text-2xl font-heading" style={{ fontFamily: SERIF, fontWeight: 600, fontStyle: "italic" }}>
                Thank you.
              </h1>
              <p className="mb-8 text-text-secondary max-w-md mx-auto">
                Got it. You will hear back within 48 hours with a scoped recommendation.
              </p>
              <PortfolioButton href="/services/design-systems" variant="ghost" size="sm">
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to pricing
              </PortfolioButton>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              <div className="text-center mb-8">
                <p className="mb-3 text-xs font-semibold tracking-wide uppercase text-text-tertiary">
                  Design systems enquiry
                </p>
                <h1
                  className="mb-4"
                  style={{
                    fontFamily: SERIF,
                    fontWeight: 600,
                    fontStyle: "italic",
                    fontSize: "clamp(26px, 3.5vw, 34px)",
                    lineHeight: 1.2,
                    letterSpacing: "-0.02em",
                    color: "var(--text-primary)",
                  }}
                >
                  Tell us what you're building.
                </h1>
                <p className="text-text-secondary max-w-md mx-auto">
                  Share a few details about your team and platform. You will hear back within 48 hours with a scoped
                  recommendation.
                </p>
              </div>

              <form
                onSubmit={handleSubmit}
                noValidate
                className="rounded-2xl border border-border-default bg-bg-surface p-6 sm:p-10 shadow-sm space-y-6"
              >
                <input type="hidden" name="_subject" value="New design systems enquiry" />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="firstName" className={labelClass}>
                      First name
                    </label>
                    <input
                      id="firstName"
                      name="firstName"
                      type="text"
                      required
                      aria-invalid={firstNameError}
                      onChange={(e) => { if (e.target.value.trim() !== "") setFirstNameError(false); }}
                      className={fieldClass(firstNameError)}
                    />
                    {firstNameError && <p className={errorTextClass} role="alert">First name is required.</p>}
                  </div>
                  <div>
                    <label htmlFor="companyName" className={labelClass}>
                      Company name
                    </label>
                    <input
                      id="companyName"
                      name="companyName"
                      type="text"
                      required
                      aria-invalid={companyNameError}
                      onChange={(e) => { if (e.target.value.trim() !== "") setCompanyNameError(false); }}
                      className={fieldClass(companyNameError)}
                    />
                    {companyNameError && <p className={errorTextClass} role="alert">Company name is required.</p>}
                  </div>
                </div>

                <div>
                  <label htmlFor="companyUrl" className={labelClass}>
                    Company URL
                  </label>
                  <input
                    id="companyUrl"
                    name="companyUrl"
                    type="text"
                    required
                    placeholder="acme.com"
                    aria-invalid={companyUrlError}
                    onChange={(e) => { if (e.target.value.trim() !== "") setCompanyUrlError(false); }}
                    className={fieldClass(companyUrlError)}
                  />
                  {companyUrlError && <p className={errorTextClass} role="alert">Company URL is required.</p>}
                </div>

                <fieldset aria-invalid={platformError}>
                  <legend className={legendClass}>Platform mix</legend>
                  <div className="flex flex-wrap gap-2">
                    {PLATFORMS.map((platform) => (
                      <label key={platform} className={optionClass}>
                        <input
                          type="checkbox"
                          name="platforms"
                          value={platform}
                          checked={platforms.includes(platform)}
                          onChange={() => togglePlatform(platform)}
                          className="accent-teal-500 size-4 shrink-0 rounded"
                        />
                        {platform}
                      </label>
                    ))}
                  </div>
                  {platformError && (
                    <p className="mt-2 text-sm text-text-error" role="alert">
                      Select at least one platform.
                    </p>
                  )}
                </fieldset>

                <fieldset>
                  <legend className={legendClass}>Team size</legend>
                  <div className="flex flex-wrap gap-2">
                    {TEAM_SIZES.map((size) => (
                      <label key={size} className={optionClass}>
                        <input type="radio" name="teamSize" value={size} className={radioInputClass} />
                        {size}
                      </label>
                    ))}
                  </div>
                </fieldset>

                <fieldset>
                  <legend className={legendClass}>Funding stage</legend>
                  <div className="flex flex-wrap gap-2">
                    {FUNDING_STAGES.map((stage) => (
                      <label key={stage} className={optionClass}>
                        <input type="radio" name="fundingStage" value={stage} className={radioInputClass} />
                        {stage}
                      </label>
                    ))}
                  </div>
                </fieldset>

                <div>
                  <label htmlFor="problem" className={labelClass}>
                    What is the problem you are trying to solve?
                  </label>
                  <textarea
                    id="problem"
                    name="problem"
                    required
                    rows={5}
                    value={problem}
                    aria-invalid={problemError}
                    onChange={(e) => {
                      const value = e.target.value;
                      setProblem(value);
                      if (value.length >= 50) setProblemError(false);
                    }}
                    className={fieldClass(problemError)}
                  />
                  <p className="mt-1.5 text-xs text-text-muted">
                    {problem.length} / 50 characters minimum
                  </p>
                  {problemError && (
                    <p className={errorTextClass} role="alert">
                      Please describe your problem in at least 50 characters. This helps us scope a recommendation.
                    </p>
                  )}
                </div>

                <fieldset>
                  <legend className={legendClass}>How soon do you need to start?</legend>
                  <div className="flex flex-wrap gap-2">
                    {TIMELINES.map((timeline) => (
                      <label key={timeline} className={optionClass}>
                        <input type="radio" name="timeline" value={timeline} className={radioInputClass} />
                        {timeline}
                      </label>
                    ))}
                  </div>
                </fieldset>

                {submitError && (
                  <p className="text-sm text-text-error" role="alert">
                    {submitError}
                  </p>
                )}

                <PortfolioButton type="submit" variant="brand" size="lg" fullWidth disabled={submitting} loading={submitting}>
                  {submitting ? "Submitting..." : "Submit enquiry"}
                </PortfolioButton>
              </form>

              <div className="mt-6 text-center">
                <PortfolioButton href="/services/design-systems" variant="ghost" size="sm">
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back to pricing
                </PortfolioButton>
              </div>
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
}
