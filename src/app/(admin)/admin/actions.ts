"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { getSessionInfo } from "@/lib/auth/session";
import { createAdminClient, createClient } from "@/lib/supabase/server";

interface ActionResult {
  error?: string;
}

/** Garante que quem chama a action é admin. */
async function assertAdmin() {
  const session = await getSessionInfo();
  if (!session || session.profile?.role !== "admin") {
    throw new Error("Acesso negado");
  }
  return session;
}

// ---------- Permissões de usuário ----------

export async function toggleUserPage(
  userId: string,
  pageId: string,
  enabled: boolean
): Promise<ActionResult> {
  await assertAdmin();
  const admin = createAdminClient();

  if (enabled) {
    const { error } = await admin
      .from("user_pages")
      .upsert(
        { user_id: userId, page_id: pageId },
        { onConflict: "user_id,page_id", ignoreDuplicates: true }
      );
    if (error) return { error: "Não foi possível liberar a página." };
  } else {
    const { error } = await admin
      .from("user_pages")
      .delete()
      .eq("user_id", userId)
      .eq("page_id", pageId);
    if (error) return { error: "Não foi possível revogar a página." };
  }

  revalidatePath(`/admin/usuarios/${userId}`);
  revalidatePath("/admin/usuarios");
  return {};
}

export async function sendPasswordReset(email: string): Promise<ActionResult> {
  await assertAdmin();

  const origin = headers().get("origin") ?? "";
  const supabase = createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/reset-password`,
  });

  if (error) return { error: "Não foi possível enviar o email de redefinição." };
  return {};
}

// ---------- CRUD de páginas ----------

interface PageInput {
  slug: string;
  label: string;
  embed_url?: string;
  icon?: string;
  order: number;
  is_active: boolean;
}

export async function createPage(input: PageInput): Promise<ActionResult> {
  await assertAdmin();

  if (!input.slug || !input.label || !input.embed_url) {
    return { error: "Slug, nome e URL de embed são obrigatórios." };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("pages").insert({
    slug: input.slug,
    label: input.label,
    embed_url: input.embed_url,
    icon: input.icon || null,
    order: input.order,
    is_active: input.is_active,
  });

  if (error) {
    return {
      error: error.code === "23505"
        ? "Já existe uma página com esse slug."
        : "Não foi possível criar a página.",
    };
  }

  revalidatePath("/admin/paginas");
  return {};
}

export async function updatePage(
  id: string,
  input: PageInput
): Promise<ActionResult> {
  await assertAdmin();

  if (!input.slug || !input.label) {
    return { error: "Slug e nome são obrigatórios." };
  }

  const update: Record<string, unknown> = {
    slug: input.slug,
    label: input.label,
    icon: input.icon || null,
    order: input.order,
    is_active: input.is_active,
  };

  // embed_url vazia = manter a atual (a URL nunca volta para a interface).
  if (input.embed_url) {
    update.embed_url = input.embed_url;
  }

  const admin = createAdminClient();
  const { error } = await admin.from("pages").update(update).eq("id", id);

  if (error) {
    return {
      error: error.code === "23505"
        ? "Já existe uma página com esse slug."
        : "Não foi possível atualizar a página.",
    };
  }

  revalidatePath("/admin/paginas");
  return {};
}

export async function deletePage(id: string): Promise<ActionResult> {
  await assertAdmin();

  const admin = createAdminClient();
  const { error } = await admin.from("pages").delete().eq("id", id);

  if (error) return { error: "Não foi possível remover a página." };

  revalidatePath("/admin/paginas");
  return {};
}
