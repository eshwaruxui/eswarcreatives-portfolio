// Per-tenant brand for the Step 4 quotation *document* only — deliberately
// separate from the shared TenantTheme (getTenantTheme.ts), which drives the
// portal chrome (Inter throughout, per the brief). Reusing TenantTheme's
// fontHeading/fontBody here would leak a tenant's document display font into
// their own admin/client UI. QuotationDocument looks up the active tenant's
// entry and falls back to NEUTRAL_DOCUMENT_THEME for a tenant that hasn't
// defined one, so the module never breaks for a future tenant without
// bespoke document branding — it's still built the same way for anyone.
export type DocumentTheme = {
  teal: string
  gold: string
  cream: string
  ochre: string
  ruby: string
  fontDisplay: string
  fontFunctional: string
  fontUI: string
  tagline: string | null
  gstin: string | null
  addressLines: string[]
  contactLines: string[]
  /** Dial code to prefix onto a client phone number that does not already
   *  carry one. Tenant data, not a constant in the renderer: the document
   *  component must not assume its reader is in any one country. `null`
   *  means render the stored number exactly as typed and add nothing. */
  defaultDialCode: string | null
}

export const NEUTRAL_DOCUMENT_THEME: DocumentTheme = {
  teal: '#1A1A1A',
  gold: '#4A4A4A',
  cream: '#FFFFFF',
  ochre: '#4A4A4A',
  ruby: '#1A1A1A',
  fontDisplay: "'Inter', system-ui, -apple-system, sans-serif",
  fontFunctional: "'Inter', system-ui, -apple-system, sans-serif",
  fontUI: "'Inter', system-ui, -apple-system, sans-serif",
  tagline: null,
  gstin: null,
  addressLines: [],
  contactLines: [],
  defaultDialCode: null,
}

// Newgen: colours/GSTIN/address/tagline confirmed in Newgen_Architecture.md
// and the validated prototype (newgen_quotation.jsx). Cormorant Garamond /
// Futura PT is the document brand only — Jost Light is the free fallback for
// Futura PT per the architecture doc, used here since Futura PT itself isn't
// a licensed web font in this codebase.
const DOCUMENT_THEMES: Record<string, DocumentTheme> = {
  newgen: {
    teal: '#024C4F',
    gold: '#D5B067',
    cream: '#FAF8F4',
    ochre: '#E1A23D',
    ruby: '#B00D2D',
    fontDisplay: "'Cormorant Garamond', 'Cormorant', Georgia, serif",
    fontFunctional: "'Jost', 'Futura PT', system-ui, -apple-system, sans-serif",
    fontUI: "'Inter', system-ui, -apple-system, sans-serif",
    tagline: 'Your vision. Their memory.',
    gstin: '33CJWPD2137G1ZA',
    addressLines: ['#15, Major Mukund Varadarajan Rd., Pallikaranai, Chennai 600100'],
    contactLines: ['WhatsApp: +91 9176045045', 'studio@newgeneventstudio.com', 'newgeneventstudio.com'],
    defaultDialCode: '+91',
  },
}

export function getDocumentTheme(tenantId: string): DocumentTheme {
  return DOCUMENT_THEMES[tenantId] ?? NEUTRAL_DOCUMENT_THEME
}
