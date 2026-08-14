"use client";

import { useEffect, useState, type FormEvent } from "react";
import { CalendarDays, Pencil, Plus, Trash } from "lucide-react";
import Masonry from "react-masonry-css";
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
  createObjetivo,
  deleteObjetivo,
  fetchObjetivos,
  updateObjetivo,
  type Objetivo,
} from "@/lib/api";

const objetivosIniciais: Objetivo[] = [
  {
    id: 1,
    codigo: "OE1",
    nome: "Integrar, qualificar, desenvolver e valorizar os colaboradores",
    descricao:
      "Aumentar a participação de mercado em 10 pontos percentuais nos próximos 12 meses, com foco nas regiões Norte e Nordeste.",
    ppa: "Programa Gestão Pública Moderna, Planejada, Transparente e Equilibrada (Eixo: Mais Eficiência de Gestão)Ações: Capacita Mais - Servidores e Lideranças ; Plano de Desenvolvimento do Servidor",
    loa: "Unidade Orçamentária - 411110/41110 - FUMPRES FIN Subação - 261300 - Manutenção do FUMPRES FIN",
  },
  {
    id: 2,
    codigo: "OE2",
    nome: "Promover o bem-estar e o fortalecimento do ambiente organizacional",
    descricao:
      "Otimizar processos internos e reduzir custos operacionais em até 15% sem comprometer a qualidade do atendimento.",
    ppa: "Programa Administração do Executivo Municipal (Eixo: Mais Eficiência de Gestão) Ações: Administração de Pessoal e Encargos; Manutenção do FUMPRES FIN; Programa de Saúde Ocupacional",
    loa: "Unidade Orçamentária - 411110/41110 - FUMPRES FIN                                                                                Subação - 261300 - Manutenção do FUMPRES FIN                                                                        Subação - 250237 - Manutenção da Tecnologia da Informação e Comunicação - FUMPRES                Subação - 250300 - Concessão de Beneficios - Previdência do Regime Estatutário",
  },
  {
    id: 3,
    codigo: "OE3",
    nome: "Fortalecer a governança e a gestão de riscos.",
    descricao:
      "Alcançar índice de satisfação (NPS) acima de 80, implementando melhorias contínuas nos canais de atendimento e no pós-venda.",
    ppa: "Programa Gestão Pública Moderna, Planejada, Transparente e Equilibrada (Eixo: Mais Eficiência de Gestão) Ações: Programa Municipal de Gestão de Riscos",
    loa: "Unidade Orçamentária - 411110/41110 - FUMPRES FIN Subação - 261300 - Manutenção do FUMPRES FIN Subação - 250237 - Manutenção da Tecnologia da Informação e Comunicação - FUMPRES",
  },
];

const ID_MOCK = 10_000;

const breakpointColumns = {
  default: 3,
  1280: 3,
  1024: 2,
  768: 2,
  640: 1,
};

