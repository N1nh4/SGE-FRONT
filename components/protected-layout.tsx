"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/auth-context";
import { Sidebar } from "@/components/sidebar";
import { canAccessRoute, getFirstAllowedRoute } from "@/lib/roles";

export function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { usuario, carregando } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (carregando) return;

    if (!usuario) {
      toast.error("Você precisa estar logado para acessar esta página.");
      const timeout = setTimeout(() => router.replace("/"), 1500);
      return () => clearTimeout(timeout);
    }

    if (!canAccessRoute(usuario.papel, pathname)) {
      toast.error("Você não tem permissão para acessar esta página.");
      const destino = getFirstAllowedRoute(usuario.papel);
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

  if (!canAccessRoute(usuario.papel, pathname)) return null;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
