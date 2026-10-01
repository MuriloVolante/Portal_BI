"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

// Altura do item + espaço entre itens: o indicador deslizante usa esses
// números para se posicionar sem medir o DOM.
const ITEM_H = 42;
const GAP = 4;
const INDICATOR_H = 22;

interface SidebarNavItemProps {
  item: NavItem;
  active: boolean;
  index: number;
  onNavigate?: () => void;
}

export function SidebarNavItem({ item, active, index, onNavigate }: SidebarNavItemProps) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      style={{ "--i": index } as React.CSSProperties}
      className={cn(
        "stagger group flex h-[42px] items-center gap-3 rounded-[9px] px-3 text-sm font-medium transition-colors [transition-duration:200ms]",
        active
          ? "bg-primary/[.12] text-primary"
          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
      )}
    >
      <Icon className="h-[17px] w-[17px] shrink-0 transition-transform [transition-duration:300ms] ease-spring group-hover:-rotate-[4deg] group-hover:scale-[1.12]" />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

interface NavListProps {
  items: NavItem[];
  activeHref: string | null;
  onNavigate?: () => void;
}

/** Lista de navegação com a barra lima que desliza até o item ativo. */
export function NavList({ items, activeHref, onNavigate }: NavListProps) {
  const activeIndex = items.findIndex((i) => i.href === activeHref);

  return (
    <div className="relative space-y-1">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -left-3 top-0 w-[3px] rounded-r-full bg-primary shadow-[0_0_12px_rgb(150_215_55/.55)] transition-[transform,opacity] [transition-duration:420ms] ease-spring"
        style={{
          height: INDICATOR_H,
          opacity: activeIndex < 0 ? 0 : 1,
          transform: `translateY(${Math.max(activeIndex, 0) * (ITEM_H + GAP) + (ITEM_H - INDICATOR_H) / 2}px)`,
        }}
      />
      {items.map((item, i) => (
        <SidebarNavItem
          key={item.href}
          item={item}
          index={i}
          active={i === activeIndex}
          onNavigate={onNavigate}
        />
      ))}
    </div>
  );
}