export function Objetivos() {
  const [objetivos, setObjetivos] = useState(objetivosIniciais);
  const [open, setOpen] = useState(false);
  const [editando, setEditando] = useState<Objetivo | null>(null);
  const [excluindo, setExcluindo] = useState<Objetivo | null>(null);
  const [codigo, setCodigo] = useState("");
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [ppa, setPpa] = useState("");
  const [loa, setLoa] = useState("");

  useEffect(() => {
    fetchObjetivos()
      .then((doBackend) => {
        setObjetivos([
          ...doBackend,
          ...objetivosIniciais.map((mock) => ({
            ...mock,
            id: mock.id + ID_MOCK,
          })),
        ]);
      })
      .catch(() => {
        // Backend offline: mantém os dados locais.
      });
  }, []);

  function abrirNovo() {
    setEditando(null);
    setCodigo("");
    setNome("");
    setDescricao("");
    setPpa("");
    setLoa("");
    setOpen(true);
  }

  function abrirEdicao(objetivo: Objetivo) {
    setEditando(objetivo);
    setCodigo(objetivo.codigo);
    setNome(objetivo.nome);
    setDescricao(objetivo.descricao);
    setPpa(objetivo.ppa);
    setLoa(objetivo.loa);
    setOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const dados = { codigo, nome, descricao, ppa, loa };

    if (editando) {
      if (editando.id >= ID_MOCK) {
        setObjetivos((prev) =>
          prev.map((o) => (o.id === editando.id ? { ...o, ...dados } : o)),
        );
        toast.success("Objetivo atualizado com sucesso.");
      } else {
        try {
          const atualizado = await updateObjetivo(editando.id, dados);
          setObjetivos((prev) =>
            prev.map((o) => (o.id === atualizado.id ? atualizado : o)),
          );
          toast.success("Objetivo atualizado com sucesso.");
        } catch {
          setObjetivos((prev) =>
            prev.map((o) => (o.id === editando.id ? { ...o, ...dados } : o)),
          );
          toast.error(
            "Erro ao atualizar o objetivo. Alteração mantida apenas localmente.",
          );
        }
      }
    } else {
      try {
        const criado = await createObjetivo(dados);
        setObjetivos((prev) => [...prev, criado]);
        toast.success("Objetivo criado com sucesso.");
      } catch {
        setObjetivos((prev) => [...prev, { ...dados, id: Date.now() }]);
        toast.error(
          "Erro ao criar o objetivo. Alteração mantida apenas localmente.",
        );
      }
    }

    setCodigo("");
    setNome("");
    setDescricao("");
    setPpa("");
    setLoa("");
    setEditando(null);
    setOpen(false);
  }

  async function confirmarExclusao() {
    if (!excluindo) return;
    const id = excluindo.id;
    if (id >= ID_MOCK) {
      setObjetivos((prev) => prev.filter((o) => o.id !== id));
      toast.success("Objetivo excluído com sucesso.");
      setExcluindo(null);
      return;
    }
    try {
      await deleteObjetivo(id);
      toast.success("Objetivo excluído com sucesso.");
    } catch {
      toast.error("Erro ao excluir o objetivo.");
    }
    setObjetivos((prev) => prev.filter((o) => o.id !== id));
    setExcluindo(null);
  }

  return (
    <>
      <header className="flex items-center justify-between gap-4 border-b px-8 py-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Objetivos Estratégicos
          </h1>
          <p className="text-sm text-muted-foreground">
            Gerencie os objetivos estratégicos da organização.
          </p>
        </div>
        <Button
          onClick={abrirNovo}
          className="cursor-pointer bg-bege hover:bg-bege/90"
        >
          <Plus />
          Adicionar Objetivo
        </Button>
      </header>

      <main className="flex-1 bg-cinza-claro p-8">
        <Masonry
          breakpointCols={breakpointColumns}
          className="flex w-auto -ml-4"
          columnClassName="bg-clip-padding pl-4"
        >
          {objetivos.map((objetivo) => (
            <article
              key={objetivo.id}
              className="mb-4 flex flex-col rounded-xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <span className="border border-solid border-black/[.08] inline-flex w-fit rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                {objetivo.codigo}
              </span>
              <h2 className="mt-3 text-lg font-semibold leading-snug">
                {objetivo.nome}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {objetivo.descricao}
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="border border-solid border-black/[.08] inline-flex w-fit rounded-sm bg-muted px-2.5 py-0.5 font-medium text-muted-foreground">
                  PPA: {objetivo.ppa}
                </span>
                <span className="border border-solid border-black/[.08] inline-flex w-fit rounded-sm bg-muted px-2.5 py-0.5 font-medium text-muted-foreground">
                  LOA: {objetivo.loa}
                </span>
              </div>

              <div className="mt-4 flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CalendarDays className="h-4 w-4" />
                  Criado em {new Date().toLocaleDateString("pt-BR")}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => abrirEdicao(objetivo)}
                    className="border border-solid border-black/[.08] rounded-mds bg-white hover:bg-white/90 text-azul-escuro cursor-pointer"
                  >
                    <Pencil />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setExcluindo(objetivo)}
                    className="bg-red-600/90 text-white hover:bg-red-600/80 cursor-pointer"
                  >
                    <Trash />
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </Masonry>
      </main>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editando ? "Editar Objetivo" : "Novo Objetivo"}
            </DialogTitle>
            <DialogDescription>
              {editando
                ? "Altere os dados do objetivo estratégico."
                : "Preencha os dados abaixo para criar um novo objetivo estratégico."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="codigo">Código</Label>
              <Input
                id="codigo"
                value={codigo}
                onChange={(event) => setCodigo(event.target.value)}
                placeholder="OE1"
                className="focus-visible:ring-0 focus-visible:border-input"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="nome">Nome</Label>
              <Input
                id="nome"
                value={nome}
                onChange={(event) => setNome(event.target.value)}
                placeholder="Nome do objetivo"
                className="focus-visible:ring-0 focus-visible:border-input"
                required
              />
            </div>
            <div className="grid gap-2 rounded-md">
              <Label htmlFor="ppa">Vínculação ao PPA</Label>
              <Input
                id="ppa"
                value={ppa}
                onChange={(event) => setPpa(event.target.value)}
                placeholder="Nome do PPA"
                className="focus-visible:ring-0 focus-visible:border-input"
                required
              />
            </div>
            <div className="grid gap-2 rounded-md">
              <Label htmlFor="loa">LOA</Label>
              <Input
                id="loa"
                value={loa}
                onChange={(event) => setLoa(event.target.value)}
                placeholder="Nome do LOA"
                className="focus-visible:ring-0 focus-visible:border-input"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                value={descricao}
                onChange={(event) => setDescricao(event.target.value)}
                placeholder="Descreva o objetivo estratégico..."
                className="focus-visible:ring-0 focus-visible:border-input"
                required
              />
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
                Salvar
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
            <AlertDialogTitle>Excluir objetivo</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o objetivo{" "}
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
