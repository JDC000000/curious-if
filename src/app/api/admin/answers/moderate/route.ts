import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient, createAdminClient } from '@/lib/supabase/server'

const SITE = 'https://curiousif.blog'

async function sendAnswerLiveEmail(
  email: string,
  name: string | null,
  answerId: string,
  answerBody: string,
  questionText: string,
  questionPublishedAt: string | null,
) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return

  const firstName = name?.split(' ')[0] ?? null
  const greeting = firstName ? `Hi ${firstName},` : 'Hi,'
  const preview = answerBody.length > 160 ? answerBody.slice(0, 157) + '…' : answerBody
  const permalinkUrl = `${SITE}/answers/${answerId}`
  const browseUrl = `${SITE}/browse`
  const unsubscribeUrl = `${SITE}/unsubscribe?email=${encodeURIComponent(email)}`

  // Build the month label for context
  const date = questionPublishedAt ? new Date(questionPublishedAt) : new Date()
  const monthLabel = date.toLocaleString('en-GB', { month: 'long', year: 'numeric' })

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your answer is live</title>
</head>
<body style="margin:0;padding:0;background-color:#F8F3E9;font-family:Georgia,'Times New Roman',serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F8F3E9;">
    <tr>
      <td align="center" style="padding:48px 24px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;">

          <tr>
            <td style="padding-bottom:40px;">
              <span style="font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:20px;font-weight:400;color:#1A1A1A;">
                curious if
              </span>
            </td>
          </tr>

          <tr>
            <td style="background-color:#FFFFFF;border-radius:12px;padding:40px 40px 48px;box-shadow:0 2px 12px rgba(26,26,46,0.07);">

              <p style="font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.7;color:#1A1A1A;margin:0 0 20px;">
                ${greeting}
              </p>

              <p style="font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.7;color:#1A1A1A;margin:0 0 20px;">
                Your answer is live.
              </p>

              <!-- Answer preview blockquote -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;">
                <tr>
                  <td style="border-left:3px solid #E0D9C8;padding:12px 16px;">
                    <p style="font-family:Georgia,'Times New Roman',serif;font-size:15px;font-style:italic;line-height:1.65;color:#3D3D3D;margin:0 0 6px;">
                      &ldquo;${preview}&rdquo;
                    </p>
                    <p style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#BABABA;margin:0;letter-spacing:0.06em;text-transform:uppercase;">
                      ${monthLabel}
                    </p>
                  </td>
                </tr>
              </table>

              <p style="font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.7;color:#1A1A1A;margin:0 0 32px;">
                It&rsquo;s sitting alongside everyone else who answered. Share it if it feels right.
              </p>

              <div style="margin-bottom:12px;">
                <a href="${permalinkUrl}"
                  style="display:inline-block;padding:12px 24px;background-color:#1A1A1A;color:#F8F3E9;text-decoration:none;border-radius:8px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:600;">
                  Read your answer →
                </a>
              </div>
              <div>
                <a href="${browseUrl}"
                  style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#9A9A9A;text-decoration:none;">
                  Browse all answers
                </a>
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding-top:32px;">
              <p style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#9A9A9A;margin:0;line-height:1.6;">
                curious if · <a href="${SITE}" style="color:#9A9A9A;">${SITE.replace('https://', '')}</a>
                <br />
                <a href="${unsubscribeUrl}" style="color:#9A9A9A;">Unsubscribe</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  const text = `${greeting}

Your answer is live.

"${preview}"

${monthLabel} — curious if

Read it here: ${permalinkUrl}
Browse all answers: ${browseUrl}

—
curious if · curiousif.blog
Unsubscribe: ${unsubscribeUrl}`

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
        subject: 'Your answer is live — curious if',
        html,
        text,
        headers: {
          'List-Unsubscribe': `<${unsubscribeUrl}>, <mailto:hello@curiousif.blog?subject=unsubscribe>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      }),
    })
    if (!res.ok) {
      const err = await res.text()
      console.warn('Answer-live email failed:', res.status, err)
    }
  } catch (err) {
    console.warn('Answer-live email fetch failed:', err)
  }
}

export async function POST(request: NextRequest) {
  // Verify admin session
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { answerId?: string; action?: 'approve' | 'reject' }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { answerId, action } = body

  if (!answerId || !action || !['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'answerId and action (approve|reject) required' }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminClient = createAdminClient() as any

  const newStatus = action === 'approve' ? 'approved' : 'rejected'
  const updateData: Record<string, unknown> = { status: newStatus }
  if (action === 'approve') {
    updateData.approved_at = new Date().toISOString()
  }

  const { error: updateError } = await adminClient
    .from('answers')
    .update(updateData)
    .eq('id', answerId)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // Log to moderation_log
  await adminClient
    .from('moderation_log')
    .insert({ answer_id: answerId, action, openai_flagged: null })

  if (action === 'approve') {
    // Fetch answer + submitter email + question for notification + ISR
    const { data: full } = await adminClient
      .from('answers')
      .select(`
        id, body, question_id,
        submitter:submitters(email, name),
        question:questions(published_at, text)
      `)
      .eq('id', answerId)
      .single()

    // ISR revalidation
    try {
      revalidatePath('/browse')
      revalidatePath('/')
      if (full?.question?.published_at) {
        const d = new Date(full.question.published_at)
        const year = d.getFullYear()
        const month = String(d.getMonth() + 1).padStart(2, '0')
        revalidatePath(`/browse/${year}/${month}`)
      }
    } catch {
      // Non-fatal
    }

    // "Your answer is live" email — fire and forget
    const submitterEmail = full?.submitter?.email
    if (submitterEmail) {
      void sendAnswerLiveEmail(
        submitterEmail,
        full.submitter.name ?? null,
        answerId,
        full.body,
        full.question?.text ?? '',
        full.question?.published_at ?? null,
      )
    }
  }

  return NextResponse.json({ success: true, status: newStatus })
}
