import { Notificacao } from "@/components/notificacoes/notificacoes";
import { ProtectedLayout } from "@/components/protected-layout";

export default function Page() {
  return (
    <ProtectedLayout>
      <Notificacao />
    </ProtectedLayout>
  );
}
