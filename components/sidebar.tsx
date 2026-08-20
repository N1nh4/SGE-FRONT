"use client";

import Link from "next/link";
import { AlertCircle, BarChart3, Building2, ClipboardCheck, FileCheck, Goal, LogOut, Target } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { canAccessRoute } from "@/lib/roles";

const navItems = [
  { label: "Indicadores", href: "/indicadores", icon: BarChart3 },
  { label: "Comprovações", href: "/comprovacoes", icon: FileCheck },
  { label: "Planejamento", href: "/planejamento", icon: Goal },
  { label: "Validação", href: "/validacao", icon: ClipboardCheck },
  { label: "Objetivos", href: "/objetivos", icon: Target },
  { label: "Unidades", href: "/unidades", icon: Building2 },
  { label: "Pendências", href: "/pendencias", icon: AlertCircle },
];

export function Sidebar() {
  const { usuario, logout } = useAuth();

  const itensVisiveis = navItems.filter((item) =>
    usuario ? canAccessRoute(usuario.papel, item.href) : false,
  );

  return (
    <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col bg-azul-escuro text-white">
      <div className="flex h-16 items-center gap-2.5 border-b border-white/10 px-6">
        <div className="flex size-8 items-center justify-center rounded-lg bg-white/10 text-sm font-bold">
          S
        </div>
        <span className="text-lg font-semibold tracking-tight">SGE</span>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {itensVisiveis.map(({ label, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3 rounded-lg bg-white/10 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-white/15"
          >
            <Icon className="size-4" />
            {label}
          </Link>
        ))}
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
