// HMAC-signed token for nomination notification unsubscribe links.
// No external JWT library needed — uses Node.js crypto.
// Token format: base64url(payload).hmac_signature
// Payload: { sid: nominatorSubmitterId, exp: epochMs }

import { createHmac, timingSafeEqual } from 'crypto'

const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

function getSecret(): string {
  const s = process.env.UNSUBSCRIBE_JWT_SECRET
  if (!s) throw new Error('UNSUBSCRIBE_JWT_SECRET is not set')
  return s
}

export function signNotificationToken(nominatorSubmitterId: string): string {
  const payload = Buffer.from(
    JSON.stringify({ sid: nominatorSubmitterId, exp: Date.now() + TOKEN_TTL_MS }),
  ).toString('base64url')

  const sig = createHmac('sha256', getSecret()).update(payload).digest('base64url')
  return `${payload}.${sig}`
}

export function verifyNotificationToken(token: string): { sid: string } | null {
  try {
    const dot = token.lastIndexOf('.')
    if (dot === -1) return null

    const payload = token.slice(0, dot)
    const sig = token.slice(dot + 1)

    const secret = getSecret()
    const expectedSig = createHmac('sha256', secret).update(payload).digest('base64url')

    // Timing-safe comparison
    const sigBuf = Buffer.from(sig)
    const expBuf = Buffer.from(expectedSig)
    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) return null

    const data = JSON.parse(Buffer.from(payload, 'base64url').toString())
    if (typeof data.sid !== 'string') return null
    if (typeof data.exp !== 'number' || Date.now() > data.exp) return null

    return { sid: data.sid }
  } catch {
    return null
  }
}
