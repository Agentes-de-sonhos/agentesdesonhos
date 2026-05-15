import { useParams } from "react-router-dom";
import { lazy, Suspense, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const CartaoPublico = lazy(() => import("@/pages/CartaoPublico"));
const VitrinePublica = lazy(() => import("@/pages/VitrinePublica"));
const SupplierPublic = lazy(() => import("@/pages/SupplierPublic"));

const VITRINE_DOMAINS = ["vitrine.tur.br", "www.vitrine.tur.br"];

const Loading = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
  </div>
);

export default function SlugResolver() {
  const { slug } = useParams<{ slug: string }>();
  const hostname = window.location.hostname;
  const isVitrineDomain = VITRINE_DOMAINS.includes(hostname);

  const [supplierData, setSupplierData] = useState<any>(null);
  const [supplierExists, setSupplierExists] = useState(false);
  const [checked, setChecked] = useState(false);

  // Try to resolve as a published supplier first.
  useEffect(() => {
    let cancelled = false;
    if (!slug) {
      setChecked(true);
      return;
    }
    (async () => {
      try {
        const [{ data }, { data: exists }] = await Promise.all([
          supabase.rpc("get_published_supplier_by_slug" as any, { p_slug: slug }),
          supabase.rpc("supplier_slug_exists" as any, { p_slug: slug }),
        ]);
        if (cancelled) return;
        setSupplierData(data ?? null);
        setSupplierExists(!!exists);
      } catch {
        if (!cancelled) {
          setSupplierData(null);
          setSupplierExists(false);
        }
      } finally {
        if (!cancelled) setChecked(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (!checked) return <Loading />;

  // 1) Published supplier wins on any domain (including vitrine.tur.br).
  if (supplierData && slug) {
    return (
      <Suspense fallback={<Loading />}>
        <SupplierPublic slug={slug} preloaded={supplierData} />
      </Suspense>
    );
  }

  // Slug belongs to a supplier, but it's deactivated/unpublished.
  if (supplierExists) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md space-y-3">
          <h2 className="text-xl font-semibold text-foreground">Perfil indisponível</h2>
          <p className="text-sm text-muted-foreground">
            Este perfil de parceiro está temporariamente desativado e não pode ser visualizado no momento.
          </p>
        </div>
      </div>
    );
  }

  // 2) Fallback to legacy slug behavior (agent vitrine or business card).
  return (
    <Suspense fallback={<Loading />}>
      {isVitrineDomain ? <VitrinePublica /> : <CartaoPublico />}
    </Suspense>
  );
}
