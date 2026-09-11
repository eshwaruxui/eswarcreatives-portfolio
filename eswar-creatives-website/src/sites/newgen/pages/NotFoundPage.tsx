import { Link } from 'react-router';
import { Helmet } from 'react-helmet-async';

// 404 copy per the Edge cases page. The unclosed-kolam illustration for this
// state lands with the Day 2 illustration set.

export function NotFoundPage() {
  return (
    <main>
      <Helmet>
        <title>Page not found | Newgen Event Studio</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <section className="ng-section">
        <div className="ng-container">
          <h1>This page is not here</h1>
          <p>The address may have changed, or the link may be incomplete.</p>
          <p>
            <Link to="/">Go to the home page</Link> or{' '}
            <Link to="/services">browse our services</Link>.
          </p>
        </div>
      </section>
    </main>
  );
}
