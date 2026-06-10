"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { SidebarPage } from "@/types";

// Colunas seguras — embed_url nunca é selecionada no cliente.
const SAFE_COLUMNS = 'id, slug, label, icon, "order", is_active, created_at';

interface UseAllowedPagesResult {
  pages: SidebarPage[];
  loading: boolean;
}

/**
 * Páginas que o usuário pode ver na sidebar.
 * Admin enxerga todas as páginas ativas; usuário comum, apenas as
 * liberadas em user_pages (a RLS também garante isso no servidor).
 */
export function useAllowedPages(): UseAllowedPagesResult {
  const [pages, setPages] = useState<SidebarPage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (!cancelled) {
          setPages([]);
          setLoading(false);
        }
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single<{ role: string }>();

      let result: SidebarPage[] = [];

      if (profile?.role === "admin") {
        const { data } = await supabase
          .from("pages")
          .select(SAFE_COLUMNS)
          .eq("is_active", true)
          .order("order", { ascending: true });
        result = (data ?? []) as unknown as SidebarPage[];
      } else {
        const { data } = await supabase
          .from("user_pages")
          .select(`page:pages(${SAFE_COLUMNS})`)
          .eq("user_id", user.id);

        result = (data ?? [])
          .map((row) => row.page as unknown as SidebarPage | null)
          .filter((p): p is SidebarPage => !!p && p.is_active)
          .sort((a, b) => a.order - b.order);
      }

      if (!cancelled) {
        setPages(result);
        setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { pages, loading };
}
