import { ProtectedLayout } from "@/components/protected-layout";

export default function Page() {
  return (
    <ProtectedLayout titulo="Indicadores">
      <main className="flex flex-1 items-center justify-center bg-cinza-claro">
        <h1 className="text-2xl font-semibold">Indicadores</h1>
      </main>
    </ProtectedLayout>
  );
}
