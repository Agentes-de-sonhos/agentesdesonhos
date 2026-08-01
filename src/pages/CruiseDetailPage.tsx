import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCruises } from "@/hooks/useCruises";
import { OperatorHero } from "@/components/operator/OperatorHero";
import { OperatorInfoCard } from "@/components/operator/OperatorInfoCard";
import { OperatorSidebar } from "@/components/operator/OperatorSidebar";
import { RichContentDisplay } from "@/components/operator/RichContentDisplay";
import { CompetitiveAdvantagesCard } from "@/components/operator/CompetitiveAdvantagesCard";
import { BusinessHoursCard } from "@/components/operator/BusinessHoursCard";
import { SupplierMaterialsCard } from "@/components/supplier/SupplierMaterialsCard";
import {
  Ship, ArrowLeft, MapPin, Users, Anchor, Waves, Compass,
  ShoppingCart, Phone, FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";

const CATEGORIA_COLORS: Record<string, string> = {
  Luxo: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800",
  Premium: "bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-950 dark:text-violet-300 dark:border-violet-800",
  Contemporaneo: "bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-800",
};

const TIPO_META: Record<string, { icon: typeof Ship; color: string; label: string }> = {
  Oceanico: { icon: Anchor, color: "text-cyan-600 dark:text-cyan-400", label: "Oceânico" },
  Fluvial: { icon: Waves, color: "text-emerald-600 dark:text-emerald-400", label: "Fluvial" },
  Expedicao: { icon: Compass, color: "text-orange-600 dark:text-orange-400", label: "Expedição" },
};

export default function CruiseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: companies = [], isLoading } = useCruises();

  const company = companies.find((c) => c.id === id);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6 max-w-6xl mx-auto">
          <Skeleton className="h-10 w-32 rounded-xl" />
          <Skeleton className="h-44 w-full rounded-2xl" />
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-48 w-full rounded-2xl" />
              <Skeleton className="h-48 w-full rounded-2xl" />
            </div>
            <Skeleton className="h-72 w-full rounded-2xl" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!company) {
    return (
      <DashboardLayout>
        <div className="text-center py-20">
          <div className="h-20 w-20 mx-auto rounded-2xl bg-muted/50 flex items-center justify-center mb-6">
            <Ship className="h-10 w-10 text-muted-foreground/40" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">Companhia não encontrada</h2>
          <p className="text-muted-foreground mt-2 mb-8">A companhia que você está procurando não existe ou foi removida.</p>
          <BackToDirectoryButton variant="outline" fallbackPath={CRUISES_ROOT} category="Cruzeiros" label="Voltar
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const op = company.operator || null;
  const tipoMeta = TIPO_META[company.tipo];
  const TipoIcon = tipoMeta?.icon || Ship;
  const isLuxo = company.categoria === "Luxo";

  // Commercial fields: prefer the tour_operators profile, fall back to legacy cruise data
  const about = op?.short_description || company.descricao_curta;
  const howToSell = op?.how_to_sell || company.how_to_sell;
  const salesChannels = op?.sales_channels || company.sales_channels;
  const contacts = op?.commercial_contacts || company.commercial_contacts;
  const advantages = op?.competitive_advantages || null;
  const specialties = op?.specialties || company.specialties;
  const businessHours = (op?.business_hours as any) || null;
  const website = op?.website || company.website;
  const instagram = op?.instagram || null;

  const socialLinks: Record<string, string> = {};
  const mergeLinks = (links: Record<string, string> | null | undefined) => {
    if (!links || typeof links !== "object") return;
    Object.entries(links).forEach(([k, v]) => { if (v) socialLinks[k] = String(v); });
  };
  mergeLinks(company.social_links);
  mergeLinks(op?.social_links);

  const hasSocial = !!website || !!instagram || Object.keys(socialLinks).length > 0;

  const categoryLabel = `Companhia Marítima • ${tipoMeta?.label || company.tipo} • ${company.categoria === "Contemporaneo" ? "Contemporâneo" : company.categoria}`;

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
        <Button variant="ghost" onClick={() => navigate("/mapa-turismo/cruzeiros")} className="rounded-xl text-muted-foreground hover:text-foreground -ml-2">
          <ArrowLeft className="mr-2 h-4 w-4" /> Companhias Marítimas
        </Button>

        <OperatorHero
          name={company.nome}
          category={categoryLabel}
          logoUrl={company.logo_url || op?.logo_url || null}
          hideRating
        />

        {/* Cruise-specific classification badges */}
        <div className="flex flex-wrap gap-2 -mt-4">
          <Badge className={cn("gap-1.5 px-3 py-1.5 text-xs font-semibold border", CATEGORIA_COLORS[company.categoria] || "")}>
            {isLuxo && <span>✦</span>}
            {company.categoria === "Contemporaneo" ? "Contemporâneo" : company.categoria}
          </Badge>
          <Badge variant="outline" className="gap-1.5 px-3 py-1.5 text-xs font-medium">
            <TipoIcon className={cn("h-3.5 w-3.5", tipoMeta?.color)} />
            {tipoMeta?.label || company.tipo}
          </Badge>
          {company.subtipo && (
            <Badge variant="outline" className="px-3 py-1.5 text-xs">{company.subtipo}</Badge>
          )}
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            {about && (
              <OperatorInfoCard icon={FileText} title="Sobre" iconColor="text-sky-600">
                <RichContentDisplay content={about} lineClamp={10} />
              </OperatorInfoCard>
            )}

            {advantages && <CompetitiveAdvantagesCard advantages={advantages} />}

            {howToSell && (
              <OperatorInfoCard icon={ShoppingCart} title="Como Vender">
                <RichContentDisplay content={howToSell} />
              </OperatorInfoCard>
            )}

            {salesChannels && (
              <OperatorInfoCard icon={Users} title="Canais de Venda">
                <RichContentDisplay content={salesChannels} />
              </OperatorInfoCard>
            )}

            {contacts && (
              <OperatorInfoCard icon={Phone} title="Contatos Comerciais" iconColor="text-emerald-600">
                <RichContentDisplay content={contacts} />
              </OperatorInfoCard>
            )}

            {businessHours && <BusinessHoursCard hours={businessHours} />}

            {/* Cruise-specific: regions served */}
            {company.regioes.length > 0 && (
              <OperatorInfoCard icon={MapPin} title="Regiões Atendidas">
                <div className="flex flex-wrap gap-2">
                  {company.regioes.map((r) => (
                    <Badge key={r.id} variant="outline" className="px-3 py-1.5 text-xs font-medium bg-muted/50 hover:bg-muted transition-colors">
                      <MapPin className="h-3 w-3 mr-1.5 text-muted-foreground" />
                      {r.nome}
                    </Badge>
                  ))}
                </div>
              </OperatorInfoCard>
            )}

            {/* Cruise-specific: traveler profile */}
            {company.perfis.length > 0 && (
              <OperatorInfoCard icon={Users} title="Perfil do Viajante" iconColor="text-violet-600">
                <div className="flex flex-wrap gap-2">
                  {company.perfis.map((p) => (
                    <span
                      key={p.id}
                      className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-primary/8 text-primary border border-primary/15"
                    >
                      {p.nome}
                    </span>
                  ))}
                </div>
              </OperatorInfoCard>
            )}

            {op && <SupplierMaterialsCard supplierId={op.id} supplierName={op.name} />}
          </div>

          {/* Sidebar */}
          <div className="space-y-5 lg:sticky lg:top-6">
            {specialties && (
              <OperatorSidebar operator={{ specialties, category: "", social_links: null }} />
            )}

            {hasSocial && (
              <OperatorSidebar operator={{
                specialties: null,
                category: "",
                social_links: Object.keys(socialLinks).length > 0 ? socialLinks : null,
                website,
                instagram,
              }} />
            )}

            <OperatorSidebar operator={{ specialties: null, social_links: null, category: "Companhia Marítima" }} />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
