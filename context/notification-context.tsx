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
import { useAuth } from "@/context/auth-context";
import {
  fetchNotificacoesQuantidade,
  marcarNotificacaoLida,
  marcarTodasNotificacoesLidas,
} from "@/lib/api";

type NotificationContextValue = {
  naoLidas: number;
  refresh: () => Promise<void>;
  marcarLida: (id: number) => Promise<void>;
  marcarTodasLidas: () => Promise<void>;
};

const NotificationContext = createContext<NotificationContextValue | null>(
  null,
);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [naoLidas, setNaoLidas] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const total = await fetchNotificacoesQuantidade();
      setNaoLidas(total);
    } catch {
      // Backend offline
    }
  }, []);

  useEffect(() => {
    if (!token) return;
    fetchNotificacoesQuantidade()
      .then(setNaoLidas)
      .catch(() => {});
    const intervalo = setInterval(() => {
      fetchNotificacoesQuantidade()
        .then(setNaoLidas)
        .catch(() => {});
    }, 30000);
    return () => clearInterval(intervalo);
  }, [token]);

  const marcarLida = useCallback(
    async (id: number) => {
      await marcarNotificacaoLida(id);
      await refresh();
    },
    [refresh],
  );

  const marcarTodasLidas = useCallback(async () => {
    await marcarTodasNotificacoesLidas();
    await refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({ naoLidas, refresh, marcarLida, marcarTodasLidas }),
    [naoLidas, refresh, marcarLida, marcarTodasLidas],
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotificacoes() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error("useNotificacoes deve ser usado dentro do NotificationProvider");
  }
  return ctx;
}
