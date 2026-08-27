"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  Check,
  CheckCheck,
  ClipboardCheck,
  FileCheck,
  Inbox,
  Target,
} from "lucide-react";
import { HeaderBell } from "@/components/notificacoes/header-bell";
import { Button } from "@/components/ui/button";
import { useNotificacoes } from "@/context/notification-context";
import { usePermissoes } from "@/lib/use-permissoes";
import { fetchNotificacoes, type Notificacao } from "@/lib/api";

type TipoNotificacao = "validacao" | "comprovacao" | "planejamento" | "objetivo";

const ICONES: Record<TipoNotificacao, typeof Bell> = {
  validacao: ClipboardCheck,
  comprovacao: FileCheck,
  planejamento: Target,
  objetivo: Bell,
};

function formatarData(iso: string): string {
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return iso;
  return data.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function Notificacao() {
  const { pode } = usePermissoes();
  const podeLer = pode("/notificacoes", "ler");
  const { naoLidas, marcarLida, marcarTodasLidas } = useNotificacoes();
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [filtro, setFiltro] = useState<"todas" | "nao-lidas" | "lidas">(
    "todas",
  );

  useEffect(() => {
    fetchNotificacoes()
      .then((lista) => setNotificacoes(lista))
      .catch(() => setNotificacoes([]))
      .finally(() => setCarregando(false));
  }, []);

  const visiveis = useMemo(() => {
    if (filtro === "nao-lidas")
      return notificacoes.filter((n) => !n.lida);
    if (filtro === "lidas") return notificacoes.filter((n) => n.lida);
    return notificacoes;
  }, [notificacoes, filtro]);

  function marcarUma(id: number) {
    marcarLida(id).then(() => {
      setNotificacoes((prev) =>
        prev.map((n) => (n.id === id ? { ...n, lida: true } : n)),
      );
    });
  }

  function marcarTodas() {
    marcarTodasLidas().then(() => {
      setNotificacoes((prev) => prev.map((n) => ({ ...n, lida: true })));
    });
  }

  return (
    <>
      <header className="flex h-16 items-center justify-between gap-4 border-b px-8 py-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Notificações
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {podeLer && (
            <Button
              variant="outline"
              onClick={marcarTodas}
              disabled={naoLidas === 0}
              className="cursor-pointer"
            >
              <CheckCheck className="h-4 w-4" />
              Marcar todas como lidas
            </Button>
          )}
          <HeaderBell />
        </div>
      </header>

      <main className="flex flex-1 flex-col bg-cinza-claro p-8">
        <div className="mb-6 flex flex-wrap items-center gap-2">
          {(
            [
              { chave: "todas", rotulo: `Todas (${notificacoes.length})` },
              { chave: "nao-lidas", rotulo: `Não lidas (${naoLidas})` },
              { chave: "lidas", rotulo: `Lidas` },
            ] as const
          ).map((aba) => (
            <Button
              key={aba.chave}
              variant={filtro === aba.chave ? "default" : "outline"}
              size="sm"
              onClick={() => setFiltro(aba.chave)}
              className="cursor-pointer"
            >
              {aba.rotulo}
            </Button>
          ))}
        </div>

        {carregando ? (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            Carregando notificações...
          </div>
        ) : visiveis.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
            <Inbox className="h-10 w-10" />
            <p className="text-sm">Nenhuma notificação no momento.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {visiveis.map((notificacao) => {
              const Icone = ICONES[notificacao.tipo as TipoNotificacao] ?? Bell;
              const naoLida = !notificacao.lida;
              return (
                <article
                  key={notificacao.id}
                  className={`flex items-start gap-4 rounded-xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md ${
                    naoLida ? "border-azul-escuro/30" : ""
                  }`}
                >
                  <div
                    className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${
                      naoLida
                        ? "bg-bege/15 text-bege"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <Icone className="h-4 w-4" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2
                          className={`text-sm font-semibold leading-snug ${
                            naoLida ? "text-azul-escuro" : "text-foreground"
                          }`}
                        >
                          {notificacao.titulo}
                          {naoLida && (
                            <span className="ml-2 inline-flex h-2 w-2 rounded-full bg-bege align-middle" />
                          )}
                        </h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {notificacao.mensagem}
                        </p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {formatarData(notificacao.created_at)}
                        </p>
                      </div>

                      {naoLida && podeLer && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => marcarUma(notificacao.id)}
                          className="shrink-0 cursor-pointer"
                          title="Marcar como lida"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
