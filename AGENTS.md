<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# Curious If — Agent Handbook

> **One question posted each month. Visitors answer, browse all past questions (permanently open for replies), and leave inspired.**
> Domain: curiousif.blog

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js App Router (TypeScript) — Next 16, React 19 |
| Hosting | Vercel |
| Database + Auth | Supabase (Postgres + GoTrue Auth + Realtime) |
| Email | Resend |
| OG Images | @vercel/og (edge runtime) |
| Rate Limiting | Upstash Redis |
| Moderation | OpenAI `omni-moderation-latest` |
| Analytics | Vercel Analytics + Plausible |
| Styling | Tailwind CSS v4 |

---

## Architecture Decisions (Read Before Touching Anything)

### 1. Questions Never Close
Every question is permanently answerable. There is **no 'closed' status**.

```ts
// questions.status enum — ONLY these three values, forever:
type QuestionStatus = 'spotlight' | 'published' | 'draft'
// DO NOT add 'closed', 'archived', 'inactive', or any other value.
// This is structural — enforced at DB level and business logic.
```

### 2. Author Attribution — Single Freeform Field
`answers.author_attribution` is a single optional freeform text field.
- Never split it into first/last name
- Never make it required
- Never validate its format

### 3. Email Encryption — AES-256-GCM
Subscriber emails are stored encrypted. The encryption key lives in `ENCRYPTION_KEY` env var.
- Use `src/lib/` crypto utilities — never roll your own
- Never store plaintext email in the database

### 4. Invite Tokens — Opaque 32-byte
Invite tokens are 32-byte hex strings. **No email or PII in URLs.**
- Token format: 64-char hex string
- Token table: `invite_tokens` — stores encrypted email + token hash
- Never put email in query strings

### 5. GDPR Erasure Pattern
`answers.submitter_id` has `ON DELETE SET NULL` — when a user account is deleted,
their answers remain visible but become anonymous. Do not break this FK behaviour.

### 6. Realtime Throttle
Realtime subscription: 2-second throttle + `seenIds` Set dedup.
- Lives in `src/components/RealtimeGrid.tsx`
- Never remove the throttle (Supabase Realtime rate limits)

### 7. Mobile-First Hard Requirement
- Minimum viewport: 375px
- WCAG AA accessibility required on all public screens
- Lighthouse mobile score must stay >= 90
- Test on 375px before every PR merge

### 8. Brand Colours — No Black CTAs on Public Screens
- All reply / answer CTAs: **#C4703A** (terracotta orange)
- Never use black (`#000`) as a primary button colour on public-facing screens
- Admin screens may use standard colours

---

## Folder Structure

```
curious-if/
├── .github/
│   └── workflows/
│       └── ci.yml              # Lint + type-check + build check on PR
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx          # Root layout (fonts, analytics, nav)
│   │   ├── page.tsx            # Home — spotlight question
│   │   ├── browse/             # Archive of all questions
│   │   ├── answer/[id]/        # Answer a specific question
│   │   ├── answers/[id]/       # Read answers for a question
│   │   ├── archive/            # Question archive index
│   │   ├── admin/              # Admin dashboard (protected)
│   │   ├── auth/               # Auth callback routes
│   │   ├── invite/             # Invite token landing
│   │   ├── unsubscribe/        # Email unsubscribe
│   │   └── api/
│   │       ├── answers/        # Submit answer
│   │       ├── moderate/       # OpenAI moderation webhook
│   │       ├── resonance/      # Resonance (react) endpoint
│   │       ├── subscribe/      # Email subscription
│   │       ├── unsubscribe/    # Unsubscribe handler
│   │       ├── invite/         # Invite token validation
│   │       ├── og/             # OG image generation (edge)
│   │       ├── admin/          # Admin API routes
│   │       ├── revalidate/     # ISR revalidation
│   │       └── webhooks/       # Supabase webhooks
│   ├── components/             # Shared UI components
│   │   ├── AnswerForm.tsx      # Answer submission form
│   │   ├── RealtimeGrid.tsx    # Live answer feed (Supabase Realtime)
│   │   ├── CueCard.tsx         # Question display card
│   │   ├── SiteNav.tsx         # Navigation
│   │   ├── SiteFooter.tsx      # Footer
│   │   └── ...
│   └── lib/
│       ├── supabase/           # Supabase client + server helpers
│       ├── types/              # Shared TypeScript types
│       ├── rateLimit.ts        # Upstash rate limiting
│       ├── answerLiveEmail.ts  # Realtime email notifications
│       ├── notificationToken.ts # Notification token handling
│       ├── reciprocalNotification.ts # Reciprocal answer notifications
│       └── palette.ts          # Brand colour constants (#C4703A etc.)
├── supabase/
│   └── migrations/             # Postgres migrations (numbered sequentially)
├── public/                     # Static assets
├── .env.example                # All required env vars (no values)
├── AGENTS.md                   # This file
└── README.md
```

---

## Milestones

| # | Name | Scope |
|---|------|-------|
| M0 | Foundation | Repo, DB schema, auth, env setup |
| M1 | Public Read | Homepage (spotlight), browse archive, OG images |
| M2 | Answer & Write | Answer submission, moderation, realtime feed |
| M3 | Growth | Email subscriptions, invite system, Plausible analytics |
| M4 | Admin | Admin dashboard, question management, moderation queue |
| M5 | Live / Email / Launch | Production deploy, domain, Resend email flows, launch |

---

## Database Schema (Key Tables)

```sql
-- questions
id uuid PK
slug text UNIQUE
body text
status 'spotlight' | 'published' | 'draft'  -- NEVER add 'closed'
published_at timestamptz
archive_headline text

-- answers
id uuid PK
question_id uuid FK -> questions.id
submitter_id uuid FK -> auth.users.id ON DELETE SET NULL  -- GDPR erasure
author_attribution text  -- optional, freeform, never required
body text
is_approved boolean
resonance_count int

-- subscribers
id uuid PK
email_encrypted bytea     -- AES-256-GCM
email_blind_index bytea   -- HMAC-SHA256 for dedup lookups

-- invite_tokens
id uuid PK
token_hash text           -- stored hashed; raw token never persisted
email_encrypted bytea
expires_at timestamptz
```

---

## Key Environment Variables

See `.env.example` for the full list. Critical ones:

| Var | Purpose |
|-----|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side admin access |
| `ENCRYPTION_KEY` | AES-256-GCM key for email encryption |
| `BLIND_INDEX_SECRET` | HMAC key for email blind index — NEVER rotate after launch |
| `OPENAI_API_KEY` | Content moderation |
| `RESEND_API_KEY` | Transactional email |
| `UPSTASH_REDIS_REST_URL` | Rate limiting |
| `UPSTASH_REDIS_REST_TOKEN` | Rate limiting |

---

## Dev Agent Handoff Notes

1. **Before any DB change** — add a new migration file in `supabase/migrations/` with the next sequential number. Never edit existing migrations.
2. **Before any new route** — check whether it should be an edge function (`export const runtime = 'edge'`) or Node.js. OG image routes and rate-limit-sensitive routes use edge.
3. **Colour guard** — search for `bg-black` or `text-black` in public-facing components before committing. Replace CTA buttons with `bg-[#C4703A]`.
4. **Mobile check** — always verify layout at 375px width in browser devtools before marking a task done.
5. **Email flows** — all email goes through Resend. The sending domain is `curiousif.blog`. Never hardcode email addresses; use `RESEND_FROM_EMAIL` env var.
6. **Moderation** — new answers are submitted with `is_approved: false`. The moderation API route calls OpenAI `omni-moderation-latest` and flips the flag. Never auto-approve without moderation.
7. **Realtime** — `RealtimeGrid.tsx` must always include the 2s throttle and `seenIds` dedup. Do not simplify this out.
8. **Auth** — admin routes are protected via Supabase Auth. The admin email is in `ADMIN_EMAIL` env var. No public registration.
9. **ISR** — question pages use ISR (`revalidate`). The `/api/revalidate` route handles on-demand revalidation triggered by Supabase webhooks.
10. **Type safety** — run `npm run type-check` before every commit. The CI will catch it but fix it locally first.

---

## CI

GitHub Actions runs on every PR:
- ESLint (next/core-web-vitals + TypeScript rules)
- TypeScript type-check (`tsc --noEmit`)
- Build check (`next build`)

See `.github/workflows/ci.yml`.

---

## Deploy Checklist (manual — not enforceable in code)

1. **Disable Supabase email signups** — Supabase → Authentication → Providers →
   Email → turn OFF "Allow new users to sign up". Pre-provision only the
   `ADMIN_EMAIL` user. Admin auth is authorisation-checked (`src/lib/adminAuth.ts`:
   `user.email === ADMIN_EMAIL`, timing-safe) in the proxy middleware and
   `/auth/callback`, and `signInWithOtp` uses `shouldCreateUser: false` — but
   disabling signups in the dashboard is the belt-and-braces control (H-1).
2. **Apply migrations** — run every file in `supabase/migrations/` in order
   (through `011`) before first traffic. `010` drops plaintext PII columns; `011`
   enables RLS on `rate_limit_log` and revokes SECURITY DEFINER functions from anon.
3. **Set all secrets in Vercel** — including `MODERATE_SECRET`,
   `UNSUBSCRIBE_TOKEN_SECRET`, `NOTIFICATION_TOKEN_SECRET`, `REVALIDATE_SECRET`.
   Missing token secrets cause those flows to throw.
4. **Security headers** ship via `next.config.ts` `headers()` (CSP, XFO, etc.).
   Verify nothing is CSP-blocked in production (Plausible, Supabase, fonts).
