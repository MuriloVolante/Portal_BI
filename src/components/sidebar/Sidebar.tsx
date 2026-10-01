"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, ShieldCheck } from "lucide-react";
import { getPageIcon } from "@/lib/icons";
import { APP_VERSION } from "@/lib/version";
import { NavList, type NavItem } from "./SidebarNavItem";
import { SidebarFrame, footerLinkClass } from "@/components/shell/SidebarFrame";
import { useSignOut } from "@/components/shell/useSignOut";
import type { SidebarPage } from "@/types";

export function toNavItems(pages: SidebarPage[]): NavItem[] {
  return pages.map((p) => ({
    href: `/dashboard/${p.slug}`,
    label: p.label,
    icon: getPageIcon(p.icon),
  }));
}

interface SidebarProps {
  pages: SidebarPage[];
  email: string;
  isAdmin: boolean;
}

/** Sidebar do portal (desktop). No celular, a navegação fica no MobileDock. */
export function Sidebar({ pages, email, isAdmin }: SidebarProps) {
  const pathname = usePathname();
  const signOut = useSignOut();

  return (
    <SidebarFrame
      sectionLabel="Dashboards"
      footer={
        <>
          {isAdmin && (
            <Link href="/admin" className={footerLinkClass}>
              <ShieldCheck className="h-[17px] w-[17px] shrink-0" />
              Administração
            </Link>
          )}
          <button onClick={signOut} className={footerLinkClass}>
            <LogOut className="h-[17px] w-[17px] shrink-0" />
            Sair
          </button>
          <div className="flex items-baseline justify-between gap-2 px-3 pt-1">
            <p className="truncate text-[11.5px] text-muted-foreground" title={email}>
              {email}
            </p>
            <p className="shrink-0 text-[11px] text-tertiary">v{APP_VERSION}</p>
          </div>
        </>
      }
    >
      {pages.length === 0 ? (
        <p className="px-3 py-2 text-sm text-tertiary">Nenhum painel liberado.</p>
      ) : (
        <NavList items={toNavItems(pages)} activeHref={pathname} />
      )}
    </SidebarFrame>
  );
}
