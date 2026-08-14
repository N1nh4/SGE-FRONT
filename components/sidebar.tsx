import Link from "next/link";
import { Building2, ClipboardCheck, Goal, Target } from "lucide-react";

const navItems = [
  { label: "Objetivos", href: "/objetivos", icon: Target },
  { label: "Planejamento", href: "/planejamento", icon: Goal },
  { label: "Unidades", href: "/unidades", icon: Building2 },
  { label: "Validação", href: "/validacao", icon: ClipboardCheck },
];

export function Sidebar() {
  return (
    <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col bg-azul-escuro text-white">
      <div className="flex h-16 items-center gap-2.5 border-b border-white/10 px-6">
        <div className="flex size-8 items-center justify-center rounded-lg bg-white/10 text-sm font-bold">
          S
        </div>
        <span className="text-lg font-semibold tracking-tight">SGE</span>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map(({ label, href, icon: Icon }) => (
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
    </aside>
  );
}
