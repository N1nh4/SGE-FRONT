const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function obterTokenAuth(): string | null {
  if (typeof window === "undefined") return null;
  const salvo = localStorage.getItem("auth");
  if (!salvo) return null;
  try {
    const parsed = JSON.parse(salvo) as { token?: string };
    return parsed.token ?? null;
  } catch {
    return null;
  }
}

function authHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const salvo = localStorage.getItem("auth");
  if (!salvo) return {};
  try {
    const parsed = JSON.parse(salvo) as {
      token: string;
      unidadeId?: number;
    };
    const headers: Record<string, string> = {};
    if (parsed.token) headers.Authorization = `Bearer ${parsed.token}`;
    if (parsed.unidadeId) headers["X-Unidade-Id"] = String(parsed.unidadeId);
    return headers;
  } catch {
    return {};
  }
}

async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T | undefined> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      ...authHeaders(),
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.detail ?? `Erro na requisição (${res.status})`);
  }
  if (res.status === 204) return undefined;
  return res.json() as Promise<T>;
}

export type Objetivo = {
  id: number;
  codigo: string;
  nome: string;
  ppa: string;
  loa: string;
};

export type NovoObjetivo = {
  codigo: string;
  nome: string;
  ppa: string;
  loa: string;
};

export async function fetchObjetivos(): Promise<Objetivo[]> {
  return (await apiFetch<Objetivo[]>("/api/objetivos")) ?? [];
}

export async function createObjetivo(dados: NovoObjetivo): Promise<Objetivo> {
  const criado = await apiFetch<Objetivo>("/api/objetivos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dados),
  });
  if (!criado) throw new Error("Resposta vazia ao criar objetivo");
  return criado;
}

export async function updateObjetivo(
  id: number,
  dados: NovoObjetivo,
): Promise<Objetivo> {
  const atualizado = await apiFetch<Objetivo>(`/api/objetivos/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dados),
  });
  if (!atualizado) throw new Error("Resposta vazia ao atualizar objetivo");
  return atualizado;
}

export async function deleteObjetivo(id: number): Promise<void> {
  await apiFetch(`/api/objetivos/${id}`, { method: "DELETE" });
}

export type ObjetivoResumo = {
  id: number;
  codigo: string;
  nome: string;
  ppa: string;
  loa: string;
};

export type UnidadeResumo = {
  id: number;
  nome: string;
};

export type Etapa = {
  id: number;
  nome: string;
};

export type IndicadorPlanejamento = {
  id: number;
  nome: string;
  meta: string;
  rotulo_x: string;
  rotulo_y: string;
  orientacao: string;
  prazo: string | null;
  unidades: UnidadeResumo[];
  etapas: Etapa[];
  progresso: number;
  created_at: string;
  updated_at: string;
};

export type Planejamento = {
  id: number;
  nome: string;
  progresso: number;
  objetivo: ObjetivoResumo;
  indicadores: IndicadorPlanejamento[];
  created_at: string;
  updated_at: string;
};

export type NovoIndicador = {
  nome: string;
  meta: string;
  rotulo_x: string;
  rotulo_y: string;
  orientacao: string;
  prazo: string | null;
  unidade_ids: number[];
  etapas: string[];
};

export type NovoPlanejamento = {
  objetivo_id: number;
  nome: string;
  indicadores: NovoIndicador[];
};

export async function fetchPlanejamento(): Promise<Planejamento[]> {
  return (await apiFetch<Planejamento[]>("/api/planejamento")) ?? [];
}

export async function fetchPlanejamentoById(id: number): Promise<Planejamento> {
  const detalhe = await apiFetch<Planejamento>(`/api/planejamento/${id}`);
  if (!detalhe) throw new Error("Planejamento não encontrado");
  return detalhe;
}

export async function createPlanejamento(
  dados: NovoPlanejamento,
): Promise<Planejamento> {
  const criado = await apiFetch<Planejamento>("/api/planejamento", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dados),
  });
  if (!criado) throw new Error("Resposta vazia ao criar planejamento");
  return criado;
}

export async function updatePlanejamento(
  id: number,
  dados: NovoPlanejamento,
): Promise<Planejamento> {
  const atualizado = await apiFetch<Planejamento>(`/api/planejamento/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dados),
  });
  if (!atualizado) throw new Error("Resposta vazia ao atualizar planejamento");
  return atualizado;
}

