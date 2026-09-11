import { Layout } from './pages/Layout';
import { HomePage } from './pages/HomePage';
import { AboutPage } from './pages/AboutPage';
import { ServicesHubPage } from './pages/ServicesHubPage';
import { CategoryPage } from './pages/CategoryPage';
import { PortfolioPage } from './pages/PortfolioPage';
import { TestimonialsPage } from './pages/TestimonialsPage';
import { ContactPage } from './pages/ContactPage';
import { NotFoundPage } from './pages/NotFoundPage';

// The 11 launch routes, matching content/site-meta.mjs exactly. Category
// pages share one component (one template, five fills).

export const newgenRouteConfig = [
  {
    Component: Layout,
    children: [
      { path: '/', Component: HomePage },
      { path: '/about', Component: AboutPage },
      { path: '/services', Component: ServicesHubPage },
      { path: '/services/wedding-decoration', Component: () => <CategoryPage slug="wedding-decoration" /> },
      { path: '/services/corporate-and-commercial', Component: () => <CategoryPage slug="corporate-and-commercial" /> },
      { path: '/services/social-celebrations', Component: () => <CategoryPage slug="social-celebrations" /> },
      { path: '/services/destination-weddings', Component: () => <CategoryPage slug="destination-weddings" /> },
      { path: '/services/eco-friendly-weddings', Component: () => <CategoryPage slug="eco-friendly-weddings" /> },
      { path: '/portfolio', Component: PortfolioPage },
      { path: '/testimonials', Component: TestimonialsPage },
      { path: '/contact', Component: ContactPage },
      { path: '*', Component: NotFoundPage },
    ],
  },
];
