import { ProtectedLayout } from "@/components/protected-layout";
import { PaginaComprovacoes } from "@/components/planejamento/comprovacoes";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function Page({
  params,
}: {
  params: Promise<{ indicadorId: string }>;
}) {
  const { indicadorId } = await params;

  return (
    <ProtectedLayout
      titulo="Comprovações"
      headerInicio={
        <Link
          href="/comprovacoes"
          className="inline-flex size-9 items-center justify-center rounded-md border border-input bg-background p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label="Voltar"
        >
          <ArrowLeft className="size-4" />
        </Link>
      }
    >
      <PaginaComprovacoes indicadorId={Number(indicadorId)} />
    </ProtectedLayout>
  );
}
