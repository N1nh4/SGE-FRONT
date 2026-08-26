"use client";

import { useAuth } from "@/context/auth-context";
import { Building2, LogOut } from "lucide-react";

export function SelecaoUnidade() {
  const { unidades, selecionarUnidade, logout, usuario } = useAuth();

  return (
    <div className="flex min-h-screen items-center justify-center bg-cinza-claro">
      <div className="w-full max-w-md rounded-xl border bg-white p-8 shadow-sm">
        <h1 className="mb-2 text-center text-xl font-semibold">
          Selecionar Unidade
        </h1>
        <p className="mb-6 text-center text-sm text-muted-foreground">
          Olá, {usuario?.nome}. Selecione a unidade que deseja acessar.
        </p>

        <div className="space-y-3">
          {unidades.map((u) => (
            <button
              key={u.id}
              onClick={() => selecionarUnidade(u.id)}
              className="flex w-full items-center gap-3 rounded-lg border p-4 text-left transition-colors hover:bg-azul-claro/10 hover:border-azul-escuro"
            >
              <Building2 className="size-5 text-azul-escuro" />
              <div>
                <p className="font-medium">{u.nome}</p>
                <p className="text-xs text-muted-foreground">
                  Perfil: {u.papel}
                </p>
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={logout}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg border py-2 text-sm text-muted-foreground transition-colors hover:bg-gray-50"
        >
          <LogOut className="size-4" />
          Sair
        </button>
      </div>
    </div>
  );
}
