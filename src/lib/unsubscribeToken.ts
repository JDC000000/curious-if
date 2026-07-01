// HMAC-signed, stateless unsubscribe token for subscriber list emails.
//
// The token carries the email BLIND INDEX (not the email) so unsubscribe links
// never contain email or any PII (AGENTS.md #4). The unsubscribe route verifies
// the signature, extracts the blind index, and finds the subscriber by it.
//
// Stateless (like notificationToken) so every email sender can mint a link from
// the recipient's address without a DB round-trip. Format: base64url(payload).hmac
// Payload: { bi: emailBlindIndex, exp: epochMs }

import { createHmac, timingSafeEqual } from 'crypto'
import { blindIndex } from '@/lib/crypto'

const TOKEN_TTL_MS = 365 * 24 * 60 * 60 * 1000 // 1 year — unsubscribe links must stay valid

function getSecret(): string {
  const s = process.env.UNSUBSCRIBE_JWT_SECRET
  if (!s) throw new Error('UNSUBSCRIBE_JWT_SECRET is not set')
  return s
}

/** Mint an opaque unsubscribe token for the given (plaintext) email address. */
export function signUnsubscribeToken(email: string): string {
  const payload = Buffer.from(
    JSON.stringify({ bi: blindIndex(email), exp: Date.now() + TOKEN_TTL_MS }),
  ).toString('base64url')
  const sig = createHmac('sha256', getSecret()).update(payload).digest('base64url')
  return `${payload}.${sig}`
}

/** Verify a token and return the email blind index, or null if invalid/expired. */
export function verifyUnsubscribeToken(token: string): { blindIndex: string } | null {
  try {
    const dot = token.lastIndexOf('.')
    if (dot === -1) return null

    const payload = token.slice(0, dot)
    const sig = token.slice(dot + 1)
    const expectedSig = createHmac('sha256', getSecret()).update(payload).digest('base64url')

    const sigBuf = Buffer.from(sig)
    const expBuf = Buffer.from(expectedSig)
    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) return null

    const data = JSON.parse(Buffer.from(payload, 'base64url').toString())
    if (typeof data.bi !== 'string') return null
    if (typeof data.exp !== 'number' || Date.now() > data.exp) return null

    return { blindIndex: data.bi }
  } catch {
    return null
  }
}
