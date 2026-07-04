import { MetadataRoute } from 'next'
import { createAdminClient } from '@/lib/supabase/server'
import { Question } from '@/lib/types/database'

const BASE = 'https://curiousif.blog'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE,              lastModified: new Date(), changeFrequency: 'daily',   priority: 1.0 },
    { url: `${BASE}/browse`,  lastModified: new Date(), changeFrequency: 'hourly',  priority: 0.9 },
    { url: `${BASE}/archive`, lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.7 },
    // '/about' now redirects into '/' (see next.config.ts) — no separate sitemap entry.
    { url: `${BASE}/answer`,  lastModified: new Date(), changeFrequency: 'daily',   priority: 0.8 },
    { url: `${BASE}/invite`,  lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
    { url: `${BASE}/privacy`, lastModified: new Date(), changeFrequency: 'yearly',  priority: 0.3 },
    { url: `${BASE}/terms`,   lastModified: new Date(), changeFrequency: 'yearly',  priority: 0.3 },
  ]

  // Dynamic: published month pages + every approved answer's permalink.
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createAdminClient() as any

    const [questionsRes, answersRes] = await Promise.all([
      supabase
        .from('questions')
        .select('published_at, created_at')
        .in('status', ['spotlight', 'published'])
        .order('published_at', { ascending: false }),
      // Every approved answer now has a working /answers/[id] permalink (seed
      // answers included, per the 2026-07-03 reversal). Cap well under the 50k
      // sitemap limit; the site is nowhere near it.
      supabase
        .from('answers')
        .select('id, approved_at, created_at')
        .eq('status', 'approved')
        .order('approved_at', { ascending: false })
        .limit(5000),
    ])

    const monthRoutes: MetadataRoute.Sitemap = (
      (questionsRes.data ?? []) as Pick<Question, 'published_at' | 'created_at'>[]
    ).map((q) => {
      const date = new Date(q.published_at ?? q.created_at)
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      return {
        url: `${BASE}/browse/${year}/${month}`,
        lastModified: new Date(),
        changeFrequency: 'daily' as const,
        priority: 0.8,
      }
    })

    const answerRoutes: MetadataRoute.Sitemap = (
      (answersRes.data ?? []) as { id: string; approved_at: string | null; created_at: string }[]
    ).map((a) => ({
      url: `${BASE}/answers/${a.id}`,
      lastModified: new Date(a.approved_at ?? a.created_at),
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    }))

    return [...staticRoutes, ...monthRoutes, ...answerRoutes]
  } catch {
    return staticRoutes
  }
}
