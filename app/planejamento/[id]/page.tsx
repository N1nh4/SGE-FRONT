import { ProtectedLayout } from "@/components/protected-layout";
import { DetalhePlanejamento } from "@/components/planejamento/detalhe";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <ProtectedLayout>
      <DetalhePlanejamento id={Number(id)} />
    </ProtectedLayout>
  );
}
