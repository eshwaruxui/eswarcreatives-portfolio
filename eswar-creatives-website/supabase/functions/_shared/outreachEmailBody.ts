// Shared HTML rendering for outreach touch emails. Single source of truth for
// both send-outreach-email (the direct "Send email" click) and
// send-confirmed-outreach-touches (the 5-minute cron that completes an early
// "Review in Advance" approval) — the two previously carried byte-identical
// copies of this function, so a change to one silently skipped whichever path
// the touch actually went out on.
//
// The rule: outreach must read as a plain email a person typed, not as a
// marketing template. No logo, no header, no background colour, no bordered
// container, no styled button, no inline colours — a cold email that looks
// designed reads as bulk mail to both the recipient and to spam filters.
//
// The only markup here is what plain text cannot do on its own: line breaks
// and two clickable links. The plain-text `text` field sent alongside this
// stays the canonical version; this is its minimal HTML twin.

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function htmlBody(body: string, unsubUrl: string): string {
  let escaped = escapeHtml(body);

  // Two bare URLs in the copy become clickable, with no styling of their own —
  // the client's default link rendering (blue, underlined) is exactly the
  // "bare URL" look we want, and any inline colour here would reintroduce
  // brand styling through the back door.
  const escapedUnsubUrl = escapeHtml(unsubUrl);
  escaped = escaped.split(escapedUnsubUrl).join(
    `<a href="${escapedUnsubUrl}">unsubscribe</a>`,
  );
  escaped = escaped.split("eswarcreatives.in/design-systems").join(
    `<a href="https://www.eswarcreatives.in/design-systems">eswarcreatives.in/design-systems</a>`,
  );

  // Preserve the paragraph structure of the plain-text body: \n\n → blank
  // line, remaining \n → single break.
  escaped = escaped
    .replace(/\n\n/g, "<br><br>")
    .replace(/\n/g, "<br>");

  return `<!doctype html>
<html>
  <body>${escaped}</body>
</html>`;
}
