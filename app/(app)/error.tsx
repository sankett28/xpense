"use client";

// Error boundary for the authenticated app. Surfaces the real error message
// (and digest) so render-time failures aren't swallowed into an opaque
// "unexpected response" in the browser.
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="pt-10">
      <div className="rounded-2xl bg-surface p-6">
        <h1 className="font-display text-2xl text-ink">Something went wrong</h1>
        <p className="mt-2 text-sm text-alert break-words">{error.message}</p>
        {error.digest && (
          <p className="mt-1 text-xs text-ink-soft">digest: {error.digest}</p>
        )}
        <button
          type="button"
          onClick={reset}
          className="mt-4 rounded-xl bg-accent px-4 py-2 text-ink"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
