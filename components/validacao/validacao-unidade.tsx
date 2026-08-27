"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Building2, Eye, LoaderCircle, Search } from "lucide-react";
import { HeaderBell } from "@/components/notificacoes/header-bell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  fetchComprovacoes,
  fetchPlanejamento,
  fetchUnidades,
  type Planejamento,
  type Unidade,
  type Comprovacao,
  type IndicadorPlanejamento,
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

type StatusValidacao = "aprovado" | "analise" | "recusado" | "sem_comprovante";

type IndicadorLinha = {
  indicador: IndicadorPlanejamento;
  iniciativa: string;
  iniciativaId: number;
  objetivoCodigo: string;
  objetivoNome: string;
  status: StatusValidacao;
  comprovacoes: Comprovacao[];
};

const FILTROS = [
  { label: "Todos", valor: "todos" },
  { label: "Aprovado", valor: "aprovado" },
  { label: "Em Análise", valor: "analise" },
  { label: "Recusado", valor: "recusado" },
  { label: "Sem comprovante", valor: "sem_comprovante" },
] as const;

function statusLabel(status: StatusValidacao): string {
  switch (status) {
    case "aprovado":
      return "Aprovado";
    case "analise":
      return "Em Análise";
    case "recusado":
      return "Recusado";
    case "sem_comprovante":
      return "Sem comprovante";
  }
}

function statusCores(status: StatusValidacao): string {
  switch (status) {
    case "aprovado":
      return "bg-green-100 text-green-700 border-green-200";
    case "analise":
      return "bg-blue-100 text-blue-700 border-blue-200";
    case "recusado":
      return "bg-red-100 text-red-700 border-red-200";
    case "sem_comprovante":
      return "bg-gray-100 text-gray-500 border-gray-200";
  }
}

