import { ProtectedLayout } from "@/components/protected-layout";
import { Unidades } from "@/components/unidades/unidades";

export default function Page() {
  return (
    <ProtectedLayout titulo="Unidades">
      <Unidades />
    </ProtectedLayout>
  );
}
