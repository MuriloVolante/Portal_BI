import { MeshField } from "@/components/brand/MeshField";
import { MeshMark } from "@/components/brand/MeshMark";
import { APP_VERSION } from "@/lib/version";

interface AuthShellProps {
  /** Frase sob a marca (ex.: "Acesse a sua conta"). */
  heading: string;
  children: React.ReactNode;
}

/** Tela dividida: malha orgânica à esquerda (desktop) e formulário à direita. */
export function AuthShell({ heading, children }: AuthShellProps) {
  return (
    <div className="grid min-h-[100dvh] bg-background lg:grid-cols-[1.15fr_1fr]">
      <section className="relative hidden overflow-hidden border-r bg-sidebar lg:block">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(55%_50%_at_50%_42%,rgb(150_215_55/.07),transparent_70%)]" />
        <div className="absolute inset-0">
          <MeshField centerY={0.4} spread={0.37} />
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-sidebar via-sidebar/80 to-transparent" />
        <div className="pointer-events-none absolute bottom-12 left-12 right-12">
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-[.2em] text-primary">
            Recursos Humanos · Viação Garcia
          </p>
          <p className="font-display text-[40px] font-semibold leading-[1.08] tracking-[-0.03em] xl:text-[46px]">
            Indicadores de RH
            <br />
            que movem <span className="text-primary">decisões.</span>
          </p>
          <p className="mt-4 text-[15px] text-muted-foreground">Dashboards executivos em Power BI.</p>
        </div>
      </section>

      <section className="flex flex-col">
        <div className="relative h-[150px] shrink-0 overflow-hidden border-b bg-sidebar lg:hidden">
          <MeshField />
        </div>

        <div className="flex flex-1 items-center justify-center px-5 py-10 sm:px-8">
          <div className="w-full max-w-[360px] animate-view-in">
            <div className="mb-9 flex flex-col items-center text-center">
              <div className="flex items-center gap-3">
                <MeshMark size={46} />
                <span className="font-display text-[34px] font-semibold leading-none tracking-[-0.03em]">
                  Portal <span className="text-primary">BI</span>
                </span>
              </div>
              <p className="mt-6 text-[17px] text-foreground/90">{heading}</p>
            </div>
            {children}
          </div>
        </div>

        <p className="pb-6 text-center text-[11px] text-tertiary">v{APP_VERSION}</p>
      </section>
    </div>
  );
}
