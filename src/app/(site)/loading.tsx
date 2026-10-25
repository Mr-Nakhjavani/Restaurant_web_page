export default function Loading() {
  return (
    <div className="container-page py-24" aria-busy="true" aria-live="polite">
      <div className="h-10 w-64 animate-pulse rounded-lg bg-sand-200" />
      <div className="mt-6 h-4 w-96 max-w-full animate-pulse rounded bg-sand-200" />
      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => <div key={i} className="aspect-[4/5] animate-pulse rounded-2xl bg-sand-200/70" />)}
      </div>
      <span className="sr-only">Loading</span>
    </div>
  );
}
