"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, ApiClientError } from "@/lib/api-client";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/fields";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="mt-8 space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
          await api("/admin/auth/login", { method: "POST", json: { email, password } });
          router.replace("/admin");
          router.refresh();
        } catch (err) {
          setError((err as ApiClientError).message);
          setBusy(false);
        }
      }}
    >
      <Field label="E-mail" htmlFor="email"><Input id="email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
      <Field label="Password" htmlFor="password"><Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
      {error && <Alert tone="error">{error}</Alert>}
      <Button type="submit" className="w-full" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</Button>
    </form>
  );
}
