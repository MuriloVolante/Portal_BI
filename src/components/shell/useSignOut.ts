"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { DEMO_SESSION_COOKIE, isDemoMode } from "@/lib/demo";

export function useSignOut() {
  const router = useRouter();

  return async function signOut() {
    if (isDemoMode) {
      document.cookie = `${DEMO_SESSION_COOKIE}=; path=/; max-age=0`;
    } else {
      await createClient().auth.signOut();
    }
    router.push("/login");
    router.refresh();
  };
}
