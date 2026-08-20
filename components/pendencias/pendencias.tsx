"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CalendarDays,
  FileText,
  LoaderCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  fetchComprovacoes,
  fetchPlanejamento,
  type Planejamento,
} from "@/lib/api";

type Pendencia = {
  comprovacaoId: number;
  arquivo_nome: string;
  justificativa: string | null;
  prazo_reenvio: string | null;
  indicadorId: number;
  indicadorNome: string;
  meta: string;
  iniciativaNome: string;
  objetivoCodigo: string;
  planejamentoId: number;
};

export function Pendencias() {
  const [pendencias, setPendencias] = useState<Pendencia[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    let ativo = true;

    fetchPlanejamento()
      .then(async (lista) => {
        if (!ativo) return;

        const resultados: Pendencia[] = [];

        for (const planejamento of lista) {
          for (const indicador of planejamento.indicadores) {
            const comprovacoes = await fetchComprovacoes(indicador.id);
            for (const c of comprovacoes) {
              if (c.status !== "recusado") continue;
              resultados.push({
                comprovacaoId: c.id,
                arquivo_nome: c.arquivo_nome,
                justificativa: c.justificativa,
                prazo_reenvio: c.prazo_reenvio,
                indicadorId: indicador.id,
                indicadorNome: indicador.nome,
                meta: indicador.meta,
                iniciativaNome: planejamento.nome,
                objetivoCodigo: planejamento.objetivo.codigo,
                planejamentoId: planejamento.id,
              });
            }
          }
        }

        if (!ativo) return;
        setPendencias(resultados);
      })
      .catch(() => {
        if (ativo) setErro(true);
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });

    return () => {
      ativo = false;
    };
  }, []);

  const temPrazoVencido = (prazo: string | null) => {
    if (!prazo) return false;
    return new Date(prazo) < new Date();
  };

  return (
    <>
      <header className="flex items-center gap-4 border-b px-8 py-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pendências</h1>
          <p className="text-sm text-muted-foreground">
            Comprovações recusadas que precisam de ação.
          </p>
        </div>
        {pendencias.length > 0 && (
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-xs font-medium text-white">
            {pendencias.length}
          </span>
        )}
      </header>

      <main className="flex-1 bg-cinza-claro p-8">
        {carregando && (
          <div className="flex items-center justify-center gap-3 py-16 text-sm text-muted-foreground">
            <LoaderCircle className="h-5 w-5 animate-spin" />
            Carregando pendências...
          </div>
        )}

        {!carregando && erro && (
          <div className="rounded-xl border bg-card p-10 text-center text-sm text-muted-foreground">
            Não foi possível carregar as pendências.
          </div>
        )}

        {!carregando && !erro && pendencias.length === 0 && (
          <div className="rounded-xl border bg-card p-10 text-center text-sm text-muted-foreground">
            Nenhuma pendência no momento.
          </div>
        )}

        {!carregando && !erro && pendencias.length > 0 && (
          <div className="flex flex-col gap-4">
            {pendencias.map((p) => (
              <article
                key={p.comprovacaoId}
                className="flex flex-col gap-4 rounded-xl border bg-card p-5 shadow-sm sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex w-fit rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                      {p.objetivoCodigo}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {p.iniciativaNome}
                    </span>
                  </div>

                  <h2 className="text-sm font-semibold">{p.indicadorNome}</h2>
                  {/* <p className="text-xs text-muted-foreground">Meta: {p.meta}</p> */}
                  {/* 
                  <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
                    <FileText className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{p.arquivo_nome}</span>
                  </div> */}

                  {p.justificativa && (
                    <div className="mt-1 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                      <div>
                        <p className="text-xs font-medium text-red-700">
                          Justificativa:
                        </p>
                        <p className="text-xs text-red-600">
                          {p.justificativa}
                        </p>
                      </div>
                    </div>
                  )}

                  {p.prazo_reenvio && (
                    <div
                      className={`flex items-center gap-1.5 text-xs ${
                        temPrazoVencido(p.prazo_reenvio)
                          ? "font-medium text-red-600"
                          : "text-muted-foreground"
                      }`}
                    >
                      <CalendarDays className="h-3.5 w-3.5" />
                      {temPrazoVencido(p.prazo_reenvio)
                        ? "Prazo vencido em"
                        : "Reenviar até"}{" "}
                      {new Date(p.prazo_reenvio).toLocaleDateString("pt-BR")}
                    </div>
                  )}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  render={
                    <Link
                      href={`/planejamento/${p.planejamentoId}/comprovacoes/${p.indicadorId}`}
                    />
                  }
                  className="shrink-0 cursor-pointer"
                >
                  Reenviar
                </Button>
              </article>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
