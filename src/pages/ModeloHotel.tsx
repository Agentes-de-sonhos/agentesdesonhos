import { useEffect } from "react";
import { HotelDetailsView } from "@/components/hotel-page/HotelDetailsView";
import { MODEL_HOTEL } from "@/components/hotel-page/modelFixture";

/** Página modelo (noindex) da página de hotel. Nenhuma solicitação é enviada. */
export default function ModeloHotel() {
  useEffect(() => {
    document.title = "Modelo · Página de hotel";
    const m = document.createElement("meta");
    m.name = "robots";
    m.content = "noindex";
    document.head.appendChild(m);
    return () => m.remove();
  }, []);
  return (
    <main className="min-h-screen bg-background px-4 py-8 md:py-12">
      <div className="mx-auto max-w-6xl">
        <HotelDetailsView hotel={MODEL_HOTEL} previewMode />
      </div>
    </main>
  );
}
