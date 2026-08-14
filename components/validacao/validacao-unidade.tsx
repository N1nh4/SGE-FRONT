"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  Check,
  ExternalLink,
  FileText,
  LoaderCircle,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  fetchComprovacoes,
  fetchPlanejamento,
  fetchUnidades,
  urlArquivoComprovacao,
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

type ComprovacaoValidacao = {
  id: number;
  arquivo_nome: string;
  created_at: string;
  objetivo_codigo: string;
  objetivo_nome: string;
  iniciativa_nome: string;
  meta: string;
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
  const [unidade, setUnidade] = useState<Unidade | null>(null);
  const [planejamentos, setPlanejamentos] = useState<Planejamento[]>([]);
  const [itens, setItens] = useState<ComprovacaoValidacao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    fetchUnidades()
      .then((unidades) => {
        const encontrada = unidades.find((u) => u.id === unidadeId);
        if (encontrada) setUnidade(encontrada);
      })
      .catch(() => {
        // Backend offline.
      });
  }, [unidadeId]);

  useEffect(() => {
    let ativo = true;

    fetchPlanejamento()
      .then(async (lista) => {
        if (!ativo) return;
        setPlanejamentos(lista);

        const promessas: Promise<ComprovacaoValidacao[]>[] = [];

        for (const planejamento of lista) {
          for (const indicador of planejamento.indicadores) {
            if (indicador.unidade_id !== unidadeId) continue;
            promessas.push(
              fetchComprovacoes(indicador.id).then((comprovacoes) =>
                comprovacoes
                  .filter((c) => c.ano === ano && c.mes === mes)
                  .map((c) => ({
                    id: c.id,
                    arquivo_nome: c.arquivo_nome,
                    created_at: c.created_at,
                    objetivo_codigo: planejamento.objetivo.codigo,
                    objetivo_nome: planejamento.objetivo.nome,
                    iniciativa_nome: planejamento.nome,
                    meta: indicador.meta,
                  })),
              ),
            );
          }
        }

        const agrupadas = await Promise.all(promessas);
        if (!ativo) return;
        setItens(agrupadas.flat());
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

  const ordenados = useMemo(
    () =>
      itens.slice().sort((a, b) => {
        return (
          a.objetivo_codigo.localeCompare(b.objetivo_codigo) ||
          a.iniciativa_nome.localeCompare(b.iniciativa_nome)
        );
      }),
    [itens],
  );

  function acaoPlaceholder(acao: "aprovar" | "reprovar") {
    toast.info(
      acao === "aprovar"
        ? "Aprovação será habilitada em breve."
        : "Reprovação será habilitada em breve.",
    );
  }

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
            Carregando comprovações...
          </div>
        )}

        {!carregando && erro && (
          <div className="rounded-xl border bg-card p-10 text-center text-sm text-muted-foreground">
            Não foi possível carregar as comprovações.
          </div>
        )}

        {!carregando && !erro && planejamentos.length === 0 && (
          <div className="rounded-xl border bg-card p-10 text-center text-sm text-muted-foreground">
            Nenhum planejamento cadastrado.
          </div>
        )}

        {!carregando &&
          !erro &&
          planejamentos.length > 0 &&
          ordenados.length === 0 && (
            <div className="rounded-xl border bg-card p-10 text-center text-sm text-muted-foreground">
              Nenhuma comprovação enviada para esta unidade em {MESES[mes - 1]}{" "}
              de {ano}.
            </div>
          )}

        {!carregando && !erro && ordenados.length > 0 && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {ordenados.map((item) => (
              <article
                key={item.id}
                className="flex flex-col rounded-xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="inline-flex w-fit rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                    {item.objetivo_codigo}
                  </span>
                </div>

                <h2 className="mt-3 text-sm font-semibold leading-snug">
                  {item.objetivo_nome}
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {/* Iniciativa: {item.iniciativa_nome} */}
                  Meta: {item.meta}
                </p>

                <div className="mt-4 flex min-w-0 items-center gap-2 rounded-lg border border-bege/30 bg-bege/5 p-3">
                  <FileText className="h-4 w-4 shrink-0 text-bege" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {item.arquivo_nome}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {/* Meta: {item.meta} */}
                    </p>
                  </div>
                </div>

                <div className="mt-auto flex items-center gap-2 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    render={
                      <a
                        href={urlArquivoComprovacao(item.id)}
                        target="_blank"
                        rel="noreferrer"
                      />
                    }
                    className="cursor-pointer"
                  >
                    <ExternalLink />
                    Visualizar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => acaoPlaceholder("aprovar")}
                    className="ml-auto cursor-pointer text-green-600 hover:bg-green-600/10 hover:text-green-600"
                  >
                    <Check />
                    Aprovar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => acaoPlaceholder("reprovar")}
                    className="cursor-pointer text-red-600 hover:bg-red-600/10 hover:text-red-600"
                  >
                    <X />
                    Reprovar
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
