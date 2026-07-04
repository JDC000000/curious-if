/* eslint-disable react/no-unescaped-entities */
import type { Metadata } from 'next'
import LegalPage, { H2, P, List, Item, Mail } from '@/components/LegalPage'

export const metadata: Metadata = {
  title: 'Privacy Policy — Curious If',
  description:
    'What Curious If collects, why, and what you can do about it — in plain language, not legal boilerplate.',
}

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="Last updated: July 2026">
      <P>
        Curious If ("we," "us") is a small, single-question-a-month website at curiousif.blog,
        operated by Jon Cartwright. This page explains what we collect, why, and what you can do
        about it — written in plain language, not legal boilerplate.
      </P>

      <H2>What we collect</H2>
      <P>
        <strong>If you just read answers or write one anonymously:</strong> nothing tied to you.
        Answers are public by design — that's the whole point of the site — but you don't have to
        give us anything to write one, and you can sign your answer with as much or as little
        identifying detail as you like (a name, initials, a city, or nothing at all).
      </P>
      <P>
        <strong>If you give us your email</strong> (to get notified when your answer goes live, to
        subscribe to the monthly question, or because a friend invited you), we store it — but not
        in plain text. Your email is encrypted before it ever touches our database, using AES-256-GCM
        encryption. We keep a separate, one-way "blind index" of your email (not the email itself) so
        we can look up your subscription without ever storing your address in a readable form.
        Practically: even someone with direct access to our database cannot read your email address.
      </P>
      <P>
        <strong>If you invite a friend,</strong> we store their email (same encryption) long enough
        to deliver the invite and track whether they've answered, plus whatever personal note you
        wrote them. Invite links use a random, one-time token — not their email — so the link itself
        never contains anyone's address.
      </P>

      <H2>What we don't do</H2>
      <List>
        <Item>We don't sell your data. Ever, to anyone.</Item>
        <Item>We don't track you across other websites.</Item>
        <Item>
          We don't use cookies for advertising. Our analytics (Plausible) is cookie-free and doesn't
          collect any personally identifiable information — it just tells us how many people visited,
          in aggregate.
        </Item>
        <Item>
          We don't require an account, a password, or any identifying information to answer a
          question.
        </Item>
      </List>

      <H2>Who we share data with</H2>
      <P>Only the services that make the site work, and only what they need to do their job:</P>
      <List>
        <Item>
          <strong>Resend</strong> — sends our emails (subscription confirmations, invites,
          notifications).
        </Item>
        <Item>
          <strong>Supabase</strong> — hosts our database.
        </Item>
        <Item>
          <strong>Vercel</strong> — hosts the website itself.
        </Item>
        <Item>
          <strong>OpenAI</strong> — automatically screens submitted answers for content that violates
          our community guidelines, before they're published. It sees the text of your answer, not
          your email or identity.
        </Item>
        <Item>
          <strong>Plausible Analytics</strong> — aggregate, anonymous visit statistics. EU-hosted, no
          cookies, no personal data.
        </Item>
      </List>
      <P>
        None of these companies get to use your data for their own purposes — they're processors
        acting on our instructions, not owners of your information.
      </P>

      <H2>Your rights</H2>
      <P>You can:</P>
      <List>
        <Item>
          <strong>Unsubscribe at any time</strong> — every email we send has a one-click unsubscribe
          link, and it actually works instantly (no "please allow up to 10 business days").
        </Item>
        <Item>
          <strong>Ask us to delete your data.</strong> Email <Mail /> and we'll erase your email
          address and any identifying information tied to it from our systems. (Answers you've written
          stay up — that's the permanent-archive promise of the site — but they get anonymized, with
          nothing left that connects them back to you.)
        </Item>
        <Item>
          <strong>Ask what we have on you.</strong> Same email address, same response.
        </Item>
      </List>
      <P>
        We aim to respond to any of the above within a few days — this is a small,
        independently-run project, not a company with a dedicated privacy team, and we treat every
        request personally.
      </P>

      <H2>How long we keep things</H2>
      <P>
        Public answers stay up indefinitely — permanence is a core part of what this site is. Email
        addresses and any other identifying data are kept only as long as you're subscribed or until
        you ask us to remove them.
      </P>

      <H2>Children</H2>
      <P>
        Curious If isn't directed at children, and we don't knowingly collect information from anyone
        under 13.
      </P>

      <H2>Changes to this policy</H2>
      <P>
        If this policy changes in any meaningful way, we'll update the date at the top and, if the
        change is significant, mention it on the site.
      </P>

      <H2>Questions</H2>
      <P>
        Email <Mail />. A real person (Jon) reads and answers these, not a support queue.
      </P>
    </LegalPage>
  )
}
