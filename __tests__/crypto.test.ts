import { describe, it, expect } from 'vitest'
import { encrypt, decrypt, encryptEmail, decryptEmail, blindIndex, normalizeEmail } from '@/lib/crypto'

describe('crypto — AES-256-GCM encrypt/decrypt', () => {
  it('round-trips arbitrary text', () => {
    const plain = 'hello, world — üñîçödé 🌍'
    expect(decrypt(encrypt(plain))).toBe(plain)
  })

  it('produces different ciphertext each call (random IV) for the same input', () => {
    expect(encrypt('same')).not.toBe(encrypt('same'))
  })

  it('emits iv:tag:ciphertext (three hex fields)', () => {
    const parts = encrypt('x').split(':')
    expect(parts).toHaveLength(3)
    parts.forEach(p => expect(p).toMatch(/^[0-9a-f]+$/))
  })

  it('rejects a tampered ciphertext (auth tag)', () => {
    const enc = encrypt('secret')
    const tampered = enc.slice(0, -2) + (enc.slice(-2) === '00' ? '11' : '00')
    expect(() => decrypt(tampered)).toThrow()
  })

  it('throws on a malformed payload', () => {
    expect(() => decrypt('not-a-valid-payload')).toThrow(/Malformed/)
  })
})

describe('crypto — email helpers', () => {
  it('encryptEmail round-trips to the normalized email', () => {
    expect(decryptEmail(encryptEmail('  Alex.Smith@Example.COM '))).toBe('alex.smith@example.com')
  })

  it('normalizeEmail trims and lowercases', () => {
    expect(normalizeEmail('  Foo@BAR.com ')).toBe('foo@bar.com')
  })
})

describe('crypto — blind index', () => {
  it('is deterministic and case/whitespace-insensitive', () => {
    expect(blindIndex(' User@Example.com ')).toBe(blindIndex('user@example.com'))
  })

  it('is a 32-byte (64-char) hex string', () => {
    expect(blindIndex('a@b.com')).toMatch(/^[0-9a-f]{64}$/)
  })

  it('differs for different emails', () => {
    expect(blindIndex('a@b.com')).not.toBe(blindIndex('c@d.com'))
  })
})
