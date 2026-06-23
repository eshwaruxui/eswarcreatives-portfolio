import { Compass } from 'lucide-react'
import { PageHeader, Card, EmptyState } from './ui'

// Part 8 — placeholder so the Discovery nav item is not a dead link. No
// backend work; the questionnaire module (DiscoveryQuestionnaire.tsx) ships
// later and will replace this empty state.
export function DiscoveryPlaceholder() {
  return (
    <>
      <PageHeader title="Discovery" />
      <Card>
        <EmptyState
          icon={<Compass size={40} strokeWidth={1.5} />}
          heading="Discovery questionnaire not yet built"
          body="Business discovery form responses will appear here once DiscoveryQuestionnaire.tsx ships."
        />
      </Card>
    </>
  )
}
