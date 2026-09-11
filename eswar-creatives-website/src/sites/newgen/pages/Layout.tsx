import { Link, NavLink, Outlet } from 'react-router';
import { nap, whatsappLink } from '../content/site';
import '../styles/newgen.css';

// Day 1 structural shell. The designed nav, kolam divider and component
// system land on Day 2; this keeps the information architecture honest from
// the first build. Client login is a quiet utility link by decision
// (Newgen_Decision_Log.md, "Client login is not in the primary navigation").

const navItems = [
  { to: '/services', label: 'Services' },
  { to: '/services/wedding-decoration', label: 'Weddings' },
  { to: '/services/corporate-and-commercial', label: 'Corporate' },
  { to: '/portfolio', label: 'Portfolio' },
  { to: '/testimonials', label: 'Testimonials' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
];

export function Layout() {
  return (
    <div className="ng-site">
      <header className="ng-header">
        <div className="ng-container ng-header__row">
          <Link to="/" className="ng-wordmark">
            NEWGEN
            <small>Event Studio</small>
          </Link>
          <nav className="ng-nav" aria-label="Primary">
            {navItems.map((item) => (
              <NavLink key={item.to} to={item.to} end>
                {item.label}
              </NavLink>
            ))}
          </nav>
          <a
            className="ng-utility-link"
            href="https://portal.newgeneventstudio.com"
            rel="noopener"
          >
            Client login
          </a>
        </div>
      </header>

      <Outlet />

      <footer className="ng-footer">
        <div className="ng-container">
          <div className="ng-footer__grid">
            <div>
              <p style={{ fontFamily: 'var(--ng-font-display)', fontSize: '1.2rem', color: 'var(--ng-gold)' }}>
                NEWGEN Event Studio
              </p>
              <p>Your vision. Their memory.</p>
            </div>
            <address style={{ fontStyle: 'normal' }}>
              <p>
                {nap.streetAddress}
                <br />
                {nap.addressLocality} {nap.postalCode}
              </p>
              <p>
                <a href={whatsappLink()}>WhatsApp {nap.telephone.replace('+91 ', '')}</a>
                <br />
                <a href={`mailto:${nap.email}`}>{nap.email}</a>
              </p>
            </address>
            <div>
              <p>Chennai · Tiruchi · Bengaluru</p>
              <p>
                <a className="ng-utility-link" href="https://portal.newgeneventstudio.com" rel="noopener">
                  Client login
                </a>
                <br />
                <Link className="ng-utility-link" to="/brand-guideline">
                  Brand guideline
                </Link>
              </p>
            </div>
          </div>
          <div className="ng-footer__legal">
            <span>© {new Date().getFullYear()} NEWGEN Event Studio</span>
            <span>1,500+ events since 2018</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
