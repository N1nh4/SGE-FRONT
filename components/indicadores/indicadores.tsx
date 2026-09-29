"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { LucideIcon } from "lucide-react";
import {
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  LoaderCircle,
  MinusCircle,
  Target,
} from "lucide-react";
import {
  fetchComprovacoes,
  fetchPlanejamento,
  fetchUnidades,
  type Comprovacao,
  type Planejamento,
  type Unidade,
} from "@/lib/api";
import { Pagination } from "@/components/ui/pagination";
import {
  GraficoDesempenho,
  type SerieGrafico,
} from "@/components/graficos/grafico-desempenho";
import { MultiselectUnidades } from "@/components/unidade/multiselect-unidades";

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

const CORES = {
  azulEscuro: "#141f28",
  bege: "#8f681b",
  verde: "#16a34a",
  azul: "#2563eb",
  vermelho: "#dc2626",
  amber: "#d97706",
  cinza: "#9ca3af",
};

type StatusPeriodo =
  | "aprovado"
  | "analise"
  | "recusado"
  | "sem_atualizacao"
  | "sem_comprovante";

const ROTULO_STATUS: Record<StatusPeriodo, string> = {
  aprovado: "Aprovado",
  analise: "Em análise",
  recusado: "Recusado",
  sem_atualizacao: "Sem atualização",
  sem_comprovante: "Sem comprovante",
};

type LinhaIndicador = {
  status: StatusPeriodo;
  progresso: number;
  prazo: string | null;
};

function motivosAtencao(
  l: LinhaIndicador,
  hoje: Date,
): { rotulo: string; classe: string }[] {
  const motivos: { rotulo: string; classe: string }[] = [];
  if (l.status === "recusado")
    motivos.push({ rotulo: "Comprovação recusada", classe: "text-red-600" });
  if (l.progresso < 30)
    motivos.push({
      rotulo: "Progresso abaixo de 30%",
      classe: "text-amber-600",
    });
  if (l.prazo && l.status !== "aprovado" && l.status !== "analise") {
    const prazo = new Date(`${l.prazo}T23:59:59`);
    const dias = Math.round((prazo.getTime() - hoje.getTime()) / 86400000);
    if (dias >= 0 && dias <= 60)
      motivos.push({ rotulo: "Prazo próximo", classe: "text-azul-escuro" });
  }
  return motivos;
}

type FaixaProgresso = "finalizados" | "em_andamento" | "nao_iniciados";

const SERIE_PROGRESSO: SerieGrafico[] = [
  { chave: "finalizados", rotulo: "Finalizado", cor: CORES.verde },
  { chave: "em_andamento", rotulo: "Em andamento", cor: CORES.amber },
  { chave: "nao_iniciados", rotulo: "Não iniciado", cor: CORES.cinza },
];

function faixaProgresso(progresso: number): FaixaProgresso {
  if (progresso >= 100) return "finalizados";
  if (progresso > 0) return "em_andamento";
  return "nao_iniciados";
}

