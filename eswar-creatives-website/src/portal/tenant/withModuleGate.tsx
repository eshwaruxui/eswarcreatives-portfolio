// Route-config helper: wraps a route's Component in ModuleGate. Kept
// separate from ModuleGate itself so route-config.ts can gate a route in one
// line, e.g. `Component: withModuleGate("discovery", DiscoveryPlaceholder)` —
// the pattern the fast-follow expansion to the remaining modules reuses.
import type { ComponentType } from 'react'
import { ModuleGate } from './ModuleGate'

export function withModuleGate(moduleKey: string, Component: ComponentType) {
  return function Gated() {
    return (
      <ModuleGate moduleKey={moduleKey}>
        <Component />
      </ModuleGate>
    )
  }
}
