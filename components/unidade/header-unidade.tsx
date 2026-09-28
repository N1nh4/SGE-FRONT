"use client";

import { useEffect, useRef, useState } from "react";
import { Building2, Check, LoaderCircle } from "lucide-react";
import { useAuth } from "@/context/auth-context";

export function HeaderUnidade() {
  const { usuario, unidades, unidadeId, selecionarUnidade } = useAuth();
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const [trocando, setTrocando] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const unidadeAtual = unidades.find((u) => u.id === unidadeId);
  const podeTrocar = usuario?.papel === "master" && unidades.length > 1;

  useEffect(() => {
    if (!aberto) return;
    function aoClicarFora(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        fechar();
      }
    }
    function aoTeclar(event: KeyboardEvent) {
      if (event.key === "Escape") fechar();
    }
    document.addEventListener("mousedown", aoClicarFora);
    document.addEventListener("keydown", aoTeclar);
    return () => {
      document.removeEventListener("mousedown", aoClicarFora);
      document.removeEventListener("keydown", aoTeclar);
    };
  }, [aberto]);

  function fechar() {
    setAberto(false);
    setBusca("");
  }

  const filtradas = busca.trim()
    ? unidades.filter((u) =>
        u.nome.toLowerCase().includes(busca.trim().toLowerCase()),
      )
    : unidades;

  async function trocar(id: number) {
    if (id === unidadeId) {
      fechar();
      return;
    }
    setTrocando(id);
    try {
      await selecionarUnidade(id, { navegar: false });
      fechar();
    } finally {
      setTrocando(null);
    }
  }

  if (!unidadeAtual) return null;

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => {
          if (!podeTrocar) return;
          if (aberto) {
            fechar();
            return;
          }
          setAberto(true);
        }}
        disabled={!podeTrocar}
        title={
          podeTrocar
            ? `Unidade: ${unidadeAtual.nome}. Clique para trocar.`
            : `Unidade: ${unidadeAtual.nome}`
        }
        aria-haspopup={podeTrocar ? "listbox" : undefined}
        aria-expanded={podeTrocar ? aberto : undefined}
        className={`flex h-9 max-w-56 items-center gap-2 rounded-lg border bg-background px-2.5 text-left ${
          podeTrocar
            ? "cursor-pointer transition-colors hover:bg-accent"
            : "cursor-default"
        }`}
      >
        <Building2 className="size-4 shrink-0 text-muted-foreground" />
        <span className="truncate text-sm font-medium">
          {unidadeAtual.nome}
        </span>
        {podeTrocar && (
          <span className="shrink-0 text-[10px] text-muted-foreground">
            trocar
          </span>
        )}
      </button>

      {aberto && (
        <div className="absolute right-0 top-full z-50 mt-1 w-72 overflow-hidden rounded-lg border bg-popover shadow-md">
          <div className="border-b p-2">
            <input
              autoFocus
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar unidade..."
              className="w-full rounded-md border bg-background px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div className="max-h-72 overflow-y-auto p-1">
            {filtradas.length === 0 ? (
              <p className="px-2 py-3 text-center text-xs text-muted-foreground">
                Nenhuma unidade encontrada.
              </p>
            ) : (
              filtradas.map((u) => {
                const ativa = u.id === unidadeId;
                return (
                  <button
                    key={u.id}
                    onClick={() => trocar(u.id)}
                    disabled={trocando !== null}
                    className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {trocando === u.id ? (
                      <LoaderCircle className="size-4 shrink-0 animate-spin" />
                    ) : (
                      <Check
                        className={`size-4 shrink-0 ${
                          ativa
                            ? "text-azul-escuro"
                            : "text-transparent"
                        }`}
                      />
                    )}
                    <span className="min-w-0 flex-1 truncate">{u.nome}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
