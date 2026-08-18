import { ProtectedLayout } from "@/components/protected-layout";
import { DetalheUnidade } from "@/components/unidades/detalhe-unidade";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <ProtectedLayout>
      <DetalheUnidade unidadeId={Number(id)} />
    </ProtectedLayout>
  );
}
