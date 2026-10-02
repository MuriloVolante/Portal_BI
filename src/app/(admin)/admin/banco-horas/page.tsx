import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/admin/PageHeader";
import { SqlConnectionTest } from "@/components/admin/SqlConnectionTest";
import { ExportLogTable } from "@/components/admin/ExportLogTable";
import { listExportLogs, type ExportLogEntry } from "@/lib/bancoHoras/audit";

export const dynamic = "force-dynamic";

export default async function BancoHorasAdminPage() {
  let entries: ExportLogEntry[] = [];
  let logError: string | null = null;
  try {
    entries = await listExportLogs(100);
  } catch (err) {
    console.error("[banco-horas] histórico:", err);
    logError = "Não foi possível carregar o histórico (a migration 0004 já foi aplicada?).";
  }

  return (
    <div className="animate-view-in">
      <PageHeader
        title="Exportações"
        description="Banco de horas: teste de conexão com o SQL Server e histórico de quem exportou o quê."
      />

      <div className="space-y-4">
        <Card className="stagger" style={{ "--i": 0 } as React.CSSProperties}>
          <CardHeader>
            <CardTitle>Conexão com o SQL Server</CardTitle>
            <CardDescription>
              Testa, em ordem, configuração, endereço, porta, login e leitura da view. A primeira etapa que
              falhar mostra onde está o problema e quem resolve.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SqlConnectionTest />
          </CardContent>
        </Card>

        <Card className="stagger overflow-hidden" style={{ "--i": 1 } as React.CSSProperties}>
          <CardHeader>
            <CardTitle>Histórico</CardTitle>
            <CardDescription>Últimas 100 tentativas: exportações, falhas ao abrir os filtros e testes de conexão.</CardDescription>
          </CardHeader>
          <CardContent className="px-0 pb-2">
            {logError ? (
              <p className="px-6 pb-4 text-sm text-destructive">{logError}</p>
            ) : (
              <ExportLogTable entries={entries} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
