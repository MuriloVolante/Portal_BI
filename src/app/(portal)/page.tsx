import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { getAllowedPages } from "@/lib/portal/pages";
import { NoPanelsState } from "@/components/empty/states";

export const dynamic = "force-dynamic";

/**
 * Após o login, redireciona para o primeiro dashboard permitido do usuário.
 * Admin sem nenhuma página ativa cai na área administrativa.
 */
export default async function HomePage() {
  const { user, profile } = await requireUser();
  const role = profile?.role ?? "user";
  const pages = await getAllowedPages(user.id, role);

  if (pages[0]) redirect(`/dashboard/${pages[0].slug}`);
  if (role === "admin") redirect("/admin");

  return <NoPanelsState />;
}
