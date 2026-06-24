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
import { PublicVotePage } from "../portal/PublicVotePage";
import { AdminShell } from "../portal/admin/AdminShell";
import { AdminDashboard } from "../portal/admin/AdminDashboard";
import { ClientsList } from "../portal/admin/ClientsList";
import { ClientDetail } from "../portal/admin/ClientDetail";
import { ProposalsAdmin } from "../portal/admin/ProposalsAdmin";
import { ProposalDetail } from "../portal/admin/ProposalDetail";
import { InvoicesAdmin } from "../portal/admin/InvoicesAdmin";
import { ProjectsList } from "../portal/admin/ProjectsList";
import { MockupsAdmin } from "../portal/admin/MockupsAdmin";
import { DiscoveryPlaceholder } from "../portal/admin/DiscoveryPlaceholder";
import { CampaignsAdmin } from "../portal/admin/CampaignsAdmin";
import { MockupsPage } from "../portal/client/MockupsPage";
import { ClientDashboardPage } from "../portal/ClientDashboard";
import { ClientProposalsPage } from "../portal/client/ClientProposals";
import { ClientInvoicesPage } from "../portal/client/ClientInvoices";
import { ClientCampaignsPage } from "../portal/client/ClientCampaigns";
import { ReviewCampaignPage } from "../portal/review/ReviewCampaignPage";

export const routeConfig = [
  { path: "/portal/login",          Component: LoginPage  },
  { path: "/portal/verify",         Component: VerifyPage },
  { path: "/portal/sketch-review",  Component: SketchReviewPage },
  { path: "/portal/account",        Component: AccountPage },
  // Phase 5 client portal screens (PortalGuard requireRole="client" inside each).
  { path: "/portal/projects",       Component: ClientDashboardPage },
  { path: "/portal/proposals",      Component: ClientProposalsPage },
  { path: "/portal/invoices",       Component: ClientInvoicesPage },
  // Client-facing mockups review page (PortalGuard inside the component).
  { path: "/portal/mockups",        Component: MockupsPage },
  // Phase 5 client campaigns list (PortalGuard requireRole="client" inside).
  { path: "/portal/campaigns",      Component: ClientCampaignsPage },
  // Phase 5 reviewer landing (PortalGuard requireRole="reviewer" inside).
  { path: "/portal/review",             Component: ReviewCampaignPage },
  { path: "/portal/review/:campaignId", Component: ReviewCampaignPage },
  // Public, unauthenticated voting page (no PortalGuard) — migrations 0019-0021.
  { path: "/portal/vote/:token",    Component: PublicVotePage },
  // Phase 3 admin portal — persistent shell (sidebar + Outlet), admin-gated.
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
      { path: "/portal/admin/mockups",     Component: MockupsAdmin },
      { path: "/portal/admin/discovery",   Component: DiscoveryPlaceholder },
      // Phase 5 (Task 6): review_campaigns management with visibility + status.
      { path: "/portal/admin/campaigns",   Component: CampaignsAdmin },
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
      { path: "/work/securevault",                  Component: SecureVaultCaseStudy },
      { path: "/work/ds-audit-roadmap",             Component: DsAuditCaseStudy },
      { path: "/services",                          Component: ServicesPage },
      { path: "*",                                  Component: NotFound },
    ],
  },
];
