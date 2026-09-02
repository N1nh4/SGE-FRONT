"use client";

import Link from "next/link";
import {
  BarChart3,
  Bell,
  Building2,
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
  { label: "Indicadores", href: "/indicadores", icon: BarChart3 },
  { label: "Comprovações", href: "/comprovacoes", icon: FileCheck },
  { label: "Planejamento", href: "/planejamento", icon: Goal },
  { label: "Validação", href: "/validacao", icon: ClipboardCheck },
  { label: "Objetivos", href: "/objetivos", icon: Target },
  { label: "Unidades", href: "/unidades", icon: Building2 },
  { label: "Notificações", href: "/notificacoes", icon: Bell },
];

export function Sidebar() {
  const { usuario, unidades, unidadeId, logout } = useAuth();
  const { naoLidas } = useNotificacoes();

  const itensVisiveis = navItems.filter(
    (item) =>
      usuario?.paginas?.some(
        (p) => item.href === p.chave || item.href.startsWith(p.chave + "/"),
      ) ?? false,
  );

  const unidadeAtual = unidades.find((u) => u.id === unidadeId);

  return (
    <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col bg-azul-escuro text-white">
      <div className="flex h-16 items-center gap-2.5 border-b border-white/10 px-6">
        <div className="flex size-8 items-center justify-center rounded-lg bg-white/10 text-sm font-bold">
          S
        </div>
        <span className="text-lg font-semibold tracking-tight">SGE</span>
      </div>

      {unidadeAtual && (
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
            className="flex items-center gap-3 rounded-lg bg-white/10 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-white/15"
          >
            <Icon className="size-4" />
            <span className="flex-1">{label}</span>
            {href === "/notificacoes" && naoLidas > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-semibold leading-none text-white">
                {naoLidas > 99 ? "99+" : naoLidas}
              </span>
            )}
          </Link>
        ))}
        {usuario?.paginas?.some((p) => p.chave === "/configurador") && (
          <Link
            href="/configurador"
            className="flex items-center gap-3 rounded-lg bg-white/10 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-white/15"
          >
            <Settings className="size-4" />
            Configurações
          </Link>
        )}
      </nav>

      <div className="border-t border-white/10 px-4 py-4">
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
      </div>
    </aside>
  );
}
