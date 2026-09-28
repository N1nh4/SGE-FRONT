import { ProtectedLayout } from "@/components/protected-layout";
import { Indicadores } from "@/components/indicadores/indicadores";

export default function Page() {
  return (
    <ProtectedLayout titulo="Indicadores">
      <Indicadores />
    </ProtectedLayout>
  );
}