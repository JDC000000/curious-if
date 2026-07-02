import { describe, it, expect } from 'vitest'
import { encrypt, decrypt, encryptEmail, decryptEmail, blindIndex, normalizeEmail, hashToken } from '@/lib/crypto'

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

describe('crypto — invite token hashing (hashToken)', () => {
  it('is deterministic', () => {
    const token = 'a-raw-invite-token'
    expect(hashToken(token)).toBe(hashToken(token))
  })

  it('is a 32-byte (64-char) lowercase-hex string — the same shape as the raw ' +
     '32-byte token it replaces (see migration 012\'s comment on why that means ' +
     '"already hashed" can\'t be format-detected)', () => {
    expect(hashToken('some-raw-token')).toMatch(/^[0-9a-f]{64}$/)
  })

  it('differs for different tokens', () => {
    expect(hashToken('token-a')).not.toBe(hashToken('token-b'))
  })

  it('matches the standard SHA-256 test vector for "abc" — pins the exact ' +
     'algorithm + encoding (SHA-256, lowercase hex) that ' +
     'supabase/migrations/012_hash_existing_nomination_tokens.sql\'s ' +
     '`encode(digest(token::bytea, \'sha256\'), \'hex\')` must reproduce for any ' +
     'pre-existing raw token to stay matchable after that migration runs. Full ' +
     'cross-system (Node vs. Postgres pgcrypto) equivalence for this exact byte ' +
     'encoding was additionally verified live, in a rolled-back transaction ' +
     'against the real database, before the migration was written — see ' +
     'changelog.md.', () => {
    expect(hashToken('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
    )
  })
})
