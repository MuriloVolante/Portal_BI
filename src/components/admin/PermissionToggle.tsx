"use client";

import { useState, useTransition } from "react";
import { icons, LayoutDashboard } from "lucide-react";
import { toggleUserPage } from "@/app/(admin)/admin/actions";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { SidebarPage } from "@/types";

interface PermissionToggleProps {
  userId: string;
  page: SidebarPage;
  initialEnabled: boolean;
}

export function PermissionToggle({
  userId,
  page,
  initialEnabled,
}: PermissionToggleProps) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [pending, startTransition] = useTransition();

  const Icon =
    (page.icon && icons[page.icon as keyof typeof icons]) || LayoutDashboard;

  function handleToggle(next: boolean) {
    setEnabled(next);
    startTransition(async () => {
      const { error } = await toggleUserPage(userId, page.id, next);
      if (error) setEnabled(!next); // desfaz em caso de falha
    });
  }

  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-md px-3 py-2.5 transition-colors hover:bg-secondary/50",
        pending && "opacity-70"
      )}
    >
      <div className="flex items-center gap-3">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">{page.label}</span>
        {!page.is_active && <Badge variant="secondary">inativa</Badge>}
      </div>
      <Switch
        checked={enabled}
        onCheckedChange={handleToggle}
        disabled={pending}
        aria-label={`Acesso a ${page.label}`}
      />
    </div>
  );
}
