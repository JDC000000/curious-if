import { MetadataRoute } from 'next'
import { createAdminClient } from '@/lib/supabase/server'
import { Question } from '@/lib/types/database'

const BASE = 'https://curiousif.blog'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE,              lastModified: new Date(), changeFrequency: 'daily',   priority: 1.0 },
    { url: `${BASE}/browse`,  lastModified: new Date(), changeFrequency: 'hourly',  priority: 0.9 },
    { url: `${BASE}/archive`, lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.7 },
    { url: `${BASE}/about`,   lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE}/answer`,  lastModified: new Date(), changeFrequency: 'daily',   priority: 0.8 },
    { url: `${BASE}/invite`,  lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
  ]

  // Dynamic: published month pages
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createAdminClient() as any
    const { data } = await supabase
      .from('questions')
      .select('published_at, created_at')
      .in('status', ['featured', 'published'])
      .order('published_at', { ascending: false })

    const monthRoutes: MetadataRoute.Sitemap = (data ?? []).map((q: Pick<Question, 'published_at' | 'created_at'>) => {
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

    return [...staticRoutes, ...monthRoutes]
  } catch {
    return staticRoutes
  }
}
