import { Sidebar } from "@/components/sidebar";
import { PaginaComprovacoes } from "@/components/planejamento/comprovacoes";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string; indicadorId: string }>;
}) {
  const { id, indicadorId } = await params;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <PaginaComprovacoes
          planejamentoId={Number(id)}
          indicadorId={Number(indicadorId)}
        />
      </div>
    </div>
  );
}
