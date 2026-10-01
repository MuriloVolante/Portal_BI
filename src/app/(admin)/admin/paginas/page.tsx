import { createAdminClient } from "@/lib/supabase/server";
import { demoListPages, isDemoMode } from "@/lib/demo";
import { PageTable } from "@/components/admin/PageTable";
import type { SidebarPage } from "@/types";

export const dynamic = "force-dynamic";

async function getPages(): Promise<SidebarPage[]> {
  if (isDemoMode) return demoListPages();

  const admin = createAdminClient();

  // embed_url NUNCA é enviada ao cliente — nem aqui na área admin.
  const { data } = await admin
    .from("pages")
    .select('id, slug, label, icon, "order", is_active, created_at')
    .order("order", { ascending: true });

  return (data ?? []) as unknown as SidebarPage[];
}

export default async function PagesAdminPage() {
  const pages = await getPages();

  return (
    <div className="animate-view-in">
      <PageTable pages={pages} />
    </div>
  );
}
