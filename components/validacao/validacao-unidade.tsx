"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  FileText,
  LoaderCircle,
} from "lucide-react";
import Masonry from "react-masonry-css";
import { Button } from "@/components/ui/button";
import {
  fetchComprovacoes,
  fetchPlanejamento,
  fetchUnidades,
  type Planejamento,
  type Unidade,
} from "@/lib/api";

const MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

type IniciativaResumo = {
  planejamentoId: number;
  iniciativaNome: string;
  objetivoCodigo: string;
  objetivoNome: string;
  totalIndicadores: number;
  totalComprovacoes: number;
};

const breakpointColumns = {
  default: 3,
  1280: 3,
  1024: 2,
  768: 2,
  640: 1,
};

export function ValidacaoUnidade({
  unidadeId,
  mes,
  ano,
}: {
  unidadeId: number;
  mes: number;
  ano: number;
}) {
  const router = useRouter();
  const [unidade, setUnidade] = useState<Unidade | null>(null);
  const [iniciativas, setIniciativas] = useState<IniciativaResumo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    fetchUnidades()
      .then((unidades) => {
        const encontrada = unidades.find((u) => u.id === unidadeId);
        if (encontrada) setUnidade(encontrada);
      })
      .catch(() => {});
  }, [unidadeId]);

  useEffect(() => {
    let ativo = true;

    fetchPlanejamento()
      .then(async (lista) => {
        if (!ativo) return;

        const iniciativasMap = new Map<
          number,
          { planejamento: Planejamento; indicadoresCount: number; comprovacoesCount: number }
        >();

        for (const planejamento of lista) {
          let indicadoresCount = 0;
          let comprovacoesCount = 0;

          for (const indicador of planejamento.indicadores) {
            if (!indicador.unidades.some((u) => u.id === unidadeId)) continue;
            indicadoresCount++;
            const comprovacoes = await fetchComprovacoes(indicador.id);
            comprovacoesCount += comprovacoes.filter(
              (c) => c.ano === ano && c.mes === mes,
            ).length;
          }

          if (indicadoresCount > 0) {
            iniciativasMap.set(planejamento.id, {
              planejamento,
              indicadoresCount,
              comprovacoesCount,
            });
          }
        }

        const resultado: IniciativaResumo[] = [];
        for (const [, { planejamento, indicadoresCount, comprovacoesCount }] of iniciativasMap) {
          resultado.push({
            planejamentoId: planejamento.id,
            iniciativaNome: planejamento.nome,
            objetivoCodigo: planejamento.objetivo.codigo,
            objetivoNome: planejamento.objetivo.nome,
            totalIndicadores: indicadoresCount,
            totalComprovacoes: comprovacoesCount,
          });
        }

        if (!ativo) return;
        setIniciativas(resultado);
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
  }, [unidadeId, mes, ano]);

  return (
    <>
      <header className="flex items-center justify-between gap-4 border-b px-8 py-6">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            render={<Link href="/validacao" />}
            aria-label="Voltar"
          >
            <ArrowLeft />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {unidade?.nome ?? "Unidade"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {MESES[mes - 1]} de {ano}
            </p>
          </div>
        </div>
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
          <Building2 className="h-3.5 w-3.5" />
          {unidade?.nome ?? "Unidade"}
        </span>
      </header>

      <main className="flex flex-1 flex-col gap-6 bg-cinza-claro p-8">
        {carregando && (
          <div className="flex items-center justify-center gap-3 py-16 text-sm text-muted-foreground">
            <LoaderCircle className="h-5 w-5 animate-spin" />
            Carregando iniciativas...
          </div>
        )}

        {!carregando && erro && (
          <div className="rounded-xl border bg-card p-10 text-center text-sm text-muted-foreground">
            Não foi possível carregar as iniciativas.
          </div>
        )}

        {!carregando && !erro && iniciativas.length === 0 && (
          <div className="rounded-xl border bg-card p-10 text-center text-sm text-muted-foreground">
            Nenhuma iniciativa encontrada para esta unidade em {MESES[mes - 1]}{" "}
            de {ano}.
          </div>
        )}

        {!carregando && !erro && iniciativas.length > 0 && (
          <Masonry
            breakpointCols={breakpointColumns}
            className="flex w-auto -ml-4"
            columnClassName="bg-clip-padding pl-4"
          >
            {iniciativas.map((iniciativa) => (
              <article
                key={iniciativa.planejamentoId}
                onClick={() =>
                  router.push(
                    `/validacao/${unidadeId}/${iniciativa.planejamentoId}?mes=${mes}&ano=${ano}`,
                  )
                }
                className="mb-4 flex cursor-pointer flex-col rounded-xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="inline-flex w-fit rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                    {iniciativa.objetivoCodigo}
                  </span>
                </div>

                <h2 className="mt-3 text-sm font-semibold leading-snug">
                  {iniciativa.iniciativaNome}
                </h2>
                <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                  {iniciativa.objetivoNome}
                </p>

                <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <FileText className="h-3.5 w-3.5" />
                    {iniciativa.totalComprovacoes} comprovação(ões)
                  </span>
                  <span>
                    {iniciativa.totalIndicadores} indicador(es)
                  </span>
                </div>
              </article>
            ))}
          </Masonry>
        )}
      </main>
    </>
  );
}
