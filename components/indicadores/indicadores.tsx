"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  AlertTriangle,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronDown,
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
  children,
}: {
  titulo: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`rounded-xl border bg-card p-5 ${className}`.trim()}
    >
      <h2 className="mb-4 text-sm font-semibold text-muted-foreground">
        {titulo}
      </h2>
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

type DadoDesempenho = {
  nome: string;
  aprovado: number;
  analise: number;
  recusado: number;
  sem_atualizacao: number;
  sem_comprovante: number;
};

const ORDEM_STACK: { chave: StatusPeriodo; cor: string }[] = [
  { chave: "aprovado", cor: CORES.verde },
  { chave: "analise", cor: CORES.azul },
  { chave: "recusado", cor: CORES.vermelho },
  { chave: "sem_atualizacao", cor: CORES.amber },
  { chave: "sem_comprovante", cor: CORES.cinza },
];

function GraficoDesempenho({ dados }: { dados: DadoDesempenho[] }) {
  const [ativo, setAtivo] = useState<number | null>(null);
  const ALTURA = 260;
  const LARGURA_EIXO = 24;
  const MARGEM_EIXO = 8;
  const OFFSET_EIXO = LARGURA_EIXO + MARGEM_EIXO;

  const maxTotal = Math.max(
    ...dados.map(
      (d) =>
        d.aprovado +
        d.analise +
        d.recusado +
        d.sem_atualizacao +
        d.sem_comprovante,
    ),
    1,
  );

  const step =
    maxTotal <= 5 ? 1 : maxTotal <= 10 ? 2 : maxTotal <= 25 ? 5 : maxTotal <= 50 ? 10 : 20;
  const yMax = Math.ceil(maxTotal / step) * step;
  const ticks = Array.from({ length: yMax / step + 1 }, (_, i) => i * step);

  const totais = dados.map(
    (d) =>
      d.aprovado +
      d.analise +
      d.recusado +
      d.sem_atualizacao +
      d.sem_comprovante,
  );
  const larguraLivre =
    Math.max(24, Math.min(64, Math.floor(480 / Math.max(dados.length, 1))));

  return (
    <div className="w-full select-none">
      <div className="flex" style={{ height: ALTURA }}>
        <div
          className="relative flex shrink-0 flex-col justify-between text-right text-[11px] tabular-nums text-muted-foreground"
          style={{ width: LARGURA_EIXO, marginRight: MARGEM_EIXO }}
        >
          {ticks.map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>

        <div className="relative flex-1 border-l border-b border-muted-foreground/30">
          {ticks.map((t) => (
            <div
              key={t}
              className="absolute right-0 border-t border-dashed border-muted-foreground/20"
              style={{ top: `${ALTURA - (t / yMax) * ALTURA}px`, left: 0 }}
            />
          ))}

          <div className="absolute inset-0 flex items-end justify-evenly px-1">
            {dados.map((d, i) => {
              const total = totais[i];
              const alturaPx = (total / yMax) * ALTURA;
              const visiveis = ORDEM_STACK.filter((o) => d[o.chave] > 0);
              const hover = ativo === i;

              return (
                <div
                  key={d.nome}
                  className="relative flex flex-col-reverse"
                  style={{
                    width: larguraLivre,
                    height: Math.max(alturaPx, 2),
                    opacity: ativo !== null && !hover ? 0.45 : 1,
                    transition: "opacity 150ms",
                  }}
                  onMouseEnter={() => setAtivo(i)}
                  onMouseLeave={() => setAtivo(null)}
                >
                  {ORDEM_STACK.map((o, idx) => {
                    const valor = d[o.chave];
                    if (valor === 0) return null;
                    const ehBase = o.chave === visiveis[0]?.chave;
                    const ehTopo = o.chave === visiveis[visiveis.length - 1]?.chave;
                    return (
                      <div
                        key={o.chave}
                        className="min-h-1"
                        style={{
                          backgroundColor: o.cor,
                          height: (valor / yMax) * ALTURA,
                          borderTopLeftRadius: ehTopo ? 4 : 0,
                          borderTopRightRadius: ehTopo ? 4 : 0,
                          borderBottomLeftRadius: ehBase ? 4 : 0,
                          borderBottomRightRadius: ehBase ? 4 : 0,
                        }}
                      />
                    );
                  })}

                  {hover && (
                    <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg border bg-popover p-2.5 text-xs shadow-md">
                      <p className="mb-1 font-semibold">{d.nome}</p>
                      {ORDEM_STACK.filter((o) => d[o.chave] > 0).map((o) => (
                        <p
                          key={o.chave}
                          className="flex items-center justify-between gap-3 py-0.5"
                        >
                          <span className="flex items-center gap-1.5">
                            <span
                              className="inline-block size-2 rounded-full"
                              style={{ backgroundColor: o.cor }}
                            />
                            {ROTULO_STATUS[o.chave]}
                          </span>
                          <span className="font-semibold tabular-nums">
                            {d[o.chave]}
                          </span>
                        </p>
                      ))}
                      <p className="mt-1 flex items-center justify-between gap-3 border-t pt-1 font-semibold tabular-nums">
                        <span>Total</span>
                        <span>{total}</span>
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div
        className="mt-2 flex justify-evenly px-1"
        style={{ marginLeft: OFFSET_EIXO }}
      >
        {dados.map((d) => (
          <span
            key={d.nome}
            className="truncate text-center text-xs text-muted-foreground"
            style={{ width: larguraLivre }}
            title={d.nome}
          >
            {d.nome}
          </span>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5">
        {ORDEM_STACK.map((o) => (
          <span
            key={o.chave}
            className="flex items-center gap-1.5 text-xs text-muted-foreground"
          >
            <span
              className="inline-block size-2.5 rounded-full"
              style={{ backgroundColor: o.cor }}
            />
            {ROTULO_STATUS[o.chave]}
          </span>
        ))}
      </div>
    </div>
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
  const [dropdownUnidadesAberto, setDropdownUnidadesAberto] = useState(false);
  const [buscaUnidade, setBuscaUnidade] = useState("");
  const refDropdownUnidades = useRef<HTMLDivElement>(null);
  const [filtroObjetivo, setFiltroObjetivo] = useState<number | "todos">(
    "todos",
  );
  const agora = new Date();
  const [mes, setMes] = useState(agora.getMonth() + 1);
  const [ano, setAno] = useState(agora.getFullYear());
  const [paginaAtencao, setPaginaAtencao] = useState(1);

  const ITENS_POR_PAGINA = 8;

  useEffect(() => {
    if (!dropdownUnidadesAberto) return;
    function handleClickFora(event: MouseEvent) {
      if (
        refDropdownUnidades.current &&
        !refDropdownUnidades.current.contains(event.target as Node)
      ) {
        setDropdownUnidadesAberto(false);
        setBuscaUnidade("");
      }
    }
    document.addEventListener("mousedown", handleClickFora);
    return () => document.removeEventListener("mousedown", handleClickFora);
  }, [dropdownUnidadesAberto]);

  const alternarUnidade = (id: number) => {
    setFiltroUnidades((prev) =>
      prev.includes(id) ? prev.filter((u) => u !== id) : [...prev, id],
    );
  };

  const unidadesFiltradas = useMemo(() => {
    const termo = buscaUnidade.trim().toLowerCase();
    if (!termo) return unidades;
    return unidades.filter((u) => u.nome.toLowerCase().includes(termo));
  }, [unidades, buscaUnidade]);

  const todasUnidadesSelecionadas =
    unidades.length > 0 && filtroUnidades.length >= unidades.length;

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

  const emAnalise = linhas.filter((l) => l.status === "analise").length;
  const aprovados = linhas.filter((l) => l.status === "aprovado").length;
  const recusados = linhas.filter((l) => l.status === "recusado").length;
  const semAtualizacao = linhas.filter(
    (l) => l.status === "sem_atualizacao",
  ).length;
  const semComprovante = linhas.filter(
    (l) => l.status === "sem_comprovante",
  ).length;
  const semNada = semAtualizacao + semComprovante;

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
      cor: CORES.azulEscuro,
    },
    {
      titulo: "Em análise",
      valor: emAnalise,
      icon: ClipboardList,
      cor: CORES.azul,
    },
    {
      titulo: "Aprovados",
      valor: aprovados,
      icon: CheckCircle2,
      cor: CORES.verde,
    },
    {
      titulo: "Recusados",
      valor: recusados,
      icon: AlertTriangle,
      cor: CORES.vermelho,
    },
    {
      titulo: "Sem atualização/comprovante",
      valor: semNada,
      icon: MinusCircle,
      cor: CORES.amber,
    },
  ];

  const kpisComStatus: { label: string; valor: number; cor: string }[] = [
    { label: "Sem atualização", valor: semAtualizacao, cor: CORES.amber },
    { label: "Sem comprovante", valor: semComprovante, cor: CORES.cinza },
  ];

  const dadosDesempenho = useMemo(() => {
    if (!planejamentos) return [];
    const acumulo = new Map<
      number,
      {
        nome: string;
        aprovado: number;
        analise: number;
        recusado: number;
        sem_atualizacao: number;
        sem_comprovante: number;
      }
    >();
    for (const p of planejamentos) {
      if (filtroObjetivo !== "todos" && p.objetivo.id !== filtroObjetivo)
        continue;
      for (const ind of p.indicadores) {
        const periodo = (comprovacoes[ind.id] ?? []).filter(
          (c) => c.ano === ano && c.mes === mes,
        );
        const status = statusPeriodo(periodo);
        for (const u of ind.unidades) {
          if (filtroUnidades.length > 0 && !filtroUnidades.includes(u.id))
            continue;
          const atual =
            acumulo.get(u.id) ??
            {
              nome: u.nome,
              aprovado: 0,
              analise: 0,
              recusado: 0,
              sem_atualizacao: 0,
              sem_comprovante: 0,
            };
          atual[status] += 1;
          acumulo.set(u.id, atual);
        }
      }
    }
    return Array.from(acumulo.values())
      .filter(
        (d) =>
          d.aprovado +
            d.analise +
            d.recusado +
            d.sem_atualizacao +
            d.sem_comprovante >
          0,
      )
      .sort(
        (a, b) =>
          b.aprovado +
          b.analise +
          b.recusado +
          b.sem_atualizacao +
          b.sem_comprovante -
          (a.aprovado +
            a.analise +
            a.recusado +
            a.sem_atualizacao +
            a.sem_comprovante),
      );
  }, [planejamentos, comprovacoes, filtroUnidades, filtroObjetivo, ano, mes]);

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
    const ids = new Set(linhas.map((l) => l.indicadorId));
    return meses.map((m) => ({
      mes: m.rotulo,
      envios: Object.entries(comprovacoes).reduce((soma, [id, lista]) => {
        if (!ids.has(Number(id))) return soma;
        return (
          soma +
          lista.filter((c) => c.created_at?.slice(0, 7) === m.chave).length
        );
      }, 0),
    }));
  }, [linhas, comprovacoes, ano, mes]);

  const atencao = useMemo(() => {
    const hoje = new Date();
    return linhas
      .filter((l) => {
        if (l.status === "recusado") return true;
        if (l.progresso < 30) return true;
        if (l.prazo && l.status !== "aprovado" && l.status !== "analise") {
          const prazo = new Date(`${l.prazo}T23:59:59`);
          const dias = Math.round((prazo.getTime() - hoje.getTime()) / 86400000);
          if (dias >= 0 && dias <= 60) return true;
        }
        return false;
      })
      .sort((a, b) => {
        if (a.status === "recusado" && b.status !== "recusado") return -1;
        if (b.status === "recusado" && a.status !== "recusado") return 1;
        return a.progresso - b.progresso;
      });
  }, [linhas]);

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
          <div ref={refDropdownUnidades} className="relative w-64">
            <button
              type="button"
              onClick={() => setDropdownUnidadesAberto((aberto) => !aberto)}
              className="flex h-8 w-full items-center justify-between gap-2 rounded-lg border border-input bg-transparent px-2.5 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
            >
              <span className="truncate">
                {filtroUnidades.length === 0
                  ? "Todas as unidades"
                  : filtroUnidades.length === 1
                    ? (unidades.find((u) => u.id === filtroUnidades[0])?.nome ??
                      "1 unidade")
                    : `${filtroUnidades.length} unidades`}
              </span>
              <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
            </button>

            {dropdownUnidadesAberto && (
              <div className="absolute top-full z-50 mt-1 w-full overflow-hidden rounded-lg border bg-popover shadow-md">
                <div className="border-b px-2.5 py-1.5">
                  <input
                    type="text"
                    value={buscaUnidade}
                    onChange={(e) => setBuscaUnidade(e.target.value)}
                    placeholder="Buscar unidade..."
                    className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                    autoFocus
                  />
                </div>
                <div className="max-h-52 overflow-auto">
                  {unidadesFiltradas.length === 0 && (
                    <p className="px-2.5 py-2 text-sm text-muted-foreground">
                      Nenhuma unidade encontrada.
                    </p>
                  )}
                  {unidadesFiltradas.length > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        setFiltroUnidades(
                          todasUnidadesSelecionadas
                            ? []
                            : unidades.map((u) => u.id),
                        )
                      }
                      className="flex w-full cursor-pointer items-center gap-2 border-b px-2.5 py-1.5 text-left text-sm font-medium hover:bg-accent"
                    >
                      <span
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                          todasUnidadesSelecionadas
                            ? "border-bege bg-bege text-white"
                            : "border-input"
                        }`}
                      >
                        {todasUnidadesSelecionadas && (
                          <Check className="h-3 w-3" />
                        )}
                      </span>
                      Selecionar todas
                    </button>
                  )}
                  {unidadesFiltradas.map((u) => {
                    const marcada = filtroUnidades.includes(u.id);
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => alternarUnidade(u.id)}
                        className="flex w-full cursor-pointer items-center gap-2 px-2.5 py-1.5 text-left text-sm hover:bg-accent"
                      >
                        <span
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                            marcada
                              ? "border-bege bg-bege text-white"
                              : "border-input"
                          }`}
                        >
                          {marcada && <Check className="h-3 w-3" />}
                        </span>
                        <span className="truncate">{u.nome}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
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
            {Array.from({ length: 5 }, (_, i) => agora.getFullYear() - 4 + i).map(
              (a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ),
            )}
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
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
            {kpis.map((k) => (
              <div
                key={k.titulo}
                className="flex flex-col gap-3 rounded-xl border bg-card p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs leading-snug font-medium text-muted-foreground">
                    {k.titulo}
                  </span>
                  <k.icon className="size-4 shrink-0" style={{ color: k.cor }} />
                </div>
                <span className="text-2xl font-semibold">{k.valor}</span>
                {k.titulo === "Sem atualização/comprovante" && (
                  <div className="flex flex-col gap-1 text-[11px] text-muted-foreground">
                    {kpisComStatus.map((s) => (
                      <span key={s.label} className="flex items-center gap-1.5">
                        <span
                          className="inline-block size-1.5 rounded-full"
                          style={{ backgroundColor: s.cor }}
                        />
                        {s.label}: {s.valor}
                      </span>
                    ))}
                  </div>
                )}
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
                <GraficoDesempenho dados={dadosDesempenho} />
              )}
            </Painel>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Painel titulo="Evolução de envios (últimos 12 meses)">
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={dadosEvolucao}>
                  <defs>
                    <linearGradient
                      id="gradEnvios"
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
                    dataKey="envios"
                    name="Envios"
                    stroke={CORES.bege}
                    strokeWidth={2}
                    fill="url(#gradEnvios)"
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

          <Painel titulo="Atenção" className="mb-2">
            {atencao.length === 0 ? (
              <SemDados>Nenhum indicador requer atenção.</SemDados>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="p-3 font-semibold">Meta</th>
                      <th className="p-3 font-semibold">Iniciativa</th>
                      <th className="p-3 font-semibold">Unidade</th>
                      <th className="p-3 font-semibold">Status</th>
                      <th className="p-3 text-right font-semibold">Progresso</th>
                      <th className="p-3 font-semibold">Prazo</th>
                      <th className="p-3 text-right font-semibold"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {atencaoPagina.map((l, i) => (
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