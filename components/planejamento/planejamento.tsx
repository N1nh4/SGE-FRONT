"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Check,
  ChevronDown,
  FileDown,
  Inbox,
  Lightbulb,
  Pencil,
  Plus,
  Trash,
} from "lucide-react";
import { PropostaFormDialog, PropostasTabela } from "./propostas";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Pagination } from "@/components/ui/pagination";
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
  enviarProposta,
  fetchMinhasPropostas,
  fetchObjetivos,
  fetchPlanejamento,
  fetchPropostasPendentes,
  fetchUnidades,
  converterProposta,
  updatePlanejamento,
  type Objetivo,
  type Planejamento,
  type Proposta,
  type Unidade,
} from "@/lib/api";
import { useAuth } from "@/context/auth-context";
import { useNotificacoes } from "@/context/notification-context";
import { gerarRelatorioPlanejamento } from "@/lib/report";

type IndicadorForm = {
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

export function Planejamento() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { usuario, unidadeId } = useAuth();
  const { refresh: refreshNotificacoes } = useNotificacoes();
  const podeCriar =
    usuario?.paginas?.some(
      (p) => p.chave === "/planejamento" && p.acoes.includes("criar"),
    ) ?? false;
  const podeEditar =
    usuario?.paginas?.some(
      (p) => p.chave === "/planejamento" && p.acoes.includes("editar"),
    ) ?? false;
  const podeExcluir =
    usuario?.paginas?.some(
      (p) => p.chave === "/planejamento" && p.acoes.includes("excluir"),
    ) ?? false;
  const podeRelatorio =
    usuario?.paginas?.some(
      (p) => p.chave === "/planejamento" && p.acoes.includes("relatorio"),
    ) ?? false;
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
  const [dropdownAberto, setDropdownAberto] = useState<number | null>(null);
  const [buscaUnidade, setBuscaUnidade] = useState("");
  const [etapaForm, setEtapaForm] = useState<1 | 2>(1);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [visao, setVisao] = useState<"normal" | "minhas" | "recebidas">(
    "normal",
  );
  const [minhasPropostas, setMinhasPropostas] = useState<Proposta[]>([]);
  const [recebidasPropostas, setRecebidasPropostas] = useState<Proposta[]>([]);
  const [formPropostaAberto, setFormPropostaAberto] = useState(false);
  const [propostaEditando, setPropostaEditando] = useState<Proposta | null>(
    null,
  );
  const dropdownRef = useRef<HTMLDivElement>(null);
  const ITENS_POR_PAGINA = 7;

  const unidadesResponsaveis =
    usuario?.papel === "default" && unidadeId != null
      ? unidades.filter((u) => u.id === unidadeId)
      : unidades;

  const totalPaginas = Math.max(1, Math.ceil(itens.length / ITENS_POR_PAGINA));
  const paginaSegura = Math.min(paginaAtual, totalPaginas);
  const paginasVisiveis = useMemo(() => {
    const inicio = (paginaSegura - 1) * ITENS_POR_PAGINA;
    return itens.slice(inicio, inicio + ITENS_POR_PAGINA);
  }, [itens, paginaSegura]);

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

  useEffect(() => {
    fetchPlanejamento()
      .then(setItens)
      .catch((err) => {
        console.error("Erro ao buscar planejamento:", err);
      });
    fetchObjetivos()
      .then(setObjetivos)
      .catch((err) => {
        console.error("Erro ao buscar objetivos:", err);
      });
    fetchUnidades()
      .then(setUnidades)
      .catch((err) => {
        console.error("Erro ao buscar unidades:", err);
      });
  }, []);

  async function carregarPlanejamentos() {
    try {
      const dados = await fetchPlanejamento();
      setItens(dados);
    } catch (err) {
      console.error("Erro ao buscar planejamento:", err);
    }
  }

  useEffect(() => {
    const tela = searchParams.get("tela");
    if (tela === "recebidas") {
      setVisao("recebidas");
    } else if (tela === "minhas") {
      setVisao("minhas");
    }
  }, [searchParams]);

  async function carregarMinhasPropostas() {
    try {
      const dados = await fetchMinhasPropostas();
      setMinhasPropostas(dados);
    } catch (err) {
      console.error("Erro ao buscar minhas sugestões:", err);
    }
  }

  async function carregarRecebidas() {
    try {
      const dados = await fetchPropostasPendentes();
      setRecebidasPropostas(dados);
    } catch (err) {
      console.error("Erro ao buscar sugestões recebidas:", err);
    }
  }

  useEffect(() => {
    if (visao === "minhas") carregarMinhasPropostas();
    if (visao === "recebidas") carregarRecebidas();
  }, [visao]);

  function abrirNovaSugestao() {
    setPropostaEditando(null);
    setFormPropostaAberto(true);
  }

  function abrirEdicaoSugestao(proposta: Proposta) {
    setPropostaEditando(proposta);
    setFormPropostaAberto(true);
  }

  async function handleEnviarSugestao(proposta: Proposta) {
    try {
      await enviarProposta(proposta.id);
      toast.success("Proposta enviada aos gestores.");
      refreshNotificacoes().catch(() => {});
      carregarMinhasPropostas();
    } catch {
      toast.error("Erro ao enviar a proposta.");
    }
  }

  async function handleConverterSugestao(proposta: Proposta) {
    try {
      const convertido = await converterProposta(proposta.id);
      toast.success(
        `Convertido em planejamento: ${convertido.nome || "sem título"}.`,
      );
      carregarRecebidas();
      carregarPlanejamentos();
    } catch {
      toast.error("Erro ao converter a proposta.");
    }
  }

  const objetivoSelecionado = objetivos.find(
    (objetivo) => String(objetivo.id) === objetivoId,
  );

  function abrirNovo() {
    setEditando(null);
    setObjetivoId("");
    setNome("");
    const unidadePadrao =
      usuario?.papel === "default" && unidadeId != null
        ? String(unidadeId)
        : "";
    setIndicadores([
      { ...indicadorVazio(), unidadeIds: unidadePadrao ? [unidadePadrao] : [] },
    ]);
    setEtapaForm(1);
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
        rotuloX: indicador.rotulo_x,
        rotuloY: indicador.rotulo_y,
        orientacao: indicador.orientacao,
        prazo: indicador.prazo ?? "",
        unidadeIds: indicador.unidades.map((u) => String(u.id)),
        etapas: indicador.etapas.map((e) => e.nome),
      })),
    );
    setEtapaForm(1);
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
    const unidadePadrao =
      usuario?.papel === "default" && unidadeId != null
        ? String(unidadeId)
        : "";
    setIndicadores((prev) => [
      ...prev,
      {
        ...indicadorVazio(),
        unidadeIds: unidadePadrao ? [unidadePadrao] : [],
      },
    ]);
    setTimeout(() => {
      document
        .getElementById(`indicador-card-${novoIndex}`)
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const dados = {
      objetivo_id: Number(objetivoId),
      nome,
      indicadores: indicadores.map((indicador) => ({
        nome: indicador.nome,
        meta: indicador.meta,
        rotulo_x: indicador.rotuloX,
        rotulo_y: indicador.rotuloY,
        orientacao: indicador.orientacao,
        prazo: indicador.prazo || null,
        unidade_ids: indicador.unidadeIds.map(Number),
        etapas: indicador.etapas,
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
      refreshNotificacoes().catch(() => {});
    } catch {
      toast.error(
        editando
          ? "Erro ao atualizar o planejamento."
          : "Erro ao criar o planejamento.",
      );
    }

    setEditando(null);
    setDropdownAberto(null);
    setOpen(false);
  }

  async function confirmarExclusao() {
    if (!excluindo) return;
    try {
      await deletePlanejamento(excluindo.id);
      setItens((prev) => prev.filter((item) => item.id !== excluindo.id));
      setPaginaAtual((prev) =>
        Math.min(
          prev,
          Math.max(1, Math.ceil((itens.length - 1) / ITENS_POR_PAGINA)),
        ),
      );
      toast.success("Planejamento excluído com sucesso.");
    } catch {
      toast.error("Erro ao excluir o planejamento.");
    }
    setExcluindo(null);
  }

  return (
    <>
      <main className="flex-1 bg-cinza-claro px-8 pt-4 pb-8">
        <div className="mb-4 flex items-center justify-end gap-2">
          {visao !== "normal" ? (
            <Button
              onClick={() => setVisao("normal")}
              variant="outline"
              className="cursor-pointer"
            >
              Voltar para planejamentos
            </Button>
          ) : (
            <>
              {podeRelatorio && (
                <Button
                  onClick={() => gerarRelatorioPlanejamento(itens)}
                  variant="outline"
                  className="cursor-pointer"
                >
                  <FileDown />
                  Gerar Relatório
                </Button>
              )}
              {usuario?.papel === "default" ? (
                <>
                  <Button
                    onClick={abrirNovaSugestao}
                    variant="outline"
                    className="cursor-pointer"
                  >
                    <Plus />
                    Nova Sugestão
                  </Button>
                  <Button
                    onClick={() => setVisao("minhas")}
                    variant="outline"
                    className="cursor-pointer"
                  >
                    <Lightbulb />
                    Minhas sugestões
                  </Button>
                </>
              ) : usuario?.papel ? (
                <Button
                  onClick={() => setVisao("recebidas")}
                  variant="outline"
                  className="cursor-pointer"
                >
                  <Inbox />
                  Sugestões recebidas
                </Button>
              ) : null}
              {podeCriar && (
                <Button
                  onClick={abrirNovo}
                  className="cursor-pointer bg-bege hover:bg-bege/90"
                >
                  <Plus />
                  Adicionar Planejamento
                </Button>
              )}
            </>
          )}
        </div>
        {visao === "minhas" ? (
          <>
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Minhas sugestões</h2>
              <p className="text-sm text-muted-foreground">
                Rascunhos de planejamento criados por você.
              </p>
            </div>
            <PropostasTabela
              propostas={minhasPropostas}
              modo="minhas"
              usuarioId={usuario?.id}
              ehGestor={false}
              onEditar={abrirEdicaoSugestao}
              onEnviar={handleEnviarSugestao}
              onConverter={() => {}}
            />
          </>
        ) : visao === "recebidas" ? (
          <>
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Sugestões recebidas</h2>
              <p className="text-sm text-muted-foreground">
                Trabalhe sobre os rascunhos enviados e converta-os em
                planejamentos oficiais.
              </p>
            </div>
            <PropostasTabela
              propostas={recebidasPropostas}
              modo="recebidas"
              usuarioId={usuario?.id}
              ehGestor={true}
              onEditar={abrirEdicaoSugestao}
              onEnviar={() => {}}
              onConverter={handleConverterSugestao}
            />
          </>
        ) : (
          <>
            <div className="overflow-x-auto rounded-xl border bg-card">
              <table className="w-full table-fixed text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="w-[5%] px-5 py-3 font-medium">Código</th>
                  <th className="w-[20%] px-5 py-3 font-medium">Objetivo</th>
                  <th className="w-[50%] px-5 py-3 font-medium">Iniciativa</th>
                  <th className="w-[15%] px-5 py-3 font-medium">Progresso</th>
                  {podeEditar && (
                    <th className="w-[10%] px-5 py-3 text-right font-medium">
                      Ações
                    </th>
                  )}
                </tr>
              </thead>
            <tbody>
              {paginasVisiveis.map((item) => (
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
                  {(podeEditar || podeExcluir) && (
                    <td className="px-5 py-4 align-top">
                      <div className="flex items-center justify-end gap-2">
                        {(podeEditar || podeExcluir) && (
                          <Button
                            type="button"
                            size="icon"
                            onClick={(event) => {
                              event.stopPropagation();
                              abrirEdicao(item);
                            }}
                            className="border border-solid border-black/[.08] rounded-mds bg-white hover:bg-white/90 text-azul-escuro cursor-pointer"
                          >
                            <Pencil />
                          </Button>
                        )}
                        {podeExcluir && (
                          <Button
                            type="button"
                            size="icon"
                            onClick={(event) => {
                              event.stopPropagation();
                              setExcluindo(item);
                            }}
                            className="bg-red-600/90 text-white hover:bg-red-600/80 cursor-pointer"
                          >
                            <Trash />
                          </Button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {itens.length === 0 && (
                <tr>
                  <td
                    colSpan={podeEditar || podeExcluir ? 5 : 4}
                    className="px-5 py-10 text-center text-sm text-muted-foreground"
                  >
                    Nenhum planejamento cadastrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          paginaAtual={paginaSegura}
          totalPaginas={totalPaginas}
          totalItens={itens.length}
          itensPorPagina={ITENS_POR_PAGINA}
          rotuloItensPlural="planejamentos"
          onMudarPagina={setPaginaAtual}
        />
          </>
        )}
      </main>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-4xl p-5">
          <DialogHeader>
            <DialogTitle>
              {editando ? "Editar Planejamento" : "Novo Planejamento"}
            </DialogTitle>
            <DialogDescription>
              {etapaForm === 1
                ? "Defina o objetivo estratégico e a iniciativa."
                : "Adicione os indicadores vinculados a esta iniciativa."}
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
                    placeholder="—"
                    disabled
                    className="focus-visible:ring-0 focus-visible:border-input"
                  />
                </div>
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
            </div>
          )}

          {etapaForm === 2 && (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="grid max-h-[55vh] gap-4 overflow-y-auto pr-1">
                <div className="space-y-4">
                  {indicadores.map((indicador, index) => (
                    <div
                      key={index}
                      id={`indicador-card-${index}`}
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
                          <Label htmlFor={`ind-nome-${index}`}>
                            Nome do indicador
                          </Label>
                          <Textarea
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
                            className="focus-visible:ring-0 focus-visible:border-input bg-white"
                            required
                          />
                        </div>

                        <div className="grid gap-2">
                          <Label htmlFor={`ind-meta-${index}`}>Meta</Label>
                          <Textarea
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
                            className="focus-visible:ring-0 focus-visible:border-input bg-white"
                            required
                          />
                        </div>

                        <div className="rounded-lg border p-4 space-y-3 bg-white">
                          <div className="flex items-center gap-1 ">
                            <Label>Forma de Cálculo</Label>
                          </div>

                          <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
                            <div className="grid gap-2">
                              <Label htmlFor={`ind-rotulo-x-${index}`}>
                                Numerador (X)
                              </Label>
                              <Input
                                id={`ind-rotulo-x-${index}`}
                                value={indicador.rotuloX}
                                onChange={(event) =>
                                  atualizarIndicador(
                                    index,
                                    "rotuloX",
                                    event.target.value,
                                  )
                                }
                                placeholder="Ex.: Etapas concluídas"
                                className="focus-visible:ring-0 focus-visible:border-input"
                                required
                              />
                            </div>
                            <span className="pb-1 text-lg font-semibold text-muted-foreground">
                              /
                            </span>
                            <div className="grid gap-2">
                              <Label htmlFor={`ind-rotulo-y-${index}`}>
                                Denominador (Y)
                              </Label>
                              <Input
                                id={`ind-rotulo-y-${index}`}
                                value={indicador.rotuloY}
                                onChange={(event) =>
                                  atualizarIndicador(
                                    index,
                                    "rotuloY",
                                    event.target.value,
                                  )
                                }
                                placeholder="Ex.: Etapas previstas"
                                className="focus-visible:ring-0 focus-visible:border-input"
                                required
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
                                    atualizarEtapa(
                                      index,
                                      etapaIndex,
                                      event.target.value,
                                    )
                                  }
                                  placeholder={`Etapa ${etapaIndex + 1}`}
                                  className="focus-visible:ring-0 focus-visible:border-input bg-white"
                                />
                                <Button
                                  type="button"
                                  size="icon-xs"
                                  variant="outline"
                                  onClick={() =>
                                    removerEtapa(index, etapaIndex)
                                  }
                                  className="cursor-pointer text-red-600 hover:text-red-600 shrink-0"
                                >
                                  <Trash />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="grid gap-2 ">
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
                            className="focus-visible:ring-0 focus-visible:border-input bg-white"
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
                              className="focus-visible:ring-0 focus-visible:border-input bg-white"
                            />
                          </div>

                          <div className="grid gap-2">
                            <Label>Responsável</Label>
                            <div
                              ref={dropdownRef}
                              className="relative bg-white"
                            >
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
                                          onChange={(e) =>
                                            setBuscaUnidade(e.target.value)
                                          }
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
                                                unidadesResponsaveis.length >
                                                  0 && (
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
                                              .includes(
                                                buscaUnidade.toLowerCase(),
                                              ),
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
                                                  toggleUnidade(
                                                    index,
                                                    String(unidade.id),
                                                  )
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
                  onClick={() => setEtapaForm(1)}
                >
                  Voltar
                </Button>
                <Button
                  type="submit"
                  className="cursor-pointer bg-bege hover:bg-bege/90"
                >
                  {editando ? "Salvar alterações" : "Salvar"}
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
                  setDropdownAberto(null);
                  setBuscaUnidade("");
                  setOpen(false);
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

      <PropostaFormDialog
        open={formPropostaAberto}
        onOpenChange={setFormPropostaAberto}
        proposta={propostaEditando}
        unidadeId={unidadeId}
        papel={usuario?.papel}
        onSalvo={() => {
          if (usuario?.papel === "default") {
            setVisao("minhas");
            carregarMinhasPropostas();
          } else if (visao === "recebidas") {
            carregarRecebidas();
          }
        }}
      />
    </>
  );
}
