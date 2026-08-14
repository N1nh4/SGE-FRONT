"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  ExternalLink,
  FileText,
  LoaderCircle,
  Paperclip,
  Trash2,
  Upload,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  deleteComprovacao,
  fetchComprovacoes,
  fetchPlanejamentoById,
  uploadComprovacao,
  urlArquivoComprovacao,
  type Comprovacao,
  type Planejamento,
} from "@/lib/api";

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

function labelMes(mes: number): string {
  return MESES[mes - 1] ?? String(mes);
}

function formatarData(iso: string | null): string {
  if (!iso) return "—";
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

export function PaginaComprovacoes({
  planejamentoId,
  indicadorId,
}: {
  planejamentoId: number;
  indicadorId: number;
}) {
  const [planejamento, setPlanejamento] = useState<Planejamento | null>(null);
  const [erro, setErro] = useState(false);
  const [itens, setItens] = useState<Comprovacao[] | null>(null);
  const [carregandoItens, setCarregandoItens] = useState(true);
  const [erroItens, setErroItens] = useState(false);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [substituindo, setSubstituindo] = useState(false);
  const [anoSelecionado, setAnoSelecionado] = useState(
    () => new Date().getFullYear(),
  );

  const indicador = useMemo(
    () =>
      planejamento?.indicadores.find((ind) => ind.id === indicadorId) ?? null,
    [planejamento, indicadorId],
  );

  useEffect(() => {
    fetchPlanejamentoById(planejamentoId)
      .then(setPlanejamento)
      .catch(() => setErro(true));
  }, [planejamentoId]);

  const carregarComprovacoes = () => {
    setCarregandoItens(true);
    setErroItens(false);
    fetchComprovacoes(indicadorId)
      .then(setItens)
      .catch(() => setErroItens(true))
      .finally(() => setCarregandoItens(false));
  };

  useEffect(() => {
    fetchComprovacoes(indicadorId)
      .then(setItens)
      .catch(() => setErroItens(true))
      .finally(() => setCarregandoItens(false));
  }, [indicadorId]);

  const hoje = new Date();
  const anoAtual = hoje.getFullYear();
  const mesAtual = hoje.getMonth() + 1;

  const historico = useMemo(
    () =>
      (itens ?? [])
        .slice()
        .sort((a, b) => b.ano - a.ano || b.mes - a.mes),
    [itens],
  );

  const atual = useMemo(
    () =>
      historico.find(
        (item) => item.ano === anoAtual && item.mes === mesAtual,
      ) ?? null,
    [historico, anoAtual, mesAtual],
  );

  const anosDisponiveis = useMemo(
    () =>
      Array.from(new Set(historico.map((item) => item.ano))).sort(
        (a, b) => b - a,
      ),
    [historico],
  );

  const anoExibido = anosDisponiveis.includes(anoSelecionado)
    ? anoSelecionado
    : (anosDisponiveis[0] ?? anoAtual);

  const visiveis = useMemo(
    () => historico.filter((item) => item.ano === anoExibido),
    [historico, anoExibido],
  );

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!arquivo) return;
    setEnviando(true);
    try {
      await uploadComprovacao(indicadorId, anoAtual, mesAtual, arquivo);
      toast.success("Comprovação enviada com sucesso.");
      setArquivo(null);
      carregarComprovacoes();
    } catch {
      toast.error("Erro ao enviar a comprovação.");
    } finally {
      setEnviando(false);
    }
  }

  async function handleDelete(item: Comprovacao) {
    try {
      await deleteComprovacao(item.id);
      toast.success("Comprovação excluída.");
      carregarComprovacoes();
    } catch {
      toast.error("Erro ao excluir a comprovação.");
    }
  }

  if (erro) {
    return (
      <>
        <header className="flex items-center justify-between gap-4 border-b px-8 py-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Comprovações
            </h1>
            <p className="text-sm text-muted-foreground">
              Não foi possível carregar os dados.
            </p>
          </div>
        </header>
        <main className="flex-1 bg-cinza-claro p-8">
          <div className="rounded-xl border bg-card p-10 text-center text-sm text-muted-foreground">
            Indicador não encontrado ou backend indisponível.
          </div>
        </main>
      </>
    );
  }

  if (!planejamento || !indicador) {
    return (
      <main className="flex flex-1 items-center justify-center bg-cinza-claro p-8">
        <div className="h-2 w-40 overflow-hidden rounded-full bg-muted">
          <div className="h-full w-1/3 animate-pulse rounded-full bg-bege" />
        </div>
      </main>
    );
  }

  return (
    <>
      <header className="flex items-center justify-between gap-4 border-b px-8 py-6">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            render={<Link href={`/planejamento/${planejamentoId}`} />}
          >
            <ArrowLeft />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Comprovações
            </h1>
            <p className="text-sm text-muted-foreground">{indicador.nome}</p>
          </div>
        </div>
        <span className="inline-flex w-fit rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
          {labelMes(mesAtual)} de {anoAtual}
        </span>
      </header>

      <main className="flex flex-1 flex-col gap-6 bg-cinza-claro p-8">
        <section className="rounded-xl border bg-card">
          <div className="flex flex-col gap-4 p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-medium">{indicador.nome}</h2>
              <span className="inline-flex w-fit rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                Meta: {indicador.meta}
              </span>
            </div>
            <div className="flex flex-wrap gap-4 text-sm">
              <span className="flex items-center gap-2 text-muted-foreground">
                <CalendarDays className="h-4 w-4" />
                Prazo: {formatarData(indicador.prazo)}
              </span>
              <span className="flex items-center gap-2 text-muted-foreground">
                <User className="h-4 w-4" />
                Responsável: {indicador.unidade?.nome ?? "—"}
              </span>
            </div>
          </div>
        </section>

        <section className="rounded-xl border bg-card">
          <div className="flex items-center justify-between gap-2 border-b px-5 py-4">
            <div className="flex items-center gap-2">
              <Upload className="h-4 w-4 text-bege" />
              <h2 className="font-medium">Comprovação do mês atual</h2>
            </div>
            <span className="inline-flex w-fit rounded-full bg-bege px-2.5 py-0.5 text-xs font-semibold text-white">
              {labelMes(mesAtual)} de {anoAtual}
            </span>
          </div>
          <form onSubmit={handleUpload} className="flex flex-col gap-4 p-5">
            {atual && !substituindo ? (
              <>
                <div className="flex items-center justify-between gap-3 rounded-lg border border-bege/30 bg-bege/5 p-4">
                  <div className="flex min-w-0 items-center gap-2">
                    <FileText className="h-4 w-4 shrink-0 text-bege" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {atual.arquivo_nome}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Enviada em{" "}
                        {formatarData(atual.created_at.split("T")[0])}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      render={
                        <a
                          href={urlArquivoComprovacao(atual.id)}
                          target="_blank"
                          rel="noreferrer"
                        />
                      }
                      aria-label="Visualizar comprovação do mês atual"
                    >
                      <ExternalLink />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleDelete(atual)}
                      className="cursor-pointer text-red-600 hover:text-red-600"
                      aria-label="Excluir comprovação do mês atual"
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSubstituindo(true)}
                  className="cursor-pointer"
                >
                  <Upload />
                  Substituir arquivo
                </Button>
              </>
            ) : (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="arquivo">Arquivo PDF</Label>
                  <Input
                    id="arquivo"
                    type="file"
                    accept="application/pdf"
                    onChange={(event) =>
                      setArquivo(event.target.files?.[0] ?? null)
                    }
                    className="cursor-pointer"
                  />
                </div>

                {atual && (
                  <p className="text-xs text-muted-foreground">
                    Já existe comprovação de {labelMes(mesAtual)} de{" "}
                    {anoAtual}. Enviar novamente substitui o arquivo atual.
                  </p>
                )}

                <div className="flex items-center gap-2">
                  <Button
                    type="submit"
                    disabled={!arquivo || enviando}
                    className="cursor-pointer bg-bege hover:bg-bege/90"
                  >
                    {enviando ? (
                      <LoaderCircle className="animate-spin" />
                    ) : (
                      <Upload />
                    )}
                    {enviando ? "Enviando..." : "Enviar comprovação"}
                  </Button>
                  {atual && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setSubstituindo(false);
                        setArquivo(null);
                      }}
                      className="cursor-pointer"
                    >
                      Cancelar
                    </Button>
                  )}
                </div>
              </>
            )}
          </form>
        </section>

        <section className="rounded-xl border bg-card">
          <div className="flex items-center justify-between gap-2 border-b px-5 py-4">
            <div className="flex items-center gap-2">
              <Paperclip className="h-4 w-4 text-bege" />
              <h2 className="font-medium">Comprovações enviadas</h2>
            </div>
            {anosDisponiveis.length > 0 && (
              <select
                aria-label="Filtrar por ano"
                value={anoExibido}
                onChange={(event) =>
                  setAnoSelecionado(Number(event.target.value))
                }
                className="h-8 w-auto min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
              >
                {anosDisponiveis.map((ano) => (
                  <option key={ano} value={ano}>
                    {ano}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="p-5">
            {carregandoItens && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Carregando...
              </p>
            )}

            {!carregandoItens && erroItens && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Não foi possível carregar as comprovações.
              </p>
            )}

            {!carregandoItens && !erroItens && historico.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nenhuma comprovação enviada ainda. Ao enviar o primeiro mês,
                ele aparece aqui.
              </p>
            )}

            {!carregandoItens && !erroItens && historico.length > 0 && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {visiveis.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col justify-between gap-3 rounded-lg border border-bege/30 bg-bege/5 p-4"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">
                        {labelMes(item.mes)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {item.ano}
                      </span>
                    </div>
                    <div className="flex min-w-0 items-center gap-2">
                      <FileText className="h-4 w-4 shrink-0 text-bege" />
                      <span className="truncate text-xs text-muted-foreground">
                        {item.arquivo_nome}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        render={
                          <a
                            href={urlArquivoComprovacao(item.id)}
                            target="_blank"
                            rel="noreferrer"
                          />
                        }
                        aria-label={`Visualizar comprovação de ${labelMes(item.mes)} de ${item.ano}`}
                      >
                        <ExternalLink />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleDelete(item)}
                        className="cursor-pointer text-red-600 hover:text-red-600"
                        aria-label={`Excluir comprovação de ${labelMes(item.mes)} de ${item.ano}`}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </>
  );
}