function calcularStatus(comprovacoes: Comprovacao[]): StatusValidacao {
  if (comprovacoes.length === 0) return "sem_comprovante";
  const temAprovado = comprovacoes.some((c) => c.status === "aprovado");
  const temAnalise = comprovacoes.some((c) => c.status === "analise");
  const temRecusado = comprovacoes.some((c) => c.status === "recusado");

  if (temRecusado) return "recusado";
  if (temAnalise) return "analise";
  if (temAprovado) return "aprovado";
  return "sem_comprovante";
}

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
  const [linhas, setLinhas] = useState<IndicadorLinha[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [busca, setBusca] = useState("");

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

    async function carregar() {
      try {
        const lista = await fetchPlanejamento();
        if (!ativo) return;

        const linhasNovas: IndicadorLinha[] = [];

        const promessas = lista.flatMap((p) =>
          p.indicadores
            .filter((ind) => ind.unidades.some((u) => u.id === unidadeId))
            .map(async (indicador) => {
              const comprovacoes = await fetchComprovacoes(indicador.id);
              const comprovacoesPeriodo = comprovacoes.filter(
                (c) => c.ano === ano && c.mes === mes,
              );
              linhasNovas.push({
                indicador,
                iniciativa: p.nome,
                iniciativaId: p.id,
                objetivoCodigo: p.objetivo.codigo,
                objetivoNome: p.objetivo.nome,
                status: calcularStatus(comprovacoesPeriodo),
                comprovacoes: comprovacoesPeriodo,
              });
            }),
        );

        await Promise.all(promessas);

        linhasNovas.sort((a, b) =>
          a.objetivoCodigo.localeCompare(b.objetivoCodigo),
        );

        if (ativo) setLinhas(linhasNovas);
      } catch {
        if (ativo) setErro(true);
      } finally {
        if (ativo) setCarregando(false);
      }
    }

    carregar();

    return () => {
      ativo = false;
    };
  }, [unidadeId, mes, ano]);

  const linhasFiltradas = useMemo(() => {
    return linhas.filter((linha) => {
      const matchBusca =
        busca === "" ||
        linha.indicador.nome.toLowerCase().includes(busca.toLowerCase()) ||
        linha.iniciativa.toLowerCase().includes(busca.toLowerCase());

      if (!matchBusca) return false;
      if (filtroStatus === "todos") return true;
      return linha.status === filtroStatus;
    });
  }, [linhas, filtroStatus, busca]);

  const totalIndicadores = linhas.length;
  const aprovados = linhas.filter((l) => l.status === "aprovado").length;
  const emAnalise = linhas.filter((l) => l.status === "analise").length;
  const pendentes = linhas.filter((l) => l.status === "sem_comprovante").length;

  return (
    <>
      <header className="flex items-center justify-between gap-4 border-b px-8 py-6 h-16">
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
        <HeaderBell />
      </header>

      <main className="flex-1 bg-cinza-claro p-8">
        {carregando && (
          <div className="flex items-center justify-center gap-3 py-16 text-sm text-muted-foreground">
            <LoaderCircle className="h-5 w-5 animate-spin" />
            Carregando indicadores...
          </div>
        )}

        {!carregando && erro && (
          <div className="rounded-xl border bg-card p-10 text-center text-sm text-muted-foreground">
            Não foi possível carregar os indicadores.
          </div>
        )}

        {!carregando && !erro && (
          <>
            <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-xl border bg-card p-4">
                <p className="text-xs font-medium uppercase text-muted-foreground">
                  Total de Metas
                </p>
                <p className="mt-1 text-2xl font-semibold">
                  {totalIndicadores}
                </p>
              </div>
              <div className="rounded-xl border bg-card p-4">
                <p className="text-xs font-medium uppercase text-muted-foreground">
                  Aprovadas
                </p>
                <p className="mt-1 text-2xl font-semibold text-green-600">
                  {aprovados}
                </p>
              </div>
              <div className="rounded-xl border bg-card p-4">
                <p className="text-xs font-medium uppercase text-muted-foreground">
                  Em Análise
                </p>
                <p className="mt-1 text-2xl font-semibold text-blue-600">
                  {emAnalise}
                </p>
              </div>
              <div className="rounded-xl border bg-card p-4">
                <p className="text-xs font-medium uppercase text-muted-foreground">
                  Sem Comprovante
                </p>
                <p className="mt-1 text-2xl font-semibold text-muted-foreground">
                  {pendentes}
                </p>
              </div>
            </div>

            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-2">
                {FILTROS.map((f) => (
                  <button
                    key={f.valor}
                    onClick={() => setFiltroStatus(f.valor)}
                    className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      filtroStatus === f.valor
                        ? "border-azul-escuro bg-azul-escuro text-white"
                        : "border-black/[.08] bg-white text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar meta, iniciativa..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="w-64 bg-white pl-8"
                />
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border bg-card">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-5 py-3 font-medium">Código</th>
                    <th className="px-5 py-3 font-medium">Iniciativa</th>
                    <th className="px-5 py-3 font-medium">Meta</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 text-right font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {linhasFiltradas.map((linha) => (
                    <tr
                      key={linha.indicador.id}
                      className="border-b last:border-0 transition-colors hover:bg-muted/50"
                    >
                      <td className="px-5 py-4 align-top">
                        <span
                          title={linha.objetivoNome}
                          className="inline-flex w-fit cursor-default rounded-full border border-solid border-black/[.08] bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
                        >
                          {linha.objetivoCodigo}
                        </span>
                      </td>
                      <td className="px-5 py-4 align-top text-muted-foreground">
                        {linha.iniciativa}
                      </td>
                      <td className="px-5 py-4 align-top font-medium">
                        {linha.indicador.nome}
                      </td>
                      <td className="px-5 py-4 align-top">
                        <span
                          className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusCores(linha.status)}`}
                        >
                          {statusLabel(linha.status)}
                        </span>
                      </td>
                      <td className="px-5 py-4 align-top">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            type="button"
                            size="sm"
                            onClick={() =>
                              (window.location.href = `/validacao/${unidadeId}/${linha.iniciativaId}?mes=${mes}&ano=${ano}`)
                            }
                            className="cursor-pointer border border-solid border-black/[.08] bg-white text-azul-escuro hover:bg-white/90"
                          >
                            <Eye />
                            Ver
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {linhasFiltradas.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-5 py-10 text-center text-sm text-muted-foreground"
                      >
                        {linhas.length === 0
                          ? `Nenhum indicador encontrado para esta unidade em ${MESES[mes - 1]} de ${ano}.`
                          : "Nenhum resultado para o filtro aplicado."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>
    </>
  );
}
