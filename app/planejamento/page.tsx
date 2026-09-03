import { ProtectedLayout } from "@/components/protected-layout";
import { Planejamento } from "@/components/planejamento/planejamento";

export default function Page() {
  return (
    <ProtectedLayout titulo="Planejamento">
      <Planejamento />
    </ProtectedLayout>
  );
}
