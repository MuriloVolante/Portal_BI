"use client";

import { useState, useTransition } from "react";
import { toggleUserPage } from "@/app/(admin)/admin/actions";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { getPageIcon } from "@/lib/icons";
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
  const Icon = getPageIcon(page.icon);

  function handleToggle(next: boolean) {
    setEnabled(next);
    startTransition(async () => {
      const { error } = await toggleUserPage(userId, page.id, next);
      if (error) setEnabled(!next); // desfaz em caso de falha
    });
  }

  return (
    <label
      className={cn(
        "flex cursor-pointer items-center justify-between gap-3 rounded-[10px] px-3 py-3 transition-colors [transition-duration:200ms] hover:bg-secondary",
        pending && "opacity-70"
      )}
    >
      <span className="flex min-w-0 items-center gap-3">
        <span
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors [transition-duration:300ms]",
            enabled ? "bg-primary/[.12] text-primary" : "bg-secondary text-muted-foreground"
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
        <span className="truncate text-sm font-medium">{page.label}</span>
        {!page.is_active && <Badge variant="warning">inativa</Badge>}
      </span>
      <Switch
        checked={enabled}
        onCheckedChange={handleToggle}
        disabled={pending}
        aria-label={`Acesso a ${page.label}`}
      />
    </label>
  );
}
