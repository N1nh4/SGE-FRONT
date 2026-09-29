// Página desativada por decisão do time. Mantida em comentário para reativar
// quando for preciso: basta restaurar o bloco abaixo (o componente continua em
// components/planejamento/detalhe.tsx, intocado).
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function Page() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 bg-cinza-claro p-8 text-center">
      <h1 className="text-lg font-semibold text-foreground">
        Detalhes do Planejamento Estratégico desativado
      </h1>
      <p className="max-w-md text-sm text-muted-foreground">
        Esta página foi retirada de uso. Os dados continuam disponíveis em
        Indicadores e Comprovações.
      </p>
      <Link
        href="/planejamento"
        className="inline-flex size-9 items-center justify-center rounded-md border border-input bg-background p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        aria-label="Voltar"
      >
        <ArrowLeft className="size-4" />
      </Link>
    </main>
  );
}

/*
import { ProtectedLayout } from "@/components/protected-layout";
import { DetalhePlanejamento } from "@/components/planejamento/detalhe";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <ProtectedLayout
      titulo="Detalhes do Planejamento Estratégico"
      headerInicio={
        <Link
          href="/planejamento"
          className="inline-flex size-9 items-center justify-center rounded-md border border-input bg-background p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label="Voltar"
        >
          <ArrowLeft className="size-4" />
        </Link>
      }
    >
      <DetalhePlanejamento id={Number(id)} />
    </ProtectedLayout>
  );
}
*/
