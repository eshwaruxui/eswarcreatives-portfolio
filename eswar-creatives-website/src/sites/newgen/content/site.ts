// TS-facing re-export of the locked sitemap and NAP data.
// The data itself lives in site-meta.mjs so prerender.mjs (Node, at build
// time) can import the same single source of truth.

// Plain ESM data module, shared verbatim with prerender.mjs.
import { SITE_ORIGIN, NAP, routes, routeMeta } from './site-meta.mjs';

export interface RouteMeta {
  title: string;
  description: string;
}

interface NapData {
  name: string;
  streetAddress: string;
  addressLocality: string;
  addressRegion: string;
  postalCode: string;
  addressCountry: string;
  telephone: string;
  whatsappNumber: string;
  email: string;
}

const siteOrigin = SITE_ORIGIN as string;
const nap = NAP as NapData;
const siteRoutes = routes as string[];
const siteRouteMeta = routeMeta as Record<string, RouteMeta>;

export { siteOrigin, nap, siteRoutes, siteRouteMeta };

/** wa.me deep link with a prefilled first message. */
export function whatsappLink(message?: string): string {
  const base = `https://wa.me/${nap.whatsappNumber}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

/** LocalBusiness JSON-LD, rendered once per page. NAP must match the
 * business profile character for character; edit site-meta.mjs, not here. */
export function localBusinessJsonLd(): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: nap.name,
    url: siteOrigin,
    email: nap.email,
    telephone: nap.telephone,
    address: {
      '@type': 'PostalAddress',
      streetAddress: nap.streetAddress,
      addressLocality: nap.addressLocality,
      addressRegion: nap.addressRegion,
      postalCode: nap.postalCode,
      addressCountry: nap.addressCountry,
    },
    areaServed: ['Chennai', 'Tiruchi', 'Bengaluru', 'Kodaikanal'],
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.9',
      reviewCount: '26',
    },
  };
}
