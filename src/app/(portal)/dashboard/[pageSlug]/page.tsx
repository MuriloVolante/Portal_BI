import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { getAllowedPages, getPageLabel } from "@/lib/portal/pages";
import { ForbiddenState } from "@/components/empty/states";

export const dynamic = "force-dynamic";

interface DashboardPageProps {
  params: { pageSlug: string };
}

/**
 * Painéis liberados são desenhados pelo PanelHost do layout (continuam
 * abertos ao trocar de painel). Aqui ficam só os casos de fora: slug que não
 * existe (404) e painel sem permissão ou inativo.
 */
export default async function DashboardPage({ params }: DashboardPageProps) {
  const label = await getPageLabel(params.pageSlug);
  if (!label) notFound();

  const { user, profile } = await requireUser();
  const pages = await getAllowedPages(user.id, profile?.role ?? "user");
  if (pages.some((p) => p.slug === params.pageSlug)) return null;

  return <ForbiddenState label={label} />;
}
