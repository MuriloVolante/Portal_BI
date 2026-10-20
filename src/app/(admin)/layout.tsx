import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireAdmin } from "@/lib/auth/session";
import { APP_VERSION } from "@/lib/version";
import { AdminNav, AdminTabBar } from "@/components/admin/AdminNav";
import { SidebarFrame, footerLinkClass } from "@/components/shell/SidebarFrame";
import { PresenceBeacon } from "@/components/shell/PresenceBeacon";

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requireAdmin();

  return (
    <div className="flex h-[100dvh] overflow-hidden">
      <PresenceBeacon />
      <SidebarFrame
        tag="admin"
        sectionLabel="Administração"
        footer={
          <>
            <Link href="/" className={footerLinkClass}>
              <ArrowLeft className="h-[17px] w-[17px] shrink-0" />
              Voltar ao portal
            </Link>
            <p className="px-3 pt-1 text-[11px] text-tertiary">Portal BI v{APP_VERSION}</p>
          </>
        }
      >
        <AdminNav />
      </SidebarFrame>

      <main className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl px-4 pb-[calc(86px+env(safe-area-inset-bottom))] pt-6 sm:px-6 md:px-10 md:pb-12 md:pt-10">
          {children}
          <p className="pt-10 text-center text-[11px] text-tertiary md:hidden">Portal BI v{APP_VERSION}</p>
        </div>
      </main>

      <AdminTabBar />
    </div>
  );
}
