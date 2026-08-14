"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash } from "lucide-react";
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
import { toast } from "sonner";
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
import {
  createPlanejamento,
  deletePlanejamento,
  fetchObjetivos,
  fetchPlanejamento,
  fetchUnidades,
  updatePlanejamento,
  type Objetivo,
  type Planejamento,
  type Unidade,
} from "@/lib/api";

type IndicadorForm = {
  nome: string;
  meta: string;
  formula: string;
  orientacao: string;
  prazo: string;
  unidadeId: string;
};

function indicadorVazio(): IndicadorForm {
  return {
    nome: "",
    meta: "",
    formula: "",
    orientacao: "",
    prazo: "",
    unidadeId: "",
  };
}

export function Planejamento() {
  const router = useRouter();
  const [itens, setItens] = useState<Planejamento[]>([]);
  const [objetivos, setObjetivos] = useState<Objetivo[]>([]);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [open, setOpen] = useState(false);
  const [editando, setEditando] = useState<Planejamento | null>(null);
  const [excluindo, setExcluindo] = useState<Planejamento | null>(null);
  const [objetivoId, setObjetivoId] = useState("");
  const [nome, setNome] = useState("");
  const [indicadores, setIndicadores] = useState<IndicadorForm[]>([
    indicadorVazio(),
  ]);

  useEffect(() => {
    fetchPlanejamento()
      .then(setItens)
      .catch(() => {
        // Backend offline: mantém a lista local.
      });
    fetchObjetivos()
      .then(setObjetivos)
      .catch(() => {
        // Backend offline: mantém o select vazio.
      });
    fetchUnidades()
      .then(setUnidades)
      .catch(() => {
        // Backend offline: mantém o select vazio.
      });
  }, []);

  const objetivoSelecionado = objetivos.find(
    (objetivo) => String(objetivo.id) === objetivoId,
  );

  function abrirNovo() {
    setEditando(null);
    setObjetivoId("");
    setNome("");
    setIndicadores([indicadorVazio()]);
    setOpen(true);
  }

  function abrirEdicao(item: Planejamento) {
    setEditando(item);
    setObjetivoId(String(item.objetivo.id));
    setNome(item.nome);
    setIndicadores(
      item.indicadores.map((indicador) => ({
        nome: indicador.nome,
        meta: indicador.meta,
        formula: indicador.formula,
        orientacao: indicador.orientacao,
        prazo: indicador.prazo ?? "",
        unidadeId: indicador.unidade_id ? String(indicador.unidade_id) : "",
      })),
    );
    setOpen(true);
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
    setIndicadores((prev) => [...prev, indicadorVazio()]);
    setTimeout(() => {
      document
        .getElementById(`indicador-card-${novoIndex}`)
        ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 50);
  }

  function removerIndicador(index: number) {
    setIndicadores((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const dados = {
      objetivo_id: Number(objetivoId),
      nome,
      indicadores: indicadores.map((indicador) => ({
        nome: indicador.nome,
        meta: indicador.meta,
        formula: indicador.formula,
        orientacao: indicador.orientacao,
        prazo: indicador.prazo || null,
        unidade_id: indicador.unidadeId ? Number(indicador.unidadeId) : null,
      })),
    };

    try {
      if (editando) {
        const atualizado = await updatePlanejamento(editando.id, dados);
        setItens((prev) =>
          prev.map((item) => (item.id === atualizado.id ? atualizado : item)),
        );
        toast.success("Planejamento atualizado com sucesso.");
      } else {
        const criado = await createPlanejamento(dados);
        setItens((prev) => [...prev, criado]);
        toast.success("Planejamento criado com sucesso.");
      }
    } catch {
      toast.error(
        editando
          ? "Erro ao atualizar o planejamento."
          : "Erro ao criar o planejamento.",
      );
    }

    setEditando(null);
    setOpen(false);
  }

  async function confirmarExclusao() {
    if (!excluindo) return;
    try {
      await deletePlanejamento(excluindo.id);
      setItens((prev) => prev.filter((item) => item.id !== excluindo.id));
      toast.success("Planejamento excluído com sucesso.");
    } catch {
      toast.error("Erro ao excluir o planejamento.");
    }
    setExcluindo(null);
  }

  return (
    <>
      <header className="flex items-center justify-between gap-4 border-b px-8 py-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Planejamento
          </h1>
          <p className="text-sm text-muted-foreground">
            Vincule iniciativas e indicadores aos objetivos estratégicos.
          </p>
        </div>
        <Button
          onClick={abrirNovo}
          className="cursor-pointer bg-bege hover:bg-bege/90"
        >
          <Plus />
          Adicionar Planejamento
        </Button>
      </header>

      <main className="flex-1 bg-cinza-claro p-8">
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-5 py-3 font-medium">Código</th>
                <th className="px-5 py-3 font-medium">Objetivo</th>
                <th className="px-5 py-3 font-medium">Iniciativa</th>
                <th className="px-5 py-3 font-medium">Progresso</th>
                <th className="px-5 py-3 text-right font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {itens.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => router.push(`/planejamento/${item.id}`)}
                  className="cursor-pointer border-b last:border-0 transition-colors hover:bg-muted/50"
                >
                  <td className="px-5 py-4 align-top">
                    <span className="border border-solid border-black/[.08] inline-flex w-fit rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                      {item.objetivo.codigo}
                    </span>
                  </td>
                  <td className="px-5 py-4 align-top text-muted-foreground">
                    {item.objetivo.nome}
                  </td>
                  <td className="px-5 py-4 align-top font-medium">
                    {item.nome}
                  </td>
                  <td className="px-5 py-4 align-top">
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-32 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-bege"
                          style={{ width: `${item.progresso}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {Math.round(item.progresso)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-4 align-top">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={(event) => {
                          event.stopPropagation();
                          abrirEdicao(item);
                        }}
                        className="border border-solid border-black/[.08] rounded-mds bg-white hover:bg-white/90 text-azul-escuro cursor-pointer"
                      >
                        <Pencil />
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={(event) => {
                          event.stopPropagation();
                          setExcluindo(item);
                        }}
                        className="bg-red-600/90 text-white hover:bg-red-600/80 cursor-pointer"
                      >
                        <Trash />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {itens.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-10 text-center text-sm text-muted-foreground"
                  >
                    Nenhum planejamento cadastrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-4xl p-5">
          <DialogHeader>
            <DialogTitle>
              {editando ? "Editar Planejamento" : "Novo Planejamento"}
            </DialogTitle>
            <DialogDescription>
              Vincule uma iniciativa a um objetivo estratégico e adicione seus
              indicadores.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid max-h-[55vh] gap-4 overflow-y-auto pr-1">
              <div className="grid gap-2">
                <Label htmlFor="objetivo">Objetivo Estratégico</Label>
                <select
                  id="objetivo"
                  value={objetivoId}
                  onChange={(event) => setObjetivoId(event.target.value)}
                  className="h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none placeholder:text-muted-foreground md:text-sm dark:bg-input/30"
                  required
                >
                  <option value="" disabled>
                    Selecione um objetivo...
                  </option>
                  {objetivos.map((objetivo) => (
                    <option key={objetivo.id} value={objetivo.id}>
                      {objetivo.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="codigo">Código</Label>
                <Input
                  id="codigo"
                  value={objetivoSelecionado?.codigo ?? ""}
                  placeholder="Código do objetivo"
                  disabled
                  className="focus-visible:ring-0 focus-visible:border-input"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="iniciativa">Iniciativa</Label>
                <Textarea
                  id="iniciativa"
                  value={nome}
                  onChange={(event) => setNome(event.target.value)}
                  placeholder="Nome da iniciativa"
                  className="focus-visible:ring-0 focus-visible:border-input"
                  required
                />
              </div>

              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <Label className="text-sm font-medium">Indicadores</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={adicionarIndicador}
                    className="cursor-pointer"
                  >
                    <Plus />
                    Adicionar indicador
                  </Button>
                </div>

                <div className="space-y-4">
                  {indicadores.map((indicador, index) => (
                    <div
                      key={index}
                      id={`indicador-card-${index}`}
                      className="rounded-lg border bg-card p-4"
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
                          // ADICIONAR STATUS
                        )}
                      </div>

                      <div className="grid gap-3">
                        <div className="grid gap-2">
                          <Label htmlFor={`ind-nome-${index}`}>
                            Nome do indicador
                          </Label>
                          <Input
                            id={`ind-nome-${index}`}
                            value={indicador.nome}
                            onChange={(event) =>
                              atualizarIndicador(
                                index,
                                "nome",
                                event.target.value,
                              )
                            }
                            placeholder="Ex.: NPS"
                            className="focus-visible:ring-0 focus-visible:border-input"
                            required
                          />
                        </div>

                        <div className="grid gap-2">
                          <Label htmlFor={`ind-meta-${index}`}>Meta</Label>
                          <Input
                            id={`ind-meta-${index}`}
                            value={indicador.meta}
                            onChange={(event) =>
                              atualizarIndicador(
                                index,
                                "meta",
                                event.target.value,
                              )
                            }
                            placeholder="Ex.: acima de 80"
                            className="focus-visible:ring-0 focus-visible:border-input"
                            required
                          />
                        </div>

                        <div className="grid gap-2">
                          <Label htmlFor={`ind-formula-${index}`}>
                            Fórmula de cálculo
                          </Label>
                          <Textarea
                            id={`ind-formula-${index}`}
                            value={indicador.formula}
                            onChange={(event) =>
                              atualizarIndicador(
                                index,
                                "formula",
                                event.target.value,
                              )
                            }
                            placeholder="Ex.: (promotores - detratores) / total de respondentes * 100"
                            className="focus-visible:ring-0 focus-visible:border-input"
                            required
                          />
                        </div>

                        <div className="grid gap-2">
                          <Label htmlFor={`ind-orientacao-${index}`}>
                            Orientação para comprovação
                          </Label>
                          <Textarea
                            id={`ind-orientacao-${index}`}
                            value={indicador.orientacao}
                            onChange={(event) =>
                              atualizarIndicador(
                                index,
                                "orientacao",
                                event.target.value,
                              )
                            }
                            placeholder="Documento/evidência que comprova o resultado"
                            className="focus-visible:ring-0 focus-visible:border-input"
                            required
                          />
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="grid gap-2">
                            <Label htmlFor={`ind-prazo-${index}`}>Prazo</Label>
                            <Input
                              id={`ind-prazo-${index}`}
                              type="date"
                              value={indicador.prazo}
                              onChange={(event) =>
                                atualizarIndicador(
                                  index,
                                  "prazo",
                                  event.target.value,
                                )
                              }
                              className="focus-visible:ring-0 focus-visible:border-input"
                            />
                          </div>

                          <div className="grid gap-2">
                            <Label htmlFor={`ind-responsavel-${index}`}>
                              Responsável
                            </Label>
                            <select
                              id={`ind-responsavel-${index}`}
                              value={indicador.unidadeId}
                              onChange={(event) =>
                                atualizarIndicador(
                                  index,
                                  "unidadeId",
                                  event.target.value,
                                )
                              }
                              className="h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30"
                            >
                              <option value="">Selecione uma unidade...</option>
                              {unidades.map((unidade) => (
                                <option key={unidade.id} value={unidade.id}>
                                  {unidade.nome}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter className="border-t-0 bg-transparent">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className={"cursor-pointer bg-bege hover:bg-bege/90"}
              >
                {editando ? "Salvar alterações" : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={excluindo !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) setExcluindo(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir planejamento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o planejamento{" "}
              <strong>{excluindo?.nome}</strong>? Esta ação não pode ser
              desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setExcluindo(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmarExclusao}
              className="bg-red-600 text-white hover:bg-red-600/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
