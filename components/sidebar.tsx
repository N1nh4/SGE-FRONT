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

function ItemTooltip({ label }: { label: string }) {
  return (
    <span
      role="tooltip"
      className="pointer-events-none absolute left-full top-1/2 z-50 ml-5 -translate-y-1/2 whitespace-nowrap rounded-lg border bg-popover px-2.5 py-1.5 text-xs font-medium text-popover-foreground opacity-0 shadow-md transition-opacity duration-150 group-hover:opacity-100"
    >
      <span className="absolute -left-[5px] top-1/2 size-2 -translate-y-1/2 rotate-45 border-b border-l border-border bg-popover" />
      {label}
    </span>
  );
}

export function Sidebar() {
  const { usuario, logout } = useAuth();
  const { naoLidas } = useNotificacoes();
  const pathname = usePathname();
  const [recolhido, setRecolhido] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("sge-menu-recolhido") === "1";
  });

  useEffect(() => {
    window.localStorage.setItem("sge-menu-recolhido", recolhido ? "1" : "0");
  }, [recolhido]);

  const [barraAberta, setBarraAberta] = useState<boolean>(() => !recolhido);

  useEffect(() => {
    const timer = setTimeout(
      () => setBarraAberta(!recolhido),
      recolhido ? 0 : 200,
    );
    return () => clearTimeout(timer);
  }, [recolhido]);

  const contadorVisivel = !recolhido && barraAberta;
  const pontoVisivel = !contadorVisivel;

  const itensVisiveis = navItems.filter(
    (item) =>
      usuario?.paginas?.some(
        (p) => item.href === p.chave || item.href.startsWith(p.chave + "/"),
      ) ?? false,
  );

  function estaAtivo(href: string): boolean {
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <aside
      className={`relative sticky top-0 flex h-screen shrink-0 flex-col bg-azul-escuro text-white transition-[width] duration-200 ${
        recolhido ? "w-16" : "w-64"
      }`}
    >
      <div className="flex h-16 shrink-0 items-center border-b border-white/10">
        <button
          onClick={() => setRecolhido(!recolhido)}
          className="absolute left-0 top-0 z-30 flex h-16 w-16 cursor-pointer items-center justify-center text-white/60 transition-colors hover:bg-white/10 hover:text-white"
          title={recolhido ? "Expandir menu" : "Recolher menu"}
          aria-label={recolhido ? "Expandir menu" : "Recolher menu"}
          aria-expanded={!recolhido}
        >
          {recolhido ? (
            <ChevronRight className="size-4" />
          ) : (
            <ChevronLeft className="size-4" />
          )}
        </button>
        {!recolhido && (
          <span className="pl-16 pr-4 text-lg font-semibold tracking-tight">
            SGE
          </span>
        )}
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {itensVisiveis.map(({ label, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            title={!recolhido ? label : undefined}
            className={`group relative flex min-h-9 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              estaAtivo(href)
                ? "bg-bege text-white hover:bg-bege/90"
                : "bg-white/10 text-white hover:bg-white/15"
            }`}
          >
            <Icon className="size-4 shrink-0" />
            {recolhido && <ItemTooltip label={label} />}
            <span
              className={`flex-1 overflow-hidden whitespace-nowrap transition-all duration-200 ${
                recolhido ? "max-w-0 opacity-0" : "max-w-40 opacity-100"
              }`}
            >
              {label}
            </span>
            {contadorVisivel &&
              href === "/notificacoes" &&
              naoLidas > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-semibold leading-none text-white">
                  {naoLidas > 99 ? "99+" : naoLidas}
                </span>
              )}
            {pontoVisivel && href === "/notificacoes" && naoLidas > 0 && (
              <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-red-500" />
            )}
          </Link>
        ))}
        {usuario?.paginas?.some((p) => p.chave === "/configurador") && (
          <Link
            href="/configurador"
            title={!recolhido ? "Configurações" : undefined}
            className={`group relative flex min-h-9 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              estaAtivo("/configurador")
                ? "bg-bege text-white hover:bg-bege/90"
                : "bg-white/10 text-white hover:bg-white/15"
            }`}
          >
            <Settings className="size-4 shrink-0" />
            {recolhido && <ItemTooltip label="Configurações" />}
            <span
              className={`flex-1 overflow-hidden whitespace-nowrap transition-all duration-200 ${
                recolhido ? "max-w-0 opacity-0" : "max-w-40 opacity-100"
              }`}
            >
              Configurações
            </span>
          </Link>
        )}
      </nav>

      <div className="relative flex items-center gap-3 border-t border-white/10 px-3.5 py-4">
        <button
          onClick={logout}
          className="group relative flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-white/50 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Sair"
          title={recolhido ? undefined : "Sair"}
        >
          <LogOut className="size-4" />
          {recolhido && <ItemTooltip label={`Sair (${usuario?.nome ?? ""})`} />}
        </button>
        <span
          className={`min-w-0 flex-1 truncate text-xs text-white/70 transition-all duration-200 ${
            recolhido ? "max-w-0 opacity-0" : "max-w-40 opacity-100"
          }`}
        >
          {usuario?.nome}
        </span>
      </div>
    </aside>
  );
}
