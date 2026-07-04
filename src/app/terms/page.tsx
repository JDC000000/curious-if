/* eslint-disable react/no-unescaped-entities */
import type { Metadata } from 'next'
import Link from 'next/link'
import LegalPage, { H2, P, Mail } from '@/components/LegalPage'

export const metadata: Metadata = {
  title: 'Terms of Use — Curious If',
  description: 'The terms for using Curious If — kept short and in plain language.',
}

function PrivacyLink() {
  return (
    <Link href="/privacy" style={{ color: '#3D5A8C', textDecoration: 'none' }}>
      Privacy Policy
    </Link>
  )
}

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Use" updated="Last updated: July 2026">
      <P>
        Curious If (curiousif.blog) is operated by Jon Cartwright. By using this site, you're agreeing
        to the following — kept short and in plain language on purpose.
      </P>

      <H2>What this is</H2>
      <P>
        Once a month, we post one question. Anyone can answer it, anonymously or with as much
        identifying detail as they like. Past questions and answers stay permanently visible and
        permanently answerable — there's no closing date.
      </P>

      <H2>Your answers</H2>
      <P>
        When you submit an answer, you're granting us a license to display it publicly on this site
        (and in previews when a page is shared, e.g. link previews on social media or messaging apps)
        — indefinitely, since permanence is core to how this site works. You still own what you wrote;
        you're just letting us keep showing it. If you want an answer taken down, email <Mail /> and
        we'll work with you on it — see the <PrivacyLink /> for how we handle removal requests
        involving your identity.
      </P>
      <P>
        Don't submit anything that isn't yours to share, or that's illegal, harassing, or intended to
        harm someone. Submitted answers are automatically screened before publishing, and we reserve
        the right to remove anything that violates this, at our discretion, without notice.
      </P>

      <H2>What you can expect from us</H2>
      <P>
        We built this to be a genuinely honest, low-pressure place to answer one real question a
        month. We'll keep your data as described in the <PrivacyLink />, keep the archive permanently
        open, and try to be straightforward with you about how the site works and what's happening if
        something breaks.
      </P>

      <H2>What we can't promise</H2>
      <P>
        This is a small, independently-run project, not a company with an uptime SLA. We do our best
        to keep the site reliable and your data safe, but we can't guarantee the service will always
        be available, error-free, or permanent forever (though "permanent" is very much the goal). Use
        it as intended — a place to read and answer honestly — and don't rely on it for anything where
        downtime or data loss would cause you real harm.
      </P>

      <H2>Liability</H2>
      <P>
        Curious If is provided as-is, without warranties of any kind. To the extent allowed by law,
        we're not liable for damages arising from your use of the site. Nothing here limits any rights
        you have that can't be waived under applicable consumer protection law (including your data
        rights under GDPR/equivalent regulations, described in the <PrivacyLink />).
      </P>

      <H2>Changes</H2>
      <P>
        We may update these terms occasionally. If we do, we'll update the date at the top, and
        mention it on the site if the change is significant.
      </P>

      <H2>Contact</H2>
      <P>
        Email <Mail /> with any questions.
      </P>
    </LegalPage>
  )
}
