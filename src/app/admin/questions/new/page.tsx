'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { ACCENTS } from '@/lib/palette'

export default function NewQuestionPage() {
  const router = useRouter()
  const [text, setText] = useState('')
  const [whisperLine, setWhisperLine] = useState('')
  const [accentColour, setAccentColour] = useState(ACCENTS[5].hex) // Indigo default
  const [loading, setLoading] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedId, setSavedId] = useState<string | null>(null)

  const saveDraft = async () => {
    if (!text.trim()) {
      setError('Question text is required')
      return
    }
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { data, error: saveError } = await supabase
      .from('questions')
      .insert({
        text: text.trim(),
        whisper_line: whisperLine.trim() || null,
        accent_colour: accentColour,
        status: 'draft',
      })
      .select('id')
      .single()

    if (saveError || !data) {
      setError(saveError?.message ?? 'Failed to save draft')
      setLoading(false)
      return
    }

    setSavedId(data.id)
    setLoading(false)
  }

  const publish = async () => {
    if (!savedId) {
      setError('Save as draft first')
      return
    }
    setPublishing(true)
    setError(null)

    const res = await fetch('/api/admin/questions/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionId: savedId }),
    })

    const json = await res.json()

    if (!res.ok) {
      setError(json.error ?? 'Publish failed')
      setPublishing(false)
      return
    }

    router.push('/admin')
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#F8F3E9',
        padding: '48px 24px',
      }}
    >
      <div style={{ maxWidth: '640px', margin: '0 auto' }}>
        <div style={{ marginBottom: '32px' }}>
          <a
            href="/admin"
            style={{ fontFamily: 'var(--font-ui)', fontSize: '13px', color: '#6B6B6B', textDecoration: 'none' }}
          >
            ← Dashboard
          </a>
          <h1
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '28px',
              fontWeight: 700,
              color: '#1A1A1A',
              marginTop: '16px',
              letterSpacing: '-0.02em',
            }}
          >
            New question
          </h1>
        </div>

        {error && (
          <div
            style={{
              backgroundColor: '#FEF2F2',
              border: '1px solid #FCA5A5',
              borderRadius: '8px',
              padding: '12px 16px',
              marginBottom: '24px',
              fontFamily: 'var(--font-ui)',
              fontSize: '14px',
              color: '#DC2626',
            }}
          >
            {error}
          </div>
        )}

        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '32px', boxShadow: '0 2px 8px rgba(26,26,46,0.08)' }}>
          {/* Question text */}
          <div style={{ marginBottom: '24px' }}>
            <label
              style={{
                display: 'block',
                fontFamily: 'var(--font-ui)',
                fontSize: '13px',
                fontWeight: 600,
                color: '#3D3D3D',
                marginBottom: '8px',
                letterSpacing: '0.02em',
              }}
            >
              Question <span style={{ color: '#DC2626' }}>*</span>
            </label>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              rows={4}
              placeholder="Curious if you'd rather know the truth or stay comfortable..."
              style={{
                width: '100%',
                padding: '12px 16px',
                fontFamily: 'var(--font-serif)',
                fontSize: '16px',
                lineHeight: 1.6,
                color: '#1A1A1A',
                backgroundColor: '#F8F3E9',
                border: '1px solid #E0D9C8',
                borderRadius: '8px',
                resize: 'vertical',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Whisper line */}
          <div style={{ marginBottom: '24px' }}>
            <label
              style={{
                display: 'block',
                fontFamily: 'var(--font-ui)',
                fontSize: '13px',
                fontWeight: 600,
                color: '#3D3D3D',
                marginBottom: '4px',
                letterSpacing: '0.02em',
              }}
            >
              Whisper line
              <span style={{ fontWeight: 400, color: '#9A9A9A', marginLeft: '8px' }}>Optional · max 80 chars</span>
            </label>
            <input
              type="text"
              value={whisperLine}
              onChange={e => setWhisperLine(e.target.value.slice(0, 80))}
              placeholder="A quieter, more personal framing..."
              style={{
                width: '100%',
                padding: '10px 16px',
                fontFamily: 'var(--font-serif)',
                fontStyle: 'italic',
                fontSize: '15px',
                color: '#1A1A1A',
                backgroundColor: '#F8F3E9',
                border: '1px solid #E0D9C8',
                borderRadius: '8px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#9A9A9A', marginTop: '4px', textAlign: 'right' }}>
              {whisperLine.length}/80
            </div>
          </div>

          {/* Accent colour */}
          <div style={{ marginBottom: '32px' }}>
            <label
              style={{
                display: 'block',
                fontFamily: 'var(--font-ui)',
                fontSize: '13px',
                fontWeight: 600,
                color: '#3D3D3D',
                marginBottom: '12px',
                letterSpacing: '0.02em',
              }}
            >
              Accent colour
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {ACCENTS.map(accent => (
                <button
                  key={accent.hex}
                  onClick={() => setAccentColour(accent.hex)}
                  title={accent.name}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    backgroundColor: accent.hex,
                    border: accentColour === accent.hex ? '3px solid #1A1A1A' : '3px solid transparent',
                    cursor: 'pointer',
                    outline: 'none',
                    transition: 'border-color 150ms ease',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                  }}
                  aria-label={accent.name}
                />
              ))}
            </div>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: '13px', color: '#6B6B6B', marginTop: '8px' }}>
              Selected: <span style={{ color: accentColour, fontWeight: 600 }}>
                {ACCENTS.find(a => a.hex === accentColour)?.name ?? accentColour}
              </span>
            </div>
          </div>

          {/* Preview */}
          {text && (
            <div
              style={{
                marginBottom: '32px',
                padding: '20px',
                backgroundColor: '#F8F3E9',
                borderRadius: '8px',
                borderLeft: `4px solid ${accentColour}`,
              }}
            >
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: '#9A9A9A', marginBottom: '8px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Preview</div>
              <p style={{ fontFamily: 'var(--font-serif)', fontSize: '16px', fontWeight: 600, color: '#1A1A1A', lineHeight: 1.4, marginBottom: whisperLine ? '6px' : 0 }}>
                {text}
              </p>
              {whisperLine && (
                <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '14px', color: 'rgba(26,26,26,0.55)' }}>
                  {whisperLine}
                </p>
              )}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={saveDraft}
              disabled={loading || !!savedId}
              style={{
                padding: '12px 24px',
                backgroundColor: 'transparent',
                color: '#3D3D3D',
                border: '2px solid #E0D9C8',
                borderRadius: '8px',
                fontFamily: 'var(--font-ui)',
                fontSize: '14px',
                fontWeight: 600,
                cursor: loading || !!savedId ? 'not-allowed' : 'pointer',
                opacity: loading || !!savedId ? 0.6 : 1,
              }}
            >
              {savedId ? '✓ Saved as draft' : loading ? 'Saving…' : 'Save as draft'}
            </button>

            {savedId && (
              <button
                onClick={publish}
                disabled={publishing}
                style={{
                  padding: '12px 24px',
                  backgroundColor: accentColour,
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '8px',
                  fontFamily: 'var(--font-ui)',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: publishing ? 'not-allowed' : 'pointer',
                  opacity: publishing ? 0.7 : 1,
                }}
              >
                {publishing ? 'Publishing…' : 'Publish → Feature now'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
