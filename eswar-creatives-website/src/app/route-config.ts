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
import { NotFound } from "./components/NotFound";

export const routeConfig = [
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
      { path: "*",                                  Component: NotFound },
    ],
  },
];