export async function deletePlanejamento(id: number): Promise<void> {
  await apiFetch(`/api/planejamento/${id}`, { method: "DELETE" });
}

export type StatusComprovacao = "analise" | "aprovado" | "recusado";

export type Comprovacao = {
  id: number;
  indicador_id: number;
  etapa_id: number | null;
  ano: number;
  mes: number;
  arquivo_nome: string;
  status: StatusComprovacao;
  justificativa: string | null;
  prazo_reenvio: string | null;
  created_at: string;
  updated_at: string;
};

export async function fetchComprovacoes(
  indicadorId: number,
): Promise<Comprovacao[]> {
  return (
    (await apiFetch<Comprovacao[]>(
      `/api/indicadores/${indicadorId}/comprovacoes`,
    )) ?? []
  );
}

export async function uploadComprovacao(
  indicadorId: number,
  etapaId: number | null,
  arquivo: File,
): Promise<Comprovacao> {
  const dados = new FormData();
  if (etapaId != null) dados.append("etapa_id", String(etapaId));
  dados.append("ano", String(new Date().getFullYear()));
  dados.append("mes", String(new Date().getMonth() + 1));
  dados.append("arquivo", arquivo);
  const criada = await apiFetch<Comprovacao>(
    `/api/indicadores/${indicadorId}/comprovacoes`,
    { method: "POST", body: dados },
  );
  if (!criada) throw new Error("Resposta vazia ao enviar comprovação");
  return criada;
}

export async function deleteComprovacao(id: number): Promise<void> {
  await apiFetch(`/api/comprovacoes/${id}`, { method: "DELETE" });
}

export type DecisaoComprovacao = {
  status: StatusComprovacao;
  justificativa?: string | null;
  prazo_reenvio?: string | null;
};

export async function decidirComprovacao(
  id: number,
  dados: DecisaoComprovacao,
): Promise<Comprovacao> {
  const atualizada = await apiFetch<Comprovacao>(`/api/comprovacoes/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dados),
  });
  if (!atualizada) throw new Error("Resposta vazia ao decidir comprovação");
  return atualizada;
}

export function urlArquivoComprovacao(id: number): string {
  return `${API_URL}/api/comprovacoes/${id}/arquivo`;
}

export async function abrirArquivoComprovacao(id: number): Promise<void> {
  const res = await fetch(urlArquivoComprovacao(id), {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Erro ao buscar arquivo");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
}

export async function fetchArquivoComprovacaoUrl(id: number): Promise<string> {
  const res = await fetch(urlArquivoComprovacao(id), {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Erro ao buscar arquivo");
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

export type Unidade = {
  id: number;
  nome: string;
  created_at: string;
  updated_at: string;
};

export async function fetchUnidades(): Promise<Unidade[]> {
  return (await apiFetch<Unidade[]>("/api/unidades")) ?? [];
}

export async function createUnidade(nome: string): Promise<Unidade> {
  const criada = await apiFetch<Unidade>("/api/unidades", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nome }),
  });
  if (!criada) throw new Error("Resposta vazia ao criar unidade");
  return criada;
}

export async function deleteUnidade(id: number): Promise<void> {
  await apiFetch(`/api/unidades/${id}`, { method: "DELETE" });
}

export async function updateUnidade(
  id: number,
  nome: string,
): Promise<Unidade> {
  const atualizada = await apiFetch<Unidade>(`/api/unidades/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nome }),
  });
  if (!atualizada) throw new Error("Resposta vazia ao atualizar unidade");
  return atualizada;
}

export async function fetchUnidadeById(id: number): Promise<Unidade> {
  const unidade = await apiFetch<Unidade>(`/api/unidades/${id}`);
  if (!unidade) throw new Error("Unidade não encontrada");
  return unidade;
}

export type Colaborador = {
  id: number;
  nome: string;
  email: string;
  papel: string;
  status: number;
  created_at: string;
  updated_at: string;
};

export async function fetchUsuarios(): Promise<Colaborador[]> {
  return (await apiFetch<Colaborador[]>("/api/usuarios")) ?? [];
}

export type NovoColaborador = {
  nome: string;
  email: string;
  senha: string;
  papel?: string;
  status?: number;
};

export async function fetchColaboradores(
  unidadeId: number,
): Promise<Colaborador[]> {
  return (
    (await apiFetch<Colaborador[]>(
      `/api/unidades/${unidadeId}/colaboradores`,
    )) ?? []
  );
}

