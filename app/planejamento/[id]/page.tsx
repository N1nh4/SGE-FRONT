import { ProtectedLayout } from "@/components/protected-layout";
import { DetalhePlanejamento } from "@/components/planejamento/detalhe";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <ProtectedLayout
      titulo="Detalhes do Planejamento Estratégico"
      headerAcoes={
        <Link
          href="/planejamento"
          className="inline-flex size-9 items-center justify-center rounded-md border border-input bg-background p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label="Voltar"
        >
          <ArrowLeft className="size-4" />
        </Link>
      }
    >
      <DetalhePlanejamento id={Number(id)} />
    </ProtectedLayout>
  );
}
