"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { selecionarUnidade, fetchMe, type UnidadeLogin, type PaginaComAcoes } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type Usuario = {
  id: number;
  nome: string;
  email: string;
  papel: string;
  status: number;
  paginas: PaginaComAcoes[];
};

type AuthContextValue = {
  usuario: Usuario | null;
  token: string | null;
  unidadeId: number | null;
  unidades: UnidadeLogin[];
  carregando: boolean;
  saiu: boolean;
  login: (email: string, senha: string) => Promise<void>;
  selecionarUnidade: (unidadeId: number) => Promise<void>;
  revalidarPermissoes: () => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [unidadeId, setUnidadeId] = useState<number | null>(null);
  const [unidades, setUnidades] = useState<UnidadeLogin[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [saiu, setSaiu] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const salvo = localStorage.getItem("auth");
    if (salvo) {
      try {
        const parsed = JSON.parse(salvo) as {
          token: string;
          usuario: Usuario;
          unidadeId?: number;
        };
        setToken(parsed.token);
        setUsuario({ ...parsed.usuario, paginas: parsed.usuario.paginas ?? [] });
        if (parsed.unidadeId) setUnidadeId(parsed.unidadeId);
      } catch {
        localStorage.removeItem("auth");
      }
    }
    setCarregando(false);
  }, []);

  const login = useCallback(
    async (email: string, senha: string) => {
      setSaiu(false);
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, senha }),
      });
      if (!res.ok) {
        const erro = await res.json().catch(() => null);
        throw new Error(erro?.detail ?? "E-mail ou senha inválidos");
      }
      const dados = (await res.json()) as {
        token: string;
        usuario: Omit<Usuario, "paginas">;
        unidades: UnidadeLogin[];
        paginas: PaginaComAcoes[];
      };

      setToken(dados.token);
      setUnidades(dados.unidades);

      if (dados.unidades.length === 1) {
        const u = dados.unidades[0];
        const usuarioCompleto: Usuario = {
          ...dados.usuario,
          papel: u.papel,
          paginas: dados.paginas,
        };
        localStorage.setItem(
          "auth",
          JSON.stringify({
            token: dados.token,
            usuario: usuarioCompleto,
            unidadeId: u.id,
          }),
        );
        setUsuario(usuarioCompleto);
        setUnidadeId(u.id);
        router.push("/indicadores");
      } else if (dados.unidades.length === 0) {
        const usuarioCompleto: Usuario = {
          ...dados.usuario,
          paginas: dados.paginas,
        };
        localStorage.setItem(
          "auth",
          JSON.stringify({ token: dados.token, usuario: usuarioCompleto }),
        );
        setUsuario(usuarioCompleto);
        router.push("/indicadores");
      } else {
        const usuarioBase: Usuario = {
          ...dados.usuario,
          paginas: [],
        };
        localStorage.setItem(
          "auth",
          JSON.stringify({ token: dados.token, usuario: usuarioBase }),
        );
        setUsuario(usuarioBase);
      }
    },
    [router],
  );

  const handleSelecionarUnidade = useCallback(
    async (novaUnidadeId: number) => {
      const resultado = await selecionarUnidade(novaUnidadeId);

      const usuarioCompleto: Usuario = {
        id: resultado.usuario.id,
        nome: resultado.usuario.nome,
        email: resultado.usuario.email,
        papel: resultado.papel,
        status: resultado.usuario.status,
        paginas: resultado.paginas,
      };

      localStorage.setItem(
        "auth",
        JSON.stringify({
          token: resultado.token,
          usuario: usuarioCompleto,
          unidadeId: novaUnidadeId,
        }),
      );
      setToken(resultado.token);
      setUsuario(usuarioCompleto);
      setUnidadeId(novaUnidadeId);
      router.push("/indicadores");
    },
    [router],
  );

  const revalidarPermissoes = useCallback(async () => {
    try {
      const me = await fetchMe();
      const novo: Usuario = {
        id: me.usuario.id,
        nome: me.usuario.nome,
        email: me.usuario.email,
        papel: me.papel,
        status: me.usuario.status,
        paginas: me.paginas,
      };
      setUsuario((atual) => {
        if (
          atual &&
          atual.id === novo.id &&
          atual.papel === novo.papel &&
          JSON.stringify(atual.paginas) === JSON.stringify(novo.paginas)
        ) {
          return atual;
        }
        const salvo = localStorage.getItem("auth");
        if (salvo) {
          try {
            const parsed = JSON.parse(salvo);
            parsed.usuario = novo;
            parsed.papel = novo.papel;
            localStorage.setItem("auth", JSON.stringify(parsed));
          } catch {
            // ignora
          }
        }
        return novo;
      });
      setUnidades(me.unidades);
    } catch {
      // Backend offline ou sem autenticação
    }
  }, []);

  useEffect(() => {
    if (!token) return;
    const revalidar = () => {
      revalidarPermissoes().catch(() => {});
    };
    const aoFocar = () => {
      if (document.visibilityState === "visible") revalidar();
    };
    document.addEventListener("visibilitychange", aoFocar);
    window.addEventListener("focus", aoFocar);
    const intervalo = setInterval(revalidar, 20 * 60 * 1000);
    return () => {
      document.removeEventListener("visibilitychange", aoFocar);
      window.removeEventListener("focus", aoFocar);
      clearInterval(intervalo);
    };
  }, [token, revalidarPermissoes]);

  const logout = useCallback(() => {
    setSaiu(true);
    localStorage.removeItem("auth");
    setToken(null);
    setUsuario(null);
    setUnidadeId(null);
    setUnidades([]);
    router.push("/");
  }, [router]);

  const value = useMemo(
    () => ({
      usuario,
      token,
      unidadeId,
      unidades,
      carregando,
      saiu,
      login,
      selecionarUnidade: handleSelecionarUnidade,
      revalidarPermissoes,
      logout,
    }),
    [usuario, token, unidadeId, unidades, carregando, saiu, login, handleSelecionarUnidade, revalidarPermissoes, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth deve ser usado dentro de um AuthProvider");
  }
  return ctx;
}
