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
import { LoginPage } from "../portal/LoginPage";
import { VerifyPage } from "../portal/VerifyPage";
import { SketchReviewPage } from "../portal/SketchReviewPage";
import { AdminSketchUpload } from "../portal/AdminSketchUpload";
import { AccountPage } from "../portal/AccountPage";

export const routeConfig = [
  { path: "/portal/login",          Component: LoginPage  },
  { path: "/portal/verify",         Component: VerifyPage },
  { path: "/portal/sketch-review",  Component: SketchReviewPage },
  { path: "/portal/admin/sketches", Component: AdminSketchUpload },
  { path: "/portal/account",        Component: AccountPage },
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
