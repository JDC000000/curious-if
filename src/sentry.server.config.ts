/**
 * Sentry Node.js runtime init.
 *
 * Loaded by src/instrumentation.ts at server startup. When the DSN is absent,
 * Sentry is a no-op so local/sandbox builds remain safe.
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
