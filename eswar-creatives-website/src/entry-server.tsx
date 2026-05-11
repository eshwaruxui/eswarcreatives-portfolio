import React from 'react';
import { renderToString } from 'react-dom/server';
import { createStaticHandler, createStaticRouter, StaticRouterProvider } from 'react-router';
import { Toaster } from 'sonner';
import { routeConfig } from './app/route-config';

export async function render(url: string): Promise<string> {
  const handler = createStaticHandler(routeConfig);
  const request = new Request(`http://localhost${url}`);
  const context = await handler.query(request);

  if (context instanceof Response) {
    throw context;
  }

  const router = createStaticRouter(handler.dataRoutes, context);

  return renderToString(
    <>
      <StaticRouterProvider router={router} context={context} />
      <Toaster
        position="bottom-center"
        toastOptions={{
          style: {
            fontFamily: 'var(--font-family-primary)',
            fontSize: 'var(--typo-caption-m-size)',
            lineHeight: 'var(--typo-caption-m-line-height)',
          },
        }}
      />
    </>
  );
}
