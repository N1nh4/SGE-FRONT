"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, LoaderCircle, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import {
  fetchComprovacoes,
  fetchPlanejamento,
  fetchUnidades,
  type Comprovacao,
  type IndicadorPlanejamento,
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

type StatusValidacao =
  | "aprovado"
  | "analise"
  | "recusado"
  | "sem_comprovante"
  | "sem_atualizacao";

type IndicadorLinha = {
  indicador: IndicadorPlanejamento;
  iniciativa: string;
  iniciativaId: number;
  objetivoCodigo: string;
  objetivoNome: string;
  unidadeId: number;
  unidadeNome: string;
  status: StatusValidacao;
  comprovacoes: Comprovacao[];
};

const FILTROS = [
  { label: "Todos", valor: "todos" },
  { label: "Aprovado", valor: "aprovado" },
  { label: "Em Análise", valor: "analise" },
  { label: "Recusado", valor: "recusado" },
  { label: "Sem comprovante", valor: "sem_comprovante" },
  { label: "Sem atualização", valor: "sem_atualizacao" },
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
    case "sem_atualizacao":
      return "Sem atualização";
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
    case "sem_atualizacao":
      return "bg-amber-100 text-amber-700 border-amber-200";
  }
}

function calcularStatus(comprovacoes: Comprovacao[]): StatusValidacao {
  if (comprovacoes.length === 0) return "sem_comprovante";
  const temAprovado = comprovacoes.some((c) => c.status === "aprovado");
  const temAnalise = comprovacoes.some((c) => c.status === "analise");
  const temRecusado = comprovacoes.some((c) => c.status === "recusado");
  const temSemAtualizacao = comprovacoes.some(
    (c) => c.status === "sem_atualizacao",
  );

  if (temRecusado) return "recusado";
  if (temAnalise) return "analise";
  if (temAprovado) return "aprovado";
  if (temSemAtualizacao) return "sem_atualizacao";
  return "sem_comprovante";
}

function formatarData(iso: string): string {
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return "—";
  return data.toLocaleDateString("pt-BR");
}

function formatarPrazo(prazo: string | null): string {
  if (!prazo) return "—";
  const data = new Date(prazo);
  if (Number.isNaN(data.getTime())) return prazo;
  return data.toLocaleDateString("pt-BR");
}

