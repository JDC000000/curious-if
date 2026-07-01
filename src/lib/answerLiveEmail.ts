// Shared utility — "Your answer is live" email
// Used by both auto-approve (/api/moderate) and human approve (/api/admin/answers/moderate)
// and by /api/subscribe when the answer is already approved by the time email is captured.

import { signUnsubscribeToken } from '@/lib/unsubscribeToken'

const SITE = 'https://curiousif.blog'

export async function sendAnswerLiveEmail(
  email: string,
  name: string | null,
  answerId: string,
  answerBody: string,
  questionText: string,
  questionPublishedAt: string | null,
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return

  const firstName = name?.split(' ')[0] ?? null
  const greeting = firstName ? `Hi ${firstName},` : 'Hi,'
  const preview = answerBody.length > 160 ? answerBody.slice(0, 157) + '…' : answerBody
  const permalinkUrl = `${SITE}/answers/${answerId}`
  const browseUrl = `${SITE}/browse`
  const unsubscribeUrl = `${SITE}/unsubscribe?token=${signUnsubscribeToken(email)}`

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
