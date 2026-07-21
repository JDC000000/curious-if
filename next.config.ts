import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

// Applied to every response. CSP allows Next's inline runtime, Plausible,
// Google Fonts, Supabase (REST + Realtime websocket), and OG/remote images.
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Content-Security-Policy",
    value:
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://plausible.io; " +
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
      "font-src 'self' https://fonts.gstatic.com; " +
      "img-src 'self' data: blob: https:; " +
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://plausible.io; " +
      "frame-ancestors 'none'",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  async redirects() {
    // /about's content was merged into the homepage (intro + spotlight
    // question + archive preview all live on '/' now, see src/app/page.tsx)
    // to keep the primary question above the fold without an extra click.
    // Redirect old /about links/bookmarks straight to the anchor section
    // that still has the full About copy, rather than leaving a duplicate
    // near-identical page around.
    return [{ source: "/about", destination: "/#about", permanent: true }];
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
  telemetry: false,
  tunnelRoute: "/monitoring",
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
  webpack: { treeshake: { removeDebugLogging: true } },
});