function statusPeriodo(comprovacoes: Comprovacao[]): StatusPeriodo {
  if (comprovacoes.length === 0) return "sem_comprovante";

  // Só a comprovação vigente de cada etapa conta. O backend guarda todas as
  // versões no histórico e nunca altera a anterior, então um "recusado" antigo
  // continuaria segurando o indicador em recusado mesmo depois de reenvio e
  // aprovação. A vigente é a de maior versão do grupo.
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

function formatarData(iso: string | null): string {
  if (!iso) return "—";
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

function badgeClasse(status: StatusPeriodo): string {
  switch (status) {
    case "aprovado":
      return "bg-green-600/15 text-green-700";
    case "analise":
      return "bg-blue-600/15 text-blue-700";
    case "recusado":
      return "bg-red-600/15 text-red-700";
    case "sem_atualizacao":
      return "bg-amber-600/15 text-amber-700";
    case "sem_comprovante":
      return "bg-muted text-muted-foreground";
  }
}

type Linha = {
  indicadorId: number;
  indicadorNome: string;
  meta: string;
  iniciativa: string;
  iniciativaId: number;
  objetivo: string;
  objetivoId: number;
  prazo: string | null;
  progresso: number;
  status: StatusPeriodo;
  unidades: string;
};

function Painel({
  titulo,
  className = "",
  descricao,
  children,
}: {
  titulo: string;
  className?: string;
  descricao?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`rounded-xl border bg-card p-5 ${className}`.trim()}>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-muted-foreground">
          {titulo}
        </h2>
        {descricao && (
          <p className="text-xs text-muted-foreground">{descricao}</p>
        )}
      </div>
      {children}
    </section>
  );
}

function SemDados({ children }: { children?: React.ReactNode }) {
  return (
    <p className="flex items-center justify-center py-14 text-sm text-muted-foreground">
      {children ?? "Sem dados no período selecionado."}
    </p>
  );
}

export function Indicadores() {
  const [planejamentos, setPlanejamentos] = useState<Planejamento[] | null>(
    null,
  );
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [comprovacoes, setComprovacoes] = useState<
    Record<number, Comprovacao[]>
  >({});
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);

  // Lista vazia = todas as unidades. Este filtro é só de visualização: o
  // escopo de escrita continua sendo aplicado pelo backend via X-Unidade-Id,
  // que só restringe o papel "default" (ver get_escopo_unidade em deps.py).
  const [filtroUnidades, setFiltroUnidades] = useState<number[]>([]);
  const [filtroObjetivo, setFiltroObjetivo] = useState<number | "todos">(
    "todos",
  );
  const agora = new Date();
  const [mes, setMes] = useState(agora.getMonth() + 1);
  const [ano, setAno] = useState(agora.getFullYear());
  const [paginaAtencao, setPaginaAtencao] = useState(1);

  const ITENS_POR_PAGINA = 8;


  useEffect(() => {
    let ativo = true;
    async function carregar() {
      try {
        const [planes, unis] = await Promise.all([
          fetchPlanejamento(),
          fetchUnidades(),
        ]);
        if (!ativo) return;
        setPlanejamentos(planes);
        setUnidades(unis);

        const mapa: Record<number, Comprovacao[]> = {};
        await Promise.all(
          planes.flatMap((p) =>
            p.indicadores.map(async (ind) => {
              mapa[ind.id] = await fetchComprovacoes(ind.id);
            }),
          ),
        );
        if (ativo) setComprovacoes(mapa);
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
  }, []);

  const objetivos = useMemo(() => {
    const mapa = new Map<number, string>();
    for (const p of planejamentos ?? []) {
      if (!mapa.has(p.objetivo.id)) mapa.set(p.objetivo.id, p.objetivo.nome);
    }
    return Array.from(mapa.entries());
  }, [planejamentos]);

  const linhas = useMemo<Linha[]>(() => {
    if (!planejamentos) return [];
    const resultado: Linha[] = [];
    for (const p of planejamentos) {
      if (filtroObjetivo !== "todos" && p.objetivo.id !== filtroObjetivo)
        continue;
      for (const ind of p.indicadores) {
        if (
          filtroUnidades.length > 0 &&
          !ind.unidades.some((u) => filtroUnidades.includes(u.id))
        )
          continue;
        const periodo = (comprovacoes[ind.id] ?? []).filter(
          (c) => c.ano === ano && c.mes === mes,
        );
        resultado.push({
          indicadorId: ind.id,
          indicadorNome: ind.nome,
          meta: ind.meta,
          iniciativa: p.nome,
          iniciativaId: p.id,
          objetivo: p.objetivo.nome,
          objetivoId: p.objetivo.id,
          prazo: ind.prazo,
          progresso: ind.progresso,
          status: statusPeriodo(periodo),
          unidades: ind.unidades.map((u) => u.nome).join(", "),
        });
      }
    }
    return resultado;
  }, [planejamentos, comprovacoes, filtroUnidades, filtroObjetivo, ano, mes]);

  const totalIndicadores = linhas.length;
  const progressoMedio =
    totalIndicadores === 0
      ? 0
      : Math.round(
          (linhas.reduce((soma, l) => soma + l.progresso, 0) /
            totalIndicadores) *
            10,
        ) / 10;

  // Aqui o objeto medido é o indicador, não o documento. Os estados de
  // comprovação (aprovado, em análise, recusado) pertencem à Validação, onde
  // uma meta pode ter mais de um documento. Aqui o corte é pelo progresso.
  const finalizados = linhas.filter(
    (l) => faixaProgresso(l.progresso) === "finalizados",
  ).length;
  const emAndamento = linhas.filter(
    (l) => faixaProgresso(l.progresso) === "em_andamento",
  ).length;
  const naoIniciados = linhas.filter(
    (l) => faixaProgresso(l.progresso) === "nao_iniciados",
  ).length;

  const kpis: {
    titulo: string;
    valor: string | number;
    icon: LucideIcon;
    cor: string;
  }[] = [
    {
      titulo: "Total de indicadores",
      valor: totalIndicadores,
      icon: Target,
      cor: CORES.azul,
    },
    {
      titulo: "Finalizado",
      valor: finalizados,
      icon: CheckCircle2,
      cor: CORES.verde,
    },
    {
      titulo: "Em andamento",
      valor: emAndamento,
      icon: ClipboardList,
      cor: CORES.amber,
    },
    {
      titulo: "Não iniciado",
      valor: naoIniciados,
      icon: MinusCircle,
      cor: CORES.cinza,
    },
  ];

  const dadosDesempenho = useMemo(() => {
    if (!planejamentos) return [];
    const acumulo = new Map<
      number,
      { nome: string; valores: Record<string, number> }
    >();
    for (const p of planejamentos) {
      if (filtroObjetivo !== "todos" && p.objetivo.id !== filtroObjetivo)
        continue;
      for (const ind of p.indicadores) {
        const faixa = faixaProgresso(ind.progresso);
        for (const u of ind.unidades) {
          if (filtroUnidades.length > 0 && !filtroUnidades.includes(u.id))
            continue;
          const atual = acumulo.get(u.id) ?? {
            nome: u.nome,
            valores: {
              finalizados: 0,
              em_andamento: 0,
              nao_iniciados: 0,
            },
          };
          atual.valores[faixa] += 1;
          acumulo.set(u.id, atual);
        }
      }
    }
    return Array.from(acumulo.values())
      .filter(
        (d) =>
          d.valores.finalizados +
            d.valores.em_andamento +
            d.valores.nao_iniciados >
          0,
      )
      .sort(
        (a, b) =>
          b.valores.finalizados +
          b.valores.em_andamento +
          b.valores.nao_iniciados -
          (a.valores.finalizados +
            a.valores.em_andamento +
            a.valores.nao_iniciados),
      );
  }, [planejamentos, filtroUnidades, filtroObjetivo]);

  const dadosAvancao = useMemo(() => {
    const mapa = new Map<
      number,
      { objetivo: string; soma: number; qtd: number }
    >();
    for (const l of linhas) {
      const atual = mapa.get(l.objetivoId) ?? {
        objetivo: l.objetivo,
        soma: 0,
        qtd: 0,
      };
      atual.soma += l.progresso;
      atual.qtd += 1;
      mapa.set(l.objetivoId, atual);
    }
    return Array.from(mapa.values())
      .map((a) => ({
        objetivo: a.objetivo,
        progresso: Math.round((a.soma / a.qtd) * 10) / 10,
        indicadores: a.qtd,
      }))
      .sort((a, b) => b.progresso - a.progresso);
  }, [linhas]);

  // Curva de crescimento dos indicadores finalizados, agregada no recorte todo
  // (nunca por indicador). Um indicador entra no mês em que sua última etapa
  // foi aprovada, que é quando ele chega a 100%.
  const dadosEvolucao = useMemo(() => {
    const meses: { chave: string; rotulo: string }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(ano, mes - 1 - i, 1);
      meses.push({
        chave: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        rotulo: `${MESES[d.getMonth()].slice(0, 3)}/${String(
          d.getFullYear(),
        ).slice(2)}`,
      });
    }

    const finalizarEm = new Map<string, number>();
    for (const l of linhas) {
      if (l.progresso < 100) continue;

      const lista = comprovacoes[l.indicadorId] ?? [];
      const vigentePorEtapa = new Map<number, Comprovacao>();
      for (const c of lista) {
        if (c.status !== "aprovado" || c.etapa_id == null) continue;
        const atual = vigentePorEtapa.get(c.etapa_id);
        if (!atual || c.versao > atual.versao)
          vigentePorEtapa.set(c.etapa_id, c);
      }
      const aprovacoes = Array.from(vigentePorEtapa.values())
        .map((c) => c.created_at ?? c.updated_at)
        .filter((d): d is string => Boolean(d));

      const ultima = aprovacoes.sort().at(-1);
      const referencia = ultima?.slice(0, 7) ?? l.prazo?.slice(0, 7);
      if (!referencia) continue;
      finalizarEm.set(referencia, (finalizarEm.get(referencia) ?? 0) + 1);
    }

    let acumulado = 0;
    return meses.map((m) => {
      const noMes = finalizarEm.get(m.chave) ?? 0;
      acumulado += noMes;
      return { mes: m.rotulo, noMes, acumulado };
    });
  }, [linhas, comprovacoes, ano, mes]);

  // A tabela lista todos os indicadores do recorte (o total tem que bater com o
  // card "Total de indicadores"); o que muda aqui é a ordenação e o motivo do
  // destaque, não a quantidade de linhas. Filtrar por atenção esconderia parte
  // dos indicadores e o total da tabela não fecharia com o KPI.
  const atencao = useMemo(() => {
    const hoje = new Date();
    const prioridade = (l: (typeof linhas)[number]) => {
      if (l.status === "recusado") return 0;
      if (motivosAtencao(l, hoje).length > 0) return 1;
      return 2;
    };
    return [...linhas].sort((a, b) => {
      const pa = prioridade(a);
      const pb = prioridade(b);
      if (pa !== pb) return pa - pb;
      if (a.status === "recusado" && b.status !== "recusado") return -1;
      if (b.status === "recusado" && a.status !== "recusado") return 1;
      return a.progresso - b.progresso;
    });
  }, [linhas]);

  const totalEmAtencao = useMemo(
    () =>
      atencao.filter(
        (l) =>
          l.status === "recusado" || motivosAtencao(l, new Date()).length > 0,
      ).length,
    [atencao],
  );

  const totalPaginasAtencao = Math.max(
    1,
    Math.ceil(atencao.length / ITENS_POR_PAGINA),
  );
  const paginaAtencaoSegura = Math.min(paginaAtencao, totalPaginasAtencao);
  const atencaoPagina = useMemo(() => {
    const inicio = (paginaAtencaoSegura - 1) * ITENS_POR_PAGINA;
    return atencao.slice(inicio, inicio + ITENS_POR_PAGINA);
  }, [atencao, paginaAtencaoSegura]);

  const campoSelect =
    "h-8 w-auto rounded-lg border border-input bg-transparent px-2 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

  return (
    <main className="flex-1 bg-cinza-claro p-8">
      <section className="mb-6 flex flex-wrap items-end gap-4 rounded-xl border bg-card p-5">
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-muted-foreground">
            Unidades
          </span>
          <MultiselectUnidades
            unidades={unidades}
            selecionadas={filtroUnidades}
            onChange={setFiltroUnidades}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="objetivo"
            className="text-sm font-medium text-muted-foreground"
          >
            Objetivo
          </label>
          <select
            id="objetivo"
            value={filtroObjetivo}
            onChange={(e) =>
              setFiltroObjetivo(
                e.target.value === "todos" ? "todos" : Number(e.target.value),
              )
            }
            className={campoSelect}
          >
            <option value="todos">Todos os objetivos</option>
            {objetivos.map(([id, nome]) => (
              <option key={id} value={id}>
                {nome}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="mes"
            className="text-sm font-medium text-muted-foreground"
          >
            Mês
          </label>
          <select
            id="mes"
            value={mes}
            onChange={(e) => setMes(Number(e.target.value))}
            className={campoSelect}
          >
            {MESES.map((nome, index) => (
              <option key={nome} value={index + 1}>
                {nome}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="ano"
            className="text-sm font-medium text-muted-foreground"
          >
            Ano
          </label>
          <select
            id="ano"
            value={ano}
            onChange={(e) => setAno(Number(e.target.value))}
            className={campoSelect}
          >
            {Array.from(
              { length: 5 },
              (_, i) => agora.getFullYear() - 4 + i,
            ).map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
      </section>

      {carregando && (
        <div className="flex items-center justify-center gap-3 py-20 text-sm text-muted-foreground">
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
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {kpis.map((k) => (
              <div
                key={k.titulo}
                className="flex flex-col gap-3 rounded-xl border bg-card p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs leading-snug font-medium text-muted-foreground">
                    {k.titulo}
                  </span>
                  <k.icon
                    className="size-4 shrink-0"
                    style={{ color: k.cor }}
                  />
                </div>
                <span className="text-2xl font-semibold">{k.valor}</span>
              </div>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-5">
            <Painel titulo="Progresso médio" className="lg:col-span-1">
              <div className="relative h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[{ value: 100 }]}
                      dataKey="value"
                      startAngle={90}
                      endAngle={450}
                      innerRadius={70}
                      outerRadius={94}
                      stroke="transparent"
                      fill="var(--muted)"
                      isAnimationActive={false}
                    />
                    <Pie
                      data={[{ value: progressoMedio }]}
                      dataKey="value"
                      startAngle={90}
                      endAngle={90 + (progressoMedio / 100) * 360}
                      innerRadius={70}
                      outerRadius={94}
                      stroke="transparent"
                      fill={CORES.bege}
                      cornerRadius={8}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-0.5">
                  <span className="text-2xl font-semibold tabular-nums">
                    {progressoMedio}%
                  </span>
                  <span className="text-xs font-medium text-muted-foreground">
                    concluído
                  </span>
                </div>
              </div>
            </Painel>

            <Painel titulo="Desempenho por unidade" className="lg:col-span-4">
              {dadosDesempenho.length === 0 ? (
                <SemDados />
              ) : (
                <GraficoDesempenho
                  dados={dadosDesempenho}
                  series={SERIE_PROGRESSO}
                />
              )}
            </Painel>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Painel titulo="Curva de finalização (últimos 12 meses)">
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={dadosEvolucao}>
                  <defs>
                    <linearGradient
                      id="gradFinalizados"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor={CORES.bege}
                        stopOpacity={0.4}
                      />
                      <stop
                        offset="100%"
                        stopColor={CORES.bege}
                        stopOpacity={0.05}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="mes"
                    tick={{ fontSize: 12 }}
                    stroke={CORES.cinza}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 12 }}
                    stroke={CORES.cinza}
                    tickLine={false}
                    axisLine={false}
                    width={28}
                  />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="acumulado"
                    name="Indicadores finalizados"
                    stroke={CORES.bege}
                    strokeWidth={2}
                    fill="url(#gradFinalizados)"
                    dot={{
                      r: 4,
                      fill: CORES.bege,
                      stroke: "#fff",
                      strokeWidth: 2,
                    }}
                    activeDot={{ r: 6, fill: CORES.bege }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Painel>

            <Painel titulo="Avanço por objetivo">
              {dadosAvancao.length === 0 ? (
                <SemDados />
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart
                    data={dadosAvancao}
                    layout="vertical"
                    margin={{ top: 4, right: 48, left: 8, bottom: 4 }}
                  >
                    <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                    <XAxis
                      type="number"
                      domain={[0, 100]}
                      tick={{ fontSize: 12 }}
                      stroke={CORES.cinza}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v: number) => `${v}%`}
                    />
                    <YAxis
                      type="category"
                      dataKey="objetivo"
                      width={170}
                      tick={{ fontSize: 12 }}
                      stroke={CORES.cinza}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v: string) =>
                        v.length > 26 ? `${v.slice(0, 26)}…` : v
                      }
                    />
                    <Tooltip
                      formatter={(v) => [`${v}%`, "Cumprido"]}
                      labelFormatter={(l) => `Objetivo: ${String(l)}`}
                    />
                    <Bar
                      dataKey="progresso"
                      name="Avanço"
                      fill={CORES.bege}
                      barSize={18}
                      radius={[0, 4, 4, 0]}
                    >
                      <LabelList
                        dataKey="progresso"
                        position="right"
                        className="fill-[var(--muted-foreground)] text-xs"
                        formatter={(v) => `${String(v)}%`}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Painel>
          </div>

          <Painel
            titulo="Atenção"
            className="mb-2"
            descricao={`${totalEmAtencao} de ${atencao.length} indicadores precisam de acompanhamento`}
          >
            {atencao.length === 0 ? (
              <SemDados>Nenhum indicador cadastrado no recorte.</SemDados>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="p-3 font-semibold">Meta</th>
                      <th className="p-3 font-semibold">Iniciativa</th>
                      <th className="p-3 font-semibold">Unidade</th>
                      <th className="p-3 font-semibold">Status</th>
                      <th className="p-3 text-right font-semibold">
                        Progresso
                      </th>
                      <th className="p-3 font-semibold">Prazo</th>
                      <th className="p-3 text-right font-semibold"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {atencaoPagina.map((l) => (
                      <tr
                        key={l.indicadorId}
                        className="border-b last:border-0"
                      >
                        <td className="p-3 font-medium">
                          <Link
                            href={`/planejamento/${l.iniciativaId}/comprovacoes/${l.indicadorId}`}
                            className="hover:underline"
                          >
                            {l.indicadorNome}
                          </Link>
                          <span className="block text-xs text-muted-foreground">
                            Meta: {l.meta}
                          </span>
                        </td>
                        <td className="max-w-56 truncate p-3 text-muted-foreground">
                          {l.iniciativa}
                        </td>
                        <td className="max-w-40 truncate p-3 text-muted-foreground">
                          {l.unidades}
                        </td>
                        <td className="p-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${badgeClasse(l.status)}`}
                          >
                            {ROTULO_STATUS[l.status]}
                          </span>
                        </td>
                        <td className="p-3 text-right tabular-nums">
                          <span className="text-xs font-medium text-muted-foreground">
                            {l.progresso}%
                          </span>
                        </td>
                        <td className="p-3 tabular-nums text-muted-foreground">
                          {formatarData(l.prazo)}
                        </td>
                        <td className="p-3 text-right">
                          <Link
                            href={`/planejamento/${l.iniciativaId}/comprovacoes/${l.indicadorId}`}
                            className="inline-flex items-center gap-1 text-xs font-medium text-primary underline underline-offset-4 hover:text-foreground"
                          >
                            <CalendarClock className="size-3.5" />
                            Ver
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <Pagination
              paginaAtual={paginaAtencaoSegura}
              totalPaginas={totalPaginasAtencao}
              totalItens={atencao.length}
              itensPorPagina={ITENS_POR_PAGINA}
              rotuloItensPlural="indicadores"
              onMudarPagina={setPaginaAtencao}
            />
          </Painel>
        </div>
      )}
    </main>
  );
}
