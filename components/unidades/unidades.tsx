"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  CalendarDays,
  Eye,
  LoaderCircle,
  Pencil,
  Plus,
  Trash,
} from "lucide-react";
import { HeaderBell } from "@/components/notificacoes/header-bell";
import { Button } from "@/components/ui/button";
import { usePermissoes } from "@/lib/use-permissoes";
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
import { toast } from "sonner";
import {
  createUnidade,
  deleteUnidade,
  fetchColaboradores,
  fetchUnidades,
  updateUnidade,
  type Unidade,
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

function formatarData(iso: string): string {
  const [ano, mes, dia] = iso.split("T")[0].split("-");
  return `${dia}/${mes}/${ano}`;
}

export function Unidades() {
  const { pode } = usePermissoes();
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [contagens, setContagens] = useState<Record<number, number>>({});
  const [carregando, setCarregando] = useState(true);
  const [open, setOpen] = useState(false);
  const [editando, setEditando] = useState<Unidade | null>(null);
  const [excluindo, setExcluindo] = useState<Unidade | null>(null);
  const [nome, setNome] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    let ativo = true;
    fetchUnidades()
      .then((lista) => {
        if (!ativo) return;
        setUnidades(lista);
        const promises = lista.map((u) =>
          fetchColaboradores(u.id)
            .then((cols) => {
              if (ativo)
                setContagens((prev) => ({ ...prev, [u.id]: cols.length }));
            })
            .catch(() => {}),
        );
        Promise.allSettled(promises).finally(() => {
          if (ativo) setCarregando(false);
        });
      })
      .catch(() => {
        if (ativo) setCarregando(false);
      });
    return () => {
      ativo = false;
    };
  }, []);

  function abrirNovo() {
    setEditando(null);
    setNome("");
    setOpen(true);
  }

  function abrirEdicao(unidade: Unidade) {
    setEditando(unidade);
    setNome(unidade.nome);
    setOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!nome.trim()) return;
    setSalvando(true);
    try {
      if (editando) {
        const atualizada = await updateUnidade(editando.id, nome.trim());
        setUnidades((prev) =>
          prev.map((u) => (u.id === atualizada.id ? atualizada : u)),
        );
        toast.success("Unidade atualizada com sucesso.");
      } else {
        const criada = await createUnidade(nome.trim());
        setUnidades((prev) => [...prev, criada]);
        toast.success("Unidade criada com sucesso.");
      }
      setNome("");
      setEditando(null);
      setOpen(false);
    } catch {
      toast.error(
        editando ? "Erro ao atualizar a unidade." : "Erro ao criar a unidade.",
      );
    } finally {
      setSalvando(false);
    }
  }

  async function confirmarExclusao() {
    if (!excluindo) return;
    try {
      await deleteUnidade(excluindo.id);
      setUnidades((prev) => prev.filter((u) => u.id !== excluindo.id));
      toast.success("Unidade excluída com sucesso.");
    } catch {
      toast.error("Erro ao excluir a unidade.");
    }
    setExcluindo(null);
  }

  return (
    <>
      <header className="flex items-center justify-between gap-4 border-b px-8 py-6 h-16">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Unidades</h1>
        </div>
        <HeaderBell />
      </header>

      <main className="flex-1 bg-cinza-claro px-8 pt-4 pb-8">
        <div className="mb-4 flex justify-end">
          {pode("/unidades", "criar") && (
            <Button
              onClick={abrirNovo}
              className="cursor-pointer bg-bege hover:bg-bege/90"
            >
              <Plus />
              Adicionar Unidade
            </Button>
          )}
        </div>
        {carregando ? (
          <div className="flex items-center justify-center py-12">
            <LoaderCircle className="animate-spin size-6 text-muted-foreground" />
          </div>
        ) : unidades.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma unidade cadastrada ainda.
          </p>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] items-start gap-6">
            {unidades.map((unidade) => (
              <article
                key={unidade.id}
                className="flex flex-col rounded-xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <h2 className="mt-3 text-base font-semibold leading-snug">
                  {unidade.nome}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {contagens[unidade.id] != null
                    ? `${contagens[unidade.id]} ${contagens[unidade.id] === 1 ? "colaborador" : "colaboradores"}`
                    : ""}
                </p>
                {/* <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                  <CalendarDays className="h-4 w-4" />
                  Criado em {formatarData(unidade.created_at)}
                </div> */}
                <div className="mt-auto flex items-center justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    size="icon"
                    render={<Link href={`/unidades/${unidade.id}`} />}
                    className="border border-solid border-black/[.08] rounded-mds bg-white hover:bg-white/90 text-azul-escuro cursor-pointer"
                    aria-label="Visualizar unidade"
                  >
                    <Eye />
                  </Button>
                  {pode("/unidades", "editar") && (
                    <Button
                      type="button"
                      size="icon"
                      onClick={() => abrirEdicao(unidade)}
                      className="border border-solid border-black/[.08] rounded-mds bg-white hover:bg-white/90 text-azul-escuro cursor-pointer"
                    >
                      <Pencil />
                    </Button>
                  )}
                  {pode("/unidades", "excluir") && (
                    <Button
                      type="button"
                      size="icon"
                      onClick={() => setExcluindo(unidade)}
                      className="bg-red-600/90 text-white hover:bg-red-600/80 cursor-pointer"
                    >
                      <Trash className="h-5 w-5" />
                    </Button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editando ? "Editar Unidade" : "Nova Unidade"}
            </DialogTitle>
            <DialogDescription>
              {editando
                ? "Altere o nome da unidade."
                : "Preencha o nome da unidade para cadastrá-la."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="nome">Nome</Label>
              <Input
                id="nome"
                value={nome}
                onChange={(event) => setNome(event.target.value)}
                placeholder="Ex.: Secretaria de Saúde"
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
                disabled={salvando}
                className="cursor-pointer bg-bege hover:bg-bege/90"
              >
                {salvando ? <LoaderCircle className="animate-spin" /> : null}
                {editando ? "Salvar" : "Adicionar"}
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
            <AlertDialogTitle>Excluir unidade</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a unidade{" "}
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
