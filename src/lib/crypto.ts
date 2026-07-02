/**
 * AES-256-GCM email encryption + HMAC-SHA256 blind index helpers.
 *
 * PII (subscriber / nominee / submitter emails) must never be written to the
 * database in plaintext (AGENTS.md architecture decisions #3, #4).
 *
 *  - `encryptEmail` / `decryptEmail`   authenticated encryption at rest
 *  - `blindIndex`                       deterministic keyed hash for equality
 *                                       lookups (dedup, "already subscribed?")
 *                                       without decrypting every row
 *
 * Keys come from env and are validated on first use:
 *  - ENCRYPTION_KEY     32-byte (64 hex char) key for AES-256-GCM
 *  - BLIND_INDEX_SECRET 32-byte (64 hex char) key for HMAC-SHA256
 *
 * CRITICAL: neither key may be rotated after launch — doing so makes existing
 * ciphertext undecryptable / existing blind indexes unmatchable.
 */
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_BYTES = 12 // 96-bit nonce — the standard/most efficient size for GCM
const KEY_BYTES = 32 // AES-256
const FIELD_SEP = ':'

function requireHexKey(name: 'ENCRYPTION_KEY' | 'BLIND_INDEX_SECRET'): Buffer {
  const raw = process.env[name]
  if (!raw) {
    throw new Error(`${name} is not set — required for PII encryption`)
  }
  const key = Buffer.from(raw, 'hex')
  if (key.length !== KEY_BYTES) {
    throw new Error(
      `${name} must be a ${KEY_BYTES}-byte (${KEY_BYTES * 2}-char) hex string, got ${key.length} bytes`,
    )
  }
  return key
}

/**
 * Normalise an email before hashing/encrypting so lookups are consistent.
 * (Trim + lowercase — we intentionally do NOT do provider-specific
 * canonicalisation like stripping Gmail dots, to avoid surprising users.)
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

/**
 * Encrypt a plaintext string with AES-256-GCM.
 * Returns `iv:authTag:ciphertext`, all hex-encoded, safe to store in a text column.
 */
export function encrypt(plaintext: string): string {
  const key = requireHexKey('ENCRYPTION_KEY')
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return [iv.toString('hex'), authTag.toString('hex'), ciphertext.toString('hex')].join(FIELD_SEP)
}

/**
 * Decrypt a payload produced by `encrypt`. Throws if the payload is malformed
 * or the auth tag fails (tamper / wrong key).
 */
export function decrypt(payload: string): string {
  const key = requireHexKey('ENCRYPTION_KEY')
  const parts = payload.split(FIELD_SEP)
  if (parts.length !== 3) {
    throw new Error('Malformed ciphertext payload')
  }
  const [ivHex, authTagHex, ciphertextHex] = parts
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, 'hex'))
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'))
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextHex, 'hex')),
    decipher.final(),
  ]).toString('utf8')
}

/** Encrypt an email (normalised first so decrypt round-trips a canonical value). */
export function encryptEmail(email: string): string {
  return encrypt(normalizeEmail(email))
}

/** Decrypt an email produced by `encryptEmail`. */
export function decryptEmail(payload: string): string {
  return decrypt(payload)
}

/**
 * Deterministic keyed hash of an email for equality lookups (dedup / uniqueness)
 * without decryption. Same email always yields the same index; the secret key
 * prevents offline dictionary attacks against the stored hashes.
 */
export function blindIndex(email: string): string {
  const key = requireHexKey('BLIND_INDEX_SECRET')
  return createHmac('sha256', key).update(normalizeEmail(email)).digest('hex')
}

/**
 * Hash a high-entropy secret (e.g. an invite token) for storage/lookup so the
 * raw value never rests in the database. A plain SHA-256 is sufficient here
 * (unlike the keyed `blindIndex` for low-entropy emails): the token is a random
 * 32-byte value, so it is not brute-forceable from the stored hash. The raw
 * token still travels in the invite URL; only `hashToken(token)` is persisted,
 * and lookups compare against the hash of the incoming token.
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}
