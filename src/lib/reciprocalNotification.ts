// Reciprocal notification — fires when a nominee captures their email.
// Checks whether this email was nominated for the question they just answered.
// If yes, sends "they answered" email to the nominator and marks notification_sent.

import { createHmac } from 'crypto'
import { createAdminClient } from '@/lib/supabase/server'
import { signNotificationToken } from '@/lib/notificationToken'

const SITE = 'https://curiousif.blog'

function blindIndex(email: string): string {
  return createHmac('sha256', process.env.BLIND_INDEX_SECRET!)
    .update(email.toLowerCase().trim())
    .digest('hex')
}

async function sendReciprocalNotificationEmail({
  nominatorEmail,
  nominatorName,
  nominatorSubmitterId,
  answerId,
  answerBody,
  questionText,
  questionPublishedAt,
}: {
  nominatorEmail: string
  nominatorName: string | null
  nominatorSubmitterId: string
  answerId: string
  answerBody: string
  questionText: string
  questionPublishedAt: string | null
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return

  const firstName = nominatorName?.split(' ')[0] ?? null
  const greeting = firstName ? `Hi ${firstName},` : 'Hi,'
  const preview = answerBody.length > 200 ? answerBody.slice(0, 197) + '…' : answerBody
  const permalinkUrl = `${SITE}/answers/${answerId}`
  const browseUrl = `${SITE}/browse`
  const unsubUrl = `${SITE}/api/unsubscribe-notifications?token=${signNotificationToken(nominatorSubmitterId)}`

  const date = questionPublishedAt ? new Date(questionPublishedAt) : new Date()
  const monthLabel = date.toLocaleString('en-GB', { month: 'long', year: 'numeric' })

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Someone you passed the question to has answered</title>
</head>
<body style="margin:0;padding:0;background-color:#F8F3E9;font-family:Georgia,'Times New Roman',serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F8F3E9;">
    <tr>
      <td align="center" style="padding:48px 24px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;">

          <tr>
            <td style="padding-bottom:8px;">
              <span style="font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:20px;font-weight:400;color:#1A1A1A;">
                curious if
              </span>
            </td>
          </tr>

          <tr>
            <td style="padding-bottom:40px;">
              <span style="font-family:'Courier New',Courier,monospace;font-size:11px;font-weight:500;letter-spacing:0.1em;text-transform:uppercase;color:#9A9A9A;">
                ${monthLabel}
              </span>
            </td>
          </tr>

          <tr>
            <td style="background-color:#FFFFFF;border-radius:12px;padding:40px 40px 48px;box-shadow:0 2px 12px rgba(26,26,46,0.07);">

              <p style="font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.7;color:#1A1A1A;margin:0 0 20px;">
                ${greeting}
              </p>

              <p style="font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.7;color:#1A1A1A;margin:0 0 24px;">
                Someone you passed the question to has answered.
              </p>

              <!-- Answer preview -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 28px;">
                <tr>
                  <td style="border-left:3px solid #E0D9C8;padding:14px 18px;background-color:#FDFAF4;border-radius:0 6px 6px 0;">
                    <p style="font-family:Georgia,'Times New Roman',serif;font-size:15px;font-style:italic;line-height:1.7;color:#3D3D3D;margin:0;">
                      &ldquo;${preview}&rdquo;
                    </p>
                  </td>
                </tr>
              </table>

              <p style="font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.7;color:#1A1A1A;margin:0 0 32px;">
                Read their answer — and see who else is thinking alongside you.
              </p>

              <div style="margin-bottom:12px;">
                <a href="${permalinkUrl}"
                  style="display:inline-block;padding:12px 24px;background-color:#1A1A1A;color:#F8F3E9;text-decoration:none;border-radius:8px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:600;">
                  Read their answer →
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
              <p style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#9A9A9A;margin:0;line-height:1.8;">
                You received this because you passed the question to someone at
                <a href="${SITE}" style="color:#9A9A9A;">curiousif.blog</a>.
                <br />
                <a href="${unsubUrl}" style="color:#9A9A9A;">Stop these notifications</a>
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

Someone you passed the question to has answered.

"${preview}"

Read their answer: ${permalinkUrl}
Browse all answers: ${browseUrl}

—
curious if · curiousif.blog
Stop these notifications: ${unsubUrl}`

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
        to: nominatorEmail,
        subject: 'Someone you passed the question to has answered',
        html,
        text,
        headers: {
          'List-Unsubscribe': `<${unsubUrl}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      }),
    })
    if (!res.ok) {
      const err = await res.text()
      console.warn('Reciprocal notification email failed:', res.status, err)
    }
  } catch (err) {
    console.warn('Reciprocal notification fetch error:', err)
  }
}

/**
 * Called (fire-and-forget) from /api/subscribe after email is captured.
 * Finds any nomination where this email was the nominee for this question,
 * notifies the nominator, and marks notification_sent = true.
 */
export async function triggerReciprocalNotification(
  nomineeEmail: string,
  answerId: string,
  nomineeName: string | null,
): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createAdminClient() as any

    // Get the answer's question_id
    const { data: answer } = await supabase
      .from('answers')
      .select('question_id, body, question:questions(text, published_at)')
      .eq('id', answerId)
      .single()

    if (!answer) return

    const idx = blindIndex(nomineeEmail)

    // Find unsent, non-opted-out nominations where this email was the nominee
    const { data: notifs } = await supabase
      .from('nominations')
      .select(`
        id,
        nominator_submitter_id,
        nominator:submitters!nominations_nominator_submitter_id_fkey(email, name)
      `)
      .eq('blind_index_email', idx)
      .eq('question_id', answer.question_id)
      .eq('notification_sent', false)
      .eq('notification_opted_out', false)
      .not('nominator_submitter_id', 'is', null)
      .limit(10)

    if (!notifs || notifs.length === 0) return

    // Mark answered_at
    await supabase
      .from('nominations')
      .update({ answered_at: new Date().toISOString() })
      .eq('blind_index_email', idx)
      .eq('question_id', answer.question_id)

    for (const nom of notifs) {
      const nominatorEmail = nom.nominator?.email
      if (!nominatorEmail) continue

      // Mark sent first to prevent double-send on retry
      await supabase
        .from('nominations')
        .update({ notification_sent: true })
        .eq('id', nom.id)

      // Send the email
      await sendReciprocalNotificationEmail({
        nominatorEmail,
        nominatorName: nom.nominator?.name ?? null,
        nominatorSubmitterId: nom.nominator_submitter_id,
        answerId,
        answerBody: answer.body,
        questionText: answer.question?.text ?? '',
        questionPublishedAt: answer.question?.published_at ?? null,
      })
    }
  } catch (err) {
    console.warn('triggerReciprocalNotification error:', err)
  }
}
