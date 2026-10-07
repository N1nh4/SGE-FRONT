"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  CalendarX,
  ExternalLink,
  FileText,
  LoaderCircle,
  Paperclip,
  Trash2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth-context";
import { usePermissoes } from "@/lib/use-permissoes";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  deleteComprovacao,
  enviarSemAtualizacao,
  fetchComprovacoes,
  fetchIndicador,
  uploadComprovacao,
  abrirArquivoComprovacao,
  mensagemErro,
  type Comprovacao,
  type IndicadorPlanejamento,
  type StatusComprovacao,
} from "@/lib/api";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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

const ROTULO_STATUS: Record<StatusComprovacao, string> = {
  analise: "Em análise",
  aprovado: "Aprovado",
  recusado: "Recusado",
  sem_atualizacao: "Sem atualização",
};

const CLASSE_STATUS: Record<StatusComprovacao, string> = {
  analise: "bg-muted text-muted-foreground",
  aprovado: "bg-green-600/15 text-green-700",
  recusado: "bg-red-600/15 text-red-700",
  sem_atualizacao: "bg-amber-600/15 text-amber-700",
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

export function PaginaComprovacoes({ indicadorId }: { indicadorId: number }) {
  const { pode } = usePermissoes();
  const { unidadeId } = useAuth();
  const podeCriar = pode("/comprovacoes", "criar");
  const podeExcluir = pode("/comprovacoes", "excluir");
  const [indicador, setIndicador] = useState<IndicadorPlanejamento | null>(
    null,
  );
  const [erro, setErro] = useState(false);
  const [itens, setItens] = useState<Comprovacao[] | null>(null);
  const [carregandoItens, setCarregandoItens] = useState(true);
  const [erroItens, setErroItens] = useState(false);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [etapaSelecionada, setEtapaSelecionada] = useState<number | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [confirmandoSemAtualizacao, setConfirmandoSemAtualizacao] =
    useState<number | null>(null);

  useEffect(() => {
    fetchIndicador(indicadorId)
      .then(setIndicador)
      .catch(() => setErro(true));
  }, [indicadorId]);

  // Etapa gerada por colaborador pertence a uma unidade. Quando o usuário está
  // com um setor selecionado, ele só vê e comprova os colaboradores desse
  // setor. Etapa sem unidade (cadastrada à mão) continua visível para todos,
  // porque não tem origem a filtrar.
  const etapasVisiveis = useMemo(() => {
    const todas = indicador?.etapas ?? [];
    if (unidadeId == null) return todas;
    return todas.filter((e) => e.unidade_id == null || e.unidade_id === unidadeId);
  }, [indicador, unidadeId]);

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
    const map: Record<number, Comprovacao[]> = {};
    for (const c of itens ?? []) {
      if (c.etapa_id != null) {
        (map[c.etapa_id] ??= []).push(c);
      }
    }
    return map;
  }, [itens]);

  // Indicador sem etapa não tem cards de etapa para anexar: a comprovação é
  // registrada por competência (ano/mês), que é como o backend versiona
  // quando etapa_id vem nulo.
  const semEtapa = indicador?.etapas.length === 0;
  const comprovacoesSemEtapa = useMemo(
    () => (itens ?? []).filter((c) => c.etapa_id == null),
    [itens],
  );
  const competenciaAtual = useMemo(() => {
    const hoje = new Date();
    return {
      ano: hoje.getFullYear(),
      mes: hoje.getMonth() + 1,
    };
  }, []);

  async function handleUploadSemEtapa(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    if (!arquivo) return;
    setEnviando(true);
    try {
      await uploadComprovacao(indicadorId, null, arquivo);
      toast.success("Comprovação enviada com sucesso.");
      setArquivo(null);
      carregarComprovacoes();
    } catch (erro) {
      toast.error(mensagemErro(erro, "Erro ao enviar a comprovação."));
    } finally {
      setEnviando(false);
    }
  }

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
    } catch (erro) {
      toast.error(mensagemErro(erro, "Erro ao enviar a comprovação."));
    } finally {
      setEnviando(false);
    }
  }

  async function handleDelete(item: Comprovacao) {
    try {
      await deleteComprovacao(item.id);
      toast.success("Comprovação excluída.");
      carregarComprovacoes();
    } catch (erro) {
      toast.error(mensagemErro(erro, "Erro ao excluir a comprovação."));
    }
  }

  async function handleSemAtualizacao() {
    const etapaId = confirmandoSemAtualizacao;
    if (etapaId == null) return;
    setEnviando(true);
    try {
      await enviarSemAtualizacao(indicadorId, etapaId);
      toast.success("Sem atualização registrada para esta etapa.");
      setConfirmandoSemAtualizacao(null);
      carregarComprovacoes();
    } catch (erro) {
      toast.error(mensagemErro(erro, "Erro ao registrar sem atualização."));
    } finally {
      setEnviando(false);
    }
  }

  if (erro) {
    return (
      <main className="flex-1 bg-cinza-claro p-8">
        <div className="rounded-xl border bg-card p-10 text-center text-sm text-muted-foreground">
          Indicador não encontrado ou backend indisponível.
        </div>
      </main>
    );
  }

  if (!indicador) {
    return (
      <main className="flex flex-1 items-center justify-center bg-cinza-claro p-8">
        <div className="h-2 w-40 overflow-hidden rounded-full bg-muted">
          <div className="h-full w-1/3 animate-pulse rounded-full bg-bege" />
        </div>
      </main>
    );
  }

  return (
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
            {indicador.orientacao && (
              <div className="text-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Orientação para comprovação
                </p>
                <p className="mt-1">{indicador.orientacao}</p>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Progresso:</span>
              <div className="h-2 w-32 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-bege"
                  style={{ width: `${indicador.progresso ?? 0}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground">
                {indicador.progresso == null
                  ? "—"
                  : `${indicador.progresso}%`}
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
            {unidadeId != null &&
              (indicador?.etapas.length ?? 0) > etapasVisiveis.length && (
                <p className="mb-4 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
                  Mostrando {etapasVisiveis.length} de {indicador.etapas.length}{" "}
                  etapas: cada setor comprova apenas os seus colaboradores. O
                  progresso acima é do indicador inteiro.
                </p>
              )}
            {semEtapa ? (
              <div className="space-y-4">
                <div className="rounded-lg border bg-muted/30 p-4">
                  <p className="text-sm font-medium">
                    Este indicador não tem etapas cadastradas
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    As comprovações são registradas por competência
                    ({MESES[competenciaAtual.mes - 1]}/{competenciaAtual.ano}).
                    O envio de uma nova versão substitui a anterior do mesmo
                    mês.
                  </p>
                </div>

                {arquivo ? (
                  <form
                    onSubmit={handleUploadSemEtapa}
                    className="rounded-lg border p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {arquivo.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {MESES[competenciaAtual.mes - 1]}/
                          {competenciaAtual.ano}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="submit"
                          size="sm"
                          disabled={enviando}
                          className="cursor-pointer"
                        >
                          {enviando ? (
                            <LoaderCircle className="animate-spin" />
                          ) : (
                            <Upload />
                          )}
                          Enviar
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setArquivo(null)}
                          className="cursor-pointer"
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  </form>
                ) : (
                  podeCriar && (
                    <label className="inline-flex cursor-pointer items-center gap-2">
                      <input
                        type="file"
                        accept="application/pdf"
                        className="hidden"
                        onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
                      />
                      <span className="inline-flex h-8 items-center gap-2 rounded-lg border border-input bg-background px-3 text-sm font-medium shadow-xs hover:bg-accent">
                        <Upload className="size-4" />
                        Enviar comprovação
                      </span>
                    </label>
                  )
                )}

                {comprovacoesSemEtapa.length > 0 && (
                  <div className="space-y-2">
                    {comprovacoesSemEtapa.map((c) => (
                      <div
                        key={c.id}
                        className="flex items-center justify-between gap-3 rounded-lg border p-3"
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          {c.status === "sem_atualizacao" ? (
                            <CalendarX className="size-4 shrink-0 text-amber-600" />
                          ) : (
                            <FileText className="size-4 shrink-0 text-muted-foreground" />
                          )}
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {c.status === "sem_atualizacao"
                                ? "Sem atualização neste período"
                                : c.arquivo_nome}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {MESES[c.mes - 1]}/{c.ano} · versão {c.versao}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <BadgeStatus status={c.status} />
                          {c.status !== "sem_atualizacao" && (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => abrirArquivoComprovacao(c.id)}
                              aria-label="Visualizar comprovação"
                            >
                              <ExternalLink />
                            </Button>
                          )}
                          {podeExcluir && (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => handleDelete(c)}
                              aria-label="Excluir comprovação"
                            >
                              <Trash2 />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {etapasVisiveis.map((etapa, index) => {
                const comprovacoesEtapa = comprovacoesPorEtapa[etapa.id] ?? [];
                const comprovacao = comprovacoesEtapa[0] ?? null;
                const historico = comprovacoesEtapa.slice(1);
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

                    {comprovacao && comprovacao.status !== "recusado" ? (
                      <div className="flex items-center justify-between gap-3 rounded-lg border border-bege/30 bg-bege/5 p-3">
                        <div className="flex min-w-0 items-center gap-2">
                          {comprovacao.status === "sem_atualizacao" ? (
                            <CalendarX className="h-4 w-4 shrink-0 text-amber-600" />
                          ) : (
                            <FileText className="h-4 w-4 shrink-0 text-bege" />
                          )}
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {comprovacao.status === "sem_atualizacao"
                                ? "Sem atualização neste período"
                                : comprovacao.arquivo_nome}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {comprovacao.status === "sem_atualizacao"
                                ? "Registrada em"
                                : "Enviada em"}{" "}
                              {formatarData(comprovacao.created_at.split("T")[0])}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {comprovacao.status !== "sem_atualizacao" && (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => abrirArquivoComprovacao(comprovacao.id)}
                              aria-label="Visualizar comprovação"
                            >
                              <ExternalLink />
                            </Button>
                          )}
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
                    ) : comprovacao && comprovacao.status === "recusado" ? (
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between gap-3 rounded-lg border border-red-300 bg-red-50 p-3">
                          <div className="flex min-w-0 items-center gap-2">
                            <FileText className="h-4 w-4 shrink-0 text-red-600" />
                            <div>
                              <p className="truncate text-sm font-medium">
                                {comprovacao.arquivo_nome}
                              </p>
                              <p className="text-xs text-red-600/80">
                                Rejeitada em{" "}
                                {formatarData(
                                  comprovacao.created_at.split("T")[0],
                                )}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => abrirArquivoComprovacao(comprovacao.id)}
                            aria-label="Visualizar comprovação rejeitada"
                          >
                            <ExternalLink />
                          </Button>
                        </div>
                        {comprovacao.justificativa && (
                          <div className="rounded-lg border bg-muted/50 p-3 text-sm">
                            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                              Justificativa
                            </p>
                            <p className="mt-1">{comprovacao.justificativa}</p>
                          </div>
                        )}
                        {podeCriar &&
                          (etapaSelecionada === etapa.id ? (
                            <form
                              onSubmit={handleUpload}
                              className="flex flex-col gap-3"
                            >
                              <div className="grid gap-2">
                                <Label htmlFor={`arquivo-${etapa.id}`}>
                                  Novo arquivo PDF
                                </Label>
                                <Input
                                  id={`arquivo-${etapa.id}`}
                                  type="file"
                                  accept="application/pdf"
                                  onChange={(event) =>
                                    setArquivo(
                                      event.target.files?.[0] ?? null,
                                    )
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
                                  {enviando ? "Enviando..." : "Reenviar"}
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
                            <div className="flex flex-wrap items-center gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setEtapaSelecionada(etapa.id)}
                                className="cursor-pointer"
                              >
                                <Upload />
                                Enviar nova comprovação
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  setConfirmandoSemAtualizacao(etapa.id)
                                }
                                className="cursor-pointer"
                              >
                                <CalendarX />
                                Sem atualização
                              </Button>
                            </div>
                          ))}
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
                      <div className="flex flex-wrap items-center gap-2">
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
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setConfirmandoSemAtualizacao(etapa.id)
                          }
                          className="cursor-pointer"
                        >
                          <CalendarX />
                          Sem atualização
                        </Button>
                      </div>
                    )}

                    {/* "Sem atualização" registra a ausência do documento naquele
                        mês, mas não é um estado final: se o papel surgir depois,
                        o usuário envia uma nova versão, que volta para análise e
                        substitui o registro vigente. */}
                    {comprovacao &&
                      comprovacao.status === "sem_atualizacao" &&
                      podeCriar &&
                      (etapaSelecionada === etapa.id ? (
                        <form
                          onSubmit={handleUpload}
                          className="mt-3 flex flex-col gap-3"
                        >
                          <div className="grid gap-2">
                            <Label htmlFor={`arquivo-${etapa.id}`}>
                              Documento PDF
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
                          className="mt-3 cursor-pointer"
                        >
                          <Upload />
                          Enviar comprovação
                        </Button>
                      ))}

                    {historico.length > 0 && (
                      <div className="mt-4 border-t pt-3">
                        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Histórico ({historico.length})
                        </p>
                        <div className="space-y-2">
                          {historico.map((anterior) => (
                            <div
                              key={anterior.id}
                              className="rounded-lg border bg-muted/30 p-3"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex min-w-0 items-center gap-2">
                                  {anterior.status === "sem_atualizacao" ? (
                                    <CalendarX className="h-4 w-4 shrink-0 text-amber-600" />
                                  ) : (
                                    <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                                  )}
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-medium">
                                      {anterior.status === "sem_atualizacao"
                                        ? "Sem atualização neste período"
                                        : anterior.arquivo_nome}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {anterior.status === "recusado"
                                        ? "Rejeitada em"
                                        : anterior.status === "sem_atualizacao"
                                          ? "Registrada em"
                                          : "Enviada em"}{" "}
                                      {formatarData(
                                        anterior.updated_at.split("T")[0],
                                      )}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <BadgeStatus status={anterior.status} />
                                  {anterior.status !== "sem_atualizacao" && (
                                    <Button
                                      variant="ghost"
                                      size="icon-sm"
                                      onClick={() =>
                                        abrirArquivoComprovacao(anterior.id)
                                      }
                                      aria-label="Visualizar comprovação anterior"
                                    >
                                      <ExternalLink />
                                    </Button>
                                  )}
                                </div>
                              </div>
                              {anterior.status === "recusado" &&
                                anterior.justificativa && (
                                  <p className="mt-2 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                                    Justificativa: {anterior.justificativa}
                                  </p>
                                )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              </div>
            )}
          </div>
        </section>

        <AlertDialog
          open={confirmandoSemAtualizacao !== null}
          onOpenChange={(open) => {
            if (!open) setConfirmandoSemAtualizacao(null);
          }}
        >
          <AlertDialogContent
            overlayClassName="bg-black/60 backdrop-blur-md supports-backdrop-filter:backdrop-blur-md"
            className="max-w-md"
          >
            <AlertDialogHeader>
              <AlertDialogTitle>Sem atualização</AlertDialogTitle>
              <AlertDialogDescription>
                Confirmar que não há comprovação para esta etapa neste mês/ano?
                Este registro não passará pela validação e não afetará a
                porcentagem da meta.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="cursor-pointer">
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleSemAtualizacao}
                disabled={enviando}
                className="cursor-pointer bg-bege hover:bg-bege/90"
              >
                {enviando ? (
                  <LoaderCircle className="animate-spin" />
                ) : (
                  <CalendarX />
                )}
                Confirmar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
  );
}
