import { Link } from 'react-router';
import { Seo } from './Seo';
import { home } from '../content/copy';
import { stats, statsFootnote } from '../content/stats';
import { partnershipHeadline, b2bLine, venuePartners } from '../content/venues';
import { serviceCategories } from '../content/services';
import { whatsappLink } from '../content/site';

// Day 1 skeleton. Day 2 replaces the hero block with the scroll journey
// (Phase 1: 6 stills on canvas) built to
// docs/Newgen_Homepage_Scroll_Sequence_Implementation_Brief.md.
// The section order below already follows the journey's overlay waypoints:
// hero, differentiators, stats, partnership, arrival CTA.

export function HomePage() {
  const lead = stats.find((s) => s.tier === 'lead');
  const primary = stats.find((s) => s.tier === 'primary');
  const secondary = stats.filter((s) => s.tier === 'secondary');

  return (
    <main>
      <Seo />

      <section className="ng-section ng-section--teal">
        <div className="ng-container">
          <h1>{home.heroHeadline}</h1>
          <p>{home.heroSupport}</p>
          <a className="ng-cta" href={whatsappLink('Hi Newgen, I would like to talk about an event.')}>
            {home.primaryCta}
          </a>
        </div>
      </section>

      <section className="ng-section">
        <div className="ng-container">
          <h2>Sketch before production</h2>
          <div className="ng-grid-3">
            {home.differentiators.map((d) => (
              <div className="ng-card" key={d.title}>
                <h3>{d.title}</h3>
                <p>{d.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="ng-section ng-section--teal">
        <div className="ng-container ng-stats">
          {lead && (
            <div className="ng-stat--lead">
              <div className="ng-stat__value">{lead.value}</div>
              <div className="ng-stat__label">{lead.label}</div>
              <div className="ng-stat__qualifier">{lead.qualifier}</div>
            </div>
          )}
          {primary && (
            <div className="ng-stat--primary">
              <div className="ng-stat__value">{primary.value}</div>
              <div className="ng-stat__label">{primary.label}</div>
              <div className="ng-stat__qualifier">{primary.qualifier}</div>
            </div>
          )}
          <div className="ng-stats__secondary">
            {secondary.map((s) => (
              <div className="ng-stat--secondary" key={s.label}>
                <div className="ng-stat__value">{s.value}</div>
                <div className="ng-stat__label">{s.label}</div>
                <div className="ng-stat__qualifier">{s.qualifier}</div>
              </div>
            ))}
          </div>
          <p className="ng-stats__footnote">{statsFootnote}</p>
        </div>
      </section>

      <section className="ng-section">
        <div className="ng-container">
          <h2>What we decorate</h2>
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

      <section className="ng-section">
        <div className="ng-container">
          <h2>{partnershipHeadline}</h2>
          <p>{b2bLine}</p>
          <ul>
            {venuePartners.map((v) => (
              <li key={v.name}>
                {v.name}, partner since {v.since}
                {v.note ? `. ${v.note}` : ''}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="ng-section ng-section--teal">
        <div className="ng-container">
          <h2>{home.primaryCta}</h2>
          <a className="ng-cta" href={whatsappLink('Hi Newgen, I would like to talk about an event.')}>
            WhatsApp us
          </a>
        </div>
      </section>
    </main>
  );
}
