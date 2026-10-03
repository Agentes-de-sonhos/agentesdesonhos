import { useEffect, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { HotelDetailsView } from "@/components/hotel-page/HotelDetailsView";
import { getResortPage } from "@/components/hotel-page/resortsCatalog";

/** Página modelo (noindex) de qualquer resort do catálogo. Nenhuma solicitação é enviada. */
export default function ModeloResort() {
  const { slug = "" } = useParams();
  const hotel = useMemo(() => getResortPage(slug), [slug]);
  useEffect(() => {
    document.title = `Modelo · ${hotel?.name ?? "Resort"}`;
    const m = document.createElement("meta");
    m.name = "robots";
    m.content = "noindex";
    document.head.appendChild(m);
    window.scrollTo(0, 0);
    return () => m.remove();
  }, [hotel]);
  return (
    <main className="min-h-screen bg-public-root px-4 py-8 md:py-12">
      <div className="mx-auto max-w-6xl">
        {hotel ? (
          <HotelDetailsView hotel={hotel} previewMode />
        ) : (
          <p className="py-20 text-center text-muted-foreground">
            Resort não encontrado. <Link to="/modelos/resorts-brasil" className="text-primary underline">Ver todos os resorts</Link>
          </p>
        )}
      </div>
    </main>
  );
}
