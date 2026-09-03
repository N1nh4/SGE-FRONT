import { ProtectedLayout } from "@/components/protected-layout";
import { PaginaComprovacoes } from "@/components/planejamento/comprovacoes";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string; indicadorId: string }>;
}) {
  const { id, indicadorId } = await params;

  return (
    <ProtectedLayout
      titulo="Comprovações"
      headerAcoes={
        <Link
          href={`/planejamento/${id}`}
          className="inline-flex size-9 items-center justify-center rounded-md border border-input bg-background p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label="Voltar"
        >
          <ArrowLeft className="size-4" />
        </Link>
      }
    >
      <PaginaComprovacoes
        planejamentoId={Number(id)}
        indicadorId={Number(indicadorId)}
      />
    </ProtectedLayout>
  );
}
