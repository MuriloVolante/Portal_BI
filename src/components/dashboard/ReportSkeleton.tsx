import { Skeleton } from "@/components/ui/skeleton";

/** Skeleton no formato de um relatório: 4 KPIs + 2 painéis. */
export function ReportSkeleton() {
  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden p-4 sm:p-5" aria-label="Carregando painel">
      <div className="grid shrink-0 grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-[84px]" />
        ))}
      </div>
      <div className="grid min-h-0 flex-1 gap-3 sm:gap-4 lg:grid-cols-[2fr_1fr]">
        <Skeleton className="min-h-[180px]" />
        <Skeleton className="min-h-[180px]" />
      </div>
    </div>
  );
}
