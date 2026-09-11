import { Seo } from './Seo';
import { testimonials } from '../content/copy';

// Quote text is pulled verbatim from Google reviews before the Day 4 build.
// Never draft or paraphrase a quote (business profile rule). Until the
// verbatim text is in copy.ts, attributed quotes render nothing.

export function TestimonialsPage() {
  const ready = testimonials.quotes.filter((q) => q.text);
  return (
    <main>
      <Seo />
      <section className="ng-section ng-section--teal">
        <div className="ng-container">
          <h1>What families and venues say</h1>
          <p>{testimonials.ratingLine}</p>
        </div>
      </section>

      {ready.length > 0 && (
        <section className="ng-section">
          <div className="ng-container">
            {ready.map((q) => (
              <blockquote key={q.author}>
                <p>{q.text}</p>
                <footer>
                  {q.author}, {q.context}
                </footer>
              </blockquote>
            ))}
          </div>
        </section>
      )}

      <section className="ng-section">
        <div className="ng-container">
          <p>{testimonials.ctaLine}</p>
          {/* Google review QR + link land with the Day 4 build. */}
        </div>
      </section>
    </main>
  );
}
