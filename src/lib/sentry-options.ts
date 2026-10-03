/**
 * Shared Sentry options for every runtime (browser, Node, Edge). Dependency-free.
 *
 * Security review 2026-10-03: performance TRANSACTIONS bypass `beforeSend`, so
 * with tracing on, server/edge transactions carried the request's cookies
 * (including the Supabase session cookie of the signed-in admin) to Sentry.
 *
 *   - Tracing is OFF. A `tracesSampler` that always returns 0 is used instead
 *     of `tracesSampleRate: 0`, because with only a rate, an inbound
 *     `sentry-trace: …-1` header makes the SDK inherit "sampled" and send a
 *     transaction anyway. A sampler overrides the parent decision.
 *   - Defence in depth if tracing is ever turned back on: transactions go
 *     through the same scrubber as errors, and span attributes that can carry
 *     cookies, auth headers or IPs are dropped.
 */
import { scrubEventPII, type ScrubbableEvent } from "@/lib/sentry-scrub";

export const tracesSampler = (): number => 0;

export function beforeSendTransaction<T extends ScrubbableEvent>(event: T): T {
  return scrubEventPII(event);
}

const SENSITIVE_SPAN_ATTR = /(cookie|authorization|auth|token|set-cookie|client\.address|ip)/i;

export function beforeSendSpan<T extends { data?: Record<string, unknown> }>(span: T): T {
  if (span.data) {
    for (const key of Object.keys(span.data)) {
      if (SENSITIVE_SPAN_ATTR.test(key)) delete span.data[key];
    }
  }
  return span;
}
