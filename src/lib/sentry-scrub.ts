/**
 * Isomorphic Sentry event scrubbing.
 *
 * Curious If stores/handles sensitive email addresses, invite/unsubscribe
 * tokens, and intimate freeform answer content. Keep this module dependency-free
 * so it can run in browser, Node, and Edge before events leave the app.
 */
export interface ScrubbableEvent {
  message?: string;
  exception?: { values?: Array<{ type?: string; value?: string }> } | null;
  request?: {
    url?: string;
    query_string?: unknown;
    data?: unknown;
    headers?: Record<string, unknown> | null;
    cookies?: unknown;
  } | null;
  extra?: Record<string, unknown> | null;
  breadcrumbs?: Array<{ message?: string; data?: unknown }> | null;
  user?: Record<string, unknown> | null;
}

const EMAIL_REDACTION = "[redacted-email]";
const TOKEN_REDACTION = "[redacted-token]";
const VALUE_REDACTION = "[redacted]";
const REQUEST_BODY_REDACTION = "[redacted-request-body]";

const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;

const NOISE_PATTERNS: RegExp[] = [
  /ResizeObserver loop (limit exceeded|completed with undelivered notifications)/i,
  /Non-Error promise rejection captured with value: undefined/i,
];

const SENSITIVE_KEY_PATTERN =
  /(email|mail|token|secret|password|auth|cookie|ref|invite|unsubscribe|notification|nominee|submitter|subscriber|author_attribution|body_text|answer|note|message)/i;

const SENSITIVE_QUERY_KEY_PATTERN =
  /^(email|e|token|ref|invite|unsubscribe|notification|password|secret|key|code|auth|message|note|answer)$/i;

export function scrubText(input: string): string {
  return input
    .replace(EMAIL_PATTERN, EMAIL_REDACTION)
    .replace(/([?&](?:email|e|token|ref|invite|unsubscribe|notification|password|secret|key|code|auth)=)[^&#\s]+/gi, `$1${TOKEN_REDACTION}`);
}

export function scrubUrl(input: string): string {
  const scrubbed = scrubText(input);
  try {
    const url = new URL(scrubbed);
    for (const key of [...url.searchParams.keys()]) {
      if (SENSITIVE_QUERY_KEY_PATTERN.test(key)) {
        url.searchParams.set(key, TOKEN_REDACTION);
      }
    }
    return url.toString();
  } catch {
    return scrubbed;
  }
}

export function scrubDeep<T>(value: T, depth = 0): T {
  if (depth > 8) return VALUE_REDACTION as T;
  if (typeof value === "string") return scrubText(value) as T;
  if (Array.isArray(value)) return value.map((item) => scrubDeep(item, depth + 1)) as T;
  if (value && typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      output[key] = SENSITIVE_KEY_PATTERN.test(key) ? VALUE_REDACTION : scrubDeep(nested, depth + 1);
    }
    return output as T;
  }
  return value;
}

export function isNoiseMessage(text: string): boolean {
  return NOISE_PATTERNS.some((pattern) => pattern.test(text));
}

export function isNoiseEvent(event: ScrubbableEvent): boolean {
  const parts = [event.message, ...(event.exception?.values?.map((value) => value.value) ?? [])].filter(
    (value): value is string => typeof value === "string",
  );
  return isNoiseMessage(parts.join(" "));
}

export function scrubEventPII<T extends ScrubbableEvent>(event: T): T {
  if (typeof event.message === "string") event.message = scrubText(event.message);

  for (const exception of event.exception?.values ?? []) {
    if (typeof exception.value === "string") exception.value = scrubText(exception.value);
  }

  if (event.request) {
    const request = event.request;
    if (typeof request.url === "string") request.url = scrubUrl(request.url);

    if (typeof request.query_string === "string") request.query_string = scrubText(request.query_string);
    else if (request.query_string !== undefined) request.query_string = scrubDeep(request.query_string);

    // Answer submissions and invite notes are freeform and can be deeply personal.
    // Drop the whole body rather than trying to infer which form field contains it.
    if (request.data !== undefined) request.data = REQUEST_BODY_REDACTION;
    if (request.headers) request.headers = scrubDeep(request.headers);
    if (request.cookies !== undefined) request.cookies = VALUE_REDACTION;
  }

  if (event.user) event.user = scrubDeep(event.user);
  if (event.extra) event.extra = scrubDeep(event.extra);

  for (const breadcrumb of event.breadcrumbs ?? []) {
    if (typeof breadcrumb.message === "string") breadcrumb.message = scrubText(breadcrumb.message);
    if (breadcrumb.data !== undefined) breadcrumb.data = scrubDeep(breadcrumb.data);
  }

  return event;
}
