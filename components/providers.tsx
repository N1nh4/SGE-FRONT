"use client";

import { AuthProvider } from "@/context/auth-context";
import { NotificationProvider } from "@/context/notification-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <NotificationProvider>{children}</NotificationProvider>
    </AuthProvider>
  );
}