export function Validacao({
  unidadeId,
  mes,
  ano,
}: {
  unidadeId: number | "todas" | null;
  mes: number;
  ano: number;
}) {
  const router = useRouter();
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [linhas, setLinhas] = useState<IndicadorLinha[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [busca, setBusca] = useState("");
  const [paginaAtual, setPaginaAtual] = useState(1);

  useEffect(() => {
    fetchUnidades()
      .then((lista) => {
        setUnidades(lista);
        const valida =
          unidadeId === "todas" ||
          (typeof unidadeId === "number" &&
            lista.some((u) => u.id === unidadeId));
        if (!valida && lista.length > 0) {
          router.replace(`/validacao?unidade=${lista[0].id}&mes=${mes}&ano=${ano}`);
        }
      })
      .catch(() => {});
  }, [router, unidadeId, mes, ano]);

  useEffect(() => {
    if (unidadeId === null) return;
    let ativo = true;

    async function carregar() {
      try {
        const lista = await fetchPlanejamento();
        if (!ativo) return;

        const linhasNovas: IndicadorLinha[] = [];

        const promessas = lista.flatMap((p) =>
          p.indicadores
            .filter((ind) =>
              unidadeId === "todas"
                ? ind.unidades.length > 0
                : ind.unidades.some((u) => u.id === unidadeId),
            )
            .flatMap((indicador) => {
              const unidadesLinha =
                unidadeId === "todas" ? indicador.unidades : indicador.unidades.filter((u) => u.id === unidadeId);
              return unidadesLinha.map(async (unidade) => {
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
                  unidadeId: unidade.id,
                  unidadeNome: unidade.nome,
                  status: calcularStatus(comprovacoesPeriodo),
                  comprovacoes: comprovacoesPeriodo,
                });
              });
            }),
        );

        await Promise.all(promessas);

        function dataMaisRecente(linha: IndicadorLinha): number {
          return linha.comprovacoes.reduce(
            (maior, c) =>
              Math.max(maior, new Date(c.updated_at).getTime() || 0),
            0,
          );
        }

        linhasNovas.sort((a, b) => dataMaisRecente(b) - dataMaisRecente(a));

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
  }, [filtroStatus, busca, unidadeId, mes, ano]);

  const totalIndicadores = linhas.length;
  const aprovados = linhas.filter((l) => l.status === "aprovado").length;
  const emAnalise = linhas.filter((l) => l.status === "analise").length;
  const pendentes = linhas.filter((l) => l.status === "sem_comprovante").length;

  function unidadeParam(valor: number | "todas" | null): string {
    if (valor === null) return "";
    return valor === "todas" ? "todas" : String(valor);
  }

  function mudarUnidade(novoValor: string) {
    router.push(`/validacao?unidade=${novoValor}&mes=${mes}&ano=${ano}`);
  }

  function mudarMes(novoMes: number) {
    router.push(
      `/validacao?unidade=${unidadeParam(unidadeId)}&mes=${novoMes}&ano=${ano}`,
    );
  }

  function mudarAno(novoAno: number) {
    router.push(
      `/validacao?unidade=${unidadeParam(unidadeId)}&mes=${mes}&ano=${novoAno}`,
    );
  }

  return (
    <main className="flex-1 bg-cinza-claro p-8">
      <section className="mb-6 flex flex-wrap items-end gap-4 rounded-xl border bg-card p-5">
        <div className="flex items-center gap-1.5">
          <label
            htmlFor="unidade"
            className="text-sm leading-none font-medium text-muted-foreground"
          >
            Unidade
          </label>
          <select
            id="unidade"
            value={unidadeId === null ? "" : unidadeId === "todas" ? "todas" : unidadeId}
            onChange={(event) => mudarUnidade(event.target.value)}
            className="h-8 w-auto min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
          >
            <option value="todas">Todas as unidades</option>
            {unidades.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nome}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1.5">
          <label
            htmlFor="mes"
            className="text-sm leading-none font-medium text-muted-foreground"
          >
            Mês
          </label>
          <select
            id="mes"
            value={mes}
            onChange={(event) => mudarMes(Number(event.target.value))}
            className="h-8 w-auto min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
          >
            {MESES.map((nome, index) => (
              <option key={nome} value={index + 1}>
                {nome}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1.5">
          <label
            htmlFor="ano"
            className="text-sm leading-none font-medium text-muted-foreground"
          >
            Ano
          </label>
          <select
            id="ano"
            value={ano}
            onChange={(event) => mudarAno(Number(event.target.value))}
            className="h-8 w-auto min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
          >
            {Array.from({ length: 5 }, (_, i) => ano - 4 + i).map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
      </section>

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
            <table className="w-full table-fixed text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="w-[9%] px-5 py-3 font-medium">Código</th>
                  <th className="w-[18%] px-5 py-3 font-medium">Iniciativa</th>
                  <th className="w-[20%] px-5 py-3 font-medium">Meta</th>
                  <th className="w-[12%] px-5 py-3 font-medium">Unidade</th>
                  <th className="w-[10%] px-5 py-3 font-medium">
                    Data de envio
                  </th>
                  <th className="w-[9%] px-5 py-3 font-medium">Status</th>
                  <th className="w-[10%] px-5 py-3 font-medium">Prazo</th>
                  <th className="w-[12%] px-5 py-3 text-right font-medium">
                    Ações
                  </th>
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
                    <td className="px-5 py-4 align-top text-muted-foreground">
                      {linha.unidadeNome}
                    </td>
                    <td className="px-5 py-4 align-top text-muted-foreground">
                      {linha.comprovacoes.length === 0
                        ? "—"
                        : formatarData(
                            linha.comprovacoes.reduce((maior, c) =>
                              c.updated_at > maior.updated_at ? c : maior,
                            ).updated_at,
                          )}
                    </td>
                    <td className="px-5 py-4 align-top">
                      <span
                        className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusCores(linha.status)}`}
                      >
                        {statusLabel(linha.status)}
                      </span>
                    </td>
                    <td className="px-5 py-4 align-top text-muted-foreground">
                      {formatarPrazo(linha.indicador.prazo)}
                    </td>
                    <td className="px-5 py-4 align-top">
                      <div className="flex items-center justify-end gap-2">
                        {linha.status === "sem_atualizacao" ? (
                          <span className="text-xs text-muted-foreground">
                            —
                          </span>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() =>
                              (window.location.href = `/validacao/${linha.unidadeId}/${linha.iniciativaId}?mes=${mes}&ano=${ano}&status=${filtroStatus}&busca=${encodeURIComponent(busca)}`)
                            }
                            className="cursor-pointer border border-solid border-black/[.08] bg-white text-azul-escuro hover:bg-white/90"
                          >
                            <Eye />
                            Ver
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {linhasFiltradas.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-5 py-10 text-center text-sm text-muted-foreground"
                    >
                      {linhas.length === 0
                        ? unidadeId === "todas"
                          ? `Nenhum indicador encontrado em ${MESES[mes - 1]} de ${ano}.`
                          : `Nenhum indicador encontrado para esta unidade em ${MESES[mes - 1]} de ${ano}.`
                        : "Nenhum resultado para o filtro aplicado."}
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
            rotuloItensPlural="indicadores"
            onMudarPagina={setPaginaAtual}
          />
        </>
      )}
    </main>
  );
}