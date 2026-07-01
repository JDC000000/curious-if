/**
 * Escape a string for safe interpolation into HTML (email bodies especially).
 *
 * Outbound emails come from hello@curiousif.blog, so unescaped user input is a
 * phishing-enablement vector (a nominee could inject <a href="evil"> into an
 * email the nominator trusts). Apply to EVERY user-controlled value before it
 * enters an HTML template. Plain-text bodies do not need this.
 */
export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
