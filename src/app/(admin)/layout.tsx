import Link from "next/link";
import { ArrowLeft, BarChart3 } from "lucide-react";
import { requireAdmin } from "@/lib/auth/session";
import { AdminNav } from "@/components/admin/AdminNav";

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requireAdmin();

  return (
    <div className="flex min-h-screen">
      <aside className="hidden h-screen w-64 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground md:flex md:sticky md:top-0">
        <div className="flex h-16 items-center gap-2 border-b px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/15">
            <BarChart3 className="h-4 w-4 text-primary" />
          </div>
          <span className="text-base font-semibold tracking-tight">
            Portal BI{" "}
            <span className="text-xs font-normal text-muted-foreground">
              admin
            </span>
          </span>
        </div>

        <AdminNav />

        <div className="border-t p-3">
          <Link
            href="/"
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" />
            Voltar ao portal
          </Link>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl p-6 md:p-10 animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  );
}
