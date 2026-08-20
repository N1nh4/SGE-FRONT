"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  LoaderCircle,
  Lock,
  Mail,
  Pencil,
  Plus,
  Trash2,
  User,
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
import { toast } from "sonner";
import {
  createColaborador,
  fetchColaboradores,
  fetchUnidadeById,
  updateColaborador,
  updateUsuarioStatus,
  type Colaborador,
  type Unidade,
} from "@/lib/api";

export function DetalheUnidade({ unidadeId }: { unidadeId: number }) {
  const [unidade, setUnidade] = useState<Unidade | null>(null);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [erro, setErro] = useState(false);
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [papel, setPapel] = useState("default");
  const [senha, setSenha] = useState("");
  const [status, setStatus] = useState(1);
  const [salvando, setSalvando] = useState(false);
  const [colaboradorEditando, setColaboradorEditando] = useState<Colaborador | null>(null);

  useEffect(() => {
    fetchUnidadeById(unidadeId)
      .then(setUnidade)
      .catch(() => setErro(true));
  }, [unidadeId]);

  const carregarColaboradores = () => {
    fetchColaboradores(unidadeId)
      .then(setColaboradores)
      .catch(() => {});
  };

  useEffect(() => {
    carregarColaboradores();
  }, [unidadeId]);

  function abrirNovo() {
    setColaboradorEditando(null);
    setNome("");
    setEmail("");
    setPapel("default");
    setSenha("");
    setStatus(1);
    setOpen(true);
  }

  function abrirEdicao(col: Colaborador) {
    setColaboradorEditando(col);
    setNome(col.nome);
    setEmail(col.email);
    setPapel(col.papel);
    setSenha("");
    setStatus(col.status);
    setOpen(true);
  }

  async function inativarColaborador(col: Colaborador) {
    try {
      await updateUsuarioStatus(col.id, 0);
      toast.success(`${col.nome} foi inativado.`);
      carregarColaboradores();
    } catch {
      toast.error("Erro ao inativar o colaborador.");
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!nome.trim() || !email.trim()) return;
    if (!colaboradorEditando && !senha.trim()) return;
    setSalvando(true);
    try {
      if (colaboradorEditando) {
        await updateColaborador(colaboradorEditando.id, {
          nome: nome.trim(),
          email: email.trim(),
          ...(senha.trim() ? { senha: senha.trim() } : {}),
          papel,
          status,
        });
        toast.success("Colaborador atualizado com sucesso.");
      } else {
        await createColaborador(unidadeId, {
          nome: nome.trim(),
          email: email.trim(),
          senha: senha.trim(),
          papel,
          status,
        });
        toast.success("Colaborador adicionado com sucesso.");
      }
      setOpen(false);
      carregarColaboradores();
    } catch {
      toast.error(colaboradorEditando ? "Erro ao atualizar o colaborador." : "Erro ao adicionar o colaborador.");
    } finally {
      setSalvando(false);
    }
  }

  if (erro) {
    return (
      <>
        <header className="flex items-center justify-between gap-4 border-b px-8 py-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Unidade</h1>
            <p className="text-sm text-muted-foreground">
              Não foi possível carregar os dados desta unidade.
            </p>
          </div>
        </header>
        <main className="flex-1 bg-cinza-claro p-8">
          <div className="rounded-xl border bg-card p-10 text-center text-sm text-muted-foreground">
            Unidade não encontrada ou backend indisponível.
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <header className="flex items-center justify-between gap-4 border-b px-8 py-6">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            render={<Link href="/unidades" />}
            aria-label="Voltar"
          >
            <ArrowLeft />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {unidade?.nome ?? "Unidade"}
            </h1>
            <p className="text-sm text-muted-foreground">
              Gerencie os colaboradores desta unidade.
            </p>
          </div>
        </div>
        <Button
          onClick={abrirNovo}
          className="cursor-pointer bg-bege hover:bg-bege/90"
        >
          <Plus />
          Adicionar Colaborador
        </Button>
      </header>

      <main className="flex-1 bg-cinza-claro p-8">
        <div className="flex items-center gap-3 rounded-xl border bg-card p-5">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-azul-escuro text-white">
            <Building2 className="size-5" />
          </div>
          <div>
            <h2 className="font-semibold">
              {unidade?.nome ?? "Carregando..."}
            </h2>
            <p className="text-sm text-muted-foreground">
              {colaboradores.length > 0
                ? `${colaboradores.length} colaboradores`
                : "Nenhum colaborador vinculado."}
            </p>
          </div>
        </div>

        <div className="mt-6 overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-5 py-3 font-medium">Nome</th>
                <th className="px-5 py-3 font-medium">E-mail</th>
                <th className="px-5 py-3 font-medium">Papel</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {colaboradores.map((col) => (
                <tr
                  key={col.id}
                  className="border-b last:border-0 transition-colors hover:bg-muted/50"
                >
                  <td className="px-5 py-4 align-top font-medium">
                    {col.nome}
                  </td>
                  <td className="px-5 py-4 align-top text-muted-foreground">
                    {col.email}
                  </td>
                  <td className="px-5 py-4 align-top text-muted-foreground">
                    {col.papel.replace("_", " ")}
                  </td>
                  <td className="px-5 py-4 align-top">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                        col.status === 1
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {col.status === 1 ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="px-5 py-4 align-top">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => abrirEdicao(col)}
                        className="cursor-pointer rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        title="Editar"
                      >
                        <Pencil className="size-4" />
                      </button>
                      {col.status === 1 && (
                        <button
                          onClick={() => inativarColaborador(col)}
                          className="cursor-pointer rounded p-1 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600"
                          title="Inativar"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {colaboradores.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-10 text-center text-sm text-muted-foreground"
                  >
                    Nenhum colaborador vinculado a esta unidade.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{colaboradorEditando ? "Editar Colaborador" : "Adicionar Colaborador"}</DialogTitle>
            <DialogDescription>
              {colaboradorEditando
                ? "Atualize os dados do colaborador."
                : "Preencha os dados do colaborador para vinculá-lo à unidade."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="nome">Nome</Label>
              <div className="relative">
                <User className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="nome"
                  value={nome}
                  onChange={(event) => setNome(event.target.value)}
                  placeholder="Nome do colaborador"
                  className="h-10 pl-9"
                  required
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="email">E-mail</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="colaborador@exemplo.com"
                  className="h-10 pl-9"
                  required
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="senha">Senha</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="senha"
                  type="password"
                  value={senha}
                  onChange={(event) => setSenha(event.target.value)}
                  placeholder={colaboradorEditando ? "Deixe vazio para manter" : "Mínimo 6 caracteres"}
                  className="h-10 pl-9"
                  minLength={colaboradorEditando ? undefined : 6}
                  required={!colaboradorEditando}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="papel">Papel</Label>
              <select
                id="papel"
                value={papel}
                onChange={(event) => setPapel(event.target.value)}
                className="h-10 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30"
              >
                <option value="default">Default</option>
                <option value="adm">Adm</option>
                <option value="master">Master</option>
              </select>
            </div>

            <div className="grid gap-2">
              <Label>Status</Label>
              <button
                type="button"
                onClick={() => setStatus(status === 1 ? 0 : 1)}
                className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
                  status === 1 ? "bg-green-500" : "bg-gray-300"
                }`}
              >
                <span
                  className={`inline-block size-5 rounded-full bg-white shadow transition-transform ${
                    status === 1 ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
              <span className="text-xs text-muted-foreground">
                {status === 1 ? "Ativo" : "Inativo"}
              </span>
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
                {salvando
                  ? colaboradorEditando ? "Salvando..." : "Adicionando..."
                  : colaboradorEditando ? "Salvar" : "Adicionar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
