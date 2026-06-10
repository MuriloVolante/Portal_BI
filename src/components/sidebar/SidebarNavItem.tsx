"use client";

import Link from "next/link";
import { icons, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SidebarPage } from "@/types";

interface SidebarNavItemProps {
  page: SidebarPage;
  active: boolean;
  onNavigate?: () => void;
}

export function SidebarNavItem({ page, active, onNavigate }: SidebarNavItemProps) {
  const Icon =
    (page.icon && icons[page.icon as keyof typeof icons]) || LayoutDashboard;

  return (
    <Link
      href={`/dashboard/${page.slug}`}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-primary/15 text-primary"
          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{page.label}</span>
    </Link>
  );
}
