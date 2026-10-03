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
import { beforeSendSpan, beforeSendTransaction, tracesSampler } from "@/lib/sentry-options";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    // Tracing off: transactions bypass beforeSend and carried cookies (security review 2026-10-03).
    tracesSampler,
    sendDefaultPii: false,
    beforeSend(event) {
      if (isNoiseEvent(event)) return null;
      return scrubEventPII(event);
    },
    beforeSendTransaction,
    beforeSendSpan,
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
