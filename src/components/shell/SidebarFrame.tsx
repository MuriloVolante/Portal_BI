import { MeshMark } from "@/components/brand/MeshMark";

interface SidebarFrameProps {
  /** Selo ao lado da marca (ex.: "admin"). */
  tag?: string;
  sectionLabel?: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}

/** Moldura da sidebar desktop: marca, rótulo de seção, navegação e rodapé. */
export function SidebarFrame({ tag, sectionLabel, children, footer }: SidebarFrameProps) {
  return (
    <aside className="hidden h-[100dvh] w-[264px] shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground md:flex">
      <div className="flex h-[66px] shrink-0 items-center gap-2.5 border-b px-5">
        <MeshMark size={30} />
        <span className="font-display text-[15.5px] font-semibold tracking-[-0.02em]">
          Portal <span className="text-primary">BI</span>
        </span>
        {tag && (
          <span className="ml-1 rounded-[5px] border border-border px-1.5 py-px text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {tag}
          </span>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-3 pt-5">
        {sectionLabel && (
          <p className="mb-2 px-3 text-[10.5px] font-semibold uppercase tracking-[.14em] text-tertiary">
            {sectionLabel}
          </p>
        )}
        {children}
      </nav>

      <div className="shrink-0 space-y-1 border-t p-3">{footer}</div>
    </aside>
  );
}

export const footerLinkClass =
  "flex h-10 w-full items-center gap-3 rounded-[9px] px-3 text-sm font-medium text-muted-foreground transition-colors [transition-duration:200ms] hover:bg-secondary hover:text-foreground";
