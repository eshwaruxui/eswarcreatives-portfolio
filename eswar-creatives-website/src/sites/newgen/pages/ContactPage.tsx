import { Seo } from './Seo';
import { contact } from '../content/copy';
import { nap, whatsappLink } from '../content/site';

// Kept close to empty by design: contact details, the CTA line, the mark.
// The enquiry form (Supabase wiring or hello@ fallback) and the Maps embed
// are the Day 5 build.

export function ContactPage() {
  return (
    <main>
      <Seo />
      <section className="ng-section ng-section--teal">
        <div className="ng-container">
          <h1>{contact.headline}</h1>
          <p>
            <a className="ng-cta" href={whatsappLink('Hi Newgen, I would like to talk about an event.')}>
              WhatsApp 91760 45045
            </a>
          </p>
          <p>
            <a href={`mailto:${nap.email}`} style={{ color: 'var(--ng-gold)' }}>
              {nap.email}
            </a>
          </p>
          <address style={{ fontStyle: 'normal' }}>
            {nap.name}
            <br />
            {nap.streetAddress}
            <br />
            {nap.addressLocality} {nap.postalCode}
          </address>
        </div>
      </section>
    </main>
  );
}
