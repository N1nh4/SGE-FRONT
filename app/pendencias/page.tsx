import { ProtectedLayout } from "@/components/protected-layout";
import { Pendencias } from "@/components/pendencias/pendencias";

export default function Page() {
  return (
    <ProtectedLayout>
      <Pendencias />
    </ProtectedLayout>
  );
}
