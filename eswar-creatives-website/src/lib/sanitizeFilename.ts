// Storage object keys must stay ASCII-safe. macOS screenshot filenames like
// "Screenshot 2026-07-24 at 3.18.09 AM.png" contain U+202F (narrow no-break
// space) between the time and AM/PM, which Supabase Storage rejects with a
// 400 on upload. Strip the extension, fold accents, and collapse anything
// that isn't a word character into hyphens.
export function sanitizeFilename(name: string): string {
  return name
    .replace(/\.[^.]+$/, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '-')
    .replace(/[\s\u00A0\u202F\u2009\u200B]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
}
