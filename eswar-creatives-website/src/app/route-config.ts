import { PortfolioHome } from "./components/PortfolioHome";
import { AboutPage } from "./components/AboutPage";
import { DesignSystemPage } from "./components/DesignSystemPage";
import { ContactPage } from "./components/ContactPage";
import { BrandIdentityDiscoveryPage } from "./components/BrandIdentityDiscoveryPage";
import { NotFound } from "./components/NotFound";

export const routeConfig = [
  {
    path: "/",
    Component: PortfolioHome,
  },
  {
    path: "/about",
    Component: AboutPage,
  },
  {
    path: "/design-system",
    Component: DesignSystemPage,
  },
  {
    path: "/contact",
    Component: ContactPage,
  },
  {
    path: "/branding/brand-identity-discovery",
    Component: BrandIdentityDiscoveryPage,
  },
  {
    path: "*",
    Component: NotFound,
  },
];
