"use client";

import type { ReactNode } from "react";
import { HeaderBell } from "@/components/notificacoes/header-bell";

type PageHeaderProps = {
  titulo: string;
  subtitulo?: string;
  inicio?: ReactNode;
  acoes?: ReactNode;
};

export function PageHeader({ titulo, subtitulo, inicio, acoes }: PageHeaderProps) {
  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between gap-4 border-b bg-background px-8">
      <div className="flex min-w-0 items-center gap-3">
        {inicio}
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight truncate">
            {titulo}
          </h1>
          {subtitulo && (
            <p className="text-sm text-muted-foreground">{subtitulo}</p>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {acoes}
        <HeaderBell />
      </div>
    </header>
  );
}