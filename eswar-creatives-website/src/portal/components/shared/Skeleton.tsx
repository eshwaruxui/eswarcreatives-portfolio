// Shared shimmer skeleton block, consolidating the .ec-shimmer pattern that
// was duplicated inline across ClientDashboard/ClientProposals/ClientInvoices/
// ClientCampaigns/MockupsPage/ClientLightbox (same gradient, same keyframes,
// copy-pasted per file). Self-contained per instance (keyframes rendered as
// its own <style> tag), matching the existing pattern in Spinner.tsx.
import type { CSSProperties } from 'react'
import { t } from '../../theme'

export function Skeleton({
  width,
  height,
  borderRadius = 6,
  style,
}: {
  width?: number | string
  height: number
  borderRadius?: number
  style?: CSSProperties
}) {
  return (
    <>
      <style>{`@keyframes ecShimmer{0%{background-position:-200% center}100%{background-position:200% center}}`}</style>
      <div
        style={{
          width,
          height,
          borderRadius,
          background: `linear-gradient(90deg, ${t.background.subtle} 25%, ${t.background.muted} 50%, ${t.background.subtle} 75%)`,
          backgroundSize: '200% 100%',
          animation: 'ecShimmer 1.5s linear infinite',
          ...style,
        }}
      />
    </>
  )
}
