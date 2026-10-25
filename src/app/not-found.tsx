import Link from "next/link";
import { LogoMark } from "@/components/site/logo";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-sand-50 px-6 text-center">
      <LogoMark className="h-16 text-brass-500" />
      <p className="eyebrow mt-8">404</p>
      <h1 className="mt-3 text-5xl">This page has wandered off</h1>
      <p className="mt-4 max-w-md text-muted">Like a guest who followed the wrong alley in Al Fahidi. Let us take you back.</p>
      <div className="mt-8 flex gap-3">
        <Link href="/" className="rounded-full bg-date-800 px-6 py-3 text-xs tracking-[0.12em] text-sand-50 uppercase">Home</Link>
        <Link href="/menu" className="rounded-full border border-brass-500 px-6 py-3 text-xs tracking-[0.12em] text-date-800 uppercase">Menu</Link>
      </div>
    </main>
  );
}
