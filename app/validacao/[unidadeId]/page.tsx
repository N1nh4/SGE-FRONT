import { ProtectedLayout } from "@/components/protected-layout";
import { ValidacaoUnidade } from "@/components/validacao/validacao-unidade";

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
    <ProtectedLayout>
      <ValidacaoUnidade
        unidadeId={Number(unidadeId)}
        mes={Number(mes ?? mesAtual)}
        ano={Number(ano ?? anoAtual)}
      />
    </ProtectedLayout>
  );
}
