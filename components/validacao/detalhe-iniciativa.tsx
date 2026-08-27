"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ExternalLink,
  FileText,
  LoaderCircle,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePermissoes } from "@/lib/use-permissoes";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  decidirComprovacao,
  fetchArquivoComprovacaoUrl,
  fetchComprovacoes,
  fetchPlanejamentoById,
  fetchUnidades,
  type Planejamento,
  type StatusComprovacao,
  type Unidade,
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

type ComprovacaoDetalhe = {
  id: number;
  arquivo_nome: string;
  created_at: string;
  status: StatusComprovacao;
  indicadorId: number;
  indicadorNome: string;
  meta: string;
  rotulo_x: string;
  rotulo_y: string;
  orientacao: string;
};

const ROTULO_STATUS: Record<StatusComprovacao, string> = {
  analise: "Em análise",
  aprovado: "Aprovado",
  recusado: "Recusado",
};

const CLASSE_STATUS: Record<StatusComprovacao, string> = {
  analise: "bg-muted text-muted-foreground",
  aprovado: "bg-green-600/15 text-green-700",
  recusado: "bg-red-600/15 text-red-700",
};

export function DetalheIniciativa({
  unidadeId,
  planejamentoId,
  mes,
  ano,
}: {
  unidadeId: number;
  planejamentoId: number;
  mes: number;
  ano: number;
}) {
  const { pode } = usePermissoes();
  const podeAprovar = pode("/validacao", "aprovar");
  const [unidade, setUnidade] = useState<Unidade | null>(null);
  const [planejamento, setPlanejamento] = useState<Planejamento | null>(null);
  const [itens, setItens] = useState<ComprovacaoDetalhe[]>([]);
  const [indiceAtual, setIndiceAtual] = useState(0);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [carregandoPdf, setCarregandoPdf] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);
  const [reprovando, setReprovando] = useState(false);
  const [justificativa, setJustificativa] = useState("");
  const [prazoReenvio, setPrazoReenvio] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    fetchUnidades()
      .then((unidades) => {
        const encontrada = unidades.find((u) => u.id === unidadeId);
        if (encontrada) setUnidade(encontrada);
      })
      .catch(() => {});
  }, [unidadeId]);

  useEffect(() => {
    let ativo = true;

    fetchPlanejamentoById(planejamentoId)
      .then(async (pj) => {
        if (!ativo) return;
        setPlanejamento(pj);

        const todos: ComprovacaoDetalhe[] = [];

        for (const indicador of pj.indicadores) {
          if (!indicador.unidades.some((u) => u.id === unidadeId)) continue;

          const comprovacoes = await fetchComprovacoes(indicador.id);
          for (const c of comprovacoes) {
            if (c.ano !== ano || c.mes !== mes) continue;
            todos.push({
              id: c.id,
              arquivo_nome: c.arquivo_nome,
              created_at: c.created_at,
              status: c.status,
              indicadorId: indicador.id,
              indicadorNome: indicador.nome,
              meta: indicador.meta,
              rotulo_x: indicador.rotulo_x,
              rotulo_y: indicador.rotulo_y,
              orientacao: indicador.orientacao,
            });
          }
        }

        if (!ativo) return;
        setItens(todos);
      })
      .catch(() => {
        if (ativo) setErro(true);
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });

    return () => {
      ativo = false;
    };
  }, [unidadeId, planejamentoId, mes, ano]);

  const itemAtual = itens[indiceAtual] ?? null;

  const carregarPdf = useCallback(async (comprovacaoId: number) => {
    setCarregandoPdf(true);
    try {
      const url = await fetchArquivoComprovacaoUrl(comprovacaoId);
      setPdfUrl(url);
    } catch {
      toast.error("Erro ao carregar o PDF.");
    } finally {
      setCarregandoPdf(false);
    }
  }, []);

  useEffect(() => {
    if (!itemAtual) {
      setPdfUrl(null);
      return;
    }
    carregarPdf(itemAtual.id);
  }, [itemAtual?.id, carregarPdf]);

  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);

  function atualizarStatus(comprovacaoId: number, novoStatus: StatusComprovacao) {
    setItens((prev) =>
      prev.map((item) =>
        item.id === comprovacaoId ? { ...item, status: novoStatus } : item,
      ),
    );
  }

  function irAnterior() {
    if (indiceAtual > 0) {
      setIndiceAtual(indiceAtual - 1);
    }
  }

  function irProximo() {
    if (indiceAtual < itens.length - 1) {
      setIndiceAtual(indiceAtual + 1);
    }
  }

  function abrirReprovacao() {
    setReprovando(true);
    setJustificativa("");
    setPrazoReenvio("");
  }

  async function confirmarReprovacao() {
    if (!itemAtual) return;
    if (!justificativa.trim()) {
      toast.error("Informe a justificativa da reprovação.");
      return;
    }
    setSalvando(true);
    try {
      const atualizada = await decidirComprovacao(itemAtual.id, {
        status: "recusado",
        justificativa: justificativa.trim(),
        prazo_reenvio: prazoReenvio || null,
      });
      atualizarStatus(atualizada.id, atualizada.status);
      toast.success("Comprovação reprovada.");
      irProximo();
    } catch {
      toast.error("Erro ao reprovar a comprovação.");
    } finally {
      setSalvando(false);
      setReprovando(false);
    }
  }

  async function aprovar() {
    if (!itemAtual) return;
    try {
      const atualizada = await decidirComprovacao(itemAtual.id, {
        status: "aprovado",
      });
      atualizarStatus(atualizada.id, atualizada.status);
      toast.success("Comprovação aprovada.");
      irProximo();
    } catch {
      toast.error("Erro ao aprovar a comprovação.");
    }
  }

  const voltarHref = `/validacao/${unidadeId}?mes=${mes}&ano=${ano}`;

  return (
    <>
      <main className="flex flex-1 flex-col bg-cinza-claro">
        {carregando && (
          <div className="flex items-center justify-center gap-3 py-16 text-sm text-muted-foreground">
            <LoaderCircle className="h-5 w-5 animate-spin" />
            Carregando comprovações...
          </div>
        )}

        {!carregando && erro && (
          <div className="m-8 rounded-xl border bg-card p-10 text-center text-sm text-muted-foreground">
            Não foi possível carregar as comprovações.
          </div>
        )}

        {!carregando && !erro && itens.length === 0 && (
          <div className="m-8 rounded-xl border bg-card p-10 text-center text-sm text-muted-foreground">
            Nenhuma comprovação enviada para esta iniciativa em {MESES[mes - 1]}{" "}
            de {ano}.
          </div>
        )}

        {!carregando && !erro && itemAtual && (
          <div className="flex flex-1 flex-col lg:flex-row">
            <div className="flex flex-1 flex-col bg-white">
              <div className="flex flex-1 items-center justify-center p-4">
                {carregandoPdf ? (
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <LoaderCircle className="h-5 w-5 animate-spin" />
                    Carregando PDF...
                  </div>
                ) : pdfUrl ? (
                  <iframe
                    key={pdfUrl}
                    src={pdfUrl}
                    className="h-full w-full rounded-lg border"
                    title={itemAtual.arquivo_nome}
                  />
                ) : (
                  <div className="text-sm text-muted-foreground">
                    Não foi possível carregar o PDF.
                  </div>
                )}
              </div>
            </div>

            <div className="flex w-full flex-col gap-6 overflow-y-auto p-6 lg:w-96">
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  render={<Link href={voltarHref} />}
                  className="cursor-pointer"
                >
                  Sair da revisão
                </Button>
                <span className="text-sm text-muted-foreground">
                  {indiceAtual + 1} / {itens.length}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={irAnterior}
                  disabled={indiceAtual === 0}
                  className="cursor-pointer"
                >
                  <ArrowLeft />
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={irProximo}
                  disabled={indiceAtual >= itens.length - 1}
                  className="cursor-pointer"
                >
                  Próximo
                  <ArrowRight />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (pdfUrl) window.open(pdfUrl, "_blank");
                  }}
                  className="cursor-pointer"
                >
                  <ExternalLink />
                  Nova aba
                </Button>
              </div>

              <div>
                <span
                  className={`inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${CLASSE_STATUS[itemAtual.status]}`}
                >
                  {ROTULO_STATUS[itemAtual.status]}
                </span>
              </div>

              <div className="flex flex-col gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Arquivo
                  </p>
                  <div className="mt-1 flex min-w-0 items-center gap-2">
                    <FileText className="h-4 w-4 shrink-0 text-bege" />
                    <p className="truncate text-sm font-medium">
                      {itemAtual.arquivo_nome}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Meta
                  </p>
                  <p className="mt-1 text-sm">{itemAtual.meta}</p>
                </div>

                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Fórmula de Cálculo
                  </p>
                  <p className="mt-1 text-sm">
                    ({itemAtual.rotulo_x || "X"} / {itemAtual.rotulo_y || "Y"}) x 100
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Orientações para Comprovação
                  </p>
                  <p className="mt-1 text-sm">
                    {itemAtual.orientacao || "—"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Enviado em
                  </p>
                  <p className="mt-1 text-sm">
                    {new Date(itemAtual.created_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              </div>

              {podeAprovar && itemAtual.status === "analise" && (
                <div className="flex flex-col gap-3 border-t pt-6">
                  <Button
                    onClick={aprovar}
                    className="cursor-pointer bg-green-600 text-white hover:bg-green-600/90"
                  >
                    <Check />
                    Aprovar
                  </Button>
                  <Button
                    variant="outline"
                    onClick={abrirReprovacao}
                    className="cursor-pointer text-red-600 hover:bg-red-600/10 hover:text-red-600"
                  >
                    <X />
                    Reprovar
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <Dialog
        open={reprovando}
        onOpenChange={(isOpen) => {
          if (!isOpen) setReprovando(false);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reprovar comprovação</DialogTitle>
            <DialogDescription>
              Informe a justificativa da reprovação para{" "}
              <strong>{itemAtual?.arquivo_nome}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="justificativa">Justificativa</Label>
              <Textarea
                id="justificativa"
                value={justificativa}
                onChange={(event) => setJustificativa(event.target.value)}
                placeholder="Explique o motivo da reprovação"
                className="focus-visible:ring-0 focus-visible:border-input"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="prazo">Prazo para reenvio (opcional)</Label>
              <Input
                id="prazo"
                type="date"
                value={prazoReenvio}
                onChange={(event) => setPrazoReenvio(event.target.value)}
                className="focus-visible:ring-0 focus-visible:border-input"
              />
            </div>
          </div>

          <DialogFooter className="border-t-0 bg-transparent">
            <Button
              type="button"
              variant="outline"
              onClick={() => setReprovando(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={confirmarReprovacao}
              disabled={salvando}
              className="cursor-pointer bg-red-600 text-white hover:bg-red-600/90"
            >
              {salvando ? <LoaderCircle className="animate-spin" /> : <X />}
              Reprovar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
