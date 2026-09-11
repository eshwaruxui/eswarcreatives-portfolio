import { Seo } from './Seo';
import { about } from '../content/copy';
import { whatsappLink } from '../content/site';

export function AboutPage() {
  return (
    <main>
      <Seo />
      <section className="ng-section">
        <div className="ng-container">
          <h1>{about.title}</h1>
          {about.paragraphs.map((p) => (
            <p key={p.slice(0, 32)}>{p}</p>
          ))}
        </div>
      </section>
      <section className="ng-section ng-section--teal">
        <div className="ng-container">
          <h2>{about.team.title}</h2>
          <p>{about.team.body}</p>
          {/* Team photo pending a Newgen photography session; text-only strip
              until the asset exists, per the business profile note. */}
        </div>
      </section>
      <section className="ng-section">
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
