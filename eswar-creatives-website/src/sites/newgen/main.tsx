import { hydrateRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { HelmetProvider } from 'react-helmet-async';
import { newgenRouteConfig } from './route-config';

// NEWGEN site entry. Built only by `npm run build:newgen` (SITE=newgen),
// which uses index.newgen.html as the Vite input; the eswarcreatives.in
// build never touches this tree.

const router = createBrowserRouter(newgenRouteConfig);

hydrateRoot(
  document.getElementById('root')!,
  <HelmetProvider>
    <RouterProvider router={router} />
  </HelmetProvider>
);
