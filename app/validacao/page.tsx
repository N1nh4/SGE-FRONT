import { ProtectedLayout } from "@/components/protected-layout";
import { Validacao } from "@/components/validacao/validacao";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    unidades?: string;
    unidade?: string;
    mes?: string;
    ano?: string;
  }>;
}) {
  const { unidades, unidade, mes, ano } = await searchParams;
  const mesAtual = new Date().getMonth() + 1;
  const anoAtual = new Date().getFullYear();

  // Sem parâmetro a lista começa em todas as unidades, e não na unidade do
  // usuário: admin e master precisam validar o conjunto todo. O parâmetro
  // legado "unidade" continua aceito para links antigos.
  const legado = unidade && unidade !== "todas" && unidade !== "all";
  const selecionada = (unidades ?? (legado ? unidade : ""))
    .split(",")
    .map((v) => Number(v.trim()))
    .filter((v) => Number.isFinite(v) && v > 0);

  return (
    <ProtectedLayout titulo="Validação de Comprovações">
      <Validacao
        unidadesSelecionadas={selecionada}
        mes={Number(mes ?? mesAtual)}
        ano={Number(ano ?? anoAtual)}
      />
    </ProtectedLayout>
  );
}
