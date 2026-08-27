"use client";

import { useAuth } from "@/context/auth-context";

export function usePermissoes() {
  const { usuario } = useAuth();

  const pode = (chave: string, acao: string): boolean => {
    return (
      usuario?.paginas?.some(
        (p) => p.chave === chave && p.acoes.includes(acao),
      ) ?? false
    );
  };

  return { pode };
}
