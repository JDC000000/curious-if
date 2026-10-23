import { describe, expect, it } from 'vitest'
import { addPageHtml, formTarget, FORM_URL } from '@/lib/addLink'

describe('/add link-preview page', () => {
  it('goes to the fixed form with no query', () => {
    expect(formTarget(new URLSearchParams())).toBe(FORM_URL)
  })
  it('passes on q, src and k only', () => {
    const t = formTarget(new URLSearchParams('src=ig-dm&k=k001&q=Q03&evil=1'))
    expect(t.startsWith(FORM_URL + '?')).toBe(true)
    expect(t).toContain('src=ig-dm')
    expect(t).toContain('k=k001')
    expect(t).toContain('q=Q03')
    expect(t).not.toContain('evil')
  })
  it('drops values that are not plain tokens (no open redirect, no markup)', () => {
    const t = formTarget(new URLSearchParams({ src: 'a"><script>', k: 'https://x.test', q: 'Q01' }))
    expect(t).toBe(FORM_URL + '?q=Q01')
  })
  it('carries our own preview card tags and the redirect', () => {
    const html = addPageHtml(FORM_URL)
    expect(html).toContain('property="og:title" content="Skip the weather: add your answer"')
    expect(html).toContain('property="og:image" content="https://curiousif.blog/add/card"')
    expect(html).toContain('name="twitter:card" content="summary_large_image"')
    expect(html).toContain('http-equiv="refresh"')
    expect(html).toContain(FORM_URL)
  })
})
