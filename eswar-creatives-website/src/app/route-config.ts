import { RootLayout } from "./components/RootLayout";
import { PortfolioHome } from "./components/PortfolioHome";
import { AboutPage } from "./components/AboutPage";
import { DesignSystemPage } from "./components/DesignSystemPage";
import { ContactPage } from "./components/ContactPage";
import { BrandIdentityDiscoveryPage } from "./components/BrandIdentityDiscoveryPage";
import { TtxCaseStudy } from "./components/TtxCaseStudy";
import { SecureVaultCaseStudy } from "./components/SecureVaultCaseStudy";
import { DsAuditCaseStudy } from "./components/DsAuditCaseStudy";
import { ServicesPage } from "./components/ServicesPage";
import { BrandingServicesPage } from "./components/BrandingServicesPage";
import { BrandingLandingPage } from "./components/BrandingLandingPage";
import { DesignSystemsServicesPage } from "./components/DesignSystemsServicesPage";
import { DesignSystemsLandingPage } from "./components/DesignSystemsLandingPage";
import { DesignSystemsEnquiryPage } from "./components/DesignSystemsEnquiryPage";
import { NotFound } from "./components/NotFound";
import { SecuronixPrototype } from "./components/SecuronixPrototype";
import { LoginPage } from "../portal/LoginPage";
import { VerifyPage } from "../portal/VerifyPage";

export const routeConfig = [
  // Full-screen iframe prototype — rendered outside RootLayout so it gets no site chrome.
  { path: "/work/securonix-prototype", Component: SecuronixPrototype },
  { path: "/portal/login",  Component: LoginPage  },
  { path: "/portal/verify", Component: VerifyPage },
  {
    Component: RootLayout,
    children: [
      { path: "/",                                  Component: PortfolioHome },
      { path: "/about",                             Component: AboutPage },
      { path: "/design-system",                     Component: DesignSystemPage },
      { path: "/contact",                           Component: ContactPage },
      { path: "/branding/brand-identity-discovery", Component: BrandIdentityDiscoveryPage },
      { path: "/work/cygnvs-ttx",                   Component: TtxCaseStudy },
      { path: "/work/securevault",                  Component: SecureVaultCaseStudy },
      { path: "/work/ds-audit-roadmap",             Component: DsAuditCaseStudy },
      { path: "/services",                          Component: ServicesPage },
      { path: "/branding",                           Component: BrandingLandingPage },
      { path: "/design-systems",                    Component: DesignSystemsLandingPage },
      { path: "/services/branding",                 Component: BrandingServicesPage },
      { path: "/services/design-systems",           Component: DesignSystemsServicesPage },
      { path: "/services/design-systems/enquiry",   Component: DesignSystemsEnquiryPage },
      { path: "*",                                  Component: NotFound },
    ],
  },
];
