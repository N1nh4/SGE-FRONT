"use client";

import { useState } from "react";

export const CORES_GRAFICO = {
  azulEscuro: "#141f28",
  bege: "#8f681b",
  verde: "#16a34a",
  azul: "#2563eb",
  vermelho: "#dc2626",
  amber: "#d97706",
  lilas: "#7c3aed",
  cinza: "#9ca3af",
};

export type SerieGrafico = { chave: string; rotulo: string; cor: string };

export type DadoGraficoBarras = {
  nome: string;
  valores: Record<string, number>;
};

export function GraficoDesempenho({
  dados,
  series,
}: {
  dados: DadoGraficoBarras[];
  series: SerieGrafico[];
}) {
  const [ativo, setAtivo] = useState<number | null>(null);
  const ALTURA = 260;
  const LARGURA_EIXO = 24;
  const MARGEM_EIXO = 8;
  const OFFSET_EIXO = LARGURA_EIXO + MARGEM_EIXO;

  const totalDe = (d: DadoGraficoBarras) =>
    series.reduce((soma, s) => soma + (d.valores[s.chave] ?? 0), 0);

  const maxTotal = Math.max(...dados.map(totalDe), 1);

  const step =
    maxTotal <= 5 ? 1 : maxTotal <= 10 ? 2 : maxTotal <= 25 ? 5 : maxTotal <= 50 ? 10 : 20;
  const yMax = Math.ceil(maxTotal / step) * step;
  const ticks = Array.from({ length: yMax / step + 1 }, (_, i) => i * step);

  const totais = dados.map(totalDe);
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
              const visiveis = series.filter((s) => (d.valores[s.chave] ?? 0) > 0);
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
                  {series.map((s) => {
                    const valor = d.valores[s.chave] ?? 0;
                    if (valor === 0) return null;
                    const ehBase = s.chave === visiveis[0]?.chave;
                    const ehTopo = s.chave === visiveis[visiveis.length - 1]?.chave;
                    return (
                      <div
                        key={s.chave}
                        className="min-h-1"
                        style={{
                          backgroundColor: s.cor,
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
                      {visiveis.map((s) => (
                        <p
                          key={s.chave}
                          className="flex items-center justify-between gap-3 py-0.5"
                        >
                          <span className="flex items-center gap-1.5">
                            <span
                              className="inline-block size-2 rounded-full"
                              style={{ backgroundColor: s.cor }}
                            />
                            {s.rotulo}
                          </span>
                          <span className="font-semibold tabular-nums">
                            {d.valores[s.chave]}
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
        {series.map((s) => (
          <span
            key={s.chave}
            className="flex items-center gap-1.5 text-xs text-muted-foreground"
          >
            <span
              className="inline-block size-2.5 rounded-full"
              style={{ backgroundColor: s.cor }}
            />
            {s.rotulo}
          </span>
        ))}
      </div>
    </div>
  );
}
