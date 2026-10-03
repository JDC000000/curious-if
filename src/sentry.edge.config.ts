/**
 * Sentry Edge runtime init.
 *
 * Covers Next's edge runtime, including src/proxy.ts. Keep this file free of
 * Node-only imports.
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
