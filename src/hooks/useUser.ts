"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { isDemoMode } from "@/lib/demo";
import type { Profile } from "@/types";

interface UseUserResult {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
}

/** Usuário autenticado + profile (role) no cliente. */
export function useUser(): UseUserResult {
  const [state, setState] = useState<UseUserResult>({
    user: null,
    profile: null,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;

    if (isDemoMode) {
      fetch("/api/demo/me")
        .then(async (res) => {
          if (cancelled) return;
          if (!res.ok) {
            setState({ user: null, profile: null, loading: false });
            return;
          }
          const data = await res.json();
          setState({ user: data.user, profile: data.profile, loading: false });
        })
        .catch(() => {
          if (!cancelled) setState({ user: null, profile: null, loading: false });
        });
      return () => {
        cancelled = true;
      };
    }

    const supabase = createClient();

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (!cancelled) setState({ user: null, profile: null, loading: false });
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("id, full_name, role, created_at")
        .eq("id", user.id)
        .single<Profile>();

      if (!cancelled) setState({ user, profile, loading: false });
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
