"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { getSessionInfo } from "@/lib/auth/session";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import {
  demoCreatePage,
  demoDeletePage,
  demoTogglePermission,
  demoUpdatePage,
  isDemoMode,
} from "@/lib/demo";
import type { Role } from "@/types";

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

// ---------- Usuários ----------

export async function createUser(input: {
  full_name: string;
  email: string;
  password: string;
  role: Role;
}): Promise<ActionResult> {
  await assertAdmin();

  if (isDemoMode) {
    return { error: "Modo demo: criação de usuários requer o Supabase configurado." };
  }
  if (!input.email || !input.password) {
    return { error: "Email e senha são obrigatórios." };
  }
  if (input.password.length < 6) {
    return { error: "A senha deve ter pelo menos 6 caracteres." };
  }

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: input.full_name || null },
  });

  if (error || !data.user) {
    const exists =
      error?.code === "email_exists" ||
      (error?.message ?? "").toLowerCase().includes("already");
    return {
      error: exists
        ? "Já existe um usuário com esse email."
        : "Não foi possível criar o usuário.",
    };
  }

  // O trigger já criou o profile; garante nome e role escolhidos.
  await admin.from("profiles").upsert({
    id: data.user.id,
    full_name: input.full_name || null,
    role: input.role,
  });

  revalidatePath("/admin/usuarios");
  return {};
}

export async function updateUserProfile(
  userId: string,
  input: { full_name: string; role: Role }
): Promise<ActionResult> {
  const session = await assertAdmin();

  if (isDemoMode) {
    return { error: "Modo demo: edição de usuários requer o Supabase configurado." };
  }
  if (session.user.id === userId && input.role !== "admin") {
    return { error: "Você não pode remover seu próprio papel de admin." };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ full_name: input.full_name || null, role: input.role })
    .eq("id", userId);

  if (error) return { error: "Não foi possível atualizar o usuário." };

  revalidatePath("/admin/usuarios");
  revalidatePath(`/admin/usuarios/${userId}`);
  return {};
}

// ---------- Permissões de usuário ----------

export async function toggleUserPage(
  userId: string,
  pageId: string,
  enabled: boolean
): Promise<ActionResult> {
  await assertAdmin();

  if (isDemoMode) {
    demoTogglePermission(userId, pageId, enabled);
    revalidatePath(`/admin/usuarios/${userId}`);
    revalidatePath("/admin/usuarios");
    return {};
  }

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

  if (isDemoMode) {
    return { error: "Modo demo: redefinição de senha requer o Supabase configurado." };
  }

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

  if (isDemoMode) {
    const result = demoCreatePage(input);
    if (!result.error) revalidatePath("/admin/paginas");
    return result;
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

  if (isDemoMode) {
    const result = demoUpdatePage(id, input);
    if (!result.error) revalidatePath("/admin/paginas");
    return result;
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

  if (isDemoMode) {
    demoDeletePage(id);
    revalidatePath("/admin/paginas");
    return {};
  }

  const admin = createAdminClient();
  const { error } = await admin.from("pages").delete().eq("id", id);

  if (error) return { error: "Não foi possível remover a página." };

  revalidatePath("/admin/paginas");
  return {};
}
