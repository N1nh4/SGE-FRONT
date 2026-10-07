"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSelectedLayoutSegment } from "next/navigation";
import { BarChart3, Search, Eye, MessageSquareWarning } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  CORES_GRAFICO,
  GraficoDesempenho,
  type SerieGrafico,
} from "@/components/graficos/grafico-desempenho";

// Série do gráfico de Comprovações: uma meta por barra, com o status
// consolidado. As chaves acompanham StatusConsolidado, não o status do
// documento, para a soma das barras bater com o card Total de Metas.
const SERIE_COMPROVACAO: SerieGrafico[] = [
  { chave: "aprovado", rotulo: "Aprovado", cor: CORES_GRAFICO.verde },
  { chave: "parcial", rotulo: "Parcial", cor: CORES_GRAFICO.lilas },
  { chave: "analise", rotulo: "Em análise", cor: CORES_GRAFICO.azul },
  { chave: "recusado", rotulo: "Recusado", cor: CORES_GRAFICO.vermelho },
  {
    chave: "sem_atualizacao",
    rotulo: "Sem atualização",
    cor: CORES_GRAFICO.amber,
  },
  { chave: "pendente", rotulo: "Pendente", cor: CORES_GRAFICO.cinza },
];
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/context/auth-context";
import {
  fetchPlanejamento,
  fetchComprovacoes,
  type IndicadorPlanejamento,
  type Comprovacao,
  type ObjetivoResumo,
} from "@/lib/api";

type StatusConsolidado =
  | "aprovado"
  | "parcial"
  | "recusado"
  | "analise"
  | "pendente"
  | "sem_atualizacao";

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
  { label: "Sem atualização", valor: "sem_atualizacao" },
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
    case "sem_atualizacao":
      return "Sem atualização";
  }
}

function formatarData(iso: string): string {
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return "—";
  return data.toLocaleDateString("pt-BR");
}

function statusCores(status: StatusConsolidado): string {
  switch (status) {
    case "aprovado":
      return "bg-green-100 text-green-700 border-green-200";
    // Parcial é lilás, e não amarelo, para não se confundir com o âmbar de
    // "sem atualização" na mesma tela.
    case "parcial":
      return "bg-violet-100 text-violet-700 border-violet-200";
    case "recusado":
      return "bg-red-100 text-red-700 border-red-200";
    case "analise":
      return "bg-blue-100 text-blue-700 border-blue-200";
    case "pendente":
      return "bg-gray-100 text-gray-500 border-gray-200";
    case "sem_atualizacao":
      return "bg-amber-100 text-amber-700 border-amber-200";
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

  // Só a comprovação vigente de cada etapa vale para o status (mesma regra de
  // validacao.tsx e indicadores.tsx). Sem isso, um "recusado" antigo continuaria
  // contando para sempre depois de o usuário registrar "sem atualização" numa
  // versão nova.
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

  const temRecusa = vigentes.some((c) => c.status === "recusado");
  const temSemAtualizacao = vigentes.some(
    (c) => c.status === "sem_atualizacao",
  );

  // Indicador sem etapas não tem "etapas aprovadas" para contar. Forçar
  // "pendente" deixava o indicador preso em Pendente para sempre, mesmo com
  // documentos aprovados. Aqui o status reflete a comprovação vigente mais
  // recente: meta sem etapas é julgada na validação, não por contagem.
  if (totalEtapas === 0) {
    let statusConsolidado: StatusConsolidado = "pendente";
    if (temRecusa) {
      statusConsolidado = "recusado";
    } else if (vigentes.some((c) => c.status === "aprovado")) {
      statusConsolidado = "aprovado";
    } else if (vigentes.some((c) => c.status === "analise")) {
      statusConsolidado = "analise";
    } else if (temSemAtualizacao) {
      statusConsolidado = "sem_atualizacao";
    }
    return {
      totalEtapas: 0,
      etapasAprovadas: 0,
      temRecusa,
      statusConsolidado,
    };
  }

  // Aprovação é terminal: se a etapa já foi aprovada em alguma versão, ela
  // conta como concluída mesmo que depois tenha havido novo registro.
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
    const temAnalise = vigentes.some((c) => c.status === "analise");
    if (temAnalise) {
      statusConsolidado = "analise";
    } else if (temSemAtualizacao) {
      statusConsolidado = "sem_atualizacao";
    } else {
      statusConsolidado = "pendente";
    }
  }

  return { totalEtapas, etapasAprovadas, temRecusa, statusConsolidado };
}

export function Comprovacoes() {
  const router = useRouter();
  // Volta a valer depois de registrar um "sem atualização" no detalhe: ao
  // retornar para a lista, o App Router reaproveita o componente em cache e
  // os cards ficariam com os números da busca anterior.
  const segmento = useSelectedLayoutSegment();
  const { usuario, unidadeId, unidades: unidadesDoUsuario } = useAuth();
  const [linhas, setLinhas] = useState<IndicadorLinha[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [filtrosStatus, setFiltrosStatus] = useState<string[]>([]);
  const [busca, setBusca] = useState("");
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [recusadasAbertas, setRecusadasAbertas] =
    useState<IndicadorLinha | null>(null);
  const [mostrarGrafico, setMostrarGrafico] = useState(false);

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

        function dataMaisRecente(linha: IndicadorLinha): number {
          return linha.comprovacoes.reduce(
            (maior, c) =>
              Math.max(maior, new Date(c.updated_at).getTime() || 0),
            0,
          );
        }

        resultado.sort((a, b) => dataMaisRecente(b) - dataMaisRecente(a));

        setLinhas(resultado);
      } catch {
        // Backend offline
      } finally {
        setCarregando(false);
      }
    }
    carregar();
  }, [usuario?.papel, unidadeId, segmento]);

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

      if (filtrosStatus.length === 0) return true;

      return filtrosStatus.includes(linha.statusConsolidado);
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
  }, [filtrosStatus, busca]);

  const totalIndicadores = linhas.length;
  const aprovados = linhas.filter(
    (l) => l.statusConsolidado === "aprovado",
  ).length;
  const emAnalise = linhas.filter(
    (l) => l.statusConsolidado === "analise",
  ).length;
  const recusados = linhas.filter(
    (l) => l.statusConsolidado === "recusado",
  ).length;
  // "Em pendência" agrupa os três estados que ainda não foram concluídos, e o
  // card mostra a conta aberta para ficar claro de onde o total vem.
  const pendentes = linhas.filter(
    (l) => l.statusConsolidado === "pendente",
  ).length;
  const semAtualizacao = linhas.filter(
    (l) => l.statusConsolidado === "sem_atualizacao",
  ).length;
  const parciais = linhas.filter(
    (l) => l.statusConsolidado === "parcial",
  ).length;
  const emPendencia = pendentes + semAtualizacao + parciais;

  // Gráfico restrito à unidade do usuário: nesta tela não existe seleção de
  // unidade, então o comparativo entre unidades não se aplica. Conta a versão
  // vigente de cada etapa, que é o documento que está de fato em validação.
  const dadosGraficoUnidade = useMemo(() => {
    const nomeUnidade =
      unidadesDoUsuario.find((u) => u.id === unidadeId)?.nome ??
      linhas[0]?.responsavel ??
      "Minha unidade";

    // Uma meta conta uma vez, com o status consolidado que a própria tabela
    // mostra. Antes era uma contagem por documento, então uma meta com várias
    // etapas aparecia várias vezes e a soma não batia com o card.
    const valores = {
      aprovado: 0,
      parcial: 0,
      analise: 0,
      recusado: 0,
      sem_atualizacao: 0,
      pendente: 0,
    };

    for (const linha of linhas) {
      if (
        unidadeId != null &&
        !linha.indicador.unidades.some((u) => u.id === unidadeId)
      )
        continue;

      valores[linha.statusConsolidado] += 1;
    }

    return [{ nome: nomeUnidade, valores }];
  }, [linhas, unidadesDoUsuario, unidadeId]);

  return (
    <>
      <main className="flex-1 bg-cinza-claro p-8">
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-5">
          <div className="rounded-xl border bg-card p-4">
            <p className="text-xs font-medium uppercase text-muted-foreground">
              Total de Metas
            </p>
            <p className="mt-1 text-2xl font-semibold">{totalIndicadores}</p>
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
              Aprovadas
            </p>
            <p className="mt-1 text-2xl font-semibold text-green-600">
              {aprovados}
            </p>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <p className="text-xs font-medium uppercase text-muted-foreground">
              Recusados
            </p>
            <p className="mt-1 text-2xl font-semibold text-red-600">
              {recusados}
            </p>
          </div>
          <div className="flex items-start justify-between gap-2 rounded-xl border bg-card p-4">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">
                Em pendência
              </p>
              <p className="mt-1 text-2xl font-semibold text-muted-foreground">
                {emPendencia}
              </p>
            </div>
            <div className="flex flex-col items-start gap-0.5">
              <DetalhePendencia
                cor="bg-amber-500"
                rotulo="Sem atualização"
                valor={semAtualizacao}
              />
              <DetalhePendencia
                cor="bg-gray-400"
                rotulo="Pendente"
                valor={pendentes}
              />
              <DetalhePendencia
                cor="bg-violet-500"
                rotulo="Parcial"
                valor={parciais}
              />
            </div>
          </div>
        </div>

        {mostrarGrafico && (
          <div className="mb-6 rounded-xl border bg-card p-5">
            <p className="mb-4 text-sm font-medium">Comprovantes da unidade</p>
            <GraficoDesempenho
              dados={dadosGraficoUnidade}
              series={SERIE_COMPROVACAO}
            />
          </div>
        )}

        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
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
              {mostrarGrafico ? "Ocultar gráfico" : "Gráfico da unidade"}
            </Button>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar meta..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-8 w-64 bg-white"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full table-fixed text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="w-[10%] px-5 py-3 font-medium">Código</th>
                <th className="w-[25%] px-5 py-3 font-medium">Meta</th>
                <th className="w-[17%] px-5 py-3 font-medium">Responsável</th>
                <th className="w-[12%] px-5 py-3 font-medium">Data de Envio</th>
                <th className="w-[18%] px-5 py-3 font-medium">Status</th>
                <th className="w-[18%] px-5 py-3 text-right font-medium">
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
                    {linha.responsavel}
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
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusCores(linha.statusConsolidado)}`}
                      >
                        {statusLabel(linha.statusConsolidado)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {linha.totalEtapas === 0
                          ? "por competência"
                          : `${linha.etapasAprovadas}/${linha.totalEtapas}`}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-4 align-top">
                    <div className="flex items-center justify-end gap-2">
                      {linha.statusConsolidado === "recusado" && (
                        <Button
                          type="button"
                          size="sm"
                          title="Ver justificativa e prazo"
                          onClick={() => setRecusadasAbertas(linha)}
                          className="cursor-pointer border border-solid border-black/[.08] bg-white text-red-600 hover:bg-white/90"
                        >
                          <MessageSquareWarning />
                        </Button>
                      )}
                      <Button
                        type="button"
                        size="sm"
                        onClick={() =>
                          router.push(
                            `/comprovacoes/${linha.indicador.id}`,
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

      <Dialog
        open={recusadasAbertas !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) setRecusadasAbertas(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Justificativa da reprovação</DialogTitle>
            <DialogDescription>
              {recusadasAbertas?.indicador.meta}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            {recusadasAbertas?.comprovacoes
              .filter((c) => c.status === "recusado")
              .map((c) => {
                const etapa = recusadasAbertas.indicador.etapas.find(
                  (e) => e.id === c.etapa_id,
                );
                return (
                  <div key={c.id} className="rounded-lg border bg-muted/30 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {etapa?.nome ?? "Comprovação"}
                    </p>
                    <div className="mt-2 grid gap-2 text-sm">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">
                          Justificativa
                        </p>
                        <p className="text-sm">
                          {c.justificativa || "Não informada."}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">
                          Prazo para reenvio
                        </p>
                        <p className="text-sm">
                          {c.prazo_reenvio
                            ? new Date(
                                c.prazo_reenvio + "T00:00:00",
                              ).toLocaleDateString("pt-BR")
                            : "Sem prazo definido."}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
