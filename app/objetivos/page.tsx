import { Sidebar } from "@/components/sidebar";
import { Objetivos } from "@/components/objetivos/objetivos";

export default function Page() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Objetivos />
      </div>
    </div>
  );
}
