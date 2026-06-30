import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

interface SubscriberRow {
  id: string
  email: string
  subscribed_at: string
  unsubscribed_at: string | null
  submitter: {
    name: string | null
    city: string | null
  } | null
}

async function getSubscribers(): Promise<{ rows: SubscriberRow[]; total: number; active: number }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createAdminClient() as any

  const { data } = await supabase
    .from('subscribers')
    .select(`
      id,
      email,
      subscribed_at,
      unsubscribed_at,
      submitter:submitters(name, city)
    `)
    .order('subscribed_at', { ascending: false })
    .limit(200)

  const rows = (data ?? []) as SubscriberRow[]
  const active = rows.filter(r => !r.unsubscribed_at).length

  return { rows, total: rows.length, active }
}

export default async function SubscribersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { rows, total, active } = await getSubscribers()

  return (
    <>
      {/* Admin nav */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          backgroundColor: 'rgba(26,26,26,0.96)',
          backdropFilter: 'blur(8px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          height: '56px',
          display: 'flex',
          alignItems: 'center',
          padding: '0 24px',
          gap: '16px',
        }}
      >
        <Link
          href="/admin"
          style={{
            fontFamily: 'var(--font-serif)',
            fontStyle: 'italic',
            fontSize: '18px',
            color: '#F8F3E9',
            textDecoration: 'none',
          }}
        >
          curious if
        </Link>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            color: 'rgba(248,243,233,0.5)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          Subscribers
        </span>
      </div>

      <main style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 24px' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
          <div>
            <h1
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '24px',
                fontWeight: 700,
                color: '#1A1A1A',
                letterSpacing: '-0.02em',
                marginBottom: '4px',
              }}
            >
              Subscribers
            </h1>
            <p style={{ fontFamily: 'var(--font-ui)', fontSize: '14px', color: '#6B6B6B' }}>
              {active} active · {total - active} unsubscribed
            </p>
          </div>
          <Link
            href="/admin"
            style={{ fontFamily: 'var(--font-ui)', fontSize: '13px', color: '#6B6B6B', textDecoration: 'none' }}
          >
            ← Dashboard
          </Link>
        </div>

        {/* Stats row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '16px',
            marginBottom: '32px',
          }}
        >
          {[
            { label: 'Total', value: total },
            { label: 'Active', value: active },
            { label: 'Unsubscribed', value: total - active },
          ].map(({ label, value }) => (
            <div
              key={label}
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                padding: '20px 24px',
                boxShadow: '0 2px 8px rgba(26,26,46,0.08)',
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '10px',
                  fontWeight: 500,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: '#9A9A9A',
                  marginBottom: '8px',
                }}
              >
                {label}
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '32px',
                  fontWeight: 700,
                  color: '#1A1A1A',
                  letterSpacing: '-0.02em',
                }}
              >
                {value}
              </div>
            </div>
          ))}
        </div>

        {/* Table */}
        {rows.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '80px 24px',
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(26,26,46,0.08)',
            }}
          >
            <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '18px', color: '#6B6B6B' }}>
              No subscribers yet.
            </p>
          </div>
        ) : (
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(26,26,46,0.08)',
              overflow: 'hidden',
            }}
          >
            {/* Table header */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr 1fr 1fr',
                padding: '12px 20px',
                borderBottom: '1px solid #F0EDE6',
                backgroundColor: '#F8F3E9',
              }}
            >
              {['Email', 'Name', 'City', 'Joined'].map(col => (
                <div
                  key={col}
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '10px',
                    fontWeight: 500,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: '#9A9A9A',
                  }}
                >
                  {col}
                </div>
              ))}
            </div>

            {/* Rows */}
            {rows.map((row, i) => {
              const isUnsub = !!row.unsubscribed_at
              const joinedDate = new Date(row.subscribed_at).toLocaleDateString('en-GB', {
                day: 'numeric', month: 'short', year: 'numeric',
              })

              return (
                <div
                  key={row.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 1fr 1fr 1fr',
                    padding: '14px 20px',
                    borderBottom: i < rows.length - 1 ? '1px solid #F8F3E9' : 'none',
                    opacity: isUnsub ? 0.45 : 1,
                    alignItems: 'center',
                  }}
                >
                  <div
                    style={{
                      fontFamily: 'var(--font-ui)',
                      fontSize: '14px',
                      color: '#1A1A1A',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      paddingRight: '12px',
                    }}
                  >
                    {row.email}
                    {isUnsub && (
                      <span
                        style={{
                          marginLeft: '8px',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '9px',
                          color: '#9A9A9A',
                          border: '1px solid #E0D9C8',
                          borderRadius: '3px',
                          padding: '1px 5px',
                          verticalAlign: 'middle',
                        }}
                      >
                        unsub
                      </span>
                    )}
                  </div>
                  <div style={{ fontFamily: 'var(--font-ui)', fontSize: '14px', color: '#3D3D3D' }}>
                    {row.submitter?.name ?? '—'}
                  </div>
                  <div style={{ fontFamily: 'var(--font-ui)', fontSize: '14px', color: '#6B6B6B' }}>
                    {row.submitter?.city ?? '—'}
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: '#9A9A9A' }}>
                    {joinedDate}
                  </div>
                </div>
              )
            })}
          </div>
        )}

      </main>
    </>
  )
}
