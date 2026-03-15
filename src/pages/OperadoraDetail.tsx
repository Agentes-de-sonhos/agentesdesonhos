import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Building2, ShoppingCart, Users, Phone } from "lucide-react";
import { OperatorHero } from "@/components/operator/OperatorHero";
import { OperatorInfoCard } from "@/components/operator/OperatorInfoCard";
import { SalesChannelCards } from "@/components/operator/SalesChannelCards";
import { ContactCards } from "@/components/operator/ContactCards";
import { OperatorSidebar } from "@/components/operator/OperatorSidebar";
import { SupplierMaterialsCard } from "@/components/supplier/SupplierMaterialsCard";

export default function OperadoraDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: operator, isLoading } = useQuery({
    queryKey: ["tour-operator", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tour_operators")
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

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

  if (!operator) {
    return (
      <DashboardLayout>
        <div className="text-center py-20">
          <div className="h-20 w-20 mx-auto rounded-2xl bg-muted/50 flex items-center justify-center mb-6">
            <Building2 className="h-10 w-10 text-muted-foreground/40" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">
            Operadora não encontrada
          </h2>
          <p className="text-muted-foreground mt-2 mb-8">
            A operadora que você está procurando não existe ou foi removida.
          </p>
          <Button
            variant="outline"
            className="rounded-xl"
            onClick={() => navigate("/mapa-turismo")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar ao diretório
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
        {/* Back button */}
        <Button
          variant="ghost"
          onClick={() => navigate("/mapa-turismo")}
          className="rounded-xl text-muted-foreground hover:text-foreground -ml-2"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar ao diretório
        </Button>

        {/* Hero */}
        <OperatorHero
          name={operator.name}
          category={operator.category}
          logoUrl={operator.logo_url}
        />

        {/* Two-column layout */}
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {operator.how_to_sell && (
              <OperatorInfoCard icon={ShoppingCart} title="Como Vender">
                <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
                  {operator.how_to_sell}
                </p>
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

            {/* Materials */}
            <SupplierMaterialsCard
              supplierId={operator.id}
              supplierName={operator.name}
            />
          </div>

          {/* Sidebar */}
          <OperatorSidebar operator={operator} />
        </div>
      </div>
    </DashboardLayout>
  );
}
