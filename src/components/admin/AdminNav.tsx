"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, FileStack, LayoutGrid, Users, type LucideIcon } from "lucide-react";
import { NavList, type NavItem } from "@/components/sidebar/SidebarNavItem";
import { cn } from "@/lib/utils";

const SECTIONS: NavItem[] = [
  { href: "/admin", label: "Visão geral", icon: LayoutGrid },
  { href: "/admin/usuarios", label: "Usuários", icon: Users },
  { href: "/admin/paginas", label: "Páginas", icon: FileStack },
];

function activeSection(pathname: string): string | null {
  if (pathname === "/admin") return "/admin";
  return SECTIONS.find((s) => s.href !== "/admin" && pathname.startsWith(s.href))?.href ?? null;
}

/** Navegação do admin na sidebar (desktop). */
export function AdminNav() {
  const pathname = usePathname();
  return <NavList items={SECTIONS} activeHref={activeSection(pathname)} />;
}

const TABS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/admin", label: "Geral", icon: LayoutGrid },
  { href: "/admin/usuarios", label: "Usuários", icon: Users },
  { href: "/admin/paginas", label: "Páginas", icon: FileStack },
  { href: "/", label: "Portal", icon: ArrowLeft },
];

/** Tab bar do admin no celular. */
export function AdminTabBar() {
  const pathname = usePathname();
  const active = activeSection(pathname);

  return (
    <nav
      aria-label="Administração"
      className="fixed inset-x-0 bottom-0 z-40 box-content h-[62px] border-t bg-[rgb(38_38_38/.94)] pb-[env(safe-area-inset-bottom)] backdrop-blur-[12px] md:hidden"
    >
      <div className="grid h-full grid-cols-4">
        {TABS.map(({ href, label, icon: Icon }) => {
          const isActive = href === active;
          return (
            <Link
              key={href}
              href={href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "relative flex flex-col items-center justify-center gap-1 text-[10.5px] font-medium transition-colors [transition-duration:200ms]",
                isActive ? "text-primary" : "text-tertiary active:text-foreground"
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "absolute top-0 h-[2.5px] w-[26px] rounded-b-full bg-primary transition-opacity [transition-duration:300ms]",
                  isActive ? "opacity-100" : "opacity-0"
                )}
              />
              <Icon
                className={cn(
                  "h-5 w-5 transition-transform [transition-duration:300ms] ease-spring",
                  isActive && "-translate-y-0.5 scale-[1.08]"
                )}
              />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
