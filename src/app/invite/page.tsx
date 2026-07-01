'use client'

import { useState } from 'react'
import { track } from '@vercel/analytics/react'
import SiteNav from '@/components/SiteNav'
import HomeSubscribeStrip from '@/components/HomeSubscribeStrip'
import Link from 'next/link'

type State = 'idle' | 'sending' | 'sent' | 'error'

export default function InvitePage() {
  const [email, setEmail] = useState('')
  const [note, setNote] = useState('')
  const [state, setState] = useState<State>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setState('sending')
    setErrorMsg('')

    try {
      const res = await fetch('/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nomineeEmail: email.trim(),
          personalNote: note.trim() || undefined,
        }),
      })

      if (res.ok) {
        setState('sent')
        track('nomination_sent')
      } else {
        const data = await res.json()
        setErrorMsg(data.error ?? 'Something went wrong.')
        setState('error')
      }
    } catch {
      setErrorMsg('Could not send. Please try again.')
      setState('error')
    }
  }

  return (
    <>
      <SiteNav />
      <main
        style={{
          maxWidth: '560px',
          margin: '0 auto',
          padding: '64px 24px',
          minHeight: 'calc(100vh - 56px)',
        }}
      >
        {state === 'sent' ? (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <div
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '32px',
                fontStyle: 'italic',
                color: '#1A1A1A',
                marginBottom: '16px',
              }}
            >
              Sent.
            </div>
            <p
              style={{
                fontFamily: 'var(--font-ui)',
                fontSize: '16px',
                color: '#6B6B6B',
                lineHeight: 1.6,
                marginBottom: '40px',
              }}
            >
              They&apos;ll get the question and a note to write their answer.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => { setState('idle'); setEmail(''); setNote('') }}
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
                Invite someone else
              </button>
              <Link
                href="/browse"
                style={{
                  padding: '12px 24px',
                  backgroundColor: 'transparent',
                  color: '#6B6B6B',
                  border: '1px solid #E0D9C8',
                  borderRadius: '8px',
                  fontFamily: 'var(--font-ui)',
                  fontSize: '14px',
                  fontWeight: 600,
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                }}
              >
                Browse answers
              </Link>
            </div>

            {/* Subscribe strip — the person sending the invite may want in too */}
            <div style={{ marginTop: '48px', paddingTop: '32px', borderTop: '1px solid #E0D9C8' }}>
              <p style={{
                fontFamily: 'var(--font-serif)',
                fontStyle: 'italic',
                fontSize: '15px',
                color: '#6B6B6B',
                marginBottom: '16px',
              }}>
                Want next month&apos;s question in your inbox too?
              </p>
              <HomeSubscribeStrip accentColour="#1A1A1A" />
            </div>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: '48px' }}>
              <h1
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: 'clamp(24px, 4vw, 36px)',
                  fontWeight: 700,
                  letterSpacing: '-0.02em',
                  color: '#1A1A1A',
                  marginBottom: '12px',
                  lineHeight: 1.25,
                }}
              >
                Invite a friend
              </h1>
              <p
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontStyle: 'italic',
                  fontSize: '17px',
                  color: '#6B6B6B',
                  lineHeight: 1.6,
                }}
              >
                Know someone whose answer you&apos;d want to read? Send them this month&apos;s question.
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '24px' }}>
                <label
                  htmlFor="nominee-email"
                  style={{
                    display: 'block',
                    fontFamily: 'var(--font-ui)',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#3D3D3D',
                    marginBottom: '8px',
                    letterSpacing: '0.01em',
                  }}
                >
                  Their email <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <input
                  id="nominee-email"
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="friend@example.com"
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    border: '1.5px solid #E0D9C8',
                    borderRadius: '8px',
                    fontFamily: 'var(--font-ui)',
                    fontSize: '15px',
                    color: '#1A1A1A',
                    backgroundColor: '#FFFFFF',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ marginBottom: '32px' }}>
                <label
                  htmlFor="personal-note"
                  style={{
                    display: 'block',
                    fontFamily: 'var(--font-ui)',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#3D3D3D',
                    marginBottom: '8px',
                    letterSpacing: '0.01em',
                  }}
                >
                  Personal note{' '}
                  <span style={{ fontWeight: 400, color: '#9A9A9A' }}>optional</span>
                </label>
                <textarea
                  id="personal-note"
                  value={note}
                  onChange={e => setNote(e.target.value.slice(0, 200))}
                  placeholder="I thought of you when I read this…"
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    border: '1.5px solid #E0D9C8',
                    borderRadius: '8px',
                    fontFamily: 'var(--font-serif)',
                    fontSize: '15px',
                    color: '#1A1A1A',
                    backgroundColor: '#FFFFFF',
                    outline: 'none',
                    resize: 'vertical',
                    boxSizing: 'border-box',
                    lineHeight: 1.6,
                  }}
                />
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    color: note.length > 180 ? '#DC2626' : '#9A9A9A',
                    textAlign: 'right',
                    marginTop: '4px',
                  }}
                >
                  {note.length}/200
                </div>
              </div>

              {state === 'error' && (
                <div
                  style={{
                    backgroundColor: '#FEF2F2',
                    border: '1px solid #FCA5A5',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    marginBottom: '20px',
                    fontFamily: 'var(--font-ui)',
                    fontSize: '14px',
                    color: '#DC2626',
                  }}
                >
                  {errorMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={!email.trim() || state === 'sending'}
                style={{
                  width: '100%',
                  padding: '16px 24px',
                  backgroundColor: '#1A1A1A',
                  color: '#F8F3E9',
                  border: 'none',
                  borderRadius: '8px',
                  fontFamily: 'var(--font-ui)',
                  fontSize: '15px',
                  fontWeight: 600,
                  cursor: !email.trim() || state === 'sending' ? 'not-allowed' : 'pointer',
                  opacity: !email.trim() || state === 'sending' ? 0.6 : 1,
                  transition: 'opacity 150ms ease',
                }}
              >
                {state === 'sending' ? 'Sending…' : 'Send invitation'}
              </button>
            </form>
          </>
        )}
      </main>
    </>
  )
}
