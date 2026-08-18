"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Lock, Mail } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [entrando, setEntrando] = useState(false);
  const { login, usuario, carregando } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!carregando && usuario) {
      router.replace("/indicadores");
    }
  }, [carregando, usuario, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim() || !senha) return;
    setEntrando(true);
    try {
      await login(email, senha);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Erro ao realizar o login.",
      );
    } finally {
      setEntrando(false);
    }
  }

  if (carregando) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoaderCircle className="animate-spin size-6 text-muted-foreground" />
      </div>
    );
  }

  if (usuario) return null;

  return (
    <div className="flex min-h-screen">
      <aside className="hidden flex-1 flex-col justify-between bg-azul-escuro p-12 text-white md:flex">
        <div className="flex items-center gap-2.5">
          <div className="flex size-10 items-center justify-center rounded-lg bg-white/10 text-lg font-bold">
            S
          </div>
          <span className="text-xl font-semibold tracking-tight">SGE</span>
        </div>
        <div className="max-w-md">
          <h1 className="text-4xl font-bold leading-tight tracking-tight">
            Sistema de Gestao Estrategica
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-white/70">
            Acompanhe objetivos, planejamentos, indicadores e unidades da
            organizacao em um so lugar.
          </p>
        </div>
        <p className="text-sm text-white/50">
          &copy; {new Date().getFullYear()} SGE. Todos os direitos reservados.
        </p>
      </aside>

      <main className="flex flex-1 items-center justify-center bg-cinza-claro p-8">
        <div className="w-full max-w-sm rounded-xl border bg-card p-8 shadow-sm">
          <div className="mb-6 flex items-center gap-2.5 md:hidden">
            <div className="flex size-8 items-center justify-center rounded-lg bg-azul-escuro text-sm font-bold text-white">
              S
            </div>
            <span className="text-lg font-semibold tracking-tight">SGE</span>
          </div>
          <h2 className="text-2xl font-semibold tracking-tight">Login</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Acesse sua conta para continuar.
          </p>
          <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">E-mail</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="voce@exemplo.com"
                  className="h-10 pl-9"
                  autoComplete="email"
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
                  placeholder="* * * * * * * *"
                  className="h-10 pl-9"
                  autoComplete="current-password"
                  required
                />
              </div>
            </div>
            <Button
              type="submit"
              disabled={entrando}
              className="h-10 cursor-pointer bg-bege hover:bg-bege/90"
            >
              {entrando ? <LoaderCircle className="animate-spin" /> : null}
              {entrando ? "Entrando..." : "Entrar"}
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}
