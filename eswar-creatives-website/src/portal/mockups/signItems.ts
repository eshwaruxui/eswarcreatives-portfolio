// Shared mockups helpers used by both the admin preview and the client page.
// The `mockups` storage bucket is private, so every image needs a short-lived
// signed URL before it can render.
import { supabase } from '../../lib/supabase'

// A single image as the lightbox consumes it.
export type LightboxMockup = { id: string; label: string; url: string }

// Set-level context shown in the lightbox header/footer.
export type LightboxMeta = {
  projectName: string
  conceptName: string
  phase: string
  phaseName: string
  taskItem: string
  date: string
}

export type StoredItem = { id: string; label: string; storage_path: string }

// Create 1-hour signed URLs for every item, preserving order.
export async function signMockupItems(items: StoredItem[]): Promise<LightboxMockup[]> {
  const out: LightboxMockup[] = []
  for (const it of items) {
    const { data } = await supabase.storage.from('mockups').createSignedUrl(it.storage_path, 3600)
    out.push({ id: it.id, label: it.label, url: data?.signedUrl ?? '' })
  }
  return out
}