export async function createColaborador(
  unidadeId: number,
  dados: NovoColaborador,
): Promise<Colaborador> {
  const criado = await apiFetch<Colaborador>("/api/usuarios", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...dados, unidade_id: unidadeId }),
  });
  if (!criado) throw new Error("Resposta vazia ao criar colaborador");
  return criado;
}

export async function updateUsuarioStatus(
  usuarioId: number,
  status: number,
): Promise<Colaborador> {
  const atualizado = await apiFetch<Colaborador>(`/api/usuarios/${usuarioId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!atualizado) throw new Error("Resposta vazia ao atualizar status");
  return atualizado;
}

export async function updateColaborador(
  usuarioId: number,
  dados: { nome?: string; email?: string; senha?: string; papel?: string; status?: number },
): Promise<Colaborador> {
  const atualizado = await apiFetch<Colaborador>(`/api/usuarios/${usuarioId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dados),
  });
  if (!atualizado) throw new Error("Resposta vazia ao atualizar colaborador");
  return atualizado;
}

export type UnidadeLogin = {
  id: number;
  nome: string;
  papel: string;
};

export async function selecionarUnidade(
  unidadeId: number,
): Promise<{ token: string; usuario: { id: number; nome: string; email: string; papel: string; status: number }; unidade_id: number; papel: string; paginas: PaginaComAcoes[] }> {
  const salvo = localStorage.getItem("auth");
  if (!salvo) throw new Error("Não autenticado");
  const { token } = JSON.parse(salvo) as { token: string };

  const resultado = await apiFetch<{
    token: string;
    usuario: { id: number; nome: string; email: string; papel: string; status: number };
    unidade_id: number;
    papel: string;
    paginas: PaginaComAcoes[];
  }>("/api/auth/selecionar-unidade", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ unidade_id: unidadeId }),
  });
  if (!resultado) throw new Error("Erro ao selecionar unidade");
  return resultado;
}

export type MeResponse = {
  usuario: {
    id: number;
    nome: string;
    email: string;
    papel: string;
    status: number;
  };
  unidades: UnidadeLogin[];
  unidade_id: number | null;
  papel: string;
  paginas: PaginaComAcoes[];
};

export async function fetchMe(): Promise<MeResponse> {
  const resultado = await apiFetch<MeResponse>("/api/auth/me");
  if (!resultado) throw new Error("Erro ao buscar perfil");
  return resultado;
}

export type Pagina = {
  id: number;
  chave: string;
  nome: string;
};

export type PaginaComAcoes = {
  chave: string;
  acoes: string[];
};

export type Perfil = {
  id: number;
  chave: string;
  nome: string;
  paginas: PaginaComAcoes[];
};

export async function fetchPaginas(): Promise<Pagina[]> {
  return (await apiFetch<Pagina[]>("/api/paginas")) ?? [];
}

export type AcaoDisponivel = {
  chave: string;
  nome: string;
};

export type PaginaCatalogo = {
  chave: string;
  nome: string;
  acoes: AcaoDisponivel[];
};

export async function fetchCatalogoAcoes(): Promise<PaginaCatalogo[]> {
  return (await apiFetch<PaginaCatalogo[]>("/api/paginas/catalogo")) ?? [];
}

export async function fetchPerfis(): Promise<Perfil[]> {
  return (await apiFetch<Perfil[]>("/api/paginas/perfis")) ?? [];
}

export async function createPerfil(nome: string): Promise<Perfil> {
  return (await apiFetch<Perfil>("/api/paginas/perfis", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nome }),
  }))!;
}

