"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiClientError } from "@/lib/api-client";
import { AdminHeader, Card } from "@/components/admin/ui";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/fields";

interface Key { id: string; name: string; prefix: string; scopes: string[]; createdAt: string; lastUsedAt: string | null; revokedAt: string | null; createdBy: string | null }

export default function AdminApiKeys() {
  const [keys, setKeys] = useState<Key[]>([]);
  const [name, setName] = useState("Voice agent (staging)");
  const [scopes, setScopes] = useState<string[]>(["agent"]);
  const [created, setCreated] = useState<{ key: string; name: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => setKeys((await api<{ data: Key[] }>("/admin/api-keys")).data), []);
  useEffect(() => {
    load();
  }, [load]);
  return (
    <>
      <AdminHeader title="API keys" subtitle="Credentials for external systems such as the voice assistant. Keys are shown once and stored only as hashes." />
      {error && <Alert tone="error" className="mb-4">{error}</Alert>}
      {created && (
        <Alert tone="success" className="mb-4" title={`Key created for ${created.name} — copy it now, it will not be shown again`}>
          <code className="block break-all rounded bg-white p-2 font-mono text-xs text-ink">{created.key}</code>
        </Alert>
      )}
      <Card className="mb-6">
        <form
          className="grid gap-3 md:grid-cols-[1fr_auto_auto] md:items-end"
          onSubmit={async (e) => {
            e.preventDefault();
            setError(null);
            try {
              const r = await api<{ data: { key: string; name: string } }>("/admin/api-keys", { method: "POST", json: { name, scopes } });
              setCreated(r.data);
              await load();
            } catch (err) {
              setError((err as ApiClientError).message);
            }
          }}
        >
          <Field label="Name" htmlFor="k-name"><Input id="k-name" required value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <fieldset className="flex gap-4 pb-3 text-sm">
            <legend className="sr-only">Scopes</legend>
            {["agent", "staff", "admin"].map((s) => (
              <label key={s} className="flex items-center gap-1.5"><input type="checkbox" checked={scopes.includes(s)} onChange={(e) => setScopes(e.target.checked ? [...scopes, s] : scopes.filter((x) => x !== s))} className="h-4 w-4 accent-[#43291c]" />{s}</label>
            ))}
          </fieldset>
          <Button type="submit" disabled={!scopes.length}>Create key</Button>
        </form>
        <p className="mt-3 text-xs text-muted"><strong>agent</strong>: create/modify customer orders and bookings on the phone channel (still needs customer verification for records) · <strong>staff</strong>: read and manage all orders and reservations · <strong>admin</strong>: everything.</p>
      </Card>
      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[700px] text-sm">
          <thead className="bg-sand-50 text-left text-xs tracking-wide text-muted uppercase"><tr><th className="p-3">Name</th><th className="p-3">Prefix</th><th className="p-3">Scopes</th><th className="p-3">Last used</th><th className="p-3" /></tr></thead>
          <tbody className="divide-y divide-sand-200">
            {keys.map((k) => (
              <tr key={k.id} className={k.revokedAt ? "text-muted" : ""}>
                <td className="p-3">{k.name}<span className="block text-xs text-muted">created {k.createdAt.slice(0, 10)} by {k.createdBy}</span></td>
                <td className="p-3 font-mono text-xs">{k.prefix}…</td>
                <td className="p-3">{k.scopes.join(", ")}</td>
                <td className="p-3 text-xs">{k.revokedAt ? `revoked ${k.revokedAt.slice(0, 10)}` : (k.lastUsedAt?.slice(0, 16).replace("T", " ") ?? "never")}</td>
                <td className="p-3 text-right">{!k.revokedAt && <Button size="sm" variant="danger" onClick={async () => { if (window.confirm(`Revoke ${k.name}?`)) { await api(`/admin/api-keys/${k.id}`, { method: "DELETE" }); await load(); } }}>Revoke</Button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
