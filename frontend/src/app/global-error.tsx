"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <main
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            gap: "1rem",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <h1>Something went wrong</h1>
          <p style={{ maxWidth: 480, textAlign: "center", opacity: 0.8 }}>
            {error.message || "The desktop renderer hit an unexpected error."}
          </p>
          <button onClick={() => reset()}>Try again</button>
        </main>
      </body>
    </html>
  );
}
