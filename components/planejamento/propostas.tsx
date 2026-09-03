"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  Check,
  ChevronDown,
  ChevronRight,
  FileUp,
  Pencil,
  Plus,
  Send,
  Trash,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { toast } from "sonner";
import {
  atualizarProposta,
  criarProposta,
  enviarProposta,
  fetchObjetivos,
  fetchUnidades,
  type NovaProposta,
  type NovoPropostaIndicador,
  type Objetivo,
  type Proposta,
  type Unidade,
} from "@/lib/api";

export type Modo = "minhas" | "recebidas";

type IndicadorForm = {
  id: number | null;
  nome: string;
  meta: string;
  rotuloX: string;
  rotuloY: string;
  orientacao: string;
  prazo: string;
  unidadeIds: string[];
  etapas: string[];
};

function indicadorVazio(): IndicadorForm {
  return {
    id: null,
    nome: "",
    meta: "",
    rotuloX: "",
    rotuloY: "",
    orientacao: "",
    prazo: "",
    unidadeIds: [],
    etapas: [],
  };
}

// ---------------------------------------------------------------------------
// Formulário (2 etapas) de Nova sugestão / Editar sugestão
// ---------------------------------------------------------------------------

export function PropostaFormDialog({
  open,
  onOpenChange,
  proposta,
  unidadeId,
  papel,
  onSalvo,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposta: Proposta | null;
  unidadeId: number | null;
  papel: string | undefined;
  onSalvo: () => void;
}) {
  const [objetivos, setObjetivos] = useState<Objetivo[]>([]);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [objetivoId, setObjetivoId] = useState("");
  const [nome, setNome] = useState("");
  const [indicadores, setIndicadores] = useState<IndicadorForm[]>([
    indicadorVazio(),
  ]);
  const [dropdownAberto, setDropdownAberto] = useState<number | null>(null);
  const [buscaUnidade, setBuscaUnidade] = useState("");
  const [etapaForm, setEtapaForm] = useState<1 | 2>(1);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unidadesResponsaveis =
    papel === "default" && unidadeId != null
      ? unidades.filter((u) => u.id === unidadeId)
      : unidades;

  useEffect(() => {
    if (!open) return;
    fetchObjetivos()
      .then(setObjetivos)
      .catch(() => {});
    fetchUnidades()
      .then(setUnidades)
      .catch(() => {});
    setEtapaForm(1);
    if (proposta) {
      setObjetivoId(proposta.objetivo ? String(proposta.objetivo.id) : "");
      setNome(proposta.nome ?? "");
      setIndicadores(
        proposta.indicadores.length
          ? proposta.indicadores.map((indicador) => ({
              id: indicador.id,
              nome: indicador.nome ?? "",
              meta: indicador.meta ?? "",
              rotuloX: indicador.rotulo_x ?? "",
              rotuloY: indicador.rotulo_y ?? "",
              orientacao: indicador.orientacao ?? "",
              prazo: indicador.prazo ?? "",
              unidadeIds: indicador.unidades.map((u) => String(u.id)),
              etapas: indicador.etapas.map((e) => e.nome),
            }))
          : [indicadorVazio()],
      );
    } else {
      setObjetivoId("");
      setNome("");
      const unidadePadrao = papel === "default" && unidadeId != null ? String(unidadeId) : "";
      setIndicadores([
        { ...indicadorVazio(), unidadeIds: unidadePadrao ? [unidadePadrao] : [] },
      ]);
    }
  }, [open, proposta, unidadeId, papel]);

  useEffect(() => {
    function handleClickFora(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownAberto(null);
        setBuscaUnidade("");
      }
    }
    if (dropdownAberto !== null) {
      document.addEventListener("mousedown", handleClickFora);
      return () => document.removeEventListener("mousedown", handleClickFora);
    }
  }, [dropdownAberto]);

  function montarDados(): NovaProposta {
    return {
      nome: nome || null,
      objetivo_id: objetivoId ? Number(objetivoId) : null,
      indicadores: indicadores
        .map<NovoPropostaIndicador>((indicador) => ({
          ...(indicador.id != null ? { id: indicador.id } : {}),
          nome: indicador.nome || null,
          meta: indicador.meta || null,
          rotulo_x: indicador.rotuloX || null,
          rotulo_y: indicador.rotuloY || null,
          orientacao: indicador.orientacao || null,
          prazo: indicador.prazo || null,
          unidade_ids: indicador.unidadeIds.map(Number),
          etapas: indicador.etapas.map((etapa) => ({ nome: etapa })),
        })),
    };
  }

  async function handleSalvar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      if (proposta) {
        await atualizarProposta(proposta.id, montarDados());
        toast.success("Proposta salva com sucesso.");
      } else {
        await criarProposta(montarDados());
        toast.success("Rascunho criado com sucesso.");
      }
      setBuscaUnidade("");
      setDropdownAberto(null);
      onOpenChange(false);
      onSalvo();
    } catch {
      toast.error("Erro ao salvar a proposta.");
    }
  }

  function atualizarIndicador(
    index: number,
    campo: keyof IndicadorForm,
    valor: string,
  ) {
    setIndicadores((prev) =>
      prev.map((indicador, i) =>
        i === index ? { ...indicador, [campo]: valor } : indicador,
      ),
    );
  }

  function adicionarIndicador() {
    const novoIndex = indicadores.length;
    const unidadePadrao =
      papel === "default" && unidadeId != null ? String(unidadeId) : "";
    setIndicadores((prev) => [
      ...prev,
      { ...indicadorVazio(), unidadeIds: unidadePadrao ? [unidadePadrao] : [] },
    ]);
    setTimeout(() => {
      document
        .getElementById(`proposta-indicador-card-${novoIndex}`)
        ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 50);
  }

  function removerIndicador(index: number) {
    setIndicadores((prev) => prev.filter((_, i) => i !== index));
  }

  function toggleUnidade(indicadorIndex: number, unidadeId: string) {
    setIndicadores((prev) =>
      prev.map((indicador, i) => {
        if (i !== indicadorIndex) return indicador;
        const selecionadas = indicador.unidadeIds.includes(unidadeId)
          ? indicador.unidadeIds.filter((id) => id !== unidadeId)
          : [...indicador.unidadeIds, unidadeId];
        return { ...indicador, unidadeIds: selecionadas };
      }),
    );
  }

  function adicionarEtapa(indicadorIndex: number) {
    setIndicadores((prev) =>
      prev.map((indicador, i) =>
        i === indicadorIndex
          ? { ...indicador, etapas: [...indicador.etapas, ""] }
          : indicador,
      ),
    );
  }

  function atualizarEtapa(
    indicadorIndex: number,
    etapaIndex: number,
    valor: string,
  ) {
    setIndicadores((prev) =>
      prev.map((indicador, i) => {
        if (i !== indicadorIndex) return indicador;
        const novasEtapas = [...indicador.etapas];
        novasEtapas[etapaIndex] = valor;
        return { ...indicador, etapas: novasEtapas };
      }),
    );
  }

  function removerEtapa(indicadorIndex: number, etapaIndex: number) {
    setIndicadores((prev) =>
      prev.map((indicador, i) => {
        if (i !== indicadorIndex) return indicador;
        return {
          ...indicador,
          etapas: indicador.etapas.filter((_, j) => j !== etapaIndex),
        };
      }),
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl p-5">
        <DialogHeader>
          <DialogTitle>
            {proposta ? "Editar sugestão" : "Nova sugestão de planejamento"}
          </DialogTitle>
          <DialogDescription>
            Todos os campos são opcionais. Preencha o que souber — os gestores
            poderão completar depois.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span
            className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
              etapaForm === 1
                ? "bg-bege text-white"
                : "bg-muted text-muted-foreground"
            }`}
          >
            1
          </span>
          <span
            className={etapaForm === 1 ? "font-medium text-foreground" : ""}
          >
            Dados gerais
          </span>
          <span className="mx-1">—</span>
          <span
            className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
              etapaForm === 2
                ? "bg-bege text-white"
                : "bg-muted text-muted-foreground"
            }`}
          >
            2
          </span>
          <span
            className={etapaForm === 2 ? "font-medium text-foreground" : ""}
          >
            Indicadores
          </span>
        </div>

        {etapaForm === 1 && (
          <div className="grid gap-4">
            <div className="grid grid-cols-[1fr_120px] items-end gap-3">
              <div className="grid gap-2">
                <Label htmlFor="prop-objetivo">Objetivo Estratégico</Label>
                <select
                  id="prop-objetivo"
                  value={objetivoId}
                  onChange={(event) => setObjetivoId(event.target.value)}
                  className="h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none placeholder:text-muted-foreground md:text-sm dark:bg-input/30"
                >
                  <option value="">
                    Selecione um objetivo (opcional)...
                  </option>
                  {objetivos.map((objetivo) => (
                    <option key={objetivo.id} value={objetivo.id}>
                      {objetivo.codigo} · {objetivo.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="prop-codigo">Código</Label>
                <Input
                  id="prop-codigo"
                  value={
                    objetivos.find((o) => String(o.id) === objetivoId)?.codigo ??
                    ""
                  }
                  placeholder="—"
                  disabled
                  className="focus-visible:ring-0 focus-visible:border-input"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="prop-nome">Iniciativa (sugerida)</Label>
              <Textarea
                id="prop-nome"
                value={nome}
                onChange={(event) => setNome(event.target.value)}
                placeholder="Nome da iniciativa (opcional)"
                className="focus-visible:ring-0 focus-visible:border-input"
              />
            </div>
          </div>
        )}

        {etapaForm === 2 && (
          <form onSubmit={handleSalvar} className="flex flex-col gap-4">
            <div className="grid max-h-[55vh] gap-4 overflow-y-auto pr-1">
              <div className="space-y-4">
                {indicadores.map((indicador, index) => (
                  <div
                    key={index}
                    id={`proposta-indicador-card-${index}`}
                    className="rounded-lg border p-4 bg-muted/30 mt-1"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Indicador {index + 1}
                      </span>
                      {indicadores.length > 1 && (
                        <Button
                          type="button"
                          size="icon-xs"
                          variant="outline"
                          onClick={() => removerIndicador(index)}
                          className="cursor-pointer text-red-600 hover:text-red-600"
                        >
                          <Trash />
                        </Button>
                      )}
                    </div>

                    <div className="grid gap-3">
                      <div className="grid gap-2">
                        <Label htmlFor={`prop-ind-nome-${index}`}>
                          Nome do indicador
                        </Label>
                        <Textarea
                          id={`prop-ind-nome-${index}`}
                          value={indicador.nome}
                          onChange={(event) =>
                            atualizarIndicador(index, "nome", event.target.value)
                          }
                          placeholder="Ex.: NPS (opcional)"
                          className="focus-visible:ring-0 focus-visible:border-input bg-white"
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor={`prop-ind-meta-${index}`}>Meta</Label>
                        <Textarea
                          id={`prop-ind-meta-${index}`}
                          value={indicador.meta}
                          onChange={(event) =>
                            atualizarIndicador(index, "meta", event.target.value)
                          }
                          placeholder="Ex.: acima de 80 (opcional)"
                          className="focus-visible:ring-0 focus-visible:border-input bg-white"
                        />
                      </div>

                      <div className="rounded-lg border p-4 space-y-3 bg-white">
                        <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
                          <div className="grid gap-2">
                            <Label htmlFor={`prop-ind-x-${index}`}>
                              Numerador (X)
                            </Label>
                            <Input
                              id={`prop-ind-x-${index}`}
                              value={indicador.rotuloX}
                              onChange={(event) =>
                                atualizarIndicador(index, "rotuloX", event.target.value)
                              }
                              placeholder="Ex.: Etapas concluídas"
                              className="focus-visible:ring-0 focus-visible:border-input"
                            />
                          </div>
                          <span className="pb-1 text-lg font-semibold text-muted-foreground">
                            /
                          </span>
                          <div className="grid gap-2">
                            <Label htmlFor={`prop-ind-y-${index}`}>
                              Denominador (Y)
                            </Label>
                            <Input
                              id={`prop-ind-y-${index}`}
                              value={indicador.rotuloY}
                              onChange={(event) =>
                                atualizarIndicador(index, "rotuloY", event.target.value)
                              }
                              placeholder="Ex.: Etapas previstas"
                              className="focus-visible:ring-0 focus-visible:border-input"
                            />
                          </div>
                        </div>

                        <div className="text-sm text-muted-foreground">
                          <span className="font-medium">Resultado:</span> (
                          {indicador.rotuloX || "X"} /{" "}
                          {indicador.rotuloY || "Y"}) x 100
                        </div>
                      </div>

                      <div className="grid gap-2">
                        <div className="flex items-center justify-between">
                          <Label>Etapas (denominador Y)</Label>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => adicionarEtapa(index)}
                            className="cursor-pointer"
                          >
                            <Plus />
                            Adicionar etapa
                          </Button>
                        </div>
                        {indicador.etapas.length === 0 && (
                          <p className="text-xs text-muted-foreground">
                            Nenhuma etapa cadastrada. Adicione as etapas para
                            compor o total (Y) da fórmula.
                          </p>
                        )}
                        <div className="space-y-2">
                          {indicador.etapas.map((etapa, etapaIndex) => (
                            <div
                              key={etapaIndex}
                              className="flex items-center gap-2"
                            >
                              <span className="text-xs text-muted-foreground w-5 text-right">
                                {etapaIndex + 1}.
                              </span>
                              <Input
                                value={etapa}
                                onChange={(event) =>
                                  atualizarEtapa(index, etapaIndex, event.target.value)
                                }
                                placeholder={`Etapa ${etapaIndex + 1}`}
                                className="focus-visible:ring-0 focus-visible:border-input bg-white"
                              />
                              <Button
                                type="button"
                                size="icon-xs"
                                variant="outline"
                                onClick={() => removerEtapa(index, etapaIndex)}
                                className="cursor-pointer text-red-600 hover:text-red-600 shrink-0"
                              >
                                <Trash />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor={`prop-ind-orientacao-${index}`}>
                          Orientação para comprovação
                        </Label>
                        <Textarea
                          id={`prop-ind-orientacao-${index}`}
                          value={indicador.orientacao}
                          onChange={(event) =>
                            atualizarIndicador(index, "orientacao", event.target.value)
                          }
                          placeholder="Documento/evidência que comprova o resultado"
                          className="focus-visible:ring-0 focus-visible:border-input bg-white"
                        />
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="grid gap-2">
                          <Label htmlFor={`prop-ind-prazo-${index}`}>Prazo</Label>
                          <Input
                            id={`prop-ind-prazo-${index}`}
                            type="date"
                            value={indicador.prazo}
                            onChange={(event) =>
                              atualizarIndicador(index, "prazo", event.target.value)
                            }
                            className="focus-visible:ring-0 focus-visible:border-input bg-white"
                          />
                        </div>

                        <div className="grid gap-2">
                          <Label>Responsável</Label>
                          <div ref={dropdownRef} className="relative bg-white">
                            <button
                              type="button"
                              onClick={() =>
                                setDropdownAberto(
                                  dropdownAberto === index ? null : index,
                                )
                              }
                              className="flex h-8 w-full min-w-0 items-center justify-between gap-2 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30"
                            >
                              <span
                                className={`truncate ${indicador.unidadeIds.length === 0 ? "text-muted-foreground" : ""}`}
                              >
                                {indicador.unidadeIds.length === 0
                                  ? "Selecione unidades..."
                                  : indicador.unidadeIds.length ===
                                      unidadesResponsaveis.length
                                    ? "Todos selecionados"
                                    : (() => {
                                        const selecionadas =
                                          unidadesResponsaveis
                                            .filter((u) =>
                                              indicador.unidadeIds.includes(
                                                String(u.id),
                                              ),
                                            )
                                            .map((u) => u.nome);
                                        if (selecionadas.length <= 3)
                                          return selecionadas.join(", ");
                                        return `${selecionadas.slice(0, 3).join(", ")} +${selecionadas.length - 3}`;
                                      })()}
                              </span>
                              <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                            </button>
                            {dropdownAberto === index && (
                              <div className="absolute z-50 mb-1 w-full overflow-auto rounded-lg border bg-popover shadow-md bottom-full">
                                {unidadesResponsaveis.length === 0 && (
                                  <div className="px-2.5 py-1.5 text-sm text-muted-foreground">
                                    Nenhuma unidade cadastrada.
                                  </div>
                                )}
                                {unidadesResponsaveis.length > 0 && (
                                  <>
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
                                    <div className="max-h-40 overflow-auto">
                                      {buscaUnidade === "" && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const todosIds =
                                              unidadesResponsaveis.map((u) =>
                                                String(u.id),
                                              );
                                            const todasSelecionadas =
                                              indicador.unidadeIds.length ===
                                              todosIds.length;
                                            setIndicadores((prev) =>
                                              prev.map((ind, i) =>
                                                i === index
                                                  ? {
                                                      ...ind,
                                                      unidadeIds:
                                                        todasSelecionadas
                                                          ? []
                                                          : todosIds,
                                                    }
                                                  : ind,
                                              ),
                                            );
                                          }}
                                          className="flex w-full items-center gap-2 border-b px-2.5 py-1.5 text-left text-sm font-medium hover:bg-accent cursor-pointer"
                                        >
                                          <span
                                            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                                              indicador.unidadeIds.length ===
                                                unidadesResponsaveis.length &&
                                              unidadesResponsaveis.length > 0
                                                ? "border-bege bg-bege text-white"
                                                : "border-input"
                                            }`}
                                          >
                                            {indicador.unidadeIds.length ===
                                              unidadesResponsaveis.length &&
                                              unidadesResponsaveis.length > 0 && (
                                                <Check className="h-3 w-3" />
                                              )}
                                          </span>
                                          Selecionar todos
                                        </button>
                                      )}
                                      {unidadesResponsaveis
                                        .filter((u) =>
                                          u.nome
                                            .toLowerCase()
                                            .includes(buscaUnidade.toLowerCase()),
                                        )
                                        .map((unidade) => {
                                          const marcada =
                                            indicador.unidadeIds.includes(
                                              String(unidade.id),
                                            );
                                          return (
                                            <button
                                              key={unidade.id}
                                              type="button"
                                              onClick={() =>
                                                toggleUnidade(index, String(unidade.id))
                                              }
                                              className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-sm hover:bg-accent cursor-pointer"
                                            >
                                              <span
                                                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                                                  marcada
                                                    ? "border-bege bg-bege text-white"
                                                    : "border-input"
                                                }`}
                                              >
                                                {marcada && (
                                                  <Check className="h-3 w-3" />
                                                )}
                                              </span>
                                              {unidade.nome}
                                            </button>
                                          );
                                        })}
                                    </div>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={adicionarIndicador}
                className="cursor-pointer bg-bege text-white hover:bg-bege/90 hover:text-white"
              >
                <Plus />
                Adicionar indicador
              </Button>
            </div>

            <DialogFooter className="border-t-0 bg-transparent">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setBuscaUnidade("");
                  setDropdownAberto(null);
                  setEtapaForm(1);
                }}
              >
                Voltar
              </Button>
              <Button
                type="submit"
                className="cursor-pointer bg-bege hover:bg-bege/90"
              >
                <FileUp />
                {proposta ? "Salvar alterações" : "Salvar rascunho"}
              </Button>
            </DialogFooter>
          </form>
        )}

        {etapaForm === 1 && (
          <DialogFooter className="border-t-0 bg-transparent">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setBuscaUnidade("");
                setDropdownAberto(null);
                onOpenChange(false);
              }}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => setEtapaForm(2)}
              className="cursor-pointer bg-bege hover:bg-bege/90"
            >
              Próximo
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Tabela de propostas (reutilizada em "Minhas sugestões" e "Sugestões recebidas")
// ---------------------------------------------------------------------------

export function PropostasTabela({
  propostas,
  modo,
  usuarioId,
  ehGestor,
  onEditar,
  onEnviar,
  onConverter,
}: {
  propostas: Proposta[];
  modo: Modo;
  usuarioId: number | undefined;
  ehGestor: boolean;
  onEditar: (proposta: Proposta) => void;
  onEnviar: (proposta: Proposta) => void;
  onConverter: (proposta: Proposta) => void;
}) {
  const [confirmandoEnvio, setConfirmandoEnvio] = useState<Proposta | null>(
    null,
  );
  const podeWorkflow = (proposta: Proposta) => {
    const ehDono = proposta.criado_por === usuarioId;
    return {
      podeEditar:
        (modo === "minhas" && ehDono && !proposta.enviado) ||
        (modo === "recebidas" && ehGestor && proposta.enviado),
      podeEnviar: modo === "minhas" && ehDono && !proposta.enviado,
      podeConverter: modo === "recebidas" && ehGestor,
    };
  };

  if (propostas.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        {modo === "minhas"
          ? "Nenhuma sugestão criada ainda."
          : "Nenhuma sugestão pendente."}
      </p>
    );
  }

  return (
    <>
      <div className="overflow-x-auto rounded-xl border bg-card">
      <table className="w-full table-fixed text-sm">
        <thead>
          <tr className="border-b bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="w-[10%] px-5 py-3 font-medium">Código</th>
            <th className="w-[25%] px-5 py-3 font-medium">Objetivo</th>
            <th className="w-[30%] px-5 py-3 font-medium">Iniciativa</th>
            <th className="w-[15%] px-5 py-3 font-medium">Status</th>
            <th className="w-[20%] px-5 py-3 text-right font-medium">Ações</th>
          </tr>
        </thead>
        <tbody>
          {propostas.map((proposta) => {
            const { podeEditar, podeEnviar, podeConverter } =
              podeWorkflow(proposta);
            return (
              <tr
                key={proposta.id}
                className="border-b last:border-0 transition-colors hover:bg-muted/50"
              >
                <td className="px-5 py-4 align-top">
                  <span className="border border-solid border-black/[.08] inline-flex w-fit rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                    {proposta.objetivo?.codigo ?? "—"}
                  </span>
                </td>
                <td className="px-5 py-4 align-top text-muted-foreground">
                  {proposta.objetivo?.nome ?? "—"}
                </td>
                <td className="px-5 py-4 align-top font-medium">
                  {proposta.nome || "Sugestão sem título"}
                </td>
                <td className="px-5 py-4 align-top">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      proposta.enviado
                        ? "bg-bege/20 text-bege"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {proposta.enviado ? "Enviada" : "Rascunho"}
                  </span>
                </td>
                <td className="px-5 py-4 align-top">
                  <div className="flex items-center justify-end gap-2">
                    {podeEditar && (
                      <Button
                        type="button"
                        size="icon"
                        onClick={() => onEditar(proposta)}
                        className="border border-solid border-black/[.08] rounded-mds bg-white hover:bg-white/90 text-azul-escuro cursor-pointer"
                      >
                        <Pencil />
                      </Button>
                    )}
                    {podeEnviar && (
                      <Button
                        size="sm"
                        onClick={() => setConfirmandoEnvio(proposta)}
                        className="cursor-pointer bg-bege hover:bg-bege/90"
                      >
                        <Send />
                        Enviar
                      </Button>
                    )}
                    {podeConverter && (
                      <Button
                        size="sm"
                        onClick={() => onConverter(proposta)}
                        className="cursor-pointer bg-azul-escuro text-white hover:bg-azul-escuro/90"
                      >
                        <ChevronRight />
                        Converter
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>

      <AlertDialog
        open={confirmandoEnvio !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) setConfirmandoEnvio(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Enviar sugestão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja enviar esta sugestão aos gestores? Uma
              vez enviada, a sugestão não poderá mais ser editada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmandoEnvio(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmandoEnvio) onEnviar(confirmandoEnvio);
                setConfirmandoEnvio(null);
              }}
              className="bg-bege text-white hover:bg-bege/90"
            >
              Enviar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}