"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSelectedLayoutSegment } from "next/navigation";
import { BarChart3, Eye, LoaderCircle, Search } from "lucide-react";
import {
  CORES_GRAFICO,
  GraficoDesempenho,
  type SerieGrafico,
} from "@/components/graficos/grafico-desempenho";
import { MultiselectUnidades } from "@/components/unidade/multiselect-unidades";

const SERIE_COMPROVACAO: SerieGrafico[] = [
  { chave: "aprovado", rotulo: "Aprovado", cor: CORES_GRAFICO.verde },
  { chave: "analise", rotulo: "Em análise", cor: CORES_GRAFICO.azul },
  { chave: "recusado", rotulo: "Recusado", cor: CORES_GRAFICO.vermelho },
  {
    chave: "sem_atualizacao",
    rotulo: "Sem atualização",
    cor: CORES_GRAFICO.amber,
  },
  {
    chave: "sem_comprovante",
    rotulo: "Sem comprovante",
    cor: CORES_GRAFICO.cinza,
  },
];
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
  unidades: { id: number; nome: string }[];
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

function DetalhePendencia({
  cor,
  rotulo,
  valor,
}: {
  cor: string;
  rotulo: string;
  valor: number;
}) {
  return (
    <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
      <span className={`inline-block size-2 shrink-0 rounded-full ${cor}`} />
      {rotulo}
      <span className="font-semibold tabular-nums text-foreground">
        {valor}
      </span>
    </span>
  );
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

  // Só a comprovação vigente de cada etapa conta (mesma regra de
  // indicadores.tsx): versões antigas ficam no histórico com o status antigo e
  // não podem mais definir o status do indicador.
  const vigentePorGrupo = new Map<string, Comprovacao>();
  for (const c of comprovacoes) {
    const grupo =
      c.etapa_id != null ? `etapa-${c.etapa_id}` : `mes-${c.ano}-${c.mes}`;
    const atual = vigentePorGrupo.get(grupo);
    if (!atual || c.versao > atual.versao) {
      vigentePorGrupo.set(grupo, c);
    }
  }
  const vigentes = Array.from(vigentePorGrupo.values());

  if (vigentes.some((c) => c.status === "recusado")) return "recusado";
  if (vigentes.some((c) => c.status === "analise")) return "analise";
  if (vigentes.some((c) => c.status === "aprovado")) return "aprovado";
  if (vigentes.some((c) => c.status === "sem_atualizacao")) {
    return "sem_atualizacao";
  }
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
  unidadesSelecionadas,
  mes,
  ano,
}: {
  unidadesSelecionadas: number[];
  mes: number;
  ano: number;
}) {
  const router = useRouter();
  // Ao voltar do detalhe de uma iniciativa, o App Router reaproveita o
  // componente em cache; isso força a lista a buscar os dados de novo.
  const segmento = useSelectedLayoutSegment();
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [linhas, setLinhas] = useState<IndicadorLinha[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);
  const [filtrosStatus, setFiltrosStatus] = useState<string[]>([]);
  const [busca, setBusca] = useState("");
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [mostrarGrafico, setMostrarGrafico] = useState(false);

  useEffect(() => {
    fetchUnidades()
      .then((lista) => setUnidades(lista))
      .catch(() => {});
  }, []);

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      try {
        const lista = await fetchPlanejamento();
        if (!ativo) return;

        const linhasNovas: IndicadorLinha[] = [];

        // A comprovação pertence ao indicador, não à unidade: no modelo a
        // tabela comprovacoes não tem unidade_id e a versão é por etapa. Uma
        // linha por indicador, para o mesmo indicador não ser contado uma vez
        // por unidade e os cards baterem com a página de Indicadores.
        const promessas = lista.flatMap((p) =>
          p.indicadores
            .filter((ind) =>
              unidadesSelecionadas.length === 0
                ? ind.unidades.length > 0
                : ind.unidades.some((u) => unidadesSelecionadas.includes(u.id)),
            )
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
                unidades: indicador.unidades.map((u) => ({
                  id: u.id,
                  nome: u.nome,
                })),
                status: calcularStatus(comprovacoesPeriodo),
                comprovacoes: comprovacoesPeriodo,
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
  }, [unidadesSelecionadas, mes, ano, segmento]);

  const linhasFiltradas = useMemo(() => {
    return linhas.filter((linha) => {
      const matchBusca =
        busca === "" ||
        linha.indicador.nome.toLowerCase().includes(busca.toLowerCase()) ||
        linha.iniciativa.toLowerCase().includes(busca.toLowerCase());

      if (!matchBusca) return false;
      if (filtrosStatus.length === 0) return true;
      return filtrosStatus.includes(linha.status);
    });
  }, [linhas, filtrosStatus, busca]);

  // Vários status podem ficar marcados ao mesmo tempo. "Todos" limpa a seleção,
  // porque lista vazia significa "sem filtro".
  function alternarFiltroStatus(valor: string) {
    if (valor === "todos") {
      setFiltrosStatus([]);
      return;
    }
    setFiltrosStatus((prev) =>
      prev.includes(valor) ? prev.filter((s) => s !== valor) : [...prev, valor],
    );
  }

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
    const timeout = setTimeout(() => setPaginaAtual(1), 0);
    return () => clearTimeout(timeout);
  }, [filtrosStatus, busca, unidadesSelecionadas, mes, ano]);

  // Aqui o objeto medido é o documento de comprovação, não o indicador: uma
  // meta pode ter mais de um documento (um por etapa), então a contagem por
  // linha de indicador subestimaria o volume real a validar. Conta a versão
  // vigente de cada etapa, que é o documento que o validador realmente julga.
  const documentos = useMemo(() => {
    const contagem = {
      total: 0,
      analise: 0,
      aprovado: 0,
      recusado: 0,
      sem_atualizacao: 0,
      sem_comprovante: 0,
    };

    for (const linha of linhas) {
      const vigentePorEtapa = new Map<string, Comprovacao>();
      for (const c of linha.comprovacoes) {
        const grupo = c.etapa_id != null ? `etapa-${c.etapa_id}` : "periodo";
        const atual = vigentePorEtapa.get(grupo);
        if (!atual || c.versao > atual.versao) vigentePorEtapa.set(grupo, c);
      }

      const vigentes = Array.from(vigentePorEtapa.values());
      if (vigentes.length === 0) {
        contagem.sem_comprovante += 1;
        continue;
      }

      for (const c of vigentes) {
        contagem.total += 1;
        if (c.status === "aprovado") contagem.aprovado += 1;
        else if (c.status === "analise") contagem.analise += 1;
        else if (c.status === "recusado") contagem.recusado += 1;
        else if (c.status === "sem_atualizacao") contagem.sem_atualizacao += 1;
        else contagem.sem_comprovante += 1;
      }
    }

    return contagem;
  }, [linhas]);

  const totalIndicadores = linhas.length;

  const dadosPorUnidade = useMemo(() => {
    const porUnidade = new Map<
      number,
      { nome: string; valores: Record<string, number> }
    >();

    for (const linha of linhas) {
      const vigentePorEtapa = new Map<string, Comprovacao>();
      for (const c of linha.comprovacoes) {
        const grupo = c.etapa_id != null ? `etapa-${c.etapa_id}` : "periodo";
        const atual = vigentePorEtapa.get(grupo);
        if (!atual || c.versao > atual.versao) vigentePorEtapa.set(grupo, c);
      }
      const vigentes = Array.from(vigentePorEtapa.values());

      // A comprovação não tem unidade: ela pertence ao indicador. Quando o
      // indicador está em várias unidades, o documento é contado em cada uma
      // para o gestor enxergar a carga de trabalho por unidade.
      for (const unidade of linha.unidades) {
        const acc = porUnidade.get(unidade.id) ?? {
          nome: unidade.nome,
          valores: {
            aprovado: 0,
            analise: 0,
            recusado: 0,
            sem_atualizacao: 0,
            sem_comprovante: 0,
          },
        };
        if (vigentes.length === 0) {
          acc.valores.sem_comprovante += 1;
        } else {
          for (const c of vigentes) {
            if (c.status === "aprovado") acc.valores.aprovado += 1;
            else if (c.status === "analise") acc.valores.analise += 1;
            else if (c.status === "recusado") acc.valores.recusado += 1;
            else if (c.status === "sem_atualizacao")
              acc.valores.sem_atualizacao += 1;
            else acc.valores.sem_comprovante += 1;
          }
        }
        porUnidade.set(unidade.id, acc);
      }
    }

    return Array.from(porUnidade.values()).sort((a, b) =>
      a.nome.localeCompare(b.nome, "pt-BR"),
    );
  }, [linhas]);

  // Lista vazia = todas as unidades. Para admin/master o padrão é todas, e não
  // a unidade do usuário; para o papel default só existe a própria unidade na
  // lista, então o resultado é o mesmo sem tratamento especial.
  const query = (sel: number[], mes_: number, ano_: number) => {
    const partes = new URLSearchParams();
    if (sel.length > 0) partes.set("unidades", sel.join(","));
    partes.set("mes", String(mes_));
    partes.set("ano", String(ano_));
    return `/validacao?${partes.toString()}`;
  };

  // A rota de detalhe aceita uma única unidade ou "todas". Com várias marcadas
  // não dá para representar o recorte inteiro, então o detalhe abre sem filtro.
  const unidadeDoDetalhe =
    unidadesSelecionadas.length === 1
      ? String(unidadesSelecionadas[0])
      : "todas";

  function mudarUnidades(novas: number[]) {
    router.push(query(novas, mes, ano));
  }

  function mudarMes(novoMes: number) {
    router.push(query(unidadesSelecionadas, novoMes, ano));
  }

  function mudarAno(novoAno: number) {
    router.push(query(unidadesSelecionadas, mes, novoAno));
  }

  return (
    <main className="flex-1 bg-cinza-claro p-8">
      <section className="mb-6 flex flex-wrap items-end gap-4 rounded-xl border bg-card p-5">
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-muted-foreground">
            Unidades
          </span>
          <MultiselectUnidades
            unidades={unidades}
            selecionadas={unidadesSelecionadas}
            onChange={mudarUnidades}
          />
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
          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-5">
            <div className="rounded-xl border bg-card p-4">
              <p className="text-xs font-medium uppercase text-muted-foreground">
                Envidados
              </p>
              <p className="mt-1 text-2xl font-semibold">{documentos.total}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                em {totalIndicadores} indicador
                {totalIndicadores === 1 ? "" : "es"}
              </p>
            </div>
            <div className="rounded-xl border bg-card p-4">
              <p className="text-xs font-medium uppercase text-muted-foreground">
                Em Análise
              </p>
              <p className="mt-1 text-2xl font-semibold text-blue-600">
                {documentos.analise}
              </p>
            </div>
            <div className="rounded-xl border bg-card p-4">
              <p className="text-xs font-medium uppercase text-muted-foreground">
                Aprovados
              </p>
              <p className="mt-1 text-2xl font-semibold text-green-600">
                {documentos.aprovado}
              </p>
            </div>
            <div className="rounded-xl border bg-card p-4">
              <p className="text-xs font-medium uppercase text-muted-foreground">
                Recusados
              </p>
              <p className="mt-1 text-2xl font-semibold text-red-600">
                {documentos.recusado}
              </p>
            </div>
            <div className="flex items-start justify-between gap-2 rounded-xl border bg-card p-4">
              <div>
                <p className="text-xs font-medium uppercase text-muted-foreground">
                  Em pendência
                </p>
                <p className="mt-1 text-2xl font-semibold text-muted-foreground">
                  {documentos.sem_atualizacao + documentos.sem_comprovante}
                </p>
              </div>
              <div className="flex flex-col items-start gap-0.5">
                <DetalhePendencia
                  cor="bg-amber-500"
                  rotulo="Sem atualização"
                  valor={documentos.sem_atualizacao}
                />
                <DetalhePendencia
                  cor="bg-gray-400"
                  rotulo="Sem comprovante"
                  valor={documentos.sem_comprovante}
                />
              </div>
            </div>
          </div>

          {mostrarGrafico && (
            <div className="mb-6 rounded-xl border bg-card p-5">
              <p className="mb-4 text-sm font-medium">Documentos por unidade</p>
              {dadosPorUnidade.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  Sem documentos no período selecionado.
                </p>
              ) : (
                <GraficoDesempenho
                  dados={dadosPorUnidade}
                  series={SERIE_COMPROVACAO}
                />
              )}
            </div>
          )}

          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              {FILTROS.map((f) => {
                const ativo =
                  f.valor === "todos"
                    ? filtrosStatus.length === 0
                    : filtrosStatus.includes(f.valor);
                return (
                  <button
                    key={f.valor}
                    aria-pressed={ativo}
                    onClick={() => alternarFiltroStatus(f.valor)}
                    className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      ativo
                        ? "border-azul-escuro bg-azul-escuro text-white"
                        : "border-black/[.08] bg-white text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setMostrarGrafico((v) => !v)}
                className="cursor-pointer"
              >
                <BarChart3 className="size-4" />
                {mostrarGrafico ? "Ocultar gráfico" : "Gráfico por unidade"}
              </Button>
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
          </div>

          <div className="overflow-x-auto rounded-xl border bg-card">
            <table className="w-full table-fixed text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="w-[9%] px-5 py-3 font-medium">Código</th>
                  <th className="w-[18%] px-5 py-3 font-medium">Iniciativa</th>
                  <th className="w-[20%] px-5 py-3 font-medium">Meta</th>
                  <th className="w-[12%] px-5 py-3 font-medium">Unidades</th>
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
                    <td
                      className="px-5 py-4 align-top text-muted-foreground"
                      title={linha.unidades.map((u) => u.nome).join(", ")}
                    >
                      <span className="line-clamp-2">
                        {linha.unidades.map((u) => u.nome).join(", ")}
                      </span>
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
                      {formatarPrazo(
                        linha.indicador.prazo_efetivo ?? linha.indicador.prazo,
                      )}
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
                              router.push(
                                `/validacao/${unidadeDoDetalhe}/${linha.iniciativaId}?mes=${mes}&ano=${ano}&unidades=${unidadesSelecionadas.join(",")}&status=${filtrosStatus.join(",")}&busca=${encodeURIComponent(busca)}`,
                              )
                            }
                            className="cursor-pointer border border-solid border-black/[.08] bg-white text-azul-escuro hover:bg-white/90"
                          >
                            <Eye />
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
                        ? unidadesSelecionadas.length === 0
                          ? `Nenhum indicador encontrado em ${MESES[mes - 1]} de ${ano}.`
                          : `Nenhum indicador encontrado para as unidades selecionadas em ${MESES[mes - 1]} de ${ano}.`
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
