"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { useAuth } from "@/context/auth-context";
import {
  fetchPlanejamento,
  fetchComprovacoes,
  type Planejamento,
  type IndicadorPlanejamento,
  type Comprovacao,
  type ObjetivoResumo,
} from "@/lib/api";

type StatusConsolidado =
  | "aprovado"
  | "parcial"
  | "recusado"
  | "analise"
  | "pendente";

type IndicadorLinha = {
  indicador: IndicadorPlanejamento;
  objetivo: ObjetivoResumo;
  iniciativa: string;
  iniciativaId: number;
  responsavel: string;
  totalEtapas: number;
  etapasAprovadas: number;
  temRecusa: boolean;
  statusConsolidado: StatusConsolidado;
  comprovacoes: Comprovacao[];
};

const FILTROS = [
  { label: "Todos", valor: "todos" },
  { label: "Aprovado", valor: "aprovado" },
  { label: "Pendente", valor: "pendente" },
  { label: "Em Análise", valor: "analise" },
  { label: "Recusado", valor: "recusado" },
] as const;

function statusLabel(status: StatusConsolidado): string {
  switch (status) {
    case "aprovado":
      return "Aprovado";
    case "parcial":
      return "Parcial";
    case "recusado":
      return "Recusado";
    case "analise":
      return "Em Análise";
    case "pendente":
      return "Pendente";
  }
}

function statusCores(status: StatusConsolidado): string {
  switch (status) {
    case "aprovado":
      return "bg-green-100 text-green-700 border-green-200";
    case "parcial":
      return "bg-yellow-100 text-yellow-700 border-yellow-200";
    case "recusado":
      return "bg-red-100 text-red-700 border-red-200";
    case "analise":
      return "bg-blue-100 text-blue-700 border-blue-200";
    case "pendente":
      return "bg-gray-100 text-gray-500 border-gray-200";
  }
}

function calcularStatus(
  indicador: IndicadorPlanejamento,
  comprovacoes: Comprovacao[],
): {
  totalEtapas: number;
  etapasAprovadas: number;
  temRecusa: boolean;
  statusConsolidado: StatusConsolidado;
} {
  const totalEtapas = indicador.etapas.length;
  if (totalEtapas === 0) {
    return {
      totalEtapas: 0,
      etapasAprovadas: 0,
      temRecusa: false,
      statusConsolidado: "pendente",
    };
  }

  const etapaIds = new Set(indicador.etapas.map((e) => e.id));
  const temRecusa = comprovacoes.some((c) => c.status === "recusado");

  let etapasAprovadas = 0;
  for (const etapa of indicador.etapas) {
    const comprovacaoEtapa = comprovacoes.find(
      (c) => c.etapa_id === etapa.id && c.status === "aprovado",
    );
    if (comprovacaoEtapa) etapasAprovadas++;
  }

  let statusConsolidado: StatusConsolidado;
  if (temRecusa && etapasAprovadas < totalEtapas) {
    statusConsolidado = "recusado";
  } else if (etapasAprovadas === totalEtapas) {
    statusConsolidado = "aprovado";
  } else if (etapasAprovadas > 0) {
    statusConsolidado = "parcial";
  } else {
    const temAnalise = comprovacoes.some((c) => c.status === "analise");
    statusConsolidado = temAnalise ? "analise" : "pendente";
  }

  return { totalEtapas, etapasAprovadas, temRecusa, statusConsolidado };
}

