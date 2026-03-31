import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";

const CarteiraPublica = lazy(() => import("@/pages/CarteiraPublica"));
const VitrinePublica = lazy(() => import("@/pages/VitrinePublica"));

const VITRINE_DOMAINS = ["vitrine.tur.br", "www.vitrine.tur.br"];

const Loading = () => (
  <div className="min-h-screen flex items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

export default function CarteiraOrVitrineResolver() {
  const isVitrineDomain = VITRINE_DOMAINS.includes(window.location.hostname);

  return (
    <Suspense fallback={<Loading />}>
      {isVitrineDomain ? <VitrinePublica /> : <CarteiraPublica />}
    </Suspense>
  );
}
