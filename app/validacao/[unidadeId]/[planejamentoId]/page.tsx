import { ProtectedLayout } from "@/components/protected-layout";
import { DetalheIniciativa } from "@/components/validacao/detalhe-iniciativa";

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
    <ProtectedLayout>
      <DetalheIniciativa
        unidadeId={Number(unidadeId)}
        planejamentoId={Number(planejamentoId)}
        mes={Number(mes ?? mesAtual)}
        ano={Number(ano ?? anoAtual)}
      />
    </ProtectedLayout>
  );
}
