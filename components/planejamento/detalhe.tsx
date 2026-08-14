"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  ChartNoAxesCombined,
  Paperclip,
  Rocket,
  Target,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  fetchPlanejamentoById,
  type Planejamento,
} from "@/lib/api";

function formatarData(iso: string | null): string {
  if (!iso) return "—";
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

export function DetalhePlanejamento({ id }: { id: number }) {
  const router = useRouter();
  const [detalhe, setDetalhe] = useState<Planejamento | null>(null);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    fetchPlanejamentoById(id)
      .then(setDetalhe)
      .catch(() => setErro(true));
  }, [id]);

  if (erro) {
    return (
      <>
        <header className="flex items-center justify-between gap-4 border-b px-8 py-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Detalhes do Planejamento
            </h1>
            <p className="text-sm text-muted-foreground">
              Não foi possível carregar os dados deste planejamento.
            </p>
          </div>
        </header>
        <main className="flex-1 bg-cinza-claro p-8">
          <div className="rounded-xl border bg-card p-10 text-center text-sm text-muted-foreground">
            Planejamento não encontrado ou backend indisponível.
          </div>
        </main>
      </>
    );
  }

  if (!detalhe) {
    return (
      <main className="flex flex-1 items-center justify-center bg-cinza-claro p-8">
        <div className="h-2 w-40 overflow-hidden rounded-full bg-muted">
          <div className="h-full w-1/3 animate-pulse rounded-full bg-bege" />
        </div>
      </main>
    );
  }

  return (
    <>
      <header className="flex items-center justify-between gap-4 border-b px-8 py-6">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            render={<Link href="/planejamento" />}
          >
            <ArrowLeft />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Detalhes do Planejamento Estratégico
            </h1>
          </div>
        </div>
      </header>

      <main className="flex flex-1 flex-col gap-6 bg-cinza-claro p-8">
        <section className="rounded-xl border bg-card">
          <div className="flex items-center gap-2 border-b px-5 py-4">
            <Target className="h-4 w-4 text-bege" />
            <h2 className="font-medium">Objetivo Estratégico</h2>
            <span className="inline-flex w-fit rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              {detalhe.objetivo.codigo}
            </span>
          </div>
          <div className="flex flex-col gap-5 p-5">
            <div>
              <h3 className="mt-2 font-semibold">{detalhe.objetivo.nome}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {detalhe.objetivo.descricao}
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  PPA
                </div>
                <p className="mt-1 text-sm">{detalhe.objetivo.ppa}</p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  LOA
                </div>
                <p className="mt-1 text-sm">{detalhe.objetivo.loa}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-xl border bg-card">
          <div className="flex items-center gap-2 border-b px-5 py-4">
            <Rocket className="h-4 w-4 text-bege" />
            <h2 className="font-medium">Iniciativa</h2>
          </div>
          <h3 className="px-5 py-5 font-semibold">{detalhe.nome}</h3>
        </section>

        <section className="rounded-xl border bg-card">
          <div className="flex items-center gap-2 border-b px-5 py-4">
            <ChartNoAxesCombined className="h-4 w-4 text-bege" />
            <h2 className="font-medium">Indicadores</h2>
            <span className="ml-auto rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              {detalhe.indicadores.length}
            </span>
          </div>
          {detalhe.indicadores.length === 0 ? (
            <p className="p-5 text-sm text-muted-foreground">
              Nenhum indicador vinculado a esta iniciativa.
            </p>
          ) : (
            <div className="grid gap-4 p-5">
              {detalhe.indicadores.map((indicador) => (
                <div key={indicador.id} className="rounded-lg border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-medium">{indicador.nome}</h3>
                    <span className="inline-flex w-fit rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                      Fórmula: {indicador.formula}
                    </span>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() =>
                      router.push(
                        `/planejamento/${detalhe.id}/comprovacoes/${indicador.id}`,
                      )
                    }
                    className="mt-4 flex h-auto w-full items-stretch justify-start gap-3 rounded-lg border border-bege/30 bg-bege/5 p-4 text-left whitespace-normal hover:bg-bege/10 cursor-pointer"
                  >
                    <span className="flex flex-col gap-1">
                      <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-bege">
                        <Target className="h-4 w-4" />
                        Meta
                      </span>
                      <span className="text-base">{indicador.meta}</span>
                      <span className="flex items-center gap-1 text-xs font-normal text-muted-foreground">
                        <Paperclip className="h-3.5 w-3.5" />
                        Ver comprovações mensais
                      </span>
                    </span>
                  </Button>

                  <div className="mt-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Orientação para comprovação
                    </div>
                    <p className="mt-1 text-sm">{indicador.orientacao}</p>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-4 text-sm">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <CalendarDays className="h-4 w-4" />
                      Prazo: {formatarData(indicador.prazo)}
                    </span>
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <User className="h-4 w-4" />
                      Responsável: {indicador.unidade?.nome ?? "—"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
