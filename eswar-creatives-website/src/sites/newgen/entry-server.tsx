import React from 'react';
import { renderToString } from 'react-dom/server';
import {
  createStaticHandler,
  createStaticRouter,
  StaticRouterProvider,
} from 'react-router';
import { HelmetProvider } from 'react-helmet-async';
import { newgenRouteConfig } from './route-config';

// SSR entry for prerender.mjs (SITE=newgen). Mirrors the root
// entry-server.tsx pattern.

export async function render(url: string): Promise<string> {
  const handler = createStaticHandler(newgenRouteConfig);
  const request = new Request(`http://localhost${url}`);
  const context = await handler.query(request);

  if (context instanceof Response) {
    throw context;
  }

  const router = createStaticRouter(handler.dataRoutes, context);

  return renderToString(
    <HelmetProvider>
      <StaticRouterProvider router={router} context={context} />
    </HelmetProvider>
  );
}
