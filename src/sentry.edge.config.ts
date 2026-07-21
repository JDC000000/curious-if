/**
 * Sentry Edge runtime init.
 *
 * Covers Next's edge runtime, including src/proxy.ts. Keep this file free of
 * Node-only imports.
 */
import * as Sentry from "@sentry/nextjs";
import { isNoiseEvent, scrubEventPII } from "@/lib/sentry-scrub";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT ?? process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
    sendDefaultPii: false,
    debug: process.env.SENTRY_DEBUG === "true",
    beforeSend(event) {
      if (isNoiseEvent(event)) return null;
      return scrubEventPII(event);
    },
  });
}
