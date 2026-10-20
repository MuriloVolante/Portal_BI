import Link from "next/link";
import { ArrowUpRight, ChevronRight, FileStack, KeySquare, Users, type LucideIcon } from "lucide-react";
import { INACTIVE_DAYS, getOverviewData, type InactiveUser } from "@/lib/admin/overview";
import { formatDateBR } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/admin/PageHeader";
import { DailyAccessChart, TopPagesChart } from "@/components/admin/OverviewCharts";

export const dynamic = "force-dynamic";

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

interface StatCardProps {
  href: string;
  title: string;
  value: number;
  support: string;
  icon: LucideIcon;
  index: number;
}

function StatCard({ href, title, value, support, icon: Icon, index }: StatCardProps) {
  return (
    <Link
      href={href}
      style={{ "--i": index } as React.CSSProperties}
      className="stagger group relative block overflow-hidden rounded-xl border bg-card p-5 transition-[transform,border-color,box-shadow] [transition-duration:400ms] ease-spring hover:-translate-y-1 hover:border-primary/50 hover:shadow-[0_14px_34px_rgb(0_0_0/.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-14 -top-14 h-40 w-40 rounded-full bg-[radial-gradient(circle,rgb(150_215_55/.22),transparent_70%)] opacity-0 transition-opacity [transition-duration:500ms] group-hover:opacity-100"
      />
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{title}</span>
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/[.12] text-primary">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-3 font-display text-[34px] font-semibold leading-none tracking-[-0.02em] tabular-nums">{value}</p>
      <p className="mt-2.5 flex items-center gap-1 text-[13px] text-muted-foreground">
        {support}
        <ArrowUpRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
      </p>
    </Link>
  );
}

function InactiveList({ users }: { users: InactiveUser[] }) {
  if (!users.length) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Todo mundo entrou no portal nos últimos {INACTIVE_DAYS} dias.
      </p>
    );
  }

  return (
    <ul className="-mx-2 divide-y divide-[rgb(70_70_70/.5)]">
      {users.map((u) => (
        <li key={u.id}>
          <Link
            href={`/admin/usuarios/${u.id}`}
            className="group flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{u.name ?? "Sem nome"}</p>
              <p className="truncate text-xs text-muted-foreground">{u.email}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className={u.days === null ? "text-sm text-warning" : "text-sm tabular-nums"}>
                {u.days === null ? "nunca acessou" : `há ${u.days} dias`}
              </p>
              {u.lastAccess && <p className="text-xs tabular-nums text-tertiary">{formatDateBR(u.lastAccess)}</p>}
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-tertiary transition-transform group-hover:translate-x-0.5" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default async function AdminOverviewPage() {
  const data = await getOverviewData();
  const avgPerUser = data.permissions.usersWithAccess
    ? (data.permissions.total / data.permissions.usersWithAccess).toLocaleString("pt-BR", { maximumFractionDigits: 1 })
    : "0";

  return (
    <div className="animate-view-in">
      <PageHeader title="Visão geral" description="Quem está usando o portal e o que mais se abre." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          index={0}
          href="/admin/usuarios"
          title="Usuários"
          value={data.users.total}
          icon={Users}
          support={`${plural(data.users.seenLast24h, "entrou", "entraram")} nas últimas 24h`}
        />
        <StatCard
          index={1}
          href="/admin/paginas"
          title="Painéis"
          value={data.pages.total}
          icon={FileStack}
          support={`${plural(data.pages.active, "ativo", "ativos")} · ${plural(data.pages.total - data.pages.active, "inativo", "inativos")}`}
        />
        <StatCard
          index={2}
          href="/admin/usuarios"
          title="Liberações"
          value={data.permissions.total}
          icon={KeySquare}
          support={`média de ${avgPerUser} por usuário com acesso`}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Card className="stagger" style={{ "--i": 3 } as React.CSSProperties}>
          <CardHeader className="pb-4">
            <CardTitle>Acessos por dia</CardTitle>
            <CardDescription>
              Últimas 2 semanas · {plural(data.periodTotal, "abertura", "aberturas")} de painel
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.periodTotal ? (
              <DailyAccessChart data={data.daily} />
            ) : (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Ainda sem acessos registrados nas últimas 2 semanas.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="stagger" style={{ "--i": 4 } as React.CSSProperties}>
          <CardHeader className="pb-4">
            <CardTitle>Painéis mais abertos</CardTitle>
            <CardDescription>Mesmo período</CardDescription>
          </CardHeader>
          <CardContent>
            {data.topPages.length ? (
              <TopPagesChart data={data.topPages} />
            ) : (
              <p className="py-10 text-center text-sm text-muted-foreground">Nada por aqui ainda.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="stagger mt-4" style={{ "--i": 5 } as React.CSSProperties}>
        <CardHeader className="pb-3">
          <CardTitle>
            Sem acesso há mais de {INACTIVE_DAYS} dias
            {data.inactive.length > 0 && (
              <span className="ml-2 font-sans text-sm font-normal tabular-nums text-muted-foreground">
                {data.inactive.length}
              </span>
            )}
          </CardTitle>
          <CardDescription>
            Contas ativas que não entram no portal há mais de um mês, ou que nunca entraram. Avalie se ainda
            precisam de acesso.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InactiveList users={data.inactive} />
        </CardContent>
      </Card>
    </div>
  );
}
