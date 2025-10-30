import type { ReactNode } from "react";
import { requireAdminSession } from "@/lib/admin-auth";
import { AdminNav } from "@/components/admin/admin-nav";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminProtectedLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await requireAdminSession();

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-6 py-8">
      <AdminNav email={session.user.email} />
      <div className="flex-1">{children}</div>
    </div>
  );
}
