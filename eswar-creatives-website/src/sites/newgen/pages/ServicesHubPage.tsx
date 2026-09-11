import { Link } from 'react-router';
import { Seo } from './Seo';
import { servicesHub } from '../content/copy';
import { scopeLadder, serviceCategories } from '../content/services';
import { whatsappLink } from '../content/site';

// The hub is built on the scope ladder, not a flat list: Decor, then Decor
// and production, then Full Event Management as the top rung, so every
// enquiry has somewhere to move up to.

export function ServicesHubPage() {
  return (
    <main>
      <Seo />
      <section className="ng-section ng-section--teal">
        <div className="ng-container">
          <h1>{servicesHub.headline}</h1>
          <p>{servicesHub.intro}</p>
        </div>
      </section>

      <section className="ng-section">
        <div className="ng-container">
          <h2>Three ways to work with Newgen</h2>
          <div className="ng-grid-3">
            {scopeLadder.map((tier) => (
              <div className="ng-card" key={tier.id}>
                <h3>{tier.name}</h3>
                <p>{tier.summary}</p>
                <ul>
                  {tier.includes.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p style={{ marginTop: '2rem', fontStyle: 'italic' }}>{servicesHub.closing}</p>
        </div>
      </section>

      <section className="ng-section">
        <div className="ng-container">
          <h2>By occasion</h2>
          <div className="ng-grid-3">
            {serviceCategories.map((c) => (
              <div className="ng-card" key={c.slug}>
                <h3>
                  <Link to={c.path} style={{ color: 'inherit', textDecoration: 'none' }}>
                    {c.name}
                  </Link>
                </h3>
                <p>{c.intro}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="ng-section ng-section--teal">
        <div className="ng-container">
          <h2>Tell us about your event.</h2>
          <a className="ng-cta" href={whatsappLink('Hi Newgen, I would like to talk about an event.')}>
            WhatsApp us
          </a>
        </div>
      </section>
    </main>
  );
}
