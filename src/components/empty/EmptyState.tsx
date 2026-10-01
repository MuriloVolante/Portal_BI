import { cn } from "@/lib/utils";

interface EmptyStateProps {
  art: React.ReactNode;
  title: string;
  description: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

/** Casca dos estados vazios: ilustração + título + texto + ações. */
export function EmptyState({ art, title, description, actions, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex h-full min-h-[420px] animate-view-in flex-col items-center justify-center px-6 py-10 text-center",
        className
      )}
    >
      <div className="mb-6 w-[220px] sm:w-[240px]">{art}</div>
      <h1 className="max-w-md text-xl font-semibold sm:text-2xl">{title}</h1>
      <p className="mt-2.5 max-w-md text-[15px] leading-relaxed text-muted-foreground">{description}</p>
      {actions && <div className="mt-7 flex flex-wrap items-center justify-center gap-3">{actions}</div>}
    </div>
  );
}
