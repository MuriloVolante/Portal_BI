import { notFound } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { getPageLabel } from "@/lib/portal/pages";

export const dynamic = "force-dynamic";

interface DashboardPageProps {
  params: { pageSlug: string };
}

export default async function DashboardPage({ params }: DashboardPageProps) {
  // Slug que não existe (link alterado/digitado errado) → tela 404.
  const label = await getPageLabel(params.pageSlug);
  if (!label) notFound();
  return <DashboardShell slug={params.pageSlug} label={label} />;
}
