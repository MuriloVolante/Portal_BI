import { requireUser } from "@/lib/auth/session";
import { Sidebar } from "@/components/sidebar/Sidebar";

export default async function PortalLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requireUser();

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
