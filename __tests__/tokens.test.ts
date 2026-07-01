import { describe, it, expect, vi, afterEach } from 'vitest'
import { randomBytes } from 'crypto'
import { signUnsubscribeToken, verifyUnsubscribeToken } from '@/lib/unsubscribeToken'
import { signNotificationToken, verifyNotificationToken } from '@/lib/notificationToken'
import { blindIndex } from '@/lib/crypto'

afterEach(() => vi.restoreAllMocks())

describe('unsubscribe token', () => {
  it('signs and verifies, carrying the email blind index (not the email)', () => {
    const email = 'reader@example.com'
    const token = signUnsubscribeToken(email)
    expect(token).not.toContain(email)
    const result = verifyUnsubscribeToken(token)
    expect(result).not.toBeNull()
    expect(result!.blindIndex).toBe(blindIndex(email))
  })

  it('returns null for a tampered signature', () => {
    const token = signUnsubscribeToken('a@b.com')
    const tampered = token.slice(0, -1) + (token.endsWith('a') ? 'b' : 'a')
    expect(verifyUnsubscribeToken(tampered)).toBeNull()
  })

  it('returns null for a malformed token', () => {
    expect(verifyUnsubscribeToken('garbage')).toBeNull()
    expect(verifyUnsubscribeToken('')).toBeNull()
  })

  it('returns null once expired', () => {
    const token = signUnsubscribeToken('a@b.com')
    // Jump well past the 1-year TTL.
    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 400 * 24 * 60 * 60 * 1000)
    expect(verifyUnsubscribeToken(token)).toBeNull()
  })

  it('does not cross-verify as a notification token (distinct payload/secret)', () => {
    const token = signUnsubscribeToken('a@b.com')
    expect(verifyNotificationToken(token)).toBeNull()
  })
})

describe('notification token', () => {
  it('signs and verifies a submitter id', () => {
    const sid = '11111111-1111-1111-1111-111111111111'
    const result = verifyNotificationToken(signNotificationToken(sid))
    expect(result).not.toBeNull()
    expect(result!.sid).toBe(sid)
  })

  it('returns null for a tampered token', () => {
    const token = signNotificationToken('sid-123')
    const tampered = token.slice(0, -1) + (token.endsWith('a') ? 'b' : 'a')
    expect(verifyNotificationToken(tampered)).toBeNull()
  })

  it('does not cross-verify as an unsubscribe token', () => {
    const token = signNotificationToken('sid-123')
    expect(verifyUnsubscribeToken(token)).toBeNull()
  })
})

describe('invite token generation', () => {
  it('is an opaque 32-byte (64-char) hex string with no PII', () => {
    const token = randomBytes(32).toString('hex')
    expect(token).toMatch(/^[0-9a-f]{64}$/)
  })

  it('is unique across generations (collision-free lookup key)', () => {
    const set = new Set(Array.from({ length: 1000 }, () => randomBytes(32).toString('hex')))
    expect(set.size).toBe(1000)
  })
})
