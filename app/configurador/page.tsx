import { ProtectedLayout } from "@/components/protected-layout";
import { Configuracoes } from "@/components/configuracoes/configuracoes";

export default function Page() {
  return (
    <ProtectedLayout>
      <Configuracoes />
    </ProtectedLayout>
  );
}
