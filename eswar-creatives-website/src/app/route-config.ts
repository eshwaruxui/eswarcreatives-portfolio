import { RootLayout } from "./components/RootLayout";
import { PortfolioHome } from "./components/PortfolioHome";
import { AboutPage } from "./components/AboutPage";
import { DesignSystemPage } from "./components/DesignSystemPage";
import { ContactPage } from "./components/ContactPage";
import { BrandIdentityDiscoveryPage } from "./components/BrandIdentityDiscoveryPage";
import { TtxCaseStudy } from "./components/TtxCaseStudy";
import { ServicesPage } from "./components/ServicesPage";
import { NotFound } from "./components/NotFound";
import { LoginPage } from "../portal/LoginPage";
import { VerifyPage } from "../portal/VerifyPage";
import { SketchReviewPage } from "../portal/SketchReviewPage";
import { AdminSketchUpload } from "../portal/AdminSketchUpload";
import { AccountPage } from "../portal/AccountPage";
import { PublicVotePage } from "../portal/PublicVotePage";
import { AdminShell } from "../portal/admin/AdminShell";
import { AdminDashboard } from "../portal/admin/AdminDashboard";
import { ClientsList } from "../portal/admin/ClientsList";
import { ClientDetail } from "../portal/admin/ClientDetail";
import { ProposalsAdmin } from "../portal/admin/ProposalsAdmin";
import { ProposalDetail } from "../portal/admin/ProposalDetail";
import { InvoicesAdmin } from "../portal/admin/InvoicesAdmin";
import { ProjectsList } from "../portal/admin/ProjectsList";
import { DiscoveryPlaceholder } from "../portal/admin/DiscoveryPlaceholder";
import { CampaignsRedirect } from "../portal/admin/CampaignsRedirect";

export const routeConfig = [
  { path: "/portal/login",          Component: LoginPage  },
  { path: "/portal/verify",         Component: VerifyPage },
  { path: "/portal/sketch-review",  Component: SketchReviewPage },
  { path: "/portal/account",        Component: AccountPage },
  // Public, unauthenticated voting page (no PortalGuard) — migrations 0019-0021.
  { path: "/portal/vote/:token",    Component: PublicVotePage },
  // Phase 3 admin portal — persistent shell (sidebar + Outlet), admin-gated.
  // The Campaigns nav item redirects to the existing sketches page for now.
  { path: "/portal/admin/campaigns", Component: CampaignsRedirect },
  {
    Component: AdminShell,
    children: [
      { path: "/portal/admin",             Component: AdminDashboard },
      { path: "/portal/admin/clients",     Component: ClientsList },
      { path: "/portal/admin/clients/:id", Component: ClientDetail },
      { path: "/portal/admin/proposals",   Component: ProposalsAdmin },
      { path: "/portal/admin/proposals/:id", Component: ProposalDetail },
      { path: "/portal/admin/invoices",    Component: InvoicesAdmin },
      { path: "/portal/admin/projects",    Component: ProjectsList },
      { path: "/portal/admin/discovery",   Component: DiscoveryPlaceholder },
      { path: "/portal/admin/sketches",    Component: AdminSketchUpload },
    ],
  },
  {
    Component: RootLayout,
    children: [
      { path: "/",                                  Component: PortfolioHome },
      { path: "/about",                             Component: AboutPage },
      { path: "/design-system",                     Component: DesignSystemPage },
      { path: "/contact",                           Component: ContactPage },
      { path: "/branding/brand-identity-discovery", Component: BrandIdentityDiscoveryPage },
      { path: "/work/cygnvs-ttx",                   Component: TtxCaseStudy },
      { path: "/services",                          Component: ServicesPage },
      { path: "*",                                  Component: NotFound },
    ],
  },
];
