import { NextRequest, NextResponse, after } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { sendAnswerLiveEmail } from '@/lib/answerLiveEmail'
import { rateGuard } from '@/lib/rateLimit'
import { triggerReciprocalNotification } from '@/lib/reciprocalNotification'
import { encrypt, encryptEmail, blindIndex } from '@/lib/crypto'
import { signUnsubscribeToken } from '@/lib/unsubscribeToken'
import { escapeHtml } from '@/lib/escapeHtml'

async function addToResendContacts(email: string, name?: string) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return

  try {
    await fetch('https://api.resend.com/contacts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        first_name: name ?? undefined,
        unsubscribed: false,
      }),
    })
  } catch (err) {
    console.warn('Resend Contacts API failed:', err)
  }
}

async function sendWelcomeEmail(email: string, name?: string) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return

  const firstName = name?.split(' ')[0] ?? null
  const unsubscribeUrl = `https://curiousif.blog/unsubscribe?token=${signUnsubscribeToken(email)}`

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'curious if <hello@curiousif.blog>',
        reply_to: 'hello@curiousif.blog',
        to: email,
        subject: "You're in — curious if",
        text: welcomeEmailText(firstName, unsubscribeUrl),
        html: welcomeEmailHtml(firstName, unsubscribeUrl),
        headers: {
          'List-Unsubscribe': `<${unsubscribeUrl}>, <mailto:hello@curiousif.blog?subject=unsubscribe>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      }),
    })
    if (!res.ok) {
      const err = await res.text()
      console.warn('Welcome email failed:', res.status, err)
    }
  } catch (err) {
    console.warn('Welcome email fetch failed:', err)
  }
}

function welcomeEmailText(firstName: string | null, unsubscribeUrl: string): string {
  const greeting = firstName ? `Hi ${firstName},` : 'Hi,'
  return `${greeting}

You answered a question. That already says something.

Once a month, one question arrives here — no noise, no algorithm, nothing else. Just something worth sitting with for a while.

You'll hear from us when the next one lands.

Browse answers: https://curiousif.blog/browse

—
curious if · curiousif.blog
To unsubscribe: ${unsubscribeUrl}`
}

function welcomeEmailHtml(firstName: string | null, unsubscribeUrl: string): string {
  const greeting = firstName ? `Hi ${escapeHtml(firstName)},` : 'Hi,'

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>you're in.</title>
</head>
<body style="margin:0;padding:0;background-color:#F8F3E9;font-family:Georgia,'Times New Roman',serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F8F3E9;">
    <tr>
      <td align="center" style="padding:48px 24px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;">

          <!-- Wordmark -->
          <tr>
            <td style="padding-bottom:40px;">
              <span style="font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:20px;font-weight:400;color:#1A1A1A;letter-spacing:-0.01em;">
                curious if
              </span>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background-color:#FFFFFF;border-radius:12px;padding:40px 40px 48px;box-shadow:0 2px 12px rgba(26,26,46,0.07);">

              <p style="font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.7;color:#1A1A1A;margin:0 0 20px;">
                ${greeting}
              </p>

              <p style="font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.7;color:#1A1A1A;margin:0 0 20px;">
                You answered a question. That already says something.
              </p>

              <p style="font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.7;color:#1A1A1A;margin:0 0 20px;">
                Once a month, one question arrives here — no noise, no algorithm, nothing else. Just something worth sitting with for a while.
              </p>

              <p style="font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.7;color:#1A1A1A;margin:0 0 32px;">
                You'll hear from us when the next one lands.
              </p>

              <!-- Divider -->
              <div style="height:1px;background-color:#E8E0CC;margin-bottom:32px;"></div>

              <!-- CTA -->
              <p style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#6B6B6B;margin:0 0 16px;">
                In the meantime, see what others said:
              </p>
              <a
                href="https://curiousif.blog/browse"
                style="display:inline-block;padding:12px 24px;background-color:#1A1A1A;color:#F8F3E9;text-decoration:none;border-radius:8px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:600;letter-spacing:0.01em;"
              >
                Browse answers
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top:32px;">
              <p style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#6E6E6E;margin:0;line-height:1.6;">
                You're receiving this because you subscribed at
                <a href="https://curiousif.blog" style="color:#6E6E6E;">curiousif.blog</a>.
                <br />
                <a href="${unsubscribeUrl}" style="color:#6E6E6E;">Unsubscribe</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export async function POST(request: NextRequest) {
  // 3 subscribe attempts per IP per hour
  const limited = await rateGuard(request, 'subscribe', 3, 3600)
  if (limited) return limited

  let body: { email?: string; name?: string; city?: string; answerId?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { email, name, city, answerId } = body

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
  }

  const supabase = createAdminClient()
  // Deterministic keyed hash — used for dedup/lookup without storing plaintext email.
  const emailBlindIndex = blindIndex(email)

  // Check if this is a new subscriber (before upsert) — look up by blind index
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (supabase as any)
    .from('subscribers')
    .select('id')
    .eq('email_blind_index', emailBlindIndex)
    .maybeSingle()

  const isNewSubscriber = !existing

  // Upsert submitter row — email/name/city encrypted at rest (AES-256-GCM),
  // deduped by the email blind index.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: submitter, error: submitterError } = await (supabase as any)
    .from('submitters')
    .upsert(
      {
        email_encrypted: encryptEmail(email),
        email_blind_index: emailBlindIndex,
        name_encrypted: name ? encrypt(name) : null,
        city_encrypted: city ? encrypt(city) : null,
        subscribed: true,
      },
      { onConflict: 'email_blind_index', ignoreDuplicates: false }
    )
    .select('id')
    .single()

  if (submitterError || !submitter) {
    console.error('Submitter upsert error:', submitterError)
    return NextResponse.json({ error: 'Failed to save subscriber' }, { status: 500 })
  }

  // Upsert subscriber row — email encrypted, deduped by blind index
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('subscribers')
    .upsert(
      {
        submitter_id: submitter.id,
        email_encrypted: encryptEmail(email),
        email_blind_index: emailBlindIndex,
        unsubscribed_at: null,
      },
      { onConflict: 'email_blind_index', ignoreDuplicates: false }
    )

  // Link submitter to the answer they just submitted
  // Also check if the answer auto-approved before they entered their email
  let answerAlreadyApproved = false
  if (answerId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: answerData } = await (supabase as any)
      .from('answers')
      .select('id, body, status, question:questions(text, published_at)')
      .eq('id', answerId)
      .single()

    // Link submitter if not already linked
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('answers')
      .update({ submitter_id: submitter.id })
      .eq('id', answerId)
      .is('submitter_id', null)

    // If auto-approve already ran, fire the "answer is live" email now
    if (answerData?.status === 'approved') {
      answerAlreadyApproved = true
      // after() keeps the serverless invocation alive until the send completes — a bare
      // fire-and-forget is killed when the function returns on Vercel (same failure mode
      // + fix as /api/invite and the /api/answers moderation trigger).
      after(async () => {
        await sendAnswerLiveEmail(
          email,
          name ?? null,
          answerId,
          answerData.body,
          answerData.question?.text ?? '',
          answerData.question?.published_at ?? null,
        )
      })
    }
  }

  // Add to Resend Contacts — after() so it survives the response returning.
  after(async () => {
    await addToResendContacts(email, name)
  })

  // Send welcome email only to new subscribers who don't have an answer live yet
  // (if their answer is already live, that email replaces the welcome context)
  if (isNewSubscriber && !answerAlreadyApproved) {
    after(async () => {
      await sendWelcomeEmail(email, name)
    })
  }

  // Reciprocal notification — if this person was nominated for this question,
  // notify the nominator they answered. Fire-and-forget.
  if (answerId) {
    after(async () => {
      await triggerReciprocalNotification(email, answerId, name ?? null)
    })
  }

  return NextResponse.json({ success: true })
}
