import { Seo } from './Seo';
import { serviceCategories } from '../content/services';
import { zones } from '../content/zones';
import { ceremonies, weddingRituals, communityTraditions } from '../content/ceremonies';
import { ecoFeature, tradeCraft } from '../content/copy';
import { whatsappLink } from '../content/site';

// One template, five fills (Day 3 plan). The wedding fill carries the full
// zone spine, ceremony pairs, community sections and trade-craft notes; the
// others carry their occasion lists until their photo libraries exist.
// Zone headings are h2 so the page sells in the order Mohan anna sells:
// outside in, one decision point at a time.

export function CategoryPage({ slug }: { slug: string }) {
  const category = serviceCategories.find((c) => c.slug === slug);
  if (!category) return null;

  const isWedding = slug === 'wedding-decoration';
  const isEco = slug === 'eco-friendly-weddings';

  return (
    <main>
      <Seo />
      <section className="ng-section ng-section--teal">
        <div className="ng-container">
          <h1>{category.name}</h1>
          <p>{category.intro}</p>
          {isEco && <p>{ecoFeature.claim}</p>}
        </div>
      </section>

      {isEco && (
        <section className="ng-section">
          <div className="ng-container">
            <p>{ecoFeature.body}</p>
            <p style={{ fontStyle: 'italic' }}>{ecoFeature.pressLine}</p>
          </div>
        </section>
      )}

      <section className="ng-section">
        <div className="ng-container">
          <h2>What we cover</h2>
          <ul>
            {category.occasions.map((o) => (
              <li key={o}>{o}</li>
            ))}
          </ul>
        </div>
      </section>

      {isWedding && (
        <>
          <section className="ng-section">
            <div className="ng-container">
              <h2>The venue, from the outside in</h2>
              <p>
                We plan a wedding the way your guests will experience it: from the moment their
                car is taken at the gate to the moment they collect a return gift on the way out.
                Every point below is decorated as part of one continuous experience.
              </p>
              {zones.map((z) => (
                <section key={z.id} aria-labelledby={`zone-${z.id}`}>
                  <h3 id={`zone-${z.id}`}>{z.heading}</h3>
                  {/* Photographs per zone land with the Day 4 gallery build. */}
                </section>
              ))}
            </div>
          </section>

          <section className="ng-section ng-section--teal">
            <div className="ng-container">
              <h2>Every ceremony, in both its names</h2>
              <ul>
                {ceremonies.map((c) => (
                  <li key={c.en}>
                    {c.en} <span className="ng-ta" lang="ta">{c.ta}</span> ({c.taLatin})
                  </li>
                ))}
              </ul>
              <h3>Wedding rituals we build for</h3>
              <p>{weddingRituals.join(' · ')}</p>
              <h3>Communities and traditions</h3>
              <p>{communityTraditions.join(' · ')}</p>
            </div>
          </section>

          <section className="ng-section">
            <div className="ng-container">
              <h2>Details only the trade knows</h2>
              <div className="ng-grid-3">
                {tradeCraft.map((t) => (
                  <div className="ng-card" key={t.title}>
                    <h3>{t.title}</h3>
                    <p>{t.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </>
      )}

      <section className="ng-section ng-section--teal">
        <div className="ng-container">
          <h2>Tell us about your event.</h2>
          <a
            className="ng-cta"
            href={whatsappLink(`Hi NEWGEN, I would like to talk about ${category.name.toLowerCase()}.`)}
          >
            WhatsApp us
          </a>
        </div>
      </section>
    </main>
  );
}
