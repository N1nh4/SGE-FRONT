import { ProtectedLayout } from "@/components/protected-layout";
import { PaginaComprovacoes } from "@/components/planejamento/comprovacoes";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string; indicadorId: string }>;
}) {
  const { id, indicadorId } = await params;

  return (
    <ProtectedLayout>
      <PaginaComprovacoes
        planejamentoId={Number(id)}
        indicadorId={Number(indicadorId)}
      />
    </ProtectedLayout>
  );
}
