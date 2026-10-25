import type { Metadata } from "next";
import { readFileSync } from "node:fs";
import path from "node:path";

export const metadata: Metadata = { title: "Photo credits & notices" };

interface Credit { title: string; author: string; sourceUrl: string; license: string; licenseUrl: string; notes?: string }

export default function CreditsPage() {
  const credits = JSON.parse(readFileSync(path.join(process.cwd(), "public", "images", "credits.json"), "utf8")) as Record<string, Credit>;
  const entries = Object.entries(credits).sort(([a], [b]) => a.localeCompare(b));
  return (
    <div className="container-page py-16">
      <p className="eyebrow">Notices</p>
      <h1 className="mt-3 text-5xl">Photo credits</h1>
      <p className="mt-4 max-w-3xl text-muted">
        Bayt Al Ghaf is a fictional restaurant. The photographs on this site are openly licensed works by the photographers below, used under their licences. They have been resized and in some cases cropped;
        many are representative stand-ins rather than photographs of our (fictional) dishes. CC BY-SA images remain under CC BY-SA.
      </p>
      <div className="mt-10 overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="text-xs tracking-wide text-muted uppercase">
          <tr><th className="py-2">Image</th><th className="py-2">Work</th><th className="py-2">Author</th><th className="py-2">Licence</th><th className="hidden py-2 md:table-cell">Changes</th></tr>
        </thead>
        <tbody className="divide-y divide-sand-200">
          {entries.map(([file, c]) => (
            <tr key={file}>
              <td className="py-2 pr-3 font-mono text-xs">{file}</td>
              <td className="py-2 pr-3"><a href={c.sourceUrl} className="underline decoration-sand-400 underline-offset-2" rel="noopener noreferrer">{c.title}</a></td>
              <td className="py-2 pr-3">{c.author}</td>
              <td className="py-2 pr-3"><a href={c.licenseUrl} className="underline decoration-sand-400 underline-offset-2" rel="noopener noreferrer">{c.license}</a></td>
              <td className="hidden py-2 text-xs text-muted md:table-cell">Resized{c.notes ? `; ${c.notes}` : ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}
