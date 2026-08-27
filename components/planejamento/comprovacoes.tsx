"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ExternalLink,
  FileText,
  LoaderCircle,
  Paperclip,
  Trash2,
  Upload,
} from "lucide-react";
import { HeaderBell } from "@/components/notificacoes/header-bell";
import { Button } from "@/components/ui/button";
import { usePermissoes } from "@/lib/use-permissoes";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  deleteComprovacao,
  fetchComprovacoes,
  fetchPlanejamentoById,
  uploadComprovacao,
  abrirArquivoComprovacao,
  type Comprovacao,
  type Planejamento,
  type StatusComprovacao,
} from "@/lib/api";

const ROTULO_STATUS: Record<StatusComprovacao, string> = {
  analise: "Em análise",
  aprovado: "Aprovado",
  recusado: "Recusado",
};

const CLASSE_STATUS: Record<StatusComprovacao, string> = {
  analise: "bg-muted text-muted-foreground",
  aprovado: "bg-green-600/15 text-green-700",
  recusado: "bg-red-600/15 text-red-700",
};

function BadgeStatus({ status }: { status: StatusComprovacao }) {
  return (
    <span
      className={`inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${CLASSE_STATUS[status]}`}
    >
      {ROTULO_STATUS[status]}
    </span>
  );
}

