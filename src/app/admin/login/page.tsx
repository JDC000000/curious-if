'use client'

import { useState } from 'react'

export default function AdminLoginPage() {
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // The server checks the address against its allow-list and sends the link
    // (security review 2026-09-30); no admin address lives in this bundle.
    try {
      const res = await fetch('/auth/admin-link', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (!res.ok) throw new Error(String(res.status))
      setSent(true)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F8F3E9',
        padding: '24px',
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          padding: '48px',
          maxWidth: '400px',
          width: '100%',
          boxShadow: '0 4px 24px rgba(26,26,46,0.10)',
        }}
      >
        <div style={{ marginBottom: '32px' }}>
          <h1
            style={{
              fontFamily: 'var(--font-serif)',
              fontStyle: 'italic',
              fontSize: '24px',
              fontWeight: 400,
              color: '#1A1A1A',
              marginBottom: '8px',
            }}
          >
            curious if
          </h1>
          <p
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: '14px',
              color: '#6B6B6B',
            }}
          >
            Admin access
          </p>
        </div>

        {sent ? (
          <div
            style={{
              textAlign: 'center',
              padding: '24px 0',
            }}
          >
            <div style={{ fontSize: '32px', marginBottom: '16px' }}>✉️</div>
            <p
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '16px',
                color: '#1A1A1A',
                marginBottom: '8px',
              }}
            >
              Check your inbox
            </p>
            <p
              style={{
                fontFamily: 'var(--font-ui)',
                fontSize: '14px',
                color: '#6B6B6B',
              }}
            >
              If that is the admin address, a magic link is on its way.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <p
              style={{
                fontFamily: 'var(--font-ui)',
                fontSize: '14px',
                color: '#3D3D3D',
                marginBottom: '24px',
                lineHeight: 1.6,
              }}
            >
              Enter the admin email address to receive a magic link.
            </p>

            {error && (
              <div
                style={{
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FCA5A5',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  marginBottom: '16px',
                  fontFamily: 'var(--font-ui)',
                  fontSize: '14px',
                  color: '#DC2626',
                }}
              >
                {error}
              </div>
            )}

            <label
              htmlFor="admin-email"
              style={{ display: 'block', fontFamily: 'var(--font-ui)', fontSize: '14px', color: '#3D3D3D', marginBottom: '8px' }}
            >
              Admin email
            </label>
            <input
              id="admin-email"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 14px',
                marginBottom: '16px',
                border: '1px solid #D6D0C4',
                borderRadius: '8px',
                fontFamily: 'var(--font-ui)',
                fontSize: '15px',
                boxSizing: 'border-box',
              }}
            />

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '14px 24px',
                backgroundColor: '#3D5A8C',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                fontFamily: 'var(--font-ui)',
                fontSize: '15px',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                transition: 'opacity 150ms ease',
              }}
            >
              {loading ? 'Sending…' : 'Send magic link'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
