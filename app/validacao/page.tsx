import { ProtectedLayout } from "@/components/protected-layout";
import { Validacao } from "@/components/validacao/validacao";

export default function Page() {
  return (
    <ProtectedLayout>
      <Validacao />
    </ProtectedLayout>
  );
}
