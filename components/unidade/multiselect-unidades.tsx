"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

export type UnidadeOpcao = { id: number; nome: string };

export function MultiselectUnidades({
  unidades,
  selecionadas,
  onChange,
  largura = "w-64",
  todasLabel = "Todas as unidades",
}: {
  unidades: UnidadeOpcao[];
  selecionadas: number[];
  onChange: (ids: number[]) => void;
  largura?: string;
  todasLabel?: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    function handleClickFora(event: MouseEvent) {
      if (
        ref.current &&
        !ref.current.contains(event.target as Node)
      ) {
        setAberto(false);
        setBusca("");
      }
    }
    document.addEventListener("mousedown", handleClickFora);
    return () => document.removeEventListener("mousedown", handleClickFora);
  }, [aberto]);

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return unidades;
    return unidades.filter((u) => u.nome.toLowerCase().includes(termo));
  }, [unidades, busca]);

  const alternar = (id: number) => {
    onChange(
      selecionadas.includes(id)
        ? selecionadas.filter((u) => u !== id)
        : [...selecionadas, id],
    );
  };

  const todasSelecionadas =
    unidades.length > 0 && selecionadas.length >= unidades.length;

  const rotuloBotao =
    selecionadas.length === 0
      ? todasLabel
      : selecionadas.length === 1
        ? (unidades.find((u) => u.id === selecionadas[0])?.nome ?? "1 unidade")
        : `${selecionadas.length} unidades`;

  return (
    <div ref={ref} className={`relative ${largura}`}>
      <button
        type="button"
        onClick={() => setAberto((a) => !a)}
        className="flex h-8 w-full items-center justify-between gap-2 rounded-lg border border-input bg-transparent px-2.5 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
      >
        <span className="truncate">{rotuloBotao}</span>
        <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
      </button>

      {aberto && (
        <div className="absolute top-full z-50 mt-1 w-full overflow-hidden rounded-lg border bg-popover shadow-md">
          <div className="border-b px-2.5 py-1.5">
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar unidade..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              autoFocus
            />
          </div>
          <div className="max-h-52 overflow-auto">
            {filtradas.length === 0 && (
              <p className="px-2.5 py-2 text-sm text-muted-foreground">
                Nenhuma unidade encontrada.
              </p>
            )}
            {filtradas.length > 0 && (
              <button
                type="button"
                onClick={() =>
                  onChange(todasSelecionadas ? [] : unidades.map((u) => u.id))
                }
                className="flex w-full cursor-pointer items-center gap-2 border-b px-2.5 py-1.5 text-left text-sm font-medium hover:bg-accent"
              >
                <span
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                    todasSelecionadas
                      ? "border-bege bg-bege text-white"
                      : "border-input"
                  }`}
                >
                  {todasSelecionadas && <Check className="h-3 w-3" />}
                </span>
                Selecionar todas
              </button>
            )}
            {filtradas.map((u) => {
              const marcada = selecionadas.includes(u.id);
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => alternar(u.id)}
                  className="flex w-full cursor-pointer items-center gap-2 px-2.5 py-1.5 text-left text-sm hover:bg-accent"
                >
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                      marcada ? "border-bege bg-bege text-white" : "border-input"
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
  );
}
