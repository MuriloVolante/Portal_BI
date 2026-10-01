import { Skeleton } from "@/components/ui/skeleton";
import { ReportSkeleton } from "@/components/dashboard/ReportSkeleton";

/** Moldura do painel na hora do clique, antes do servidor responder. */
export default function DashboardLoading() {
  return (
    <div className="flex h-full flex-col bg-background">
      <div className="flex h-[52px] shrink-0 items-center gap-3 border-b pl-4 sm:pl-5">
        <span className="h-1.5 w-1.5 rounded-full bg-primary/60" aria-hidden="true" />
        <Skeleton className="h-4 w-40" />
      </div>
      <div className="min-h-0 flex-1">
        <ReportSkeleton />
      </div>
    </div>
  );
}
