import { ProtectedLayout } from "@/components/protected-layout";
import { ValidacaoUnidade } from "@/components/validacao/validacao-unidade";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ unidadeId: string }>;
  searchParams: Promise<{ mes?: string; ano?: string }>;
}) {
  const { unidadeId } = await params;
  const { mes, ano } = await searchParams;
  const mesAtual = new Date().getMonth() + 1;
  const anoAtual = new Date().getFullYear();

  return (
    <ProtectedLayout
      titulo="Validação de Comprovações"
      headerAcoes={
        <Link
          href="/validacao"
          className="inline-flex size-9 items-center justify-center rounded-md border border-input bg-background p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label="Voltar"
        >
          <ArrowLeft className="size-4" />
        </Link>
      }
    >
      <ValidacaoUnidade
        unidadeId={Number(unidadeId)}
        mes={Number(mes ?? mesAtual)}
        ano={Number(ano ?? anoAtual)}
      />
    </ProtectedLayout>
  );
}
