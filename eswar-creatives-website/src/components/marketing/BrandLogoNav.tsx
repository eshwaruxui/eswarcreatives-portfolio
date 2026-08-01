import brandStudioLogo from "../../imports/ec-brand-logo-brand-studio.svg";
import saasLogo from "../../imports/ec-brand-logo-saas.svg";
import portfolioLogo from "../../imports/ec-brand-logo-portfolio.svg";

// Figma "EC Brand Logo - Top Nav" (fileKey 0SGbENUggpj9Fe6NebJ9QM, node
// 4448:13972, Type=Brand Studio/SaaS/Portfolio). Each variant is a single
// flattened lockup (icon + "EswarCreatives" wordmark + tagline, all vector
// paths, no live <text>) — not composed from separate icon/text pieces in
// code, since that's how the source SVGs are actually built. SaaS and
// Portfolio share the identical teal icon in Figma; only Brand Studio's
// icon differs (black fill).
export type BrandLogoNavVariant = "brand-studio" | "saas" | "portfolio";

const LOGO_SRC: Record<BrandLogoNavVariant, string> = {
  "brand-studio": brandStudioLogo,
  saas: saasLogo,
  portfolio: portfolioLogo,
};

interface BrandLogoNavProps {
  variant: BrandLogoNavVariant;
  className?: string;
}

export function BrandLogoNav({ variant, className }: BrandLogoNavProps) {
  return (
    <img
      src={LOGO_SRC[variant]}
      alt="EswarCreatives"
      className={className}
      // Intrinsic 201x42 (Figma). Height-constrained so it scales down
      // cleanly at mobile nav heights; width follows aspect ratio.
      style={{ height: 42, width: "auto", display: "block" }}
    />
  );
}
