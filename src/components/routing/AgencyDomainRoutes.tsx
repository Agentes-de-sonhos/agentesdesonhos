import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import type { AgencyDomainInfo } from "@/lib/agencyDomains";
import { AgencySiteLayout } from "@/components/whitelabel/AgencySiteLayout";

const AgencySiteHome = lazy(() => import("@/pages/whitelabel/AgencySiteHome"));
const AgencyClientArea = lazy(() => import("@/pages/whitelabel/AgencyClientArea"));
const VitrinePublica = lazy(() => import("@/pages/VitrinePublica"));
const OrcamentoPublicoV2 = lazy(() => import("@/pages/OrcamentoPublicoV2"));
const RoteiroPublicoV2 = lazy(() => import("@/pages/RoteiroPublicoV2"));
const CarteiraPublicaV2 = lazy(() => import("@/pages/CarteiraPublicaV2"));
const FaturaPublica = lazy(() => import("@/pages/FaturaPublica"));
const PoliticasPrivacidade = lazy(() => import("@/pages/PoliticasPrivacidade"));
const TermosDeUso = lazy(() => import("@/pages/TermosDeUso"));

const Fallback = () => (
  <div className="min-h-[60vh] flex items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

function LinkUnavailable() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6 text-center">
      <div className="max-w-md space-y-2">
        <h1 className="text-xl font-semibold text-foreground">Link indisponível</h1>
        <p className="text-sm text-muted-foreground">
          Este endereço não está disponível. Verifique o link recebido ou fale com o seu consultor.
        </p>
      </div>
    </div>
  );
}

/** Public code pages: the agency slug always comes from the DOMAIN. */
function CodePage({
  info,
  kind,
}: {
  info: AgencyDomainInfo;
  kind: "orcamento" | "roteiro" | "carteira" | "fatura";
}) {
  const { code } = useParams<{ code: string }>();
  if (!code) return <LinkUnavailable />;
  if (kind === "orcamento")
    return <OrcamentoPublicoV2 agencySlugOverride={info.agency_slug} accessCodeOverride={code} />;
  if (kind === "roteiro")
    return <RoteiroPublicoV2 agencySlugOverride={info.agency_slug} accessCodeOverride={code} />;
  if (kind === "carteira")
    return <CarteiraPublicaV2 agencySlugOverride={info.agency_slug} accessCodeOverride={code} />;
  return <FaturaPublica agencySlugOverride={info.agency_slug} codeOverride={code} />;
}

function Ofertas({ info }: { info: AgencyDomainInfo }) {
  return <VitrinePublica slugOverride={info.public_slug || info.agency_slug} />;
}

export default function AgencyDomainRoutes({ info }: { info: AgencyDomainInfo }) {
  return (
    <BrowserRouter>
      <AgencySiteLayout info={info}>
      <Suspense fallback={<Fallback />}>
        <Routes>
          <Route path="/" element={<AgencySiteHome info={info} />} />
          <Route path="/area-do-cliente" element={<AgencyClientArea info={info} />} />
          <Route path="/ofertas" element={<Ofertas info={info} />} />
          <Route path="/orcamento/:code" element={<CodePage info={info} kind="orcamento" />} />
          <Route path="/roteiro/:code" element={<CodePage info={info} kind="roteiro" />} />
          <Route path="/carteira/:code" element={<CodePage info={info} kind="carteira" />} />
          <Route path="/fatura/:code" element={<CodePage info={info} kind="fatura" />} />
          <Route path="/politicasdeprivacidade" element={<PoliticasPrivacidade />} />
          <Route path="/termosdeuso" element={<TermosDeUso />} />
          <Route path="*" element={<LinkUnavailable />} />
        </Routes>
      </Suspense>
      </AgencySiteLayout>
    </BrowserRouter>
  );
}