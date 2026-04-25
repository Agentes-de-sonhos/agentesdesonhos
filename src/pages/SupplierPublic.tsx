import { useEffect, useState } from "react";
import { Building2, FileText, ShoppingCart, Users, Phone, Tag, Share2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { OperatorHero } from "@/components/operator/OperatorHero";
import { OperatorInfoCard } from "@/components/operator/OperatorInfoCard";
import { SalesChannelCards } from "@/components/operator/SalesChannelCards";
import { ContactCards } from "@/components/operator/ContactCards";
import { CompetitiveAdvantagesCard } from "@/components/operator/CompetitiveAdvantagesCard";
import { RichContentDisplay } from "@/components/operator/RichContentDisplay";
import { BusinessHoursCard } from "@/components/operator/BusinessHoursCard";
import { CertificationsCard } from "@/components/operator/CertificationsCard";
import { OperatorSidebar } from "@/components/operator/OperatorSidebar";
import { Skeleton } from "@/components/ui/skeleton";

interface BusinessHours {
  commercial?: string;
  after_hours?: string;
  emergency?: string;
}

interface SupplierPublicProps {
  slug: string;
  /** Optional: data already fetched by a parent resolver, to avoid double fetch. */
  preloaded?: any;
}

export default function SupplierPublic({ slug, preloaded }: SupplierPublicProps) {
  const [operator, setOperator] = useState<any>(preloaded ?? null);
  const [loading, setLoading] = useState(!preloaded);

  useEffect(() => {
    if (preloaded) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase.rpc("get_published_supplier_by_slug" as any, {
        p_slug: slug,
      });
      if (cancelled) return;
      setOperator(data ?? null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, preloaded]);

  // Set page metadata (no helmet dependency)
  useEffect(() => {
    if (!operator) return;
    const prevTitle = document.title;
    document.title = `${operator.name} — Perfil oficial`;
    return () => {
      document.title = prevTitle;
    };
  }, [operator]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <Skeleton className="h-44 w-full rounded-2xl" />
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-48 w-full rounded-2xl" />
              <Skeleton className="h-48 w-full rounded-2xl" />
            </div>
            <Skeleton className="h-72 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!operator) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Building2 className="h-16 w-16 text-muted-foreground/40 mb-4" />
        <h2 className="text-xl font-semibold">Empresa não encontrada</h2>
        <p className="text-muted-foreground mt-2 text-center max-w-sm">
          O perfil que você está procurando não está disponível ou ainda não foi publicado.
        </p>
      </div>
    );
  }

  const sl = operator.social_links as Record<string, string> | null;
  const hasSocial =
    !!operator.website ||
    !!operator.instagram ||
    (sl && typeof sl === "object" && Object.values(sl).some((v) => !!v));

  const pageTitle = `${operator.name} — Perfil oficial`;
  const pageDesc =
    operator.short_description?.replace(/<[^>]*>/g, "").slice(0, 155) ||
    `Conheça ${operator.name} no Mapa do Turismo.`;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8 animate-fade-in">
        <OperatorHero
          name={operator.name}
          category={operator.category}
          logoUrl={operator.logo_url}
          averageRating={0}
          totalReviews={0}
          onReviewClick={() => {}}
          hideRating
        />

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            {operator.short_description && (
              <OperatorInfoCard icon={FileText} title="Sobre a Empresa" iconColor="text-sky-600">
                <RichContentDisplay content={operator.short_description} lineClamp={10} />
              </OperatorInfoCard>
            )}

            {operator.competitive_advantages && (
              <CompetitiveAdvantagesCard advantages={operator.competitive_advantages} />
            )}

            {operator.how_to_sell && (
              <OperatorInfoCard icon={ShoppingCart} title="Como Vender">
                <RichContentDisplay content={operator.how_to_sell} />
              </OperatorInfoCard>
            )}

            {operator.sales_channels && (
              <OperatorInfoCard icon={Users} title="Canais de Venda">
                <SalesChannelCards salesChannels={operator.sales_channels} />
              </OperatorInfoCard>
            )}

            {operator.commercial_contacts && (
              <OperatorInfoCard icon={Phone} title="Contatos Comerciais" iconColor="text-emerald-600">
                <ContactCards contacts={operator.commercial_contacts} />
              </OperatorInfoCard>
            )}

            {operator.business_hours && (
              <BusinessHoursCard hours={operator.business_hours as BusinessHours} />
            )}
          </div>

          <div className="space-y-5 lg:sticky lg:top-6">
            {operator.specialties && (
              <OperatorSidebar operator={{ specialties: operator.specialties, category: "", social_links: null }} />
            )}

            {hasSocial && (
              <OperatorSidebar
                operator={{
                  social_links: sl,
                  website: operator.website,
                  instagram: operator.instagram,
                  category: "",
                  specialties: null,
                }}
              />
            )}

            <OperatorSidebar
              operator={{
                category: operator.category,
                founded_year: operator.founded_year,
                employees: operator.employees,
                executive_team: operator.executive_team,
                specialties: null,
                social_links: null,
              }}
            />

            {operator.certifications && (
              <CertificationsCard certifications={operator.certifications} />
            )}
          </div>
        </div>

        <footer className="pt-8 pb-4 text-center text-xs text-muted-foreground border-t border-border/40">
          Perfil exibido no Mapa do Turismo · Agentes de Sonhos
        </footer>
      </div>
    </div>
  );
}