import { DashboardShell } from "@/components/dashboard/DashboardShell";

export const dynamic = "force-dynamic";

interface DashboardPageProps {
  params: { pageSlug: string };
}

export default function DashboardPage({ params }: DashboardPageProps) {
  return <DashboardShell slug={params.pageSlug} />;
}
