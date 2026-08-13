import { Sidebar } from "@/components/sidebar";
import { Planejamento } from "@/components/planejamento/planejamento";

export default function Page() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Planejamento />
      </div>
    </div>
  );
}