export function Comprovacoes() {
  const router = useRouter();
  const { usuario, unidadeId } = useAuth();
  const [linhas, setLinhas] = useState<IndicadorLinha[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [busca, setBusca] = useState("");
  const [paginaAtual, setPaginaAtual] = useState(1);

  useEffect(() => {
    async function carregar() {
      try {
        const planejamentos = await fetchPlanejamento();
        const linhasNovas: IndicadorLinha[] = [];

        const promessas = planejamentos.flatMap((p) =>
          p.indicadores.map(async (indicador) => {
            const comprovacoes = await fetchComprovacoes(indicador.id);
            const {
              totalEtapas,
              etapasAprovadas,
              temRecusa,
              statusConsolidado,
            } = calcularStatus(indicador, comprovacoes);
            linhasNovas.push({
              indicador,
              objetivo: p.objetivo,
              iniciativa: p.nome,
              iniciativaId: p.id,
              responsavel: indicador.unidades[0]?.nome ?? "Sem unidade",
              totalEtapas,
              etapasAprovadas,
              temRecusa,
              statusConsolidado,
              comprovacoes,
            });
          }),
        );

        await Promise.all(promessas);

        let resultado = linhasNovas;
        if (usuario?.papel === "default" && unidadeId != null) {
          resultado = resultado.filter((linha) =>
            linha.indicador.unidades.some((u) => u.id === unidadeId),
          );
        }

        resultado.sort(
          (a, b) =>
            a.objetivo?.codigo?.localeCompare(b.objetivo?.codigo ?? "") ?? 0,
        );

        setLinhas(resultado);
      } catch {
        // Backend offline
      } finally {
        setCarregando(false);
      }
    }
    carregar();
  }, [usuario?.papel, unidadeId]);

  const linhasFiltradas = useMemo(() => {
    return linhas.filter((linha) => {
      const matchBusca =
        busca === "" ||
        linha.indicador.meta.toLowerCase().includes(busca.toLowerCase()) ||
        linha.indicador.orientacao
          .toLowerCase()
          .includes(busca.toLowerCase()) ||
        linha.responsavel.toLowerCase().includes(busca.toLowerCase());

      if (!matchBusca) return false;

      if (filtroStatus === "todos") return true;

      return linha.statusConsolidado === filtroStatus;
    });
  }, [linhas, filtroStatus, busca]);

  const ITENS_POR_PAGINA = 7;
  const totalPaginas = Math.max(
    1,
    Math.ceil(linhasFiltradas.length / ITENS_POR_PAGINA),
  );
  const paginaSegura = Math.min(paginaAtual, totalPaginas);
  const linhasVisiveis = useMemo(() => {
    const inicio = (paginaSegura - 1) * ITENS_POR_PAGINA;
    return linhasFiltradas.slice(inicio, inicio + ITENS_POR_PAGINA);
  }, [linhasFiltradas, paginaSegura]);

  useEffect(() => {
    setPaginaAtual(1);
  }, [filtroStatus, busca]);

  const totalIndicadores = linhas.length;
  const aprovados = linhas.filter(
    (l) => l.statusConsolidado === "aprovado",
  ).length;
  const pendentes = linhas.filter(
    (l) => l.statusConsolidado === "pendente",
  ).length;
  const emAnalise = linhas.filter(
    (l) => l.statusConsolidado === "analise",
  ).length;

  return (
    <>
      <main className="flex-1 bg-cinza-claro p-8">
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-xl border bg-card p-4">
            <p className="text-xs font-medium uppercase text-muted-foreground">
              Total de Metas
            </p>
            <p className="mt-1 text-2xl font-semibold">{totalIndicadores}</p>
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
            <p className="mt-1 text-2xl font-semibold text-yellow-600">
              {emAnalise}
            </p>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <p className="text-xs font-medium uppercase text-muted-foreground">
              Pendentes
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
              placeholder="Buscar meta, orientação..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-8 w-64 bg-white"
            />
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full table-fixed text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="w-[10%] px-5 py-3 font-medium">Código</th>
                <th className="w-[22%] px-5 py-3 font-medium">Meta</th>
                <th className="w-[30%] px-5 py-3 font-medium">Orientação</th>
                <th className="w-[14%] px-5 py-3 font-medium">Responsável</th>
                <th className="w-[15%] px-5 py-3 font-medium">Status</th>
                <th className="w-[9%] px-5 py-3 text-right font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {linhasVisiveis.map((linha) => (
                <tr
                  key={linha.indicador.id}
                  className="border-b last:border-0 transition-colors hover:bg-muted/50"
                >
                  <td className="px-5 py-4 align-top">
                    <span
                      title={linha.objetivo?.nome}
                      className="inline-flex w-fit cursor-default rounded-full border border-solid border-black/[.08] bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
                    >
                      {linha.objetivo?.codigo ?? "—"}
                    </span>
                  </td>
                  <td className="px-5 py-4 align-top font-medium">
                    {linha.indicador.meta}
                  </td>
                  <td className="px-5 py-4 align-top text-muted-foreground">
                    {linha.indicador.orientacao || "—"}
                  </td>
                  <td className="px-5 py-4 align-top text-muted-foreground">
                    {linha.responsavel}
                  </td>
                  <td className="px-5 py-4 align-top">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusCores(linha.statusConsolidado)}`}
                      >
                        {statusLabel(linha.statusConsolidado)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {linha.etapasAprovadas}/{linha.totalEtapas}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-4 align-top">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() =>
                          router.push(
                            `/planejamento/${linha.iniciativaId}/comprovacoes/${linha.indicador.id}`,
                          )
                        }
                        className="cursor-pointer border border-solid border-black/[.08] bg-white text-azul-escuro hover:bg-white/90"
                      >
                        <Eye />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {linhasFiltradas.length === 0 && !carregando && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-10 text-center text-sm text-muted-foreground"
                  >
                    {linhas.length === 0
                      ? "Nenhuma comprovação encontrada."
                      : "Nenhum resultado para o filtro aplicado."}
                  </td>
                </tr>
              )}
              {carregando && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-10 text-center text-sm text-muted-foreground"
                  >
                    Carregando comprovações...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          paginaAtual={paginaSegura}
          totalPaginas={totalPaginas}
          totalItens={linhasFiltradas.length}
          itensPorPagina={ITENS_POR_PAGINA}
          rotuloItensPlural="comprovações"
          onMudarPagina={setPaginaAtual}
        />
      </main>
    </>
  );
}
