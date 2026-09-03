"use client";

import type { ReactNode } from "react";
import { HeaderBell } from "@/components/notificacoes/header-bell";

type PageHeaderProps = {
  titulo: string;
  subtitulo?: string;
  acoes?: ReactNode;
};

export function PageHeader({ titulo, subtitulo, acoes }: PageHeaderProps) {
  return (
    <header className="flex items-center justify-between gap-4 border-b px-8 py-6 h-16">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight truncate">
          {titulo}
        </h1>
        {subtitulo && (
          <p className="text-sm text-muted-foreground">{subtitulo}</p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {acoes}
        <HeaderBell />
      </div>
    </header>
  );
}