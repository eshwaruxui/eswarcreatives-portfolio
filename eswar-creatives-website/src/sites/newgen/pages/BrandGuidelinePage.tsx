import { useEffect, useMemo, useRef, useState } from 'react';
import { Seo } from './Seo';
import {
  addressOf,
  brandSymbolsHtml,
  findItFastIntro,
  guidelineParts,
  rulesForPart,
  taskIndex,
} from '../content/guidelines';
import '../styles/brand-guideline.css';

// The permanent brand guideline at /brand-guideline. One long reader-first
// document: every rule from the v0.1 book as its own section, addressable
// by the book's decimal anchors (#2-7). The sidebar is the live contents
// (spread 0.2), the task index at the top is find-it-fast (spread 0.3).

type SearchItem = {
  id: string;
  part: string;
  title: string;
  summary: string;
  tags: string[];
};

const BRAND_SWATCHES = [
  { name: 'Teal', hex: '#024C4F', dark: true },
  { name: 'Gold', hex: '#D7A953', dark: false },
  { name: 'Cream', hex: '#FAF8F4', dark: false, bordered: true },
  { name: 'Ochre', hex: '#E1A23D', dark: false },
  { name: 'Ruby', hex: '#B01F2F', dark: true },
];

function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
  return Promise.reject(new Error('clipboard unavailable'));
}

function CopyLinkButton({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={`bg-copylink${copied ? ' is-copied' : ''}`}
      aria-label={`Copy link to rule ${id.replace('-', '.')}`}
      onClick={() => {
        const url = `${window.location.origin}/brand-guideline#${id}`;
        copyText(url).catch(() => {
          window.location.hash = id;
        });
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1600);
      }}
    >
      {copied ? 'Link copied' : 'Copy link'}
    </button>
  );
}

function LiveSwatches() {
  const [copiedHex, setCopiedHex] = useState<string | null>(null);
  return (
    <div className="bg-live">
      <small>Live on this page: the palette as rendered colour. Tap a value to copy it.</small>
      <div className="bg-swatches">
        {BRAND_SWATCHES.map((s) => (
          <figure key={s.hex} className="bg-swatch">
            <div
              className="bg-swatch__chip"
              style={{
                background: s.hex,
                border: s.bordered ? '1px solid #d6dddc' : undefined,
              }}
            />
            <figcaption>
              <b>{s.name}</b>
              <button
                type="button"
                className={copiedHex === s.hex ? 'is-copied' : ''}
                onClick={() => {
                  copyText(s.hex).catch(() => undefined);
                  setCopiedHex(s.hex);
                  window.setTimeout(() => setCopiedHex(null), 1600);
                }}
              >
                {copiedHex === s.hex ? 'Copied' : s.hex}
              </button>
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}

function LiveTypeScale() {
  return (
    <div className="bg-live">
      <small>Live on this page: the three roles set in the real fonts.</small>
      <div className="bg-typescale">
        <div>
          <span
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontWeight: 700,
              fontSize: 'clamp(1.8rem, 4vw, 2.6rem)',
              color: '#024c4f',
              lineHeight: 1.1,
            }}
          >
            NEWGEN Event Studio
          </span>
          <small>Display · Cormorant Garamond bold</small>
        </div>
        <div>
          <span
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontStyle: 'italic',
              fontSize: 'clamp(1.3rem, 3vw, 1.8rem)',
              color: '#8b6200',
            }}
          >
            Your vision. Their memory.
          </span>
          <small>Tagline · Cormorant italic</small>
        </div>
        <div>
          <span style={{ fontFamily: "'Jost', sans-serif", fontWeight: 300, fontSize: '1rem' }}>
            Functional text is set in Jost light: captions, tables, addresses and every
            working sentence in this guideline.
          </span>
          <small>Functional · Jost light</small>
        </div>
      </div>
    </div>
  );
}

function LiveKolamQuarter() {
  return (
    <div className="bg-live">
      <small>
        Live on this page: the corrected repeating tile on teal, knocked back to
        roughly quarter strength, the way it runs as texture.
      </small>
      <div className="bg-kolam-quarter">
        <div />
      </div>
    </div>
  );
}

// Web-only specimens slot in after the rule that states the matching print rule.
const LIVE_SPECIMENS: Record<string, () => JSX.Element> = {
  '3-2': LiveSwatches,
  '4-2': LiveTypeScale,
  '5-2': LiveKolamQuarter,
};

