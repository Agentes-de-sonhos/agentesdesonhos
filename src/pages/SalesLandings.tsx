import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProductLandingsSection } from "@/components/leads/ProductLandingsSection";
import { Globe, ArrowLeft } from "lucide-react";

// TEMPORÁRIO: a criação de landing pages personalizadas segue implementada
// (hook useSalesLandings, rotas /meus-leads/landings/nova e /:id/editar),
// porém todos os acessos visuais foram ocultados nesta tela. Esta página
// exibe somente os modelos oficiais da plataforma.

export default function SalesLandings() {
  const navigate = useNavigate();

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in max-w-6xl">
        <div className="flex flex-col gap-3">
          <div>
            <button
              onClick={() => navigate("/meus-leads")}
              className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-2"
            >
              <ArrowLeft className="h-3 w-3" /> Captação de Leads
            </button>
            <h1 className="font-display text-2xl sm:text-3xl font-bold flex items-center gap-2">
              <Globe className="h-6 w-6 text-pink-600" />
              Páginas de Vendas
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Landing pages prontas da plataforma, publicadas com a marca da sua
              agência e com captação de leads integrada ao seu CRM.
            </p>
          </div>
        </div>

        <ProductLandingsSection />
      </div>
    </DashboardLayout>
  );
}