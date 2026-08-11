// Reads the real error code out of a supabase.functions.invoke() result.
//
// Why this exists: on a non-2xx response, functions-js throws
// `new FunctionsHttpError(response)` (FunctionsClient.js:271) and returns it
// as `error` with `data: null`. It never parses the body on that path — the
// JSON decode happens further down, after the throw. So the usual
// `if (data?.error)` check can never fire for a real server-side failure, and
// every edge function's carefully-coded error string collapses into whatever
// generic fallback the caller has. That silently killed all seven of
// send-outreach-email's specific messages, including "Daily sending limit of
// 25 reached".
//
// The raw Response survives on `error.context`, which is the documented way
// to recover the body (see the FunctionsClient.invoke JSDoc). We clone before
// reading so a second call on the same error object can't hit an
// already-consumed stream.
import { FunctionsHttpError } from '@supabase/supabase-js'

// Returned when a request failed but no machine-readable code could be
// recovered — a network drop, a non-JSON body, a gateway error.
export const GENERIC_ERROR_CODE = 'network_error'

/**
 * Resolves an invoke() result to the server's error code, or null on success.
 *
 * Handles both conventions in this codebase: a 200 carrying `{ error }` in the
 * body (generate-outreach-message, extract-lead-from-image) and a non-2xx
 * carrying the same shape (send-outreach-email, confirm-scheduled-touch).
 */
export async function invokeErrorCode(
  data: unknown,
  error: unknown,
): Promise<string | null> {
  // 200 with an error field in the body.
  if (data && typeof data === 'object' && 'error' in data) {
    const code = (data as { error?: unknown }).error
    if (typeof code === 'string' && code) return code
  }

  if (!error) return null

  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.clone().json()
      const code = (body as { error?: unknown } | null)?.error
      if (typeof code === 'string' && code) return code
    } catch {
      // Non-JSON body, or a body already read elsewhere. Fall through to the
      // generic code rather than throwing out of an error handler.
    }
  }

  return GENERIC_ERROR_CODE
}

/**
 * Best-effort readable text for a code, for call sites that have a free-text
 * error slot but no dedicated message map of their own. A caller with real
 * copy per code (OutreachSendModal) should map the code itself instead.
 *
 * Unrecoverable/unknown failures keep the caller's own wording, so this never
 * degrades an existing message into something vaguer.
 */
export function humanizeErrorCode(code: string | null, fallback: string): string {
  if (!code || code === GENERIC_ERROR_CODE) return fallback
  const words = code.replace(/_/g, ' ').trim()
  return words.charAt(0).toUpperCase() + words.slice(1) + '.'
}
