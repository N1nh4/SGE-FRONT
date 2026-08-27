"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNotificacoes } from "@/context/notification-context";

export function HeaderBell() {
  const { naoLidas } = useNotificacoes();

  return (
    <Link
      href="/notificacoes"
      aria-label="Ver notificações"
      className="relative cursor-pointer"
    >
      <Button variant="outline" size="icon" className="relative">
        <Bell className="h-5 w-5" />
        {naoLidas > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-none text-white">
            {naoLidas > 99 ? "99+" : naoLidas}
          </span>
        )}
      </Button>
    </Link>
  );
}