export async function updatePerfil(
  perfilId: number,
  nome: string,
): Promise<Perfil> {
  return (await apiFetch<Perfil>(`/api/paginas/perfis/${perfilId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nome }),
  }))!;
}

export async function deletePerfil(perfilId: number): Promise<void> {
  await apiFetch(`/api/paginas/perfis/${perfilId}`, { method: "DELETE" });
}

export async function updatePerfilPaginas(
  perfilId: number,
  paginas: { pagina_id: number; acoes: string[] }[],
): Promise<void> {
  await apiFetch(`/api/paginas/perfis/${perfilId}/paginas`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ paginas }),
  });
}

export type Notificacao = {
  id: number;
  usuario_id: number;
  tipo: string;
  titulo: string;
  mensagem: string;
  lida: boolean;
  created_at: string;
};

export async function fetchNotificacoes(): Promise<Notificacao[]> {
  return (await apiFetch<Notificacao[]>("/api/notificacoes")) ?? [];
}

export async function fetchNotificacoesQuantidade(): Promise<number> {
  const r = await apiFetch<{ quantidade: number }>(
    "/api/notificacoes/quantidade",
  );
  return r?.quantidade ?? 0;
}

export function assinarNotificacoes(
  onAtualizar: () => void,
): () => void {
  const token = obterTokenAuth();
  if (!token) return () => {};

  const url = `${API_URL}/api/notificacoes/stream?token=${encodeURIComponent(token)}`;
  const source = new EventSource(url);
  source.addEventListener("atualizar", onAtualizar);
  return () => source.close();
}

export async function marcarNotificacaoLida(id: number): Promise<Notificacao> {
  const atualizada = await apiFetch<Notificacao>(
    `/api/notificacoes/${id}/ler`,
    { method: "POST" },
  );
  if (!atualizada) throw new Error("Resposta vazia ao marcar como lida");
  return atualizada;
}

export async function marcarTodasNotificacoesLidas(): Promise<void> {
  await apiFetch("/api/notificacoes/ler-todas", { method: "POST" });
}

// ---------------------------------------------------------------------------
// Propostas de Planejamento
// ---------------------------------------------------------------------------

export type PropostaEtapa = {
  id: number | null;
  nome: string;
};

export type PropostaIndicador = {
  id: number | null;
  nome: string | null;
  meta: string | null;
  rotulo_x: string | null;
  rotulo_y: string | null;
  orientacao: string | null;
  prazo: string | null;
  unidades: UnidadeResumo[];
  etapas: PropostaEtapa[];
};

export type Proposta = {
  id: number;
  nome: string | null;
  enviado: boolean;
  criado_por: number | null;
  criador: { id: number; nome: string } | null;
  criado_at: string;
  atualizado_at: string;
  objetivo: ObjetivoResumo | null;
  indicadores: PropostaIndicador[];
};

export type NovoPropostaIndicador = {
  id?: number | null;
  nome?: string | null;
  meta?: string | null;
  rotulo_x?: string | null;
  rotulo_y?: string | null;
  orientacao?: string | null;
  prazo?: string | null;
  unidade_ids: number[];
  etapas: { nome: string }[];
};

export type NovaProposta = {
  nome?: string | null;
  objetivo_id?: number | null;
  indicadores: NovoPropostaIndicador[];
};

export async function fetchMinhasPropostas(): Promise<Proposta[]> {
  return (await apiFetch<Proposta[]>("/api/propostas/mine")) ?? [];
}

export async function fetchPropostasPendentes(): Promise<Proposta[]> {
  return (await apiFetch<Proposta[]>("/api/propostas/pending")) ?? [];
}

export async function fetchPropostaById(id: number): Promise<Proposta> {
  const detalhe = await apiFetch<Proposta>(`/api/propostas/${id}`);
  if (!detalhe) throw new Error("Proposta não encontrada");
  return detalhe;
}

export async function criarProposta(
  dados: NovaProposta,
): Promise<Proposta> {
  const criada = await apiFetch<Proposta>("/api/propostas", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dados),
  });
  if (!criada) throw new Error("Resposta vazia ao criar proposta");
  return criada;
}

export async function atualizarProposta(
  id: number,
  dados: NovaProposta,
): Promise<Proposta> {
  const atualizada = await apiFetch<Proposta>(`/api/propostas/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dados),
  });
  if (!atualizada) throw new Error("Resposta vazia ao atualizar proposta");
  return atualizada;
}

export async function enviarProposta(id: number): Promise<Proposta> {
  const enviada = await apiFetch<Proposta>(`/api/propostas/${id}/enviar`, {
    method: "POST",
  });
  if (!enviada) throw new Error("Resposta vazia ao enviar proposta");
  return enviada;
}

export async function converterProposta(id: number): Promise<Planejamento> {
  const convertido = await apiFetch<Planejamento>(
    `/api/propostas/${id}/converter`,
    { method: "POST" },
  );
  if (!convertido) throw new Error("Resposta vazia ao converter proposta");
  return convertido;
}
