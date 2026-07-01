'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ACCENTS } from '@/lib/palette'
import { Suspense } from 'react'

function NewQuestionForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const editId = searchParams.get('edit')
  const isEdit = !!editId

  const [text, setText] = useState('')
  const [whisperLine, setWhisperLine] = useState('')
  const [accentColour, setAccentColour] = useState(ACCENTS[5].hex)
  const [loading, setLoading] = useState(false)
  const [loadingEdit, setLoadingEdit] = useState(isEdit)
  const [publishing, setPublishing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedId, setSavedId] = useState<string | null>(isEdit ? editId : null)
  const [saved, setSaved] = useState(false)

  // Load existing draft when in edit mode
  useEffect(() => {
    if (!editId) return
    // loadingEdit is already initialised to true when editId is present (see useState above)
    fetch(`/api/admin/questions?id=${editId}`)
      .then(r => r.json())
      .then(data => {
        if (data.text) setText(data.text)
        if (data.whisper_line) setWhisperLine(data.whisper_line)
        if (data.accent_colour) setAccentColour(data.accent_colour)
      })
      .catch(() => setError('Failed to load question'))
      .finally(() => setLoadingEdit(false))
  }, [editId])

  const saveDraft = async () => {
    if (!text.trim()) {
      setError('Question text is required')
      return
    }
    setLoading(true)
    setError(null)
    setSaved(false)

    const method = isEdit ? 'PATCH' : 'POST'
    const body = isEdit
      ? { id: editId, text: text.trim(), whisper_line: whisperLine.trim() || null, accent_colour: accentColour }
      : { text: text.trim(), whisper_line: whisperLine.trim() || null, accent_colour: accentColour, status: 'draft' }

    const res = await fetch('/api/admin/questions', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const json = await res.json()

    if (!res.ok) {
      setError(json.error ?? 'Failed to save draft')
      setLoading(false)
      return
    }

    if (!isEdit) setSavedId(json.id)
    setSaved(true)
    setLoading(false)
  }

  const publish = async () => {
    const id = savedId ?? editId
    if (!id) {
      setError('Save as draft first')
      return
    }
    setPublishing(true)
    setError(null)

    const res = await fetch('/api/admin/questions/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionId: id }),
    })

    const json = await res.json()

    if (!res.ok) {
      setError(json.error ?? 'Publish failed')
      setPublishing(false)
      return
    }

    router.push('/admin/questions')
  }

  if (loadingEdit) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#F8F3E9', padding: '48px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '18px', color: '#9A9A9A' }}>Loading…</p>
      </div>
    )
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
            href="/admin/questions"
            style={{ fontFamily: 'var(--font-ui)', fontSize: '13px', color: '#6B6B6B', textDecoration: 'none' }}
          >
            ← Questions
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
            {isEdit ? 'Edit question' : 'New question'}
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
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button
              onClick={saveDraft}
              disabled={loading}
              style={{
                padding: '12px 24px',
                backgroundColor: 'transparent',
                color: saved ? '#2E6B45' : '#3D3D3D',
                border: `2px solid ${saved ? '#2E6B45' : '#E0D9C8'}`,
                borderRadius: '8px',
                fontFamily: 'var(--font-ui)',
                fontSize: '14px',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
                transition: 'color 150ms ease, border-color 150ms ease',
              }}
            >
              {loading ? 'Saving…' : saved ? '✓ Saved' : isEdit ? 'Save changes' : 'Save as draft'}
            </button>

            {(savedId || isEdit) && (
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

export default function NewQuestionPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', backgroundColor: '#F8F3E9', padding: '48px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '18px', color: '#9A9A9A' }}>Loading…</p>
      </div>
    }>
      <NewQuestionForm />
    </Suspense>
  )
}
