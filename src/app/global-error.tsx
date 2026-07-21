"use client";

/**
 * Root App Router error boundary. Reports render errors that escape all nested
 * boundaries and renders its own document shell because it replaces layout.tsx.
 */
import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#F8F3E9",
          color: "#1A1A2E",
          fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
          padding: 24,
        }}
      >
        <main style={{ maxWidth: 420, textAlign: "center" }}>
          <p
            style={{
              color: "#C4703A",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.16em",
              marginBottom: 12,
              textTransform: "uppercase",
            }}
          >
            Curious If
          </p>
          <h1 style={{ fontFamily: "Georgia, serif", fontSize: 32, lineHeight: 1.1, marginBottom: 12 }}>
            Something went wrong.
          </h1>
          <p style={{ color: "#4F4F5A", fontSize: 16, lineHeight: 1.5, marginBottom: 24 }}>
            The error has been logged. Please try again in a moment.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              appearance: "none",
              background: "#C4703A",
              border: 0,
              borderRadius: 999,
              color: "#fff",
              cursor: "pointer",
              fontSize: 15,
              fontWeight: 700,
              minHeight: 44,
              padding: "12px 22px",
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
