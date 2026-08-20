import { ProtectedLayout } from "@/components/protected-layout";
import { Comprovacoes } from "@/components/comprovacoes/comprovacoes";

export default function Page() {
  return (
    <ProtectedLayout>
      <Comprovacoes />
    </ProtectedLayout>
  );
}
