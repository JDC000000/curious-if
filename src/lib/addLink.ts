// Link-preview page for the Skip the weather form (Curious If book, ledger #28).
// /add answers with a small HTML page that carries our own preview card and sends the
// visitor on to the Tally form. Link previews (Instagram, texts, WhatsApp) read the tags
// and never follow the redirect; people's browsers do. Only q, src and k are passed on
// (the form's three hidden fields) and only when they are plain tokens, so the target
// is always the one fixed form and the page cannot be used as an open redirect.

export const FORM_URL = 'https://tally.so/r/BEz0PQ'
export const SITE_URL = 'https://curiousif.blog'
const ALLOWED = ['q', 'src', 'k'] as const
const TOKEN = /^[A-Za-z0-9_-]{1,40}$/

export function formTarget(search: URLSearchParams): string {
  const out = new URLSearchParams()
  for (const key of ALLOWED) {
    const v = search.get(key)
    if (v !== null && TOKEN.test(v)) out.set(key, v)
  }
  const qs = out.toString()
  return qs ? `${FORM_URL}?${qs}` : FORM_URL
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export const CARD_TITLE = 'Skip the weather: add your answer'
export const CARD_DESCRIPTION =
  "I'm making a small book of questions, with answers from friends. Answer one, two, or the whole bunch."

export function addPageHtml(target: string): string {
  const t = esc(target)
  const img = `${SITE_URL}/add/card`
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(CARD_TITLE)}</title>
<meta name="description" content="${esc(CARD_DESCRIPTION)}">
<meta property="og:title" content="${esc(CARD_TITLE)}">
<meta property="og:description" content="${esc(CARD_DESCRIPTION)}">
<meta property="og:site_name" content="Curious If">
<meta property="og:type" content="website">
<meta property="og:url" content="${SITE_URL}/add">
<meta property="og:image" content="${img}">
<meta property="og:image:type" content="image/png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Skip the weather. Add your answer.">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(CARD_TITLE)}">
<meta name="twitter:description" content="${esc(CARD_DESCRIPTION)}">
<meta name="twitter:image" content="${img}">
<meta name="robots" content="noindex">
<meta http-equiv="refresh" content="0;url=${t}">
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#F8F3E9;color:#1A1A1A;font:18px/1.5 Georgia,serif;text-align:center;padding:24px}a{color:#3D5A8C}</style>
</head>
<body>
<p>Taking you to the form. If nothing happens, <a href="${t}">tap here</a>.</p>
<script>window.location.replace(${JSON.stringify(target).replace(/</g, '\\u003c')})</script>
</body>
</html>
`
}
