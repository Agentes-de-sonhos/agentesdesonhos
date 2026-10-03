import { useEffect } from "react";
import { HotelDetailsView } from "@/components/hotel-page/HotelDetailsView";
import { NANNAI_MURO_ALTO } from "@/components/hotel-page/nannaiFixture";

/** Piloto (noindex) com dados reais do Nannai Muro Alto. Nenhuma solicitação é enviada. */
export default function ModeloNannai() {
  useEffect(() => {
    document.title = "Modelo · Nannai Muro Alto";
    const m = document.createElement("meta");
    m.name = "robots";
    m.content = "noindex";
    document.head.appendChild(m);
    return () => m.remove();
  }, []);
  return (
    <main className="min-h-screen bg-public-root px-4 py-8 md:py-12">
      <div className="mx-auto max-w-6xl">
        <HotelDetailsView hotel={NANNAI_MURO_ALTO} previewMode />
      </div>
    </main>
  );
}
