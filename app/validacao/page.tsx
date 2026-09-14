import { ProtectedLayout } from "@/components/protected-layout";
import { Validacao } from "@/components/validacao/validacao";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ unidade?: string; mes?: string; ano?: string }>;
}) {
  const { unidade, mes, ano } = await searchParams;
  const mesAtual = new Date().getMonth() + 1;
  const anoAtual = new Date().getFullYear();

  return (
    <ProtectedLayout titulo="Validação de Comprovações">
      <Validacao
        unidadeId={
          unidade === "todas" || unidade === "all"
            ? "todas"
            : unidade
              ? Number(unidade)
              : null
        }
        mes={Number(mes ?? mesAtual)}
        ano={Number(ano ?? anoAtual)}
      />
    </ProtectedLayout>
  );
}