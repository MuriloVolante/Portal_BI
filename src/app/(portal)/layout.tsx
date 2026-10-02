import { requireUser } from "@/lib/auth/session";
import { getAllowedPages } from "@/lib/portal/pages";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { MobileDock } from "@/components/sidebar/MobileDock";
import { PanelHost } from "@/components/dashboard/PanelHost";

export default async function PortalLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { user, profile } = await requireUser();
  const role = profile?.role ?? "user";
  const pages = await getAllowedPages(user.id, role);

  return (
    <div className="flex h-[100dvh] overflow-hidden">
      {/* Abre a conexão com o Power BI enquanto a URL do painel é buscada. */}
      <link rel="preconnect" href="https://app.powerbi.com" />
      <Sidebar pages={pages} email={user.email ?? ""} isAdmin={role === "admin"} />
      <main className="relative min-w-0 flex-1 overflow-hidden pb-[calc(62px+env(safe-area-inset-bottom))] md:pb-0">
        <PanelHost pages={pages}>{children}</PanelHost>
      </main>
      <MobileDock pages={pages} isAdmin={role === "admin"} />
    </div>
  );
}
