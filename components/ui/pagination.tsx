"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PaginationProps = {
  paginaAtual: number;
  totalPaginas: number;
  totalItens: number;
  itensPorPagina: number;
  rotuloItensPlural: string;
  onMudarPagina: (pagina: number) => void;
};

export function Pagination({
  paginaAtual,
  totalPaginas,
  totalItens,
  itensPorPagina,
  rotuloItensPlural,
  onMudarPagina,
}: PaginationProps) {
  if (totalPaginas <= 1) return null;

  const inicio = (paginaAtual - 1) * itensPorPagina + 1;
  const fim = Math.min(paginaAtual * itensPorPagina, totalItens);

  return (
    <div className="mt-4 flex items-center justify-between gap-4">
      <p className="text-sm text-muted-foreground">
        Mostrando{" "}
        <strong>
          {inicio}–{fim}
        </strong>{" "}
        de <strong>{totalItens}</strong> {rotuloItensPlural}
      </p>
      <div className={cn("flex items-center gap-2")}>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onMudarPagina(paginaAtual - 1)}
          disabled={paginaAtual === 1}
          className="cursor-pointer"
        >
          <ChevronLeft className="h-4 w-4" />
          Anterior
        </Button>
        <span className="px-1 text-sm text-muted-foreground">
          Página {paginaAtual} de {totalPaginas}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onMudarPagina(paginaAtual + 1)}
          disabled={paginaAtual === totalPaginas}
          className="cursor-pointer"
        >
          Próxima
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}