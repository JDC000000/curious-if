/**
 * Sentry Node.js runtime init.
 *
 * Loaded by src/instrumentation.ts at server startup. When the DSN is absent,
 * Sentry is a no-op so local/sandbox builds remain safe.
 */
import * as Sentry from "@sentry/nextjs";
import { isNoiseEvent, scrubEventPII } from "@/lib/sentry-scrub";
import { beforeSendSpan, beforeSendTransaction, tracesSampler } from "@/lib/sentry-options";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT ?? process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    // Tracing off: transactions bypass beforeSend and carried cookies (security review 2026-10-03).
    tracesSampler,
    sendDefaultPii: false,
    debug: process.env.SENTRY_DEBUG === "true",
    beforeSend(event) {
      if (isNoiseEvent(event)) return null;
      return scrubEventPII(event);
    },
    beforeSendTransaction,
    beforeSendSpan,
  });
}
