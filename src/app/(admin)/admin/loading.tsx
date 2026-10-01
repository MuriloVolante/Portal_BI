import { Skeleton } from "@/components/ui/skeleton";

/** Aparece na hora do clique enquanto o servidor monta a tela do admin. */
export default function AdminLoading() {
  return (
    <div aria-label="Carregando" aria-busy="true">
      <div className="mb-6 space-y-2 sm:mb-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-[124px] rounded-xl" />
        ))}
      </div>
      <Skeleton className="mt-4 h-[260px] rounded-xl" />
    </div>
  );
}
