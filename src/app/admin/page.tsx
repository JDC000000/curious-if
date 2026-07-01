import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function AdminDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/admin/login')
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#F8F3E9',
        padding: '48px 24px',
      }}
    >
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ marginBottom: '48px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1
              style={{
                fontFamily: 'var(--font-serif)',
                fontStyle: 'italic',
                fontSize: '28px',
                fontWeight: 400,
                color: '#1A1A1A',
                marginBottom: '4px',
              }}
            >
              curious if
            </h1>
            <p style={{ fontFamily: 'var(--font-ui)', fontSize: '14px', color: '#6B6B6B' }}>
              Admin dashboard
            </p>
          </div>
          <Link
            href="/"
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: '13px',
              color: '#6B6B6B',
              textDecoration: 'none',
            }}
          >
            ← Back to site
          </Link>
        </div>

        {/* Quick actions */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
          <AdminCard
            title="Questions"
            description="View, draft, and publish monthly questions"
            href="/admin/questions"
            accent="#3D5A8C"
          />
          <AdminCard
            title="Moderation"
            description="Review pending answers — approve or reject"
            href="/admin/moderation"
            accent="#5C8C6B"
          />
          <AdminCard
            title="Subscribers"
            description="View subscriber list and send broadcasts"
            href="/admin/subscribers"
            accent="#B8902A"
          />
          <AdminCard
            title="Answers"
            description="All published answers sorted by resonance"
            href="/admin/answers"
            accent="#7C5C8C"
          />
        </div>
      </div>
    </div>
  )
}

function AdminCard({
  title,
  description,
  href,
  accent,
  badge,
}: {
  title: string
  description: string
  href: string
  accent: string
  badge?: string
}) {
  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 2px 8px rgba(26,26,46,0.08)',
          cursor: 'pointer',
          transition: 'box-shadow 150ms ease',
        }}
      >
        <div style={{ height: '4px', backgroundColor: accent }} />
        <div style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <h3
              style={{
                fontFamily: 'var(--font-ui)',
                fontSize: '16px',
                fontWeight: 600,
                color: '#1A1A1A',
              }}
            >
              {title}
            </h3>
            {badge && (
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '10px',
                  color: '#9A9A9A',
                  border: '1px solid #E0D9C8',
                  borderRadius: '4px',
                  padding: '2px 6px',
                }}
              >
                {badge}
              </span>
            )}
          </div>
          <p style={{ fontFamily: 'var(--font-ui)', fontSize: '13px', color: '#6B6B6B', lineHeight: 1.5 }}>
            {description}
          </p>
        </div>
      </div>
    </Link>
  )
}
