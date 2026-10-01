import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { MeshField } from "@/components/brand/MeshField";
import { MeshMark } from "@/components/brand/MeshMark";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-sidebar">
      <div className="absolute inset-0">
        <MeshField spread={0.46} />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(45%_40%_at_50%_50%,rgb(38_38_38/.92),rgb(38_38_38/.55)_60%,transparent)]" />

      <div className="pointer-events-none absolute left-6 top-6 flex items-center gap-2.5 sm:left-10 sm:top-9">
        <MeshMark size={28} />
        <span className="font-display text-[15px] font-semibold tracking-[-0.02em]">
          Portal <span className="text-primary">BI</span>
        </span>
      </div>

      <div className="pointer-events-none relative z-10 flex min-h-[100dvh] animate-view-in flex-col items-center justify-center px-6 text-center">
        <p className="font-display text-[88px] font-semibold leading-none tracking-[-0.04em] text-primary sm:text-[120px]">
          404
        </p>
        <h1 className="mt-4 text-2xl font-semibold sm:text-3xl">Esta página não existe</h1>
        <p className="mt-3 max-w-md text-[15px] leading-relaxed text-muted-foreground">
          O endereço pode ter sido digitado errado, ou o painel que estava aqui foi removido.
        </p>
        <Button asChild size="lg" className="pointer-events-auto mt-8">
          <Link href="/login">
            Ir para o login
            <ArrowRight />
          </Link>
        </Button>
      </div>
    </main>
  );
}
