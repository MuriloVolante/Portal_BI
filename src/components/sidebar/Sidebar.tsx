"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { BarChart3, LogOut, Menu, ShieldCheck, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { DEMO_SESSION_COOKIE, isDemoMode } from "@/lib/demo";
import { useUser } from "@/hooks/useUser";
import { useAllowedPages } from "@/hooks/useAllowedPages";
import { SidebarNavItem } from "./SidebarNavItem";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile } = useUser();
  const { pages, loading } = useAllowedPages();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleSignOut() {
    if (isDemoMode) {
      document.cookie = `${DEMO_SESSION_COOKIE}=; path=/; max-age=0`;
    } else {
      const supabase = createClient();
      await supabase.auth.signOut();
    }
    router.push("/login");
    router.refresh();
  }

  const nav = (
    <>
      <div className="flex h-16 items-center gap-2 border-b px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/15">
          <BarChart3 className="h-4 w-4 text-primary" />
        </div>
        <span className="text-base font-semibold tracking-tight">
          Portal BI
        </span>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {loading ? (
          <div className="space-y-2 p-1">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        ) : pages.length === 0 ? (
          <p className="px-3 py-2 text-sm text-muted-foreground">
            Nenhuma página liberada.
          </p>
        ) : (
          pages.map((page) => (
            <SidebarNavItem
              key={page.id}
              page={page}
              active={pathname === `/dashboard/${page.slug}`}
              onNavigate={() => setMobileOpen(false)}
            />
          ))
        )}
      </nav>

      <div className="space-y-1 border-t p-3">
        {profile?.role === "admin" && (
          <Link
            href="/admin"
            onClick={() => setMobileOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              pathname.startsWith("/admin")
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
          >
            <ShieldCheck className="h-4 w-4 shrink-0" />
            Administração
          </Link>
        )}
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Sair
        </button>
        {user?.email && (
          <p className="truncate px-3 pt-1 text-xs text-muted-foreground">
            {user.email}
          </p>
        )}
      </div>
    </>
  );

  return (
    <>
      {/* Botão hamburger — mobile */}
      <Button
        variant="secondary"
        size="icon"
        className="fixed left-3 top-3 z-40 md:hidden"
        onClick={() => setMobileOpen(true)}
        aria-label="Abrir menu"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Overlay mobile */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar mobile (drawer) */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-sidebar text-sidebar-foreground transition-transform duration-200 md:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-3"
          onClick={() => setMobileOpen(false)}
          aria-label="Fechar menu"
        >
          <X className="h-5 w-5" />
        </Button>
        {nav}
      </aside>

      {/* Sidebar desktop — fixa à esquerda */}
      <aside className="hidden h-screen w-64 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground md:flex">
        {nav}
      </aside>
    </>
  );
}
