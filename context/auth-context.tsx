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

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type Usuario = {
  id: number;
  nome: string;
  email: string;
  papel: string;
  unidade_id: number | null;
  status: number;
};

type AuthContextValue = {
  usuario: Usuario | null;
  token: string | null;
  carregando: boolean;
  login: (email: string, senha: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const salvo = localStorage.getItem("auth");
    if (salvo) {
      try {
        const parsed = JSON.parse(salvo) as {
          token: string;
          usuario: Usuario;
        };
        setToken(parsed.token);
        setUsuario(parsed.usuario);
      } catch {
        localStorage.removeItem("auth");
      }
    }
    setCarregando(false);
  }, []);

  const login = useCallback(
    async (email: string, senha: string) => {
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
        usuario: Usuario;
      };
      localStorage.setItem("auth", JSON.stringify(dados));
      setToken(dados.token);
      setUsuario(dados.usuario);
      router.push("/indicadores");
    },
    [router],
  );

  const logout = useCallback(() => {
    localStorage.removeItem("auth");
    setToken(null);
    setUsuario(null);
    router.push("/");
  }, [router]);

  const value = useMemo(
    () => ({ usuario, token, carregando, login, logout }),
    [usuario, token, carregando, login, logout],
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
