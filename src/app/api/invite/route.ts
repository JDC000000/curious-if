import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { createAdminClient } from '@/lib/supabase/server'
import { blindIndex, encryptEmail } from '@/lib/crypto'
import { signUnsubscribeToken } from '@/lib/unsubscribeToken'
import { escapeHtml } from '@/lib/escapeHtml'
import { rateGuard } from '@/lib/rateLimit'

async function sendInviteEmail({
  nomineeEmail,
  personalNote,
  questionText,
  inviteToken,
}: {
  nomineeEmail: string
  personalNote?: string
  questionText: string
  inviteToken: string
}) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return

  // Opaque 32-byte token in the URL — never the nominee email or a guessable id.
  const answerUrl = `https://curiousif.blog/answer?ref=${inviteToken}`
  const unsubscribeUrl = `https://curiousif.blog/unsubscribe?token=${signUnsubscribeToken(nomineeEmail)}`

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Someone thought of you</title>
</head>
<body style="margin:0;padding:0;background-color:#F8F3E9;font-family:Georgia,'Times New Roman',serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F8F3E9;">
    <tr>
      <td align="center" style="padding:48px 24px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;">

          <tr>
            <td style="padding-bottom:40px;">
              <span style="font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:20px;color:#1A1A1A;">
                curious if
              </span>
            </td>
          </tr>

          <tr>
            <td style="background-color:#FFFFFF;border-radius:12px;padding:40px 40px 48px;box-shadow:0 2px 12px rgba(26,26,46,0.07);">

              <p style="font-family:Georgia,serif;font-size:16px;line-height:1.7;color:#1A1A1A;margin:0 0 20px;">
                Someone thought you had something worth saying.
              </p>

              <p style="font-family:Georgia,serif;font-size:16px;line-height:1.7;color:#1A1A1A;margin:0 0 24px;">
                This month's question:
              </p>

              <div style="border-left:3px solid #1A1A1A;padding:16px 20px;margin:0 0 24px;background-color:#F8F3E9;border-radius:0 8px 8px 0;">
                <p style="font-family:Georgia,serif;font-style:italic;font-size:18px;font-weight:600;line-height:1.4;color:#1A1A1A;margin:0;">
                  ${escapeHtml(questionText)}
                </p>
              </div>

              ${personalNote ? `
              <p style="font-family:Georgia,serif;font-size:15px;line-height:1.7;color:#6B6B6B;font-style:italic;margin:0 0 24px;">
                They left you a note: &ldquo;${escapeHtml(personalNote)}&rdquo;
              </p>
              ` : ''}

              <p style="font-family:Georgia,serif;font-size:16px;line-height:1.7;color:#1A1A1A;margin:0 0 32px;">
                No account needed. It takes two minutes.
              </p>

              <a
                href="${answerUrl}"
                style="display:inline-block;padding:14px 28px;background-color:#1A1A1A;color:#F8F3E9;text-decoration:none;border-radius:8px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:600;"
              >
                Write your answer →
              </a>
            </td>
          </tr>

          <tr>
            <td style="padding-top:32px;">
              <p style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#9A9A9A;margin:0;line-height:1.6;">
                One question per month at <a href="https://curiousif.blog" style="color:#9A9A9A;">curiousif.blog</a>.
                <br />
                <a href="${unsubscribeUrl}" style="color:#9A9A9A;">Don't want invitations like this?</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  const text = `Someone thought you had something worth saying.

This month's question: ${questionText}
${personalNote ? `\nThey left you a note: "${personalNote}"\n` : ''}
No account needed. It takes two minutes.

Write your answer: ${answerUrl}

—
curious if · curiousif.blog
${unsubscribeUrl}`

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'curious if <hello@curiousif.blog>',
      reply_to: 'hello@curiousif.blog',
      to: nomineeEmail,
      subject: 'Someone thought you had something to say',
      html,
      text,
      headers: {
        'List-Unsubscribe': `<${unsubscribeUrl}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    }),
  }).catch(err => console.warn('Invite email failed:', err))
}

export async function POST(request: NextRequest) {
  // 1 invite per IP per 5 minutes
  const limited = await rateGuard(request, 'invite', 1, 300)
  if (limited) return limited

  let body: { nomineeEmail?: string; personalNote?: string; nominatorName?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { nomineeEmail, personalNote, nominatorName } = body

  if (!nomineeEmail || typeof nomineeEmail !== 'string' || !nomineeEmail.includes('@')) {
    return NextResponse.json({ error: 'Valid nominee email required' }, { status: 400 })
  }

  // Server-side length cap — do not trust the client's 200-char limit.
  const note = typeof personalNote === 'string' ? personalNote.trim().slice(0, 200) || null : null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createAdminClient() as any

  // Get the current featured question
  const { data: question } = await supabase
    .from('questions')
    .select('id, text')
    .eq('status', 'spotlight')
    .single()

  if (!question) {
    return NextResponse.json({ error: 'No active question' }, { status: 404 })
  }

  // Opaque 32-byte invite token (64-char hex) — stored, mapped to this nomination.
  const inviteToken = randomBytes(32).toString('hex')

  // Create nomination — nominee email is encrypted at rest; blind index enables
  // the reciprocal-answer lookup without storing plaintext.
  const { data: nomination, error } = await supabase
    .from('nominations')
    .insert({
      question_id: question.id,
      nominee_email_encrypted: encryptEmail(nomineeEmail),
      blind_index_email: blindIndex(nomineeEmail),
      personal_note: note,
      token: inviteToken,
    })
    .select('id')
    .single()

  if (error || !nomination) {
    console.error('Nomination insert error:', error)
    return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 })
  }

  // Send invite email (fire-and-forget)
  void sendInviteEmail({
    nomineeEmail,
    personalNote: note ?? undefined,
    questionText: question.text,
    inviteToken,
  })

  return NextResponse.json({ success: true })
}
