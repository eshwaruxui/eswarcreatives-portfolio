import { PortfolioHome } from "./components/PortfolioHome";
import { AboutPage } from "./components/AboutPage";
import { DesignSystemPage } from "./components/DesignSystemPage";
import { ContactPage } from "./components/ContactPage";
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
    path: "*",
    Component: NotFound,
  },
];
