import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { decrypt, decryptEmail } from '@/lib/crypto'
import { signUnsubscribeToken } from '@/lib/unsubscribeToken'
import { escapeHtml } from '@/lib/escapeHtml'
import { isAdminEmail } from '@/lib/adminAuth'

interface Question {
  id: string
  text: string
  whisper_line: string | null
  accent_colour: string
  published_at: string | null
}

interface Subscriber {
  email: string
  name: string | null
}

function broadcastEmailHtml({
  question,
  monthLabel,
  subscriber,
}: {
  question: Question
  monthLabel: string
  subscriber: Subscriber
}): string {
  const greeting = subscriber.name ? `Hi ${escapeHtml(subscriber.name.split(' ')[0])},` : 'Hi,'
  const unsubscribeUrl = `https://curiousif.blog/unsubscribe?token=${signUnsubscribeToken(subscriber.email)}`
  const browseUrl = `https://curiousif.blog/browse`
  const answerUrl = `https://curiousif.blog/answer`
  const accentColour = question.accent_colour ?? '#3D5A8C'
  const qText = escapeHtml(question.text)
  const qWhisper = question.whisper_line ? escapeHtml(question.whisper_line) : null

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${qText}</title>
</head>
<body style="margin:0;padding:0;background-color:#F8F3E9;font-family:Georgia,'Times New Roman',serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F8F3E9;">
    <tr>
      <td align="center" style="padding:48px 24px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;">

          <!-- Wordmark -->
          <tr>
            <td style="padding-bottom:8px;">
              <span style="font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:20px;font-weight:400;color:#1A1A1A;">
                curious if
              </span>
            </td>
          </tr>

          <!-- Month label -->
          <tr>
            <td style="padding-bottom:40px;">
              <span style="font-family:'Courier New',Courier,monospace;font-size:11px;font-weight:500;letter-spacing:0.1em;text-transform:uppercase;color:#6E6E6E;">
                ${monthLabel}
              </span>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background-color:#FFFFFF;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(26,26,46,0.07);">

              <!-- Accent stripe -->
              <div style="height:6px;background-color:${accentColour};"></div>

              <div style="padding:40px 40px 48px;">

                <p style="font-family:Georgia,serif;font-size:15px;line-height:1.7;color:#6B6B6B;margin:0 0 24px;font-style:italic;">
                  ${greeting} This month's question:
                </p>

                <!-- The question -->
                <p style="font-family:Georgia,serif;font-size:26px;font-weight:700;line-height:1.3;color:#1A1A1A;letter-spacing:-0.02em;margin:0${qWhisper ? ' 0 16px' : ' 0 32px'};">
                  ${qText}
                </p>

                ${qWhisper ? `
                <p style="font-family:Georgia,serif;font-style:italic;font-size:16px;color:rgba(26,26,26,0.5);line-height:1.55;margin:0 0 32px;">
                  ${qWhisper}
                </p>
                ` : ''}

                <!-- Divider -->
                <div style="height:1px;background-color:#E8E0CC;margin-bottom:32px;"></div>

                <p style="font-family:Georgia,serif;font-size:16px;line-height:1.7;color:#1A1A1A;margin:0 0 28px;">
                  Take two minutes. Say what comes to mind. There's no right answer — only yours.
                </p>

                <!-- CTA -->
                <a
                  href="${answerUrl}"
                  style="display:inline-block;padding:14px 28px;background-color:${accentColour};color:#FFFFFF;text-decoration:none;border-radius:8px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:600;margin-bottom:16px;"
                >
                  Write your answer →
                </a>

                <br />

                <a
                  href="${browseUrl}"
                  style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#6E6E6E;text-decoration:none;"
                >
                  See what others are saying
                </a>

              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top:32px;">
              <p style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#6E6E6E;margin:0;line-height:1.8;">
                One question per month. Nothing else.<br />
                You subscribed at <a href="https://curiousif.blog" style="color:#6E6E6E;">curiousif.blog</a>.
                &nbsp;·&nbsp;
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

function broadcastEmailText({
  question,
  monthLabel,
  subscriber,
}: {
  question: Question
  monthLabel: string
  subscriber: Subscriber
}): string {
  const greeting = subscriber.name ? `Hi ${subscriber.name.split(' ')[0]},` : 'Hi,'
  const unsubscribeUrl = `https://curiousif.blog/unsubscribe?token=${signUnsubscribeToken(subscriber.email)}`

  return `${greeting} This month's question:

${monthLabel} · CURIOUS IF

${question.text}${question.whisper_line ? `\n\n${question.whisper_line}` : ''}

Take two minutes. Say what comes to mind. There's no right answer — only yours.

Write your answer: https://curiousif.blog/answer
See what others are saying: https://curiousif.blog/browse

—
One question per month. Nothing else.
curiousif.blog
Unsubscribe: ${unsubscribeUrl}`
}

export async function GET() {
  // Verify admin session — defense-in-depth on top of proxy.ts middleware,
  // not a replacement for it (see architecture.md).
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any

  const { data: question } = await admin
    .from('questions')
    .select('id, text, whisper_line, accent_colour, published_at')
    .eq('status', 'spotlight')
    .single()

  if (!question) {
    return NextResponse.json({ error: 'No spotlight question' }, { status: 404 })
  }

  const { count } = await admin
    .from('subscribers')
    .select('id', { count: 'exact', head: true })
    .is('unsubscribed_at', null)

  const publishedDate = question.published_at ? new Date(question.published_at) : new Date()
  const monthName = publishedDate.toLocaleString('en-GB', { month: 'long' }).toUpperCase()
  const year = publishedDate.getFullYear()
  const monthLabel = `${monthName} ${year}`

  return NextResponse.json({
    question: {
      text: question.text,
      whisper_line: question.whisper_line,
      accent_colour: question.accent_colour,
    },
    monthLabel,
    subscriberCount: count ?? 0,
  })
}

export async function POST(request: NextRequest) {
  // Verify admin session — defense-in-depth on top of proxy.ts middleware,
  // not a replacement for it (see architecture.md).
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'Resend API key not configured' }, { status: 500 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any

  // Get the featured question
  const { data: question } = await admin
    .from('questions')
    .select('id, text, whisper_line, accent_colour, published_at')
    .eq('status', 'spotlight')
    .single()

  if (!question) {
    return NextResponse.json({ error: 'No spotlight question to broadcast' }, { status: 404 })
  }

  // Get all active subscribers with their names (encrypted at rest)
  const { data: subscribers } = await admin
    .from('subscribers')
    .select('email_encrypted, submitter:submitters(name_encrypted)')
    .is('unsubscribed_at', null)

  if (!subscribers || subscribers.length === 0) {
    return NextResponse.json({ error: 'No active subscribers' }, { status: 404 })
  }

  const publishedDate = question.published_at ? new Date(question.published_at) : new Date()
  const monthName = publishedDate.toLocaleString('en-GB', { month: 'long' }).toUpperCase()
  const year = publishedDate.getFullYear()
  const monthLabel = `${monthName} ${year}`

  // Build email batch — chunk into groups of 100 (Resend limit)
  const BATCH_SIZE = 100
  let totalSent = 0
  let errors = 0

  const emailList = (subscribers as { email_encrypted: string; submitter?: { name_encrypted: string | null } | null }[]).map(s => {
    // Decrypt PII only in-memory to send; never logged or persisted in plaintext.
    const email = decryptEmail(s.email_encrypted)
    const name = s.submitter?.name_encrypted ? decrypt(s.submitter.name_encrypted) : null
    const sub: Subscriber = { email, name }
    const unsubscribeUrl = `https://curiousif.blog/unsubscribe?token=${signUnsubscribeToken(email)}`

    return {
      from: 'curious if <hello@curiousif.blog>',
      reply_to: 'hello@curiousif.blog',
      to: email,
      subject: question.text,
      text: broadcastEmailText({ question, monthLabel, subscriber: sub }),
      html: broadcastEmailHtml({ question, monthLabel, subscriber: sub }),
      headers: {
        'List-Unsubscribe': `<${unsubscribeUrl}>, <mailto:hello@curiousif.blog?subject=unsubscribe>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    }
  })

  // Send in batches
  for (let i = 0; i < emailList.length; i += BATCH_SIZE) {
    const batch = emailList.slice(i, i + BATCH_SIZE)

    const res = await fetch('https://api.resend.com/emails/batch', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(batch),
    })

    if (res.ok) {
      totalSent += batch.length
    } else {
      const err = await res.text()
      console.error(`Broadcast batch ${i / BATCH_SIZE + 1} failed:`, res.status, err)
      errors += batch.length
    }
  }

  return NextResponse.json({
    success: true,
    sent: totalSent,
    errors,
    question: question.text,
    monthLabel,
  })
}
