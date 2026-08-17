const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type Objetivo = {
  id: number;
  codigo: string;
  nome: string;
  descricao: string;
  ppa: string;
  loa: string;
};

export type NovoObjetivo = {
  codigo: string;
  nome: string;
  descricao: string;
  ppa: string;
  loa: string;
};

async function handleResponse<T>(res: Response): Promise<T | undefined> {
  if (!res.ok) {
    throw new Error(`Erro na requisição (${res.status})`);
  }
  if (res.status === 204) return undefined;
  return res.json() as Promise<T>;
}

export async function fetchObjetivos(): Promise<Objetivo[]> {
  const res = await fetch(`${API_URL}/api/objetivos`);
  return (await handleResponse<Objetivo[]>(res)) ?? [];
}

export async function createObjetivo(dados: NovoObjetivo): Promise<Objetivo> {
  const res = await fetch(`${API_URL}/api/objetivos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dados),
  });
  const criado = await handleResponse<Objetivo>(res);
  if (!criado) {
    throw new Error("Resposta vazia ao criar objetivo");
  }
  return criado;
}

export async function updateObjetivo(
  id: number,
  dados: NovoObjetivo,
): Promise<Objetivo> {
  const res = await fetch(`${API_URL}/api/objetivos/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dados),
  });
  const atualizado = await handleResponse<Objetivo>(res);
  if (!atualizado) {
    throw new Error("Resposta vazia ao atualizar objetivo");
  }
  return atualizado;
}

export async function deleteObjetivo(id: number): Promise<void> {
  const res = await fetch(`${API_URL}/api/objetivos/${id}`, {
    method: "DELETE",
  });
  await handleResponse(res);
}

export type ObjetivoResumo = {
  id: number;
  codigo: string;
  nome: string;
  descricao: string;
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
  const res = await fetch(`${API_URL}/api/planejamento`);
  return (await handleResponse<Planejamento[]>(res)) ?? [];
}

export async function fetchPlanejamentoById(id: number): Promise<Planejamento> {
  const res = await fetch(`${API_URL}/api/planejamento/${id}`);
  const detalhe = await handleResponse<Planejamento>(res);
  if (!detalhe) {
    throw new Error("Planejamento não encontrado");
  }
  return detalhe;
}

export async function createPlanejamento(
  dados: NovoPlanejamento,
): Promise<Planejamento> {
  const res = await fetch(`${API_URL}/api/planejamento`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dados),
  });
  const criado = await handleResponse<Planejamento>(res);
  if (!criado) {
    throw new Error("Resposta vazia ao criar planejamento");
  }
  return criado;
}

export async function updatePlanejamento(
  id: number,
  dados: NovoPlanejamento,
): Promise<Planejamento> {
  const res = await fetch(`${API_URL}/api/planejamento/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dados),
  });
  const atualizado = await handleResponse<Planejamento>(res);
  if (!atualizado) {
    throw new Error("Resposta vazia ao atualizar planejamento");
  }
  return atualizado;
}

export async function deletePlanejamento(id: number): Promise<void> {
  const res = await fetch(`${API_URL}/api/planejamento/${id}`, {
    method: "DELETE",
  });
  await handleResponse(res);
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
  const res = await fetch(
    `${API_URL}/api/indicadores/${indicadorId}/comprovacoes`,
  );
  return (await handleResponse<Comprovacao[]>(res)) ?? [];
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
  const res = await fetch(
    `${API_URL}/api/indicadores/${indicadorId}/comprovacoes`,
    {
      method: "POST",
      body: dados,
    },
  );
  const criada = await handleResponse<Comprovacao>(res);
  if (!criada) {
    throw new Error("Resposta vazia ao enviar comprovação");
  }
  return criada;
}

export async function deleteComprovacao(id: number): Promise<void> {
  const res = await fetch(`${API_URL}/api/comprovacoes/${id}`, {
    method: "DELETE",
  });
  await handleResponse(res);
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
  const res = await fetch(`${API_URL}/api/comprovacoes/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dados),
  });
  const atualizada = await handleResponse<Comprovacao>(res);
  if (!atualizada) {
    throw new Error("Resposta vazia ao decidir comprovação");
  }
  return atualizada;
}

export function urlArquivoComprovacao(id: number): string {
  return `${API_URL}/api/comprovacoes/${id}/arquivo`;
}

export type Unidade = {
  id: number;
  nome: string;
  created_at: string;
  updated_at: string;
};

export async function fetchUnidades(): Promise<Unidade[]> {
  const res = await fetch(`${API_URL}/api/unidades`);
  return (await handleResponse<Unidade[]>(res)) ?? [];
}

export async function createUnidade(nome: string): Promise<Unidade> {
  const res = await fetch(`${API_URL}/api/unidades`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nome }),
  });
  const criada = await handleResponse<Unidade>(res);
  if (!criada) {
    throw new Error("Resposta vazia ao criar unidade");
  }
  return criada;
}

export async function deleteUnidade(id: number): Promise<void> {
  const res = await fetch(`${API_URL}/api/unidades/${id}`, {
    method: "DELETE",
  });
  await handleResponse(res);
}

export async function updateUnidade(
  id: number,
  nome: string,
): Promise<Unidade> {
  const res = await fetch(`${API_URL}/api/unidades/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nome }),
  });
  const atualizada = await handleResponse<Unidade>(res);
  if (!atualizada) {
    throw new Error("Resposta vazia ao atualizar unidade");
  }
  return atualizada;
}

export async function fetchUnidadeById(id: number): Promise<Unidade> {
  const res = await fetch(`${API_URL}/api/unidades/${id}`);
  const unidade = await handleResponse<Unidade>(res);
  if (!unidade) {
    throw new Error("Unidade não encontrada");
  }
  return unidade;
}

export type Colaborador = {
  id: number;
  nome: string;
  email: string;
  papel: string;
  unidade_id: number | null;
  created_at: string;
  updated_at: string;
};

export type NovoColaborador = {
  nome: string;
  email: string;
  papel?: string;
};

export async function fetchColaboradores(
  unidadeId: number,
): Promise<Colaborador[]> {
  const res = await fetch(
    `${API_URL}/api/unidades/${unidadeId}/colaboradores`,
  );
  return (await handleResponse<Colaborador[]>(res)) ?? [];
}

export async function createColaborador(
  unidadeId: number,
  dados: NovoColaborador,
): Promise<Colaborador> {
  const res = await fetch(`${API_URL}/api/usuarios`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...dados, unidade_id: unidadeId }),
  });
  const criado = await handleResponse<Colaborador>(res);
  if (!criado) {
    throw new Error("Resposta vazia ao criar colaborador");
  }
  return criado;
}
