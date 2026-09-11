import { Seo } from './Seo';
import { portfolio } from '../content/copy';
import { whatsappLink } from '../content/site';

// Day 1 skeleton. The gallery (curated library, moment sections, single-axis
// chip filter) is the Day 4 build; this locks the page structure and copy.
// Empty-category states are live launch states, styled per the Edge cases
// page, not fallbacks.

export function PortfolioPage() {
  return (
    <main>
      <Seo />
      <section className="ng-section ng-section--teal">
        <div className="ng-container">
          <h1>Portfolio</h1>
          <p>{portfolio.intro}</p>
        </div>
      </section>

      <section className="ng-section">
        <div className="ng-container">
          <h2>Weddings</h2>
          <p>{portfolio.weddings}</p>
          <h2>Corporate</h2>
          <p>{portfolio.corporate}</p>
          <h2>Destination</h2>
          <p>{portfolio.destination}</p>
        </div>
      </section>

      <section className="ng-section">
        <div className="ng-container">
          <h2>{portfolio.caseStudy.title}</h2>
          <p>{portfolio.caseStudy.body}</p>
        </div>
      </section>

      <section className="ng-section ng-section--teal">
        <div className="ng-container">
          <h2>Build yours like this.</h2>
          <a className="ng-cta" href={whatsappLink('Hi Newgen, I saw your portfolio and would like to talk about an event.')}>
            WhatsApp us
          </a>
        </div>
      </section>
    </main>
  );
}
