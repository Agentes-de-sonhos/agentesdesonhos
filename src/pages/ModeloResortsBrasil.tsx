import { useEffect } from "react";
import { BrazilResortsMap } from "@/components/resorts-brasil/BrazilResortsMap";

/** Modelo de demonstração (sem ações comerciais), antes de ativar em sites de agências. */
export default function ModeloResortsBrasil() {
  useEffect(() => {
    document.title = "Modelo · Mapa de Resorts do Brasil";
    const m = document.createElement("meta");
    m.name = "robots";
    m.content = "noindex";
    document.head.appendChild(m);
    return () => m.remove();
  }, []);
  return (
    <main className="min-h-screen bg-background px-4 py-12 md:py-20">
      <div className="mx-auto max-w-7xl">
        <BrazilResortsMap />
      </div>
    </main>
  );
}
