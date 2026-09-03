import { ProtectedLayout } from "@/components/protected-layout";
import { DetalheIniciativa } from "@/components/validacao/detalhe-iniciativa";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ unidadeId: string; planejamentoId: string }>;
  searchParams: Promise<{ mes?: string; ano?: string }>;
}) {
  const { unidadeId, planejamentoId } = await params;
  const { mes, ano } = await searchParams;
  const mesAtual = new Date().getMonth() + 1;
  const anoAtual = new Date().getFullYear();

  return (
    <ProtectedLayout
      titulo="Validação de Comprovações"
      headerAcoes={
        <Link
          href={`/validacao/${unidadeId}?mes=${mes ?? mesAtual}&ano=${ano ?? anoAtual}`}
          className="inline-flex size-9 items-center justify-center rounded-md border border-input bg-background p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label="Voltar"
        >
          <ArrowLeft className="size-4" />
        </Link>
      }
    >
      <DetalheIniciativa
        unidadeId={Number(unidadeId)}
        planejamentoId={Number(planejamentoId)}
        mes={Number(mes ?? mesAtual)}
        ano={Number(ano ?? anoAtual)}
      />
    </ProtectedLayout>
  );
}
