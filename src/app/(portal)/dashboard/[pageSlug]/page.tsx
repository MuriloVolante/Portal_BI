import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { getPageLabel } from "@/lib/portal/pages";

export const dynamic = "force-dynamic";

interface DashboardPageProps {
  params: { pageSlug: string };
}

export default async function DashboardPage({ params }: DashboardPageProps) {
  const label = await getPageLabel(params.pageSlug);
  return <DashboardShell slug={params.pageSlug} label={label} />;
}
