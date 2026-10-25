"use client";

export default function SiteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="container-page py-24 text-center">
      <p className="eyebrow">Something went wrong</p>
      <h1 className="mt-3 text-4xl">We couldn&apos;t load this page</h1>
      <p className="mx-auto mt-4 max-w-md text-muted">Please try again in a moment. If you were placing an order or booking, nothing has been confirmed unless you saw a confirmation page.</p>
      {error.digest && <p className="mt-2 text-xs text-muted">Reference: {error.digest}</p>}
      <button type="button" onClick={reset} className="mt-8 rounded-full bg-date-800 px-6 py-3 text-xs tracking-[0.12em] text-sand-50 uppercase">Try again</button>
    </div>
  );
}
