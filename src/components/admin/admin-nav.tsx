"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";

const links = [
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/health", label: "Health" },
];

export function AdminNav({ email }: { email: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/logout", { method: "POST" });
      if (!response.ok) {
        toast({ title: "Logout failed", description: "Please retry." });
        return;
      }
      router.replace("/admin/login");
      toast({ title: "Signed out" });
    } catch (error) {
      console.error("Logout error", error);
      toast({ title: "Unexpected error", description: "Unable to sign out." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <header className="flex flex-col gap-4 rounded-md border border-border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-6">
        <span className="text-sm text-muted-foreground">{email}</span>
        <nav className="flex gap-3 text-sm">
          {links.map((link) => {
            const active = pathname?.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={active ? "font-semibold text-primary" : "text-muted-foreground hover:text-foreground"}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <Button variant="outline" onClick={handleLogout} disabled={loading}>
        {loading ? "Signing out..." : "Sign out"}
      </Button>
    </header>
  );
}
