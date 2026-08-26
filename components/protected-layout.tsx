"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/auth-context";
import { Sidebar } from "@/components/sidebar";
import { SelecaoUnidade } from "@/components/selecao-unidade/selecao-unidade";
import type { PaginaComAcoes } from "@/lib/api";

function canAccessPages(paginas: PaginaComAcoes[] | undefined, pathname: string): boolean {
  if (!paginas || paginas.length === 0) return false;
  return paginas.some(
    (p) => pathname === p.chave || pathname.startsWith(p.chave + "/"),
  );
}

function getFirstAllowedPage(paginas: PaginaComAcoes[] | undefined): string {
  return paginas?.[0]?.chave ?? "/indicadores";
}

export function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { usuario, unidades, unidadeId, carregando } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (carregando) return;

    if (!usuario) {
      toast.error("Você precisa estar logado para acessar esta página.");
      const timeout = setTimeout(() => router.replace("/"), 1500);
      return () => clearTimeout(timeout);
    }

    if (!canAccessPages(usuario.paginas, pathname)) {
      toast.error("Você não tem permissão para acessar esta página.");
      const destino = getFirstAllowedPage(usuario.paginas);
      const timeout = setTimeout(() => router.replace(destino), 1500);
      return () => clearTimeout(timeout);
    }
  }, [carregando, usuario, router, pathname]);

  if (carregando) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoaderCircle className="animate-spin size-6 text-muted-foreground" />
      </div>
    );
  }

  if (!usuario) return null;

  if (unidades.length > 1 && !unidadeId) {
    return <SelecaoUnidade />;
  }

  if (!canAccessPages(usuario.paginas, pathname)) return null;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
