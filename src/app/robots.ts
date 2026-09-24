import { MetadataRoute } from 'next'

// AI crawlers we disallow site-wide (cost-control control C9 in
// vercel-supabase-cost-control recipe). Normal search engines (Googlebot,
// Bingbot, etc.) are NOT in this list and stay allowed via the userAgent:'*'
// rule below. This is the "gentle" robots.txt-only option — it does not
// touch Vercel's managed firewall "AI Bots" ruleset, which would also catch
// Applebot (Siri/Spotlight/Safari search) and user-pasted links into AI
// assistants. See the recipe for that tradeoff before turning the firewall
// ruleset on.
const AI_CRAWLER_USER_AGENTS = [
  'GPTBot',
  'ChatGPT-User',
  'OAI-SearchBot',
  'ClaudeBot',
  'anthropic-ai',
  'CCBot',
  'PerplexityBot',
  'Google-Extended',
  'Bytespider',
  'Amazonbot',
  'Applebot-Extended',
  'meta-externalagent',
]

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/api/', '/auth/'],
      },
      ...AI_CRAWLER_USER_AGENTS.map((userAgent) => ({
        userAgent,
        disallow: '/',
      })),
    ],
    sitemap: 'https://curiousif.blog/sitemap.xml',
  }
}
