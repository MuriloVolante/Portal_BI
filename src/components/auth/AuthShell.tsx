import { MeshCanvas } from "@/components/brand/MeshCanvas";
import { MeshMark } from "@/components/brand/MeshMark";
import { APP_VERSION } from "@/lib/version";

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

/** Tela dividida: arte da malha à esquerda (desktop) e formulário à direita. */
export function AuthShell({ title, subtitle, children }: AuthShellProps) {
  return (
    <div className="grid min-h-[100dvh] bg-background lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden overflow-hidden border-r bg-sidebar lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(60%_55%_at_50%_45%,rgb(150_215_55/.08),transparent_70%)]" />
        <div className="absolute inset-0">
          <MeshCanvas />
        </div>
        <div className="pointer-events-none absolute left-10 top-9 flex items-center gap-2.5">
          <MeshMark size={30} />
          <span className="font-display text-[15.5px] font-semibold tracking-[-0.02em]">
            Portal <span className="text-primary">BI</span>
          </span>
        </div>
        <div className="pointer-events-none absolute bottom-10 left-10 right-10">
          <p className="font-display text-[28px] font-semibold leading-tight tracking-[-0.02em]">
            Seus painéis,
            <br />
            num só lugar.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">Viação Garcia · indicadores em Power BI</p>
        </div>
      </section>

      <section className="flex flex-col">
        <div className="relative h-[190px] shrink-0 overflow-hidden border-b bg-sidebar lg:hidden">
          <MeshCanvas />
          <div className="pointer-events-none absolute left-5 top-5 flex items-center gap-2">
            <MeshMark size={26} />
            <span className="font-display text-[15px] font-semibold tracking-[-0.02em]">
              Portal <span className="text-primary">BI</span>
            </span>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center px-5 py-10 sm:px-8">
          <div className="w-full max-w-[380px] animate-view-in">
            <h1 className="text-[26px] font-semibold leading-tight">{title}</h1>
            <p className="mt-1.5 text-[15px] text-muted-foreground">{subtitle}</p>
            <div className="mt-8">{children}</div>
          </div>
        </div>

        <p className="pb-6 text-center text-[11px] text-tertiary">v{APP_VERSION}</p>
      </section>
    </div>
  );
}
