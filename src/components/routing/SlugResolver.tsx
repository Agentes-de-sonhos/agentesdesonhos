import { useParams } from "react-router-dom";
import { lazy, Suspense } from "react";

const CartaoPublico = lazy(() => import("@/pages/CartaoPublico"));
const VitrinePublica = lazy(() => import("@/pages/VitrinePublica"));

const VITRINE_DOMAINS = ["vitrine.tur.br", "www.vitrine.tur.br"];

const Loading = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
  </div>
);

export default function SlugResolver() {
  const hostname = window.location.hostname;
  const isVitrineDomain = VITRINE_DOMAINS.includes(hostname);

  return (
    <Suspense fallback={<Loading />}>
      {isVitrineDomain ? <VitrinePublica /> : <CartaoPublico />}
    </Suspense>
  );
}
