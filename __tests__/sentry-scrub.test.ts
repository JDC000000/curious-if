import { describe, expect, it } from "vitest";
import {
  isNoiseEvent,
  scrubDeep,
  scrubEventPII,
  scrubText,
  scrubUrl,
  type ScrubbableEvent,
} from "@/lib/sentry-scrub";

describe("Sentry PII scrubber", () => {
  it("redacts email addresses and sensitive query values from strings", () => {
    expect(scrubText("failed for reader@example.com")).toBe("failed for [redacted-email]");
    expect(scrubText("/answer?ref=raw-invite-token&email=reader@example.com")).toBe(
      "/answer?ref=[redacted-token]&email=[redacted-token]",
    );
  });

  it("redacts sensitive URL query params", () => {
    expect(scrubUrl("https://curiousif.blog/answer?ref=abc123&utm_source=test").toString()).toContain(
      "ref=%5Bredacted-token%5D",
    );
  });

  it("redacts known PII/content object keys", () => {
    expect(
      scrubDeep({
        email: "reader@example.com",
        body_text: "deeply personal answer",
        safe: "kept",
      }),
    ).toEqual({
      email: "[redacted]",
      body_text: "[redacted]",
      safe: "kept",
    });
  });

  it("scrubs Sentry event request body, headers, extra, and breadcrumbs", () => {
    const event: ScrubbableEvent = {
      message: "boom for reader@example.com",
      request: {
        url: "https://curiousif.blog/api/answers?ref=abc123",
        data: { body_text: "private answer", email: "reader@example.com" },
        headers: { "x-note": "reader@example.com", cookie: "session=abc" },
        cookies: "session=abc",
      },
      extra: { author_attribution: "name", harmless: "reader@example.com" },
      breadcrumbs: [{ message: "clicked reader@example.com", data: { answer: "private" } }],
    };

    const out = scrubEventPII(event);

    expect(out.message).toBe("boom for [redacted-email]");
    expect(out.request?.url).toContain("ref=%5Bredacted-token%5D");
    expect(out.request?.data).toBe("[redacted-request-body]");
    expect(out.request?.headers?.["x-note"]).toBe("[redacted]");
    expect(out.request?.headers?.cookie).toBe("[redacted]");
    expect(out.request?.cookies).toBe("[redacted]");
    expect(out.extra?.author_attribution).toBe("[redacted]");
    expect(out.extra?.harmless).toBe("[redacted-email]");
    expect(out.breadcrumbs?.[0].message).toBe("clicked [redacted-email]");
    expect((out.breadcrumbs?.[0].data as Record<string, unknown>).answer).toBe("[redacted]");
  });

  it("drops known browser noise", () => {
    expect(isNoiseEvent({ message: "ResizeObserver loop limit exceeded" })).toBe(true);
    expect(isNoiseEvent({ message: "TypeError: real app bug" })).toBe(false);
  });
});
