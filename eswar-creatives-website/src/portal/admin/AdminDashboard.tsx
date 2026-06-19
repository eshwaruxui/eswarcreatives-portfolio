import { PageHeader, Card, ui } from './ui'

// Stub — fleshed out in layer (3).
export function AdminDashboard() {
  return (
    <>
      <PageHeader title="Dashboard" />
      <Card>
        <p style={ui.muted}>Dashboard metrics load here.</p>
      </Card>
    </>
  )
}
