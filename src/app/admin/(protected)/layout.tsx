import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifySession } from "@/server/auth/session";
import { AdminShell } from "@/components/admin/shell";

export const dynamic = "force-dynamic";

export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = await verifySession(token);
  if (!session) redirect("/admin/login");
  return <AdminShell user={{ name: session.name, email: session.email, role: session.role }}>{children}</AdminShell>;
}
