"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  LoaderCircle,
  Save,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import {
  type Pagina,
  type Perfil,
  fetchPaginas,
  fetchPerfis,
  createPerfil,
  updatePerfil,
  deletePerfil,
  updatePerfilPaginas,
} from "@/lib/api";

const ALL_ACTIONS = ["ver", "criar", "editar", "excluir"];
const ACTION_LABELS: Record<string, string> = {
  ver: "Ver",
  criar: "Criar",
  editar: "Editar",
  excluir: "Excluir",
};

type PerfilPermissoes = Record<string, string[]>;

export function Configuracoes() {
  const { usuario } = useAuth();
  const [paginas, setPaginas] = useState<Pagina[]>([]);
  const [perfis, setPerfis] = useState<Perfil[]>([]);
  const [perfilPermissoes, setPerfilPermissoes] = useState<
    Record<string, PerfilPermissoes>
  >({});
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const [novoNome, setNovoNome] = useState("");
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [editandoNome, setEditandoNome] = useState("");
  const [excluindoId, setExcluindoId] = useState<number | null>(null);

  const isMaster =
    usuario?.paginas?.some((p) => p.chave === "/configurador") ?? false;

  const carregarDados = useCallback(async () => {
    try {
      const [p, perf] = await Promise.all([fetchPaginas(), fetchPerfis()]);
      setPaginas(p);
      setPerfis(perf);

      const permMap: Record<number, PerfilPermissoes> = {};
      for (const perfil of perf) {
        const pgMap: PerfilPermissoes = {};
        for (const pg of perfil.paginas) {
          pgMap[pg.chave] = pg.acoes;
        }
        permMap[perfil.id] = pgMap;
      }
      setPerfilPermissoes(permMap);
    } catch {
      toast.error("Erro ao carregar configurações");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  const togglePerfilPagina = (perfilId: number, paginaChave: string) => {
    setPerfilPermissoes((prev) => {
      const current = prev[perfilId] ?? {};
      const updated = { ...current };
      if (updated[paginaChave]) {
        delete updated[paginaChave];
      } else {
        updated[paginaChave] = ["ver"];
      }
      return { ...prev, [perfilId]: updated };
    });
  };

  const toggleAcao = (perfilId: number, paginaChave: string, acao: string) => {
    setPerfilPermissoes((prev) => {
      const current = prev[perfilId] ?? {};
      const acoesAtuais = current[paginaChave] ?? [];
      let novasAcoes: string[];
      if (acoesAtuais.includes(acao)) {
        novasAcoes = acoesAtuais.filter((a) => a !== acao);
      } else {
        novasAcoes = [...acoesAtuais, acao];
      }
      return {
        ...prev,
        [perfilId]: {
          ...current,
          [paginaChave]: novasAcoes,
        },
      };
    });
  };

  const handleCriarPerfil = async () => {
    if (!novoNome.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }
    try {
      const perfil = await createPerfil(novoNome.trim());
      setPerfis((prev) => [...prev, perfil]);
      setPerfilPermissoes((prev) => ({ ...prev, [perfil.id]: {} }));
      setNovoNome("");
      toast.success("Perfil criado com sucesso!");
    } catch {
      toast.error("Erro ao criar perfil");
    }
  };

  const handleEditarPerfil = async (perfilId: number) => {
    if (!editandoNome.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }
    try {
      await updatePerfil(perfilId, editandoNome.trim());
      setPerfis((prev) =>
        prev.map((p) =>
          p.id === perfilId ? { ...p, nome: editandoNome.trim() } : p,
        ),
      );
      setEditandoId(null);
      setEditandoNome("");
      toast.success("Perfil atualizado!");
    } catch {
      toast.error("Erro ao atualizar perfil");
    }
  };

  const handleExcluirPerfil = async (perfilId: number) => {
    try {
      await deletePerfil(perfilId);
      setPerfis((prev) => prev.filter((p) => p.id !== perfilId));
      setPerfilPermissoes((prev) => {
        const next = { ...prev };
        delete next[perfilId];
        return next;
      });
      setExcluindoId(null);
      toast.success("Perfil excluído!");
    } catch {
      toast.error("Erro ao excluir perfil");
    }
  };

  const salvarPerfis = async () => {
    setSalvando(true);
    try {
      for (const [perfilId, permMap] of Object.entries(perfilPermissoes)) {
        const itens = Object.entries(permMap)
          .filter(([_, acoes]) => acoes.length > 0)
          .map(([chave, acoes]) => {
            const pg = paginas.find((p) => p.chave === chave);
            return pg ? { pagina_id: pg.id, acoes } : null;
          })
          .filter(Boolean) as { pagina_id: number; acoes: string[] }[];

        await updatePerfilPaginas(Number(perfilId), itens);
      }
      toast.success("Perfis atualizados com sucesso!");
    } catch {
      toast.error("Erro ao salvar perfis");
    } finally {
      setSalvando(false);
    }
  };

  if (carregando) {
    return (
      <div className="flex flex-1 items-center justify-center bg-cinza-claro">
        <LoaderCircle className="animate-spin size-6 text-muted-foreground" />
      </div>
    );
  }

  if (!isMaster) {
    return (
      <div className="flex flex-1 items-center justify-center bg-cinza-claro">
        <p className="text-muted-foreground">
          Apenas administradores podem acessar esta página.
        </p>
      </div>
    );
  }

  return (
    <main className="flex flex-1 flex-col bg-cinza-claro p-6">
      <h1 className="mb-6 text-2xl font-semibold">Configurações de Acesso</h1>

      <div className="space-y-6">
        <section className="rounded-lg border bg-white p-4">
          <h2 className="mb-3 text-lg font-medium">Criar Novo Perfil</h2>
          <div className="flex items-end gap-3">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">
                Nome do perfil
              </label>
              <input
                value={novoNome}
                onChange={(e) => setNovoNome(e.target.value)}
                placeholder="ex: Gestor de Obras"
                className="rounded border px-3 py-1.5 text-sm"
              />
            </div>
            <button
              onClick={handleCriarPerfil}
              className="flex items-center gap-1 rounded bg-azul-escuro px-3 py-1.5 text-sm font-medium text-white hover:bg-azul-escuro/90"
            >
              <Plus className="size-4" />
              Criar
            </button>
          </div>
        </section>

        {perfis.map((perfil) => (
          <section key={perfil.id} className="rounded-lg border bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              {editandoId === perfil.id ? (
                <div className="flex items-center gap-2">
                  <input
                    value={editandoNome}
                    onChange={(e) => setEditandoNome(e.target.value)}
                    className="rounded border px-2 py-1 text-sm"
                  />
                  <button
                    onClick={() => handleEditarPerfil(perfil.id)}
                    className="text-green-600 hover:text-green-700"
                  >
                    <Check className="size-4" />
                  </button>
                  <button
                    onClick={() => {
                      setEditandoId(null);
                      setEditandoNome("");
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ) : (
                <h2 className="text-lg font-medium">{perfil.nome}</h2>
              )}

              <div className="flex items-center gap-2">
                {editandoId !== perfil.id && (
                  <button
                    onClick={() => {
                      setEditandoId(perfil.id);
                      setEditandoNome(perfil.nome);
                    }}
                    className="text-gray-400 hover:text-azul-escuro"
                  >
                    <Pencil className="size-4" />
                  </button>
                )}
                {excluindoId === perfil.id ? (
                  <div className="flex items-center gap-1 text-sm">
                    <span className="text-red-500">Excluir?</span>
                    <button
                      onClick={() => handleExcluirPerfil(perfil.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Check className="size-4" />
                    </button>
                    <button
                      onClick={() => setExcluindoId(null)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setExcluindoId(perfil.id)}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="size-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-3">
              {paginas.map((pagina) => {
                const temPagina =
                  (perfilPermissoes[perfil.id]?.[pagina.chave]?.length ?? 0) >
                  0;
                const acoesAtuais =
                  perfilPermissoes[perfil.id]?.[pagina.chave] ?? [];
                return (
                  <div
                    key={pagina.id}
                    className="flex items-center gap-3 rounded border p-2"
                  >
                    <label className="flex items-center gap-2 text-sm font-medium">
                      <input
                        type="checkbox"
                        checked={temPagina}
                        onChange={() =>
                          togglePerfilPagina(perfil.id, pagina.chave)
                        }
                        className="size-4 rounded border-gray-300"
                      />
                      {pagina.nome}
                    </label>
                    {temPagina && (
                      <div className="flex items-center gap-3 ml-6">
                        {ALL_ACTIONS.map((acao) => (
                          <label
                            key={acao}
                            className="flex items-center gap-1 text-xs text-muted-foreground"
                          >
                            <input
                              type="checkbox"
                              checked={acoesAtuais.includes(acao)}
                              onChange={() =>
                                toggleAcao(perfil.id, pagina.chave, acao)
                              }
                              className="size-3 rounded border-gray-300"
                            />
                            {ACTION_LABELS[acao]}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))}

        <button
          onClick={salvarPerfis}
          disabled={salvando}
          className="flex items-center gap-2 rounded-lg bg-azul-escuro px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-azul-escuro/90 disabled:opacity-50"
        >
          <Save className="size-4" />
          {salvando ? "Salvando..." : "Salvar Alterações"}
        </button>
      </div>
    </main>
  );
}
