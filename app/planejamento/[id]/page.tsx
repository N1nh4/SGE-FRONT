import { Sidebar } from "@/components/sidebar";
import { DetalhePlanejamento } from "@/components/planejamento/detalhe";

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
        <DetalhePlanejamento id={Number(id)} />
      </div>
    </div>
  );
}
