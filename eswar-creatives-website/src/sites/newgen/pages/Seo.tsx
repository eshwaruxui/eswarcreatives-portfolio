import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router';
import { siteRouteMeta, siteOrigin, localBusinessJsonLd } from '../content/site';

/**
 * Per-route title, description, canonical and LocalBusiness JSON-LD.
 * Route metadata comes from the locked table in content/site-meta.mjs, the
 * same source prerender.mjs stamps into the static HTML, so the client and
 * the prerendered head can never disagree.
 */
export function Seo({ jsonLd }: { jsonLd?: object }) {
  const { pathname } = useLocation();
  const meta = siteRouteMeta[pathname];
  const canonical = `${siteOrigin}${pathname === '/' ? '/' : pathname}`;

  return (
    <Helmet>
      {meta && <title>{meta.title}</title>}
      {meta && <meta name="description" content={meta.description} />}
      <link rel="canonical" href={canonical} />
      <script type="application/ld+json">
        {JSON.stringify(jsonLd ?? localBusinessJsonLd())}
      </script>
    </Helmet>
  );
}