function GuidelineSearch() {
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState<SearchItem[] | null>(null);
  const [open, setOpen] = useState(false);
  const loading = useRef(false);

  // The index is prebuilt JSON, fetched on first interaction so first paint
  // stays clean.
  const loadIndex = () => {
    if (index || loading.current) return;
    loading.current = true;
    fetch('/brand-guideline/search-index.json')
      .then((res) => res.json())
      .then((data: SearchItem[]) => setIndex(data))
      .catch(() => {
        loading.current = false;
      });
  };

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || !index) return [];
    return index
      .filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.summary.toLowerCase().includes(q) ||
          item.id.replace('-', '.').startsWith(q) ||
          item.tags.some((t) => t.toLowerCase().includes(q)),
      )
      .slice(0, 20);
  }, [query, index]);

  return (
    <div className="bg-searchbar">
      <div className="bg-search">
        <input
          type="search"
          placeholder="Search rules and tasks, or type an address like 2.7"
          aria-label="Search the brand guideline"
          value={query}
          onFocus={loadIndex}
          onChange={(e) => {
            loadIndex();
            setQuery(e.target.value);
            setOpen(true);
          }}
          onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        />
        {open && query.trim() && (
          <div className="bg-search__results" role="listbox">
            {results.map((r, i) => (
              <a key={`${r.id}-${i}`} href={`#${r.id}`} onClick={() => setOpen(false)}>
                <b>{r.part === 'task' ? '→' : r.id.replace('-', '.')}</b>
                <span>
                  {r.title}
                  {r.summary && <span>{r.summary}</span>}
                </span>
              </a>
            ))}
            {index && results.length === 0 && (
              <div className="bg-search__empty">
                Nothing matches. Try a task word (printer, jersey, WhatsApp) or an
                address like 3.2.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function BrandGuidelinePage() {
  const [activeId, setActiveId] = useState<string>('');
  const [drawerOpen, setDrawerOpen] = useState(false);

  // You-are-here indicator, driven by scroll position.
  useEffect(() => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>('.bg-rule[id]'));
    if (!sections.length || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveId(entry.target.id);
        }
      },
      { rootMargin: '-15% 0px -70% 0px' },
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  const activePart = activeId ? activeId.split('-')[0] : '';

  return (
    <main className="bg-page" id="top">
      <Seo />
      {/* mark / lockup / wordmark symbol defs, referenced by rule bodies */}
      <div aria-hidden="true" dangerouslySetInnerHTML={{ __html: brandSymbolsHtml }} />

      <header className="bg-hero">
        <div className="ng-container bg-hero__inner">
          <svg className="bg-hero__mark" viewBox="0 0 117.6 120.3" aria-hidden="true">
            <use href="#mark" />
          </svg>
          <div>
            <p className="bg-hero__eyebrow">NEWGEN Event Studio</p>
            <h1>Brand guidelines</h1>
            <p className="bg-hero__tagline">Your vision. Their memory.</p>
            <p className="bg-hero__meta">
              v0.1-web · 11 September 2026 · Every rule has an address. Quote the
              address, not the page.
            </p>
          </div>
        </div>
      </header>

      <GuidelineSearch />

      <div className="bg-layout">
        <aside
          className={`bg-side${drawerOpen ? ' is-open' : ''}`}
          aria-label="Guideline contents"
        >
          <nav>
            {guidelineParts.map((part) => (
              <details
                key={part.num}
                className="bg-side__part"
                open={part.num === (activePart === 'A' ? 'A' : `0${activePart}`) || undefined}
              >
                <summary>
                  <span className="bg-side__tab" style={{ background: part.color }} />
                  <span className="bg-side__num">{part.num}</span>
                  {part.label}
                </summary>
                <div className="bg-side__rules">
                  {rulesForPart(part.num).map((rule) => (
                    <a
                      key={rule.id}
                      href={`#${rule.id}`}
                      className={activeId === rule.id ? 'is-active' : ''}
                      aria-current={activeId === rule.id ? 'true' : undefined}
                      onClick={() => setDrawerOpen(false)}
                    >
                      <b>{addressOf(rule)}</b>
                      {rule.title}
                    </a>
                  ))}
                </div>
              </details>
            ))}
          </nav>
          <div className="bg-side__extra">
            <a href="#find-it-fast" onClick={() => setDrawerOpen(false)}>
              Find it fast
            </a>
            <a href="#9-2" onClick={() => setDrawerOpen(false)}>
              Field card (Tanglish)
            </a>
            <a href="#9-3" onClick={() => setDrawerOpen(false)}>
              Glossary
            </a>
            <a href="#9-4" onClick={() => setDrawerOpen(false)}>
              A to Z
            </a>
          </div>
        </aside>

        <div className="bg-main">
          <section className="bg-fif bg-anchor-target" id="find-it-fast" aria-label="Find it fast">
            <h2>Find it fast</h2>
            <p>{findItFastIntro}</p>
            {taskIndex.map((t) => (
              <a key={t.task} className="bg-fif__row" href={`#${t.ids[0]}`}>
                <span>{t.task}</span>
                <b>{t.refs}</b>
              </a>
            ))}
          </section>

          {guidelineParts.map((part) => {
            const rules = rulesForPart(part.num);
            if (!rules.length) return null;
            return (
              <section key={part.num} aria-label={part.label}>
                <div className="bg-part-h" id={`part-${part.num}`}>
                  <span className="bg-side__tab" style={{ background: part.color }} />
                  <div>
                    <small>{part.num === 'A' ? 'Annexe A' : `Part ${part.num}`}</small>
                    <h2>{part.label}</h2>
                  </div>
                </div>
                {rules.map((rule) => {
                  const Specimen = LIVE_SPECIMENS[rule.id];
                  return (
                    <section key={rule.id} className="bg-rule" id={rule.id}>
                      <div className="bg-rule__head">
                        <span className="bg-rule__addr">{addressOf(rule)}</span>
                        <h3>{rule.title}</h3>
                        <CopyLinkButton id={rule.id} />
                      </div>
                      <div
                        className="bgd"
                        dangerouslySetInnerHTML={{ __html: rule.body }}
                      />
                      {Specimen && <Specimen />}
                    </section>
                  );
                })}
              </section>
            );
          })}

          <footer className="bg-contact">
            <p>
              NEWGEN Event Studio · Brand guidelines v0.1-web · First web edition,
              11 September 2026 · Prepared by Eswar Creatives.
            </p>
            <p>
              Artwork and file queries:{' '}
              <a href="mailto:eswar@eswarcreatives.in">eswar@eswarcreatives.in</a>. Eswar
              Creatives holds the master artwork.
            </p>
          </footer>
        </div>
      </div>

      <button
        type="button"
        className="bg-drawer-toggle"
        aria-expanded={drawerOpen}
        onClick={() => setDrawerOpen((v) => !v)}
      >
        {drawerOpen ? 'Close contents' : 'Contents'}
      </button>
    </main>
  );
}
