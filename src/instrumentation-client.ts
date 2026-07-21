"use client";

/**
 * Sentry browser runtime init.
 *
 * Captures uncaught client exceptions and unhandled promise rejections. Request
 * bodies, email-looking values, invite/unsubscribe tokens, and answer-content
 * fields are scrubbed before events leave the browser.
 */
import * as Sentry from "@sentry/nextjs";
import { isNoiseEvent, scrubEventPII } from "@/lib/sentry-scrub";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
    sendDefaultPii: false,
    beforeSend(event) {
      if (isNoiseEvent(event)) return null;
      return scrubEventPII(event);
    },
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
