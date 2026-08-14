import { Sidebar } from "@/components/sidebar";
import { Validacao } from "@/components/validacao/validacao";

export default function Page() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Validacao />
      </div>
    </div>
  );
}
