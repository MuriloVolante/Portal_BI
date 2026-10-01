import { cn } from "@/lib/utils";

/** Bloco de carregamento com brilho diagonal (shimmer). */
function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("shimmer rounded-lg", className)} {...props} />;
}

export { Skeleton };
