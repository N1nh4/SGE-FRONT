"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BarChart3,
  Bell,
  Building2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  FileCheck,
  Goal,
  LogOut,
  Settings,
  Target,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useNotificacoes } from "@/context/notification-context";

const navItems = [
  { label: "Notificações", href: "/notificacoes", icon: Bell },
  { label: "Indicadores", href: "/indicadores", icon: BarChart3 },
  { label: "Comprovações", href: "/comprovacoes", icon: FileCheck },
  { label: "Planejamento", href: "/planejamento", icon: Goal },
  { label: "Validação", href: "/validacao", icon: ClipboardCheck },
  { label: "Objetivos", href: "/objetivos", icon: Target },
  { label: "Unidades", href: "/unidades", icon: Building2 },
];

export function Sidebar() {
  const { usuario, unidades, unidadeId, logout } = useAuth();
  const { naoLidas } = useNotificacoes();
  const pathname = usePathname();
  const [recolhido, setRecolhido] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("sge-menu-recolhido") === "1";
  });

  useEffect(() => {
    window.localStorage.setItem(
      "sge-menu-recolhido",
      recolhido ? "1" : "0",
    );
  }, [recolhido]);

  const itensVisiveis = navItems.filter(
    (item) =>
      usuario?.paginas?.some(
        (p) => item.href === p.chave || item.href.startsWith(p.chave + "/"),
      ) ?? false,
  );

  const unidadeAtual = unidades.find((u) => u.id === unidadeId);

  function estaAtivo(href: string): boolean {
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <aside
      className={`sticky top-0 flex h-screen shrink-0 flex-col bg-azul-escuro text-white transition-[width] duration-200 ${
        recolhido ? "w-16" : "w-64"
      }`}
    >
      <div className="flex h-16 items-center justify-between gap-2.5 border-b border-white/10 px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-sm font-bold">
            S
          </div>
          {!recolhido && (
            <span className="text-lg font-semibold tracking-tight">SGE</span>
          )}
        </div>
        {!recolhido && (
          <button
            onClick={() => setRecolhido(true)}
            className="cursor-pointer rounded p-1 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
            title="Recolher menu"
          >
            <ChevronLeft className="size-4" />
          </button>
        )}
        {recolhido && (
          <button
            onClick={() => setRecolhido(false)}
            className="cursor-pointer rounded p-1 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
            title="Expandir menu"
          >
            <ChevronRight className="size-4" />
          </button>
        )}
      </div>

      {unidadeAtual && !recolhido && (
        <div className="border-b border-white/10 px-6 py-3">
          <p className="text-xs text-white/50">Unidade</p>
          <p className="truncate text-sm font-medium">{unidadeAtual.nome}</p>
        </div>
      )}

      <nav className="flex-1 space-y-1 px-3 py-4">
        {itensVisiveis.map(({ label, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            title={label}
            className={`relative flex min-h-9 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              estaAtivo(href)
                ? "bg-bege text-white hover:bg-bege/90"
                : "bg-white/10 text-white hover:bg-white/15"
            }`}
          >
            <Icon className="size-4 shrink-0" />
            {!recolhido && <span className="flex-1">{label}</span>}
            {!recolhido && href === "/notificacoes" && naoLidas > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-semibold leading-none text-white">
                {naoLidas > 99 ? "99+" : naoLidas}
              </span>
            )}
            {recolhido && href === "/notificacoes" && naoLidas > 0 && (
              <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-red-500" />
            )}
          </Link>
        ))}
        {usuario?.paginas?.some((p) => p.chave === "/configurador") && (
          <Link
            href="/configurador"
            title="Configurações"
            className={`flex min-h-9 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              estaAtivo("/configurador")
                ? "bg-bege text-white hover:bg-bege/90"
                : "bg-white/10 text-white hover:bg-white/15"
            }`}
          >
            <Settings className="size-4 shrink-0" />
            {!recolhido && <span className="flex-1">Configurações</span>}
          </Link>
        )}
      </nav>

      <div className="relative border-t border-white/10 px-4 py-4">
        {recolhido ? (
          <div className="flex justify-end">
            <button
              onClick={logout}
              className="cursor-pointer rounded p-1 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
              title={`Sair (${usuario?.nome})`}
            >
              <LogOut className="size-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <span className="truncate text-xs text-white/70">
              {usuario?.nome}
            </span>
            <button
              onClick={logout}
              className="cursor-pointer rounded p-1 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
              title="Sair"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}