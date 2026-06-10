import { createAdminClient } from "@/lib/supabase/server";
import { PageTable } from "@/components/admin/PageTable";
import type { SidebarPage } from "@/types";

export const dynamic = "force-dynamic";

export default async function PagesAdminPage() {
  const admin = createAdminClient();

  // embed_url NUNCA é enviada ao cliente — nem aqui na área admin.
  const { data } = await admin
    .from("pages")
    .select('id, slug, label, icon, "order", is_active, created_at')
    .order("order", { ascending: true });

  const pages = (data ?? []) as unknown as SidebarPage[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Páginas</h1>
        <p className="text-sm text-muted-foreground">
          Cadastre e gerencie os dashboards disponíveis no portal.
        </p>
      </div>

      <PageTable pages={pages} />
    </div>
  );
}
