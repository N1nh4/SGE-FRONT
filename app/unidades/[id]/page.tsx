import { Sidebar } from "@/components/sidebar";
import { DetalheUnidade } from "@/components/unidades/detalhe-unidade";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <DetalheUnidade unidadeId={Number(id)} />
      </div>
    </div>
  );
}
