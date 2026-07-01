'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'

type State = 'confirm' | 'loading' | 'done' | 'already' | 'error'

function UnsubscribeForm() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email') ?? ''
  const isNotifications = searchParams.get('notifications') === '1'
  const [state, setState] = useState<State>(isNotifications ? 'done' : 'confirm')

  // Auto-process if arriving from a one-click unsubscribe link
  const handleUnsubscribe = async () => {
    if (!email) {
      setState('error')
      return
    }
    setState('loading')
    try {
      const res = await fetch('/api/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (res.ok) {
        setState('done')
      } else {
        setState('error')
      }
    } catch {
      setState('error')
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
      <div style={{ maxWidth: '480px', width: '100%', textAlign: 'center' }}>

        {/* Wordmark */}
        <Link
          href="/"
          style={{
            display: 'inline-block',
            fontFamily: 'var(--font-serif)',
            fontStyle: 'italic',
            fontSize: '22px',
            fontWeight: 400,
            color: '#1A1A1A',
            textDecoration: 'none',
            marginBottom: '48px',
          }}
        >
          curious if
        </Link>

        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            padding: '48px 40px',
            boxShadow: '0 4px 24px rgba(26,26,46,0.08)',
          }}
        >
          {state === 'confirm' && (
            <>
              <p
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '20px',
                  fontWeight: 700,
                  color: '#1A1A1A',
                  marginBottom: '12px',
                  letterSpacing: '-0.01em',
                }}
              >
                Unsubscribe
              </p>
              {email ? (
                <p
                  style={{
                    fontFamily: 'var(--font-ui)',
                    fontSize: '15px',
                    color: '#6B6B6B',
                    lineHeight: 1.6,
                    marginBottom: '32px',
                  }}
                >
                  Remove <strong style={{ color: '#3D3D3D' }}>{email}</strong> from the curious if list.
                  You won't hear from us again.
                </p>
              ) : (
                <p style={{ fontFamily: 'var(--font-ui)', fontSize: '15px', color: '#DC2626', marginBottom: '32px' }}>
                  No email address found. Try clicking the unsubscribe link in the email again.
                </p>
              )}
              <button
                onClick={handleUnsubscribe}
                disabled={!email}
                style={{
                  width: '100%',
                  padding: '14px 24px',
                  backgroundColor: email ? '#1A1A1A' : '#E0D9C8',
                  color: email ? '#F8F3E9' : '#9A9A9A',
                  border: 'none',
                  borderRadius: '8px',
                  fontFamily: 'var(--font-ui)',
                  fontSize: '15px',
                  fontWeight: 600,
                  cursor: email ? 'pointer' : 'not-allowed',
                  marginBottom: '16px',
                }}
              >
                Yes, unsubscribe me
              </button>
              <Link
                href="/"
                style={{
                  display: 'block',
                  fontFamily: 'var(--font-ui)',
                  fontSize: '14px',
                  color: '#9A9A9A',
                  textDecoration: 'none',
                }}
              >
                Actually, keep me subscribed
              </Link>
            </>
          )}

          {state === 'loading' && (
            <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '18px', color: '#6B6B6B' }}>
              Removing you…
            </p>
          )}

          {state === 'done' && (
            <>
              <p
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '22px',
                  fontWeight: 700,
                  color: '#1A1A1A',
                  marginBottom: '12px',
                  letterSpacing: '-0.01em',
                }}
              >
                Done.
              </p>
              <p
                style={{
                  fontFamily: 'var(--font-ui)',
                  fontSize: '15px',
                  color: '#6B6B6B',
                  lineHeight: 1.6,
                  marginBottom: '32px',
                }}
              >
                {isNotifications
                  ? "You won't receive notifications when someone you invited answers."
                  : `${email} has been removed. You won't hear from us again.`}
              </p>
              <Link
                href="/"
                style={{
                  fontFamily: 'var(--font-ui)',
                  fontSize: '14px',
                  color: '#9A9A9A',
                  textDecoration: 'none',
                }}
              >
                Back to curious if →
              </Link>
            </>
          )}

          {state === 'error' && (
            <>
              <p
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '20px',
                  fontWeight: 700,
                  color: '#1A1A1A',
                  marginBottom: '12px',
                }}
              >
                Something went wrong
              </p>
              <p
                style={{
                  fontFamily: 'var(--font-ui)',
                  fontSize: '15px',
                  color: '#6B6B6B',
                  lineHeight: 1.6,
                  marginBottom: '32px',
                }}
              >
                Reply to any email from us with "unsubscribe" and we'll remove you immediately.
              </p>
              <button
                onClick={handleUnsubscribe}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#1A1A1A',
                  color: '#F8F3E9',
                  border: 'none',
                  borderRadius: '8px',
                  fontFamily: 'var(--font-ui)',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Try again
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function UnsubscribePage() {
  return (
    <Suspense>
      <UnsubscribeForm />
    </Suspense>
  )
}
