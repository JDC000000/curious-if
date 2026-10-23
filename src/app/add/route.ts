import { addPageHtml, formTarget } from '@/lib/addLink'

// Public, static-looking page: no database, no cookies, no auth. See src/lib/addLink.ts.
export function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  return new Response(addPageHtml(formTarget(searchParams)), {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=0, s-maxage=300',
    },
  })
}