function formatarData(iso: string | null): string {
  if (!iso) return "—";
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

export function PaginaComprovacoes({
  planejamentoId,
  indicadorId,
}: {
  planejamentoId: number;
  indicadorId: number;
}) {
  const { pode } = usePermissoes();
  const podeCriar = pode("/comprovacoes", "criar");
  const podeExcluir = pode("/comprovacoes", "excluir");
  const [planejamento, setPlanejamento] = useState<Planejamento | null>(null);
  const [erro, setErro] = useState(false);
  const [itens, setItens] = useState<Comprovacao[] | null>(null);
  const [carregandoItens, setCarregandoItens] = useState(true);
  const [erroItens, setErroItens] = useState(false);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [etapaSelecionada, setEtapaSelecionada] = useState<number | null>(null);
  const [enviando, setEnviando] = useState(false);

  const indicador = useMemo(
    () =>
      planejamento?.indicadores.find((ind) => ind.id === indicadorId) ?? null,
    [planejamento, indicadorId],
  );

  useEffect(() => {
    fetchPlanejamentoById(planejamentoId)
      .then(setPlanejamento)
      .catch(() => setErro(true));
  }, [planejamentoId]);

  const carregarComprovacoes = () => {
    setCarregandoItens(true);
    setErroItens(false);
    fetchComprovacoes(indicadorId)
      .then(setItens)
      .catch(() => setErroItens(true))
      .finally(() => setCarregandoItens(false));
  };

  useEffect(() => {
    fetchComprovacoes(indicadorId)
      .then(setItens)
      .catch(() => setErroItens(true))
      .finally(() => setCarregandoItens(false));
  }, [indicadorId]);

  const comprovacoesPorEtapa = useMemo(() => {
    const map: Record<number, Comprovacao> = {};
    for (const c of itens ?? []) {
      if (c.etapa_id != null && !map[c.etapa_id]) {
        map[c.etapa_id] = c;
      }
    }
    return map;
  }, [itens]);

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!arquivo || etapaSelecionada == null) return;
    setEnviando(true);
    try {
      await uploadComprovacao(indicadorId, etapaSelecionada, arquivo);
      toast.success("Comprovação enviada com sucesso.");
      setArquivo(null);
      setEtapaSelecionada(null);
      carregarComprovacoes();
    } catch {
      toast.error("Erro ao enviar a comprovação.");
    } finally {
      setEnviando(false);
    }
  }

  async function handleDelete(item: Comprovacao) {
    try {
      await deleteComprovacao(item.id);
      toast.success("Comprovação excluída.");
      carregarComprovacoes();
    } catch {
      toast.error("Erro ao excluir a comprovação.");
    }
  }

  if (erro) {
    return (
      <>
        <header className="flex items-center justify-between gap-4 border-b px-8 py-6 h-16">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Comprovações
            </h1>
            <p className="text-sm text-muted-foreground">
              Não foi possível carregar os dados.
            </p>
          </div>
        </header>
        <main className="flex-1 bg-cinza-claro p-8">
          <div className="rounded-xl border bg-card p-10 text-center text-sm text-muted-foreground">
            Indicador não encontrado ou backend indisponível.
          </div>
        </main>
      </>
    );
  }

  if (!planejamento || !indicador) {
    return (
      <main className="flex flex-1 items-center justify-center bg-cinza-claro p-8">
        <div className="h-2 w-40 overflow-hidden rounded-full bg-muted">
          <div className="h-full w-1/3 animate-pulse rounded-full bg-bege" />
        </div>
      </main>
    );
  }

  return (
    <>
      <header className="flex items-center justify-between gap-4 border-b px-8 py-6">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            render={<Link href={`/planejamento/${planejamentoId}`} />}
          >
            <ArrowLeft />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Comprovações
            </h1>
            <p className="text-sm text-muted-foreground">{indicador.nome}</p>
          </div>
        </div>
        <HeaderBell />
      </header>

      <main className="flex flex-1 flex-col gap-6 bg-cinza-claro p-8">
        <section className="rounded-xl border bg-card">
          <div className="flex flex-col gap-4 p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-medium">{indicador.nome}</h2>
              <span className="inline-flex w-fit rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                Meta: {indicador.meta}
              </span>
            </div>
            <div className="text-sm text-muted-foreground">
              ({indicador.rotulo_x} / {indicador.rotulo_y}) x 100
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Progresso:</span>
              <div className="h-2 w-32 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-bege"
                  style={{ width: `${indicador.progresso}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground">
                {indicador.progresso}%
              </span>
            </div>
          </div>
        </section>

        <section className="rounded-xl border bg-card">
          <div className="flex items-center gap-2 border-b px-5 py-4">
            <Paperclip className="h-4 w-4 text-bege" />
            <h2 className="font-medium">Etapas e Comprovações</h2>
          </div>
          <div className="p-5">
            {indicador.etapas.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nenhuma etapa cadastrada para este indicador.
              </p>
            )}

            <div className="space-y-4">
              {indicador.etapas.map((etapa, index) => {
                const comprovacao = comprovacoesPorEtapa[etapa.id];
                return (
                  <div
                    key={etapa.id}
                    className="rounded-lg border p-4"
                  >
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-bege text-xs font-semibold text-white">
                          {index + 1}
                        </span>
                        <span className="font-medium text-sm">{etapa.nome}</span>
                      </div>
                      {comprovacao && (
                        <BadgeStatus status={comprovacao.status} />
                      )}
                    </div>

                    {comprovacao ? (
                      <div className="flex items-center justify-between gap-3 rounded-lg border border-bege/30 bg-bege/5 p-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <FileText className="h-4 w-4 shrink-0 text-bege" />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {comprovacao.arquivo_nome}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Enviada em{" "}
                              {formatarData(comprovacao.created_at.split("T")[0])}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => abrirArquivoComprovacao(comprovacao.id)}
                            aria-label="Visualizar comprovação"
                          >
                            <ExternalLink />
                          </Button>
                          {podeExcluir && (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => handleDelete(comprovacao)}
                              className="cursor-pointer text-red-600 hover:text-red-600"
                              aria-label="Excluir comprovação"
                            >
                              <Trash2 />
                            </Button>
                          )}
                        </div>
                      </div>
                    ) : !podeCriar ? null : etapaSelecionada === etapa.id ? (
                      <form onSubmit={handleUpload} className="flex flex-col gap-3">
                        <div className="grid gap-2">
                          <Label htmlFor={`arquivo-${etapa.id}`}>
                            Arquivo PDF
                          </Label>
                          <Input
                            id={`arquivo-${etapa.id}`}
                            type="file"
                            accept="application/pdf"
                            onChange={(event) =>
                              setArquivo(event.target.files?.[0] ?? null)
                            }
                            className="cursor-pointer"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            type="submit"
                            disabled={!arquivo || enviando}
                            className="cursor-pointer bg-bege hover:bg-bege/90"
                          >
                            {enviando ? (
                              <LoaderCircle className="animate-spin" />
                            ) : (
                              <Upload />
                            )}
                            {enviando ? "Enviando..." : "Enviar"}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => {
                              setEtapaSelecionada(null);
                              setArquivo(null);
                            }}
                            className="cursor-pointer"
                          >
                            Cancelar
                          </Button>
                        </div>
                      </form>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setEtapaSelecionada(etapa.id)}
                        className="cursor-pointer"
                      >
                        <Upload />
                        Enviar comprovação
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
