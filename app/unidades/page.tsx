import { Sidebar } from "@/components/sidebar";
import { Unidades } from "@/components/unidades/unidades";

export default function Page() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Unidades />
      </div>
    </div>
  );
}
