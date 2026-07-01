'use client'

import { useState } from 'react'
import { track } from '@vercel/analytics/react'

const MAX_LENGTH = 1500
const WARN_LENGTH = 1400

type FormState = 'idle' | 'submitting' | 'success' | 'error'
type ModalState = 'hidden' | 'shown' | 'submitting' | 'done'

interface AnswerFormProps {
  questionId: string
  accentColour: string
  inviteRef?: string
}

export default function AnswerForm({ questionId, accentColour, inviteRef }: AnswerFormProps) {
  const [answerBody, setAnswerBody] = useState('')
  const [formState, setFormState] = useState<FormState>('idle')
  const [answerId, setAnswerId] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Email capture modal state
  const [modal, setModal] = useState<ModalState>('hidden')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [city, setCity] = useState('')
  const [subscribeChecked, setSubscribeChecked] = useState(true)
  const [modalError, setModalError] = useState<string | null>(null)

  const charCount = answerBody.length
  const isOverLimit = charCount > MAX_LENGTH
  const isNearLimit = charCount >= WARN_LENGTH && !isOverLimit
  const canSubmit = charCount > 0 && !isOverLimit && formState !== 'submitting'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return

    setFormState('submitting')
    setErrorMsg(null)

    try {
      const res = await fetch('/api/answers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId, answerBody, ref: inviteRef }),
      })
      const data = await res.json()

      if (!res.ok) {
        setErrorMsg(data.error ?? 'Something went wrong. Please try again.')
        setFormState('error')
        return
      }

      setAnswerId(data.id)
      setFormState('success')
      setModal('shown')
      track('answer_submitted')
    } catch {
      setErrorMsg('Connection error. Please try again.')
      setFormState('error')
    }
  }

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!subscribeChecked || !email.trim()) {
      setModal('done')
      return
    }

    setModal('submitting')
    setModalError(null)

    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          name: name.trim() || undefined,
          city: city.trim() || undefined,
          answerId,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setModalError(data.error ?? 'Failed to save. Please try again.')
        setModal('shown')
        return
      }

      setModal('done')
    } catch {
      setModalError('Connection error. Please try again.')
      setModal('shown')
    }
  }

  const handleDismissModal = () => setModal('done')

  const charColour = isOverLimit
    ? '#DC2626'
    : isNearLimit
    ? '#B8902A'
    : '#9A9A9A'

  // Success state + modal
  if (formState === 'success') {
    return (
      <div>
        {/* Confirmation message */}
        <div
          style={{
            padding: '32px',
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            borderLeft: `4px solid ${accentColour}`,
            boxShadow: '0 2px 8px rgba(26,26,46,0.08)',
            marginBottom: '24px',
          }}
        >
          <p
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '20px',
              fontWeight: 600,
              color: '#1A1A1A',
              marginBottom: '8px',
            }}
          >
            Your answer is in.
          </p>
          <p
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: '14px',
              color: '#6B6B6B',
              lineHeight: 1.6,
            }}
          >
            It&apos;s under review. Once approved it will appear on the browse page — sometimes within minutes.
          </p>
        </div>

        {/* Email capture modal */}
        {modal !== 'done' && (
          <div
            style={{
              padding: '32px',
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(26,26,46,0.08)',
            }}
          >
            <h2
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '18px',
                fontWeight: 700,
                color: '#1A1A1A',
                marginBottom: '8px',
              }}
            >
              Want to know when it&apos;s live?
            </h2>
            <p
              style={{
                fontFamily: 'var(--font-ui)',
                fontSize: '14px',
                color: '#6B6B6B',
                marginBottom: '24px',
                lineHeight: 1.6,
              }}
            >
              Leave your email and we&apos;ll let you know when your answer is published. We&apos;ll also send you the next question — one per month, no more.
            </p>

            {modalError && (
              <div style={{
                backgroundColor: '#FEF2F2',
                border: '1px solid #FCA5A5',
                borderRadius: '8px',
                padding: '10px 14px',
                marginBottom: '16px',
                fontFamily: 'var(--font-ui)',
                fontSize: '13px',
                color: '#DC2626',
              }}>
                {modalError}
              </div>
            )}

            <form onSubmit={handleSubscribe}>
              <div style={{ marginBottom: '16px' }}>
                <label style={labelStyle}>
                  Email <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  style={inputStyle}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                <div>
                  <label style={labelStyle}>First name <span style={optionalStyle}>optional</span></label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Alex"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>City <span style={optionalStyle}>optional</span></label>
                  <input
                    type="text"
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    placeholder="London"
                    style={inputStyle}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '24px' }}>
                <input
                  type="checkbox"
                  id="subscribe"
                  checked={subscribeChecked}
                  onChange={e => setSubscribeChecked(e.target.checked)}
                  style={{ marginTop: '2px', accentColor: accentColour, flexShrink: 0 }}
                />
                <label
                  htmlFor="subscribe"
                  style={{
                    fontFamily: 'var(--font-ui)',
                    fontSize: '13px',
                    color: '#3D3D3D',
                    lineHeight: 1.5,
                    cursor: 'pointer',
                  }}
                >
                  Send me the next question when it&apos;s live — one email per month. Unsubscribe any time.
                </label>
              </div>

              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <button
                  type="submit"
                  disabled={modal === 'submitting'}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: accentColour,
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '8px',
                    fontFamily: 'var(--font-ui)',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: modal === 'submitting' ? 'not-allowed' : 'pointer',
                    opacity: modal === 'submitting' ? 0.7 : 1,
                  }}
                >
                  {modal === 'submitting' ? 'Saving…' : 'Keep me posted'}
                </button>
                <button
                  type="button"
                  onClick={handleDismissModal}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontFamily: 'var(--font-ui)',
                    fontSize: '13px',
                    color: '#9A9A9A',
                    cursor: 'pointer',
                    padding: '12px 0',
                  }}
                >
                  No thanks
                </button>
              </div>
            </form>
          </div>
        )}

        {modal === 'done' && (
          <div style={{ textAlign: 'center', padding: '24px', color: '#6B6B6B', fontFamily: 'var(--font-ui)', fontSize: '14px' }}>
            <a
              href="/browse"
              style={{ color: accentColour, textDecoration: 'none', fontWeight: 600 }}
            >
              Browse other answers →
            </a>
          </div>
        )}
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ marginBottom: '8px' }}>
        <label
          htmlFor="answer"
          style={{
            display: 'block',
            fontFamily: 'var(--font-ui)',
            fontSize: '15px',
            fontWeight: 600,
            color: '#1A1A1A',
            marginBottom: '12px',
          }}
        >
          Your answer
        </label>
        <textarea
          id="answer"
          value={answerBody}
          onChange={e => setAnswerBody(e.target.value)}
          rows={8}
          placeholder="What&apos;s your honest answer?"
          disabled={formState === 'submitting'}
          style={{
            width: '100%',
            padding: '16px',
            fontFamily: 'var(--font-serif)',
            fontSize: '16px',
            lineHeight: 1.7,
            color: '#1A1A1A',
            backgroundColor: '#FFFFFF',
            border: `1px solid ${isOverLimit ? '#DC2626' : isNearLimit ? '#B8902A' : '#E0D9C8'}`,
            borderRadius: '12px',
            resize: 'vertical',
            outline: 'none',
            boxSizing: 'border-box',
            transition: 'border-color 150ms ease',
          }}
        />
      </div>

      {/* Character counter */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          marginBottom: '24px',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
            color: charColour,
            transition: 'color 150ms ease',
          }}
        >
          {charCount} / {MAX_LENGTH}
          {isOverLimit && ' — too long'}
          {isNearLimit && ' — almost there'}
        </span>
      </div>

      {errorMsg && (
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

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button
          type="submit"
          disabled={!canSubmit}
          style={{
            padding: '14px 32px',
            backgroundColor: canSubmit ? accentColour : '#E0D9C8',
            color: canSubmit ? '#FFFFFF' : '#9A9A9A',
            border: 'none',
            borderRadius: '8px',
            fontFamily: 'var(--font-ui)',
            fontSize: '15px',
            fontWeight: 600,
            cursor: canSubmit ? 'pointer' : 'not-allowed',
            transition: 'background-color 150ms ease, color 150ms ease',
          }}
        >
          {formState === 'submitting' ? 'Submitting…' : 'Submit answer'}
        </button>
        <span
          style={{
            fontFamily: 'var(--font-ui)',
            fontSize: '13px',
            color: '#9A9A9A',
          }}
        >
          Reviewed before publishing
        </span>
      </div>
    </form>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontFamily: 'var(--font-ui)',
  fontSize: '13px',
  fontWeight: 600,
  color: '#3D3D3D',
  marginBottom: '6px',
  letterSpacing: '0.02em',
}

const optionalStyle: React.CSSProperties = {
  fontWeight: 400,
  color: '#9A9A9A',
  marginLeft: '6px',
  fontSize: '12px',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  fontFamily: 'var(--font-ui)',
  fontSize: '14px',
  color: '#1A1A1A',
  backgroundColor: '#F8F3E9',
  border: '1px solid #E0D9C8',
  borderRadius: '8px',
  outline: 'none',
  boxSizing: 'border-box',
}
