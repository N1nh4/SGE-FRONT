import { ProtectedLayout } from "@/components/protected-layout";
import { Objetivos } from "@/components/objetivos/objetivos";

export default function Page() {
  return (
    <ProtectedLayout titulo="Objetivos Estratégicos">
      <Objetivos />
    </ProtectedLayout>
  );
}
