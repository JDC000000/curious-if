import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { isAdminEmail } from '@/lib/adminAuth'
import { blindIndex } from '@/lib/crypto'

/**
 * Admin-only GDPR right-to-erasure endpoint (minimal v1).
 *
 * Given an email, computes its blind index and removes that person's PII across
 * every table that stores it, keyed by the deterministic blind index (never by
 * plaintext). Deletion order respects foreign keys:
 *   1. subscribers   (references submitters.id)
 *   2. submitters    (answers.submitter_id is ON DELETE SET NULL — answers stay
 *                     visible but become anonymous, per AGENTS.md #5 / decisions.md)
 *   3. nominations   (nominee-side PII; not referenced by other tables)
 *
 * This is intentionally admin-triggered, not a public self-service flow — a
 * self-service erasure UX is a v2 product decision, not made here.
 *
 * NOTE (flagged for operator): this does NOT scrub `answers.author_attribution`
 * (freeform text a visitor chose to publicly sign their answer with) — that is
 * deliberate public content, and the documented design keeps answers visible
 * after erasure. Scrubbing it is a separate product call.
 */
export async function POST(request: NextRequest) {
  // Authorisation: valid session AND the curator (defense-in-depth on top of the
  // proxy middleware that already guards /api/admin/*; see decisions.md H-1).
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!isAdminEmail(user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: { email?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const email = typeof body.email === 'string' ? body.email.trim() : ''
  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'A valid email is required' }, { status: 400 })
  }

  // Deterministic blind index — same value for this email everywhere it is stored.
  const bi = blindIndex(email)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any

  // 1. subscribers (delete first — FK reference to submitters)
  const { data: delSubs, error: subsErr } = await admin
    .from('subscribers')
    .delete()
    .eq('email_blind_index', bi)
    .select('id')
  if (subsErr) {
    console.error(`GDPR erase: subscribers delete failed: ${subsErr.message}`)
    return NextResponse.json({ error: 'Erasure failed (subscribers)' }, { status: 500 })
  }

  // 2. submitters (answers.submitter_id -> SET NULL, anonymising their answers)
  const { data: delSubmitters, error: submittersErr } = await admin
    .from('submitters')
    .delete()
    .eq('email_blind_index', bi)
    .select('id')
  if (submittersErr) {
    console.error(`GDPR erase: submitters delete failed: ${submittersErr.message}`)
    return NextResponse.json({ error: 'Erasure failed (submitters)' }, { status: 500 })
  }

  // 3. nominations (nominee email PII — note the column is blind_index_email here)
  const { data: delNoms, error: nomsErr } = await admin
    .from('nominations')
    .delete()
    .eq('blind_index_email', bi)
    .select('id')
  if (nomsErr) {
    console.error(`GDPR erase: nominations delete failed: ${nomsErr.message}`)
    return NextResponse.json({ error: 'Erasure failed (nominations)' }, { status: 500 })
  }

  const erased = {
    subscribers: delSubs?.length ?? 0,
    submitters: delSubmitters?.length ?? 0,
    nominations: delNoms?.length ?? 0,
  }
  // No PII in the response — only per-table counts.
  return NextResponse.json({ success: true, erased })
}
