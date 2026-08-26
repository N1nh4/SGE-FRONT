"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Bell, CalendarDays, Pencil, Plus, Trash } from "lucide-react";
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

const breakpointColumns = {
  default: 3,
  1280: 3,
  1024: 2,
  768: 2,
  640: 1,
};

export function Objetivos() {
  const [objetivos, setObjetivos] = useState<Objetivo[]>([]);
  const [open, setOpen] = useState(false);
  const [editando, setEditando] = useState<Objetivo | null>(null);
  const [excluindo, setExcluindo] = useState<Objetivo | null>(null);
  const [codigo, setCodigo] = useState("");
  const [nome, setNome] = useState("");
  const [ppa, setPpa] = useState("");
  const [loa, setLoa] = useState("");

  useEffect(() => {
    fetchObjetivos()
      .then(setObjetivos)
      .catch(() => {});
  }, []);

  function abrirNovo() {
    setEditando(null);
    setCodigo("");
    setNome("");
    setPpa("");
    setLoa("");
    setOpen(true);
  }

  function abrirEdicao(objetivo: Objetivo) {
    setEditando(objetivo);
    setCodigo(objetivo.codigo);
    setNome(objetivo.nome);
    setPpa(objetivo.ppa);
    setLoa(objetivo.loa);
    setOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const dados = { codigo, nome, ppa, loa };

    if (editando) {
      try {
        const atualizado = await updateObjetivo(editando.id, dados);
        setObjetivos((prev) =>
          prev.map((o) => (o.id === atualizado.id ? atualizado : o)),
        );
        toast.success("Objetivo atualizado com sucesso.");
      } catch {
        toast.error("Erro ao atualizar o objetivo.");
      }
    } else {
      try {
        const criado = await createObjetivo(dados);
        setObjetivos((prev) => [...prev, criado]);
        toast.success("Objetivo criado com sucesso.");
      } catch {
        toast.error("Erro ao criar o objetivo.");
      }
    }

    setCodigo("");
    setNome("");
    setPpa("");
    setLoa("");
    setEditando(null);
    setOpen(false);
  }

  async function confirmarExclusao() {
    if (!excluindo) return;
    const id = excluindo.id;
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
      <header className="flex items-center justify-between gap-4 border-b px-8 py-6 h-16">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Objetivos Estratégicos
          </h1>
        </div>
        <Button variant="outline" size="icon" className="cursor-pointer">
          <Bell className="h-5 w-5" />
        </Button>
      </header>

      <main className="flex-1 bg-cinza-claro px-8 pt-4 pb-8">
        <div className="mb-4 flex justify-end">
          <Button
            onClick={abrirNovo}
            className="cursor-pointer bg-bege hover:bg-bege/90"
          >
            <Plus />
            Adicionar Objetivo
          </Button>
        </div>
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
                    size="icon"
                    onClick={() => abrirEdicao(objetivo)}
                    className="border border-solid border-black/[.08] rounded-mds bg-white hover:bg-white/90 text-azul-escuro cursor-pointer"
                  >
                    <Pencil />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
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
              <Textarea
                id="ppa"
                value={ppa}
                onChange={(event) => setPpa(event.target.value)}
                placeholder="Vínculação ao PPA"
                className="focus-visible:ring-0 focus-visible:border-input"
                required
              />
            </div>
            <div className="grid gap-2 rounded-md">
              <Label htmlFor="loa">LOA</Label>
              <Textarea
                id="loa"
                value={loa}
                onChange={(event) => setLoa(event.target.value)}
                placeholder="LOA"
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
