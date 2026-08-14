"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Building2, CalendarRange, ClipboardCheck } from "lucide-react";
import { fetchUnidades, type Unidade } from "@/lib/api";

const MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export function Validacao() {
  const hoje = new Date();
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [mes, setMes] = useState(() => hoje.getMonth() + 1);
  const [ano, setAno] = useState(() => hoje.getFullYear());

  useEffect(() => {
    fetchUnidades()
      .then(setUnidades)
      .catch(() => {
        // Backend offline: mantém a lista vazia.
      });
  }, []);

  return (
    <>
      <header className="flex items-center justify-between gap-4 border-b px-8 py-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Validação de Comprovações
          </h1>
          <p className="text-sm text-muted-foreground">
            Selecione o período e a unidade para validar as comprovações
            enviadas.
          </p>
        </div>
      </header>

      <main className="flex flex-1 flex-col gap-6 bg-cinza-claro p-8">
        <section className="flex flex-wrap items-end gap-4 rounded-xl border bg-card p-5">
          <div className="flex items-center gap-1.5">
            <label
              htmlFor="mes"
              className="text-sm leading-none font-medium text-muted-foreground"
            >
              Mês
            </label>
            <select
              id="mes"
              value={mes}
              onChange={(event) => setMes(Number(event.target.value))}
              className="h-8 w-auto min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
            >
              {MESES.map((nome, index) => (
                <option key={nome} value={index + 1}>
                  {nome}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <label
              htmlFor="ano"
              className="text-sm leading-none font-medium text-muted-foreground"
            >
              Ano
            </label>
            <select
              id="ano"
              value={ano}
              onChange={(event) => setAno(Number(event.target.value))}
              className="h-8 w-auto min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
            >
              {Array.from({ length: 5 }, (_, i) => ano - 4 + i).map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
        </section>

        <section>
          {unidades.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma unidade cadastrada ainda.
            </p>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] items-stretch gap-6">
              {unidades.map((unidade) => (
                <Link
                  key={unidade.id}
                  href={`/validacao/${unidade.id}?mes=${mes}&ano=${ano}`}
                  className="flex flex-col rounded-xl border bg-card p-5 shadow-sm transition-all hover:shadow-md"
                >
                  <div className="flex items-center gap-3">
                    <h2 className="text-base font-semibold leading-snug">
                      {unidade.nome}
                    </h2>
                  </div>
                  <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                    <ClipboardCheck className="size-3.5" />
                    Clique para ver as comprovações de {MESES[mes - 1]} de {ano}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
