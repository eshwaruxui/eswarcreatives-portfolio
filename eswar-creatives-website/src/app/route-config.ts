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
import { BrandingLandingPage } from "./components/BrandingLandingPage";
import { BrandingWorkPage } from "../pages/BrandingWorkPage";
import { BrandingServicesPage } from "./components/BrandingServicesPage";
import { DesignSystemsLandingPage } from "./components/DesignSystemsLandingPage";
import { DesignSystemsServicesPage } from "./components/DesignSystemsServicesPage";
import { DesignSystemsEnquiryPage } from "./components/DesignSystemsEnquiryPage";
import { DesignSystemsCaseStudy } from "./components/DesignSystemsCaseStudy";
import { NotFound } from "./components/NotFound";
import { LoginPage } from "../portal/LoginPage";
import { VerifyPage } from "../portal/VerifyPage";
import { SketchReviewPage } from "../portal/SketchReviewPage";
import { AdminSketchUpload } from "../portal/AdminSketchUpload";
import { AccountPage } from "../portal/AccountPage";
import { PublicVotePage } from "../portal/PublicVotePage";
import { PublicInvoicePage } from "../portal/PublicInvoicePage";
import { PublicProposalPage } from "../portal/PublicProposalPage";
import { PublicOutputFilePage } from "../portal/PublicOutputFilePage";
import { PublicBrandPage } from "../portal/PublicBrandPage";
import { UnsubscribePage } from "../portal/UnsubscribePage";
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
import { OutreachAdmin } from "../portal/admin/OutreachAdmin";
import { BrandVisualGuideAdmin } from "../portal/admin/BrandVisualGuideAdmin";
import { QrAdmin } from "../portal/admin/QrAdmin";
import { SettingsPage } from "../portal/admin/settings/SettingsPage";
import { MockupsPage } from "../portal/client/MockupsPage";
import { ClientShell } from "../portal/client/ClientShell";
import { ClientDashboardPage } from "../portal/ClientDashboard";
import { ProjectsListPage } from "../portal/client/ProjectsList";
import { ProjectDetailPage } from "../portal/client/ProjectDetailPage";
import { ClientProposalsPage } from "../portal/client/ClientProposals";
import { ClientInvoicesPage } from "../portal/client/ClientInvoices";
import { ClientCampaignsPage } from "../portal/client/ClientCampaigns";
import { BrandVisualClientPage } from "../portal/client/BrandVisualPage";
import { ClientQr } from "../portal/client/ClientQr";
import { ReviewCampaignPage } from "../portal/review/ReviewCampaignPage";
import { OutreachLandingPage } from "../pages/outreach/OutreachLandingPage";
import { OutreachSignupPage } from "../pages/outreach/OutreachSignupPage";
import { OutreachVerifyPage } from "../pages/outreach/OutreachVerifyPage";
import { OutreachOnboardingPage } from "../pages/outreach/OutreachOnboardingPage";
import { OutreachAppShell, OutreachDashboardIndex } from "../pages/outreach/OutreachAppShell";
import { OutreachLeadsPage } from "../pages/outreach/OutreachLeadsPage";
import { OutreachSequencesPage } from "../pages/outreach/OutreachSequencesPage";
import { OutreachActivityPage } from "../pages/outreach/OutreachActivityPage";
import { OutreachSettingsPage } from "../pages/outreach/OutreachSettingsPage";

export const routeConfig = [
  { path: "/portal/login",          Component: LoginPage  },
  { path: "/portal/verify",         Component: VerifyPage },
  { path: "/portal/sketch-review",  Component: SketchReviewPage },
  // Phase 5 client portal — persistent ClientShell (ClientNav + Outlet) so the
  // top nav mounts once and never flashes on navigation. Role-gated in the shell.
  {
    Component: ClientShell,
    children: [
      { path: "/portal/dashboard",     Component: ClientDashboardPage },
      { path: "/portal/projects",      Component: ProjectsListPage },
      { path: "/portal/projects/:id",  Component: ProjectDetailPage },
      { path: "/portal/proposals",  Component: ClientProposalsPage },
      { path: "/portal/invoices",   Component: ClientInvoicesPage },
      { path: "/portal/mockups",    Component: MockupsPage },
      { path: "/portal/campaigns",  Component: ClientCampaignsPage },
      { path: "/portal/brand",      Component: BrandVisualClientPage },
      { path: "/portal/qr",         Component: ClientQr },
      { path: "/portal/account",    Component: AccountPage },
    ],
  },
  // Phase 5 reviewer landing (PortalGuard requireRole="reviewer" inside).
  { path: "/portal/review",             Component: ReviewCampaignPage },
  { path: "/portal/review/:campaignId", Component: ReviewCampaignPage },
  // Public, unauthenticated voting page (no PortalGuard) — migrations 0019-0021.
  { path: "/portal/vote/:token",    Component: PublicVotePage },
  // Public invoice view — no auth required; token enforced server-side (0068).
  { path: "/invoice/:token",        Component: PublicInvoicePage },
  // Public proposal view — no auth required; token enforced server-side (0071).
  { path: "/proposal/:token",       Component: PublicProposalPage },
  // Public Outputs file share view — no auth required; token enforced server-side (0088).
  { path: "/output/:token",         Component: PublicOutputFilePage },
  // Public Brand Visual Guide view — no auth required; clients.public_token enforced server-side (0094-0095).
  { path: "/brand/:token",          Component: PublicBrandPage },
  // Public unsubscribe page — no auth required; calls unsubscribe_by_token RPC.
  { path: "/unsubscribe/:token",    Component: UnsubscribePage },
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
      { path: "/portal/admin/outreach",    Component: OutreachAdmin },
      { path: "/portal/admin/brand-visual-guide", Component: BrandVisualGuideAdmin },
      { path: "/portal/admin/qr",          Component: QrAdmin },
      { path: "/portal/admin/settings",    Component: SettingsPage },
      { path: "/portal/admin/sketches",    Component: AdminSketchUpload },
    ],
  },
  // New self-serve outreach product surface — /outreach/* — additive only,
  // no changes to the existing /portal/admin/outreach admin flow.
  { path: "/outreach",             Component: OutreachLandingPage },
  { path: "/outreach/signup",      Component: OutreachSignupPage },
  { path: "/outreach/verify",      Component: OutreachVerifyPage },
  { path: "/outreach/onboarding",  Component: OutreachOnboardingPage },
  {
    Component: OutreachAppShell,
    children: [
      { path: "/outreach/app",              Component: OutreachDashboardIndex },
      { path: "/outreach/app/leads",        Component: OutreachLeadsPage },
      { path: "/outreach/app/sequences",    Component: OutreachSequencesPage },
      { path: "/outreach/app/activity",     Component: OutreachActivityPage },
      { path: "/outreach/app/settings",     Component: OutreachSettingsPage },
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
      { path: "/branding",                          Component: BrandingLandingPage },
      { path: "/branding/work",                     Component: BrandingWorkPage },
      { path: "/design-systems",                    Component: DesignSystemsLandingPage },
      { path: "/services/branding",                 Component: BrandingServicesPage },
      { path: "/services/design-systems",           Component: DesignSystemsServicesPage },
      { path: "/design-systems/case-study",          Component: DesignSystemsCaseStudy },
      { path: "/services/design-systems/enquiry",   Component: DesignSystemsEnquiryPage },
      { path: "*",                                  Component: NotFound },
    ],
  },
];
