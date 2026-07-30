import { lazy, Suspense } from "react";
import { useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { usePublicProductLanding } from "@/hooks/usePublicProductLanding";
import { productForHostname, COMANDATUBA_PRODUCT_KEY } from "@/config/landingProducts";

const ComandatubaLandingPage = lazy(() => import("@/pages/ComandatubaLandingPage"));

/**
 * Public entry point for white-label product landing pages.
 * The hostname identifies the product (comandatuba.* -> Transamerica
 * Comandatuba) and the first path segment identifies the agency.
 */
export default function ProductLandingResolver() {
  const params = useParams<{ agencySlug?: string; slug?: string }>();
  const agencySlug = params.agencySlug ?? params.slug;
  const product = productForHostname(window.location.hostname);
  const productKey = product?.productKey ?? COMANDATUBA_PRODUCT_KEY;
  const { data, loading, error } = usePublicProductLanding(productKey, agencySlug);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-6">
        <div className="max-w-md space-y-2 text-center">
          <h1 className="text-xl font-semibold text-slate-900">Página indisponível</h1>
          <p className="text-sm text-slate-500">
            Este link não está ativo. Verifique o endereço com quem compartilhou a página.
          </p>
        </div>
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-white">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      }
    >
      <ComandatubaLandingPage agency={data.agency} context={data.context} />
    </Suspense>
  );
}