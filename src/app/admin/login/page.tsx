import type { Metadata } from "next";
import { LogoMark } from "@/components/site/logo";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Staff login" };

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-date-900 px-4">
      <div className="w-full max-w-sm rounded-3xl bg-sand-50 p-8 shadow-[var(--shadow-lift)]">
        <LogoMark className="h-12 text-brass-700" />
        <h1 className="mt-6 text-4xl">Staff login</h1>
        <p className="mt-2 text-sm text-muted">Bayt Al Ghaf back office (test environment).</p>
        <LoginForm />
      </div>
    </main>
  );
}
