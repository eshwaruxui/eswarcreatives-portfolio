// Portal-neutral file-format badge. Renders identically no matter which
// client's file it labels — the direct answer to "assets need a clear
// extension thumbnail" (brand-visual-guide-prd-v2 Section 4). Specced as
// portal chrome, not brand content, so it deliberately never picks up a
// client's own colours: neutral fill, portal monospace, t.text.primary.
// Used on the card grid, the admin list row, and the detail drawer header.
import type { CSSProperties } from 'react'
import { t } from '../../theme'

// No mono token in theme.ts; this mirrors the single admin-wide definition
// in admin/ui.tsx without importing admin code into client/public bundles.
const mono = "'SF Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"

export function ExtensionBadge({ ext, size = 'md' }: { ext: string; size?: 'md' | 'lg' }) {
  const dims = size === 'lg' ? { w: 64, h: 52, fs: 13 } : { w: 44, h: 34, fs: 10.5 }
  const style: CSSProperties = {
    width: dims.w,
    height: dims.h,
    borderRadius: 8,
    background: t.background.muted,
    border: `1px solid ${t.border.default}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: mono,
    fontSize: dims.fs,
    fontWeight: 600,
    letterSpacing: '0.02em',
    color: t.text.primary,
    flexShrink: 0,
  }
  return (
    <div style={style} aria-hidden>
      {ext.toUpperCase()}
    </div>
  )
}
