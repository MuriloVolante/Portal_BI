"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { LogOut, ShieldCheck } from "lucide-react";
import { MeshCanvas } from "@/components/brand/MeshCanvas";
import { useSignOut } from "@/components/shell/useSignOut";
import { cn } from "@/lib/utils";
import { toNavItems } from "./Sidebar";
import type { SidebarPage } from "@/types";

const sideButtonClass =
  "flex h-11 w-11 items-center justify-center rounded-xl text-tertiary transition-colors [transition-duration:200ms] hover:bg-secondary hover:text-foreground active:bg-secondary active:text-foreground";

interface MobileDockProps {
  pages: SidebarPage[];
  isAdmin: boolean;
}

/** Barra inferior do portal no celular: orb central abre o seletor de painéis. */
export function MobileDock({ pages, isAdmin }: MobileDockProps) {
  const pathname = usePathname();
  const signOut = useSignOut();
  const [open, setOpen] = useState(false);
  const items = toNavItems(pages);

  // Fecha o seletor ao trocar de página (inclusive pelo botão voltar).
  useEffect(() => setOpen(false), [pathname]);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <nav
        aria-label="Navegação"
        className="fixed inset-x-0 bottom-0 z-[60] box-content h-[62px] border-t bg-[rgb(38_38_38/.94)] pb-[env(safe-area-inset-bottom)] backdrop-blur-[12px] md:hidden"
      >
        <div className="flex h-full items-center justify-between px-5">
          {isAdmin ? (
            <Link href="/admin" aria-label="Administração" className={sideButtonClass}>
              <ShieldCheck className="h-5 w-5" />
            </Link>
          ) : (
            <span className="h-11 w-11" />
          )}
          <button onClick={signOut} aria-label="Sair" className={sideButtonClass}>
            <LogOut className="h-5 w-5" />
          </button>
        </div>

        <div className="absolute left-[calc(50%-31px)] top-[-24px]">
          <DialogPrimitive.Trigger
            aria-label="Seus painéis"
            className={cn(
              "orb-ring relative flex h-[62px] w-[62px] items-center justify-center rounded-full border bg-[radial-gradient(120%_120%_at_50%_20%,#3A3A3A,#242424)] shadow-[0_10px_26px_rgb(0_0_0/.45),0_0_0_6px_hsl(var(--sidebar))] transition-transform [transition-duration:300ms] ease-spring active:scale-[.93] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              open && "scale-[1.06]"
            )}
          >
            <span className="h-11 w-11 overflow-hidden rounded-full">
              <MeshCanvas interactive={false} />
            </span>
          </DialogPrimitive.Trigger>
        </div>
      </nav>

      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 animate-scrim-in bg-[rgb(20_20_20/.6)] backdrop-blur-[4px] md:hidden" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed inset-x-3 bottom-[calc(76px+env(safe-area-inset-bottom))] z-50 max-h-[65dvh] animate-sheet-in overflow-y-auto rounded-[18px] border bg-card p-3 shadow-[0_26px_60px_rgb(0_0_0/.55)] focus:outline-none md:hidden"
        >
          <div className="mx-auto mb-3 mt-0.5 h-1 w-[34px] rounded-full bg-border" />
          <DialogPrimitive.Title className="mb-2 px-3 font-sans text-[10.5px] font-semibold uppercase tracking-[.14em] text-tertiary">
            Seus painéis
          </DialogPrimitive.Title>

          {items.length === 0 ? (
            <p className="px-3 py-3 text-sm text-muted-foreground">Nenhum painel liberado ainda.</p>
          ) : (
            <div className="space-y-1">
              {items.map((item, i) => {
                const active = item.href === pathname;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    aria-current={active ? "page" : undefined}
                    style={{ "--i": i } as React.CSSProperties}
                    className={cn(
                      "stagger flex h-12 items-center gap-3 rounded-[11px] px-3 text-[15px] font-medium transition-colors [transition-duration:200ms]",
                      active
                        ? "bg-primary/[.12] text-primary"
                        : "text-muted-foreground active:bg-secondary active:text-foreground"
                    )}
                  >
                    <Icon className="h-[18px] w-[18px] shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
