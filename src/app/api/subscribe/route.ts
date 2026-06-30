import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

async function addToResendContacts(email: string, name?: string) {
  if (!process.env.RESEND_API_KEY) return

  try {
    await fetch('https://api.resend.com/contacts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        first_name: name ?? undefined,
        unsubscribed: false,
      }),
    })
  } catch (err) {
    // Non-fatal — subscriber is in Supabase even if Resend fails
    console.warn('Resend Contacts API failed:', err)
  }
}

async function sendWelcomeEmail(email: string, name?: string) {
  if (!process.env.RESEND_API_KEY) return

  const firstName = name?.split(' ')[0] ?? null

  try {
    await resend.emails.send({
      from: 'curious if <hello@curiousif.blog>',
      to: email,
      subject: "you're in.",
      html: welcomeEmailHtml(firstName),
    })
  } catch (err) {
    // Non-fatal — don't fail the subscription if email fails
    console.warn('Welcome email failed:', err)
  }
}

function welcomeEmailHtml(firstName: string | null): string {
  const greeting = firstName ? `Hi ${firstName},` : 'Hi,'

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
              <p style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#9A9A9A;margin:0;line-height:1.6;">
                You're receiving this because you subscribed at
                <a href="https://curiousif.blog" style="color:#9A9A9A;">curiousif.blog</a>.
                <br />
                To unsubscribe, reply with "unsubscribe" and we'll remove you.
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

  // Check if this is a new subscriber (before upsert)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (supabase as any)
    .from('subscribers')
    .select('id')
    .eq('email', email)
    .maybeSingle()

  const isNewSubscriber = !existing

  // Upsert submitter row
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: submitter, error: submitterError } = await (supabase as any)
    .from('submitters')
    .upsert(
      { email, name: name || null, city: city || null, subscribed: true },
      { onConflict: 'email', ignoreDuplicates: false }
    )
    .select('id')
    .single()

  if (submitterError || !submitter) {
    console.error('Submitter upsert error:', submitterError)
    return NextResponse.json({ error: 'Failed to save subscriber' }, { status: 500 })
  }

  // Upsert subscriber row
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('subscribers')
    .upsert(
      { submitter_id: submitter.id, email, unsubscribed_at: null },
      { onConflict: 'email', ignoreDuplicates: false }
    )

  // Link submitter to the answer they just submitted
  if (answerId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('answers')
      .update({ submitter_id: submitter.id })
      .eq('id', answerId)
      .is('submitter_id', null) // Safety: only update if not already linked
  }

  // Add to Resend Contacts (fire-and-forget)
  void addToResendContacts(email, name)

  // Send welcome email only to new subscribers (fire-and-forget)
  if (isNewSubscriber) {
    void sendWelcomeEmail(email, name)
  }

  return NextResponse.json({ success: true })
}
