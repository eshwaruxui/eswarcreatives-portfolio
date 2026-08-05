// Uploads a file to a Supabase Storage bucket with real byte-level progress
// callbacks. supabase-js's own storage.upload() is fetch-based and exposes
// no progress events, so this hits the same REST contract directly via
// XMLHttpRequest (which does support upload.onprogress): POST
// {SUPABASE_URL}/storage/v1/object/{bucket}/{path}, same headers/
// cache-control storage-js sends. This is purely a transport swap to get
// progress, not a different upload contract -- on any failure the caller
// gets back the same { error } shape it already handles.
import { supabase } from '../../lib/supabase'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string

export async function uploadWithProgress(
  bucket: string,
  path: string,
  file: File,
  onProgress: (pct: number) => void
): Promise<{ error: string | null }> {
  const { data: sessionData } = await supabase.auth.getSession()
  const accessToken = sessionData.session?.access_token ?? SUPABASE_PUBLISHABLE_KEY

  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`)
    xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`)
    xhr.setRequestHeader('apikey', SUPABASE_PUBLISHABLE_KEY)
    xhr.setRequestHeader('content-type', file.type || 'application/octet-stream')
    xhr.setRequestHeader('cache-control', 'max-age=3600')

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(100)
        resolve({ error: null })
      } else {
        resolve({ error: `Upload failed (status ${xhr.status}).` })
      }
    }
    xhr.onerror = () => resolve({ error: 'Upload failed. Check your connection.' })
    xhr.send(file)
  })
}
