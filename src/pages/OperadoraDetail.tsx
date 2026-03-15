import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Building2,
  Globe,
  Instagram,
  ShoppingCart,
  Users,
  Phone,
  Tag,
  Info,
  CalendarDays,
  DollarSign,
  UserCheck,
  ExternalLink,
} from "lucide-react";

const safeOpen = (url: string | null | undefined) => {
  if (!url) return;
  const sanitized =
    url.startsWith("http://") || url.startsWith("https://") ? url : `https://${url}`;
  window.open(sanitized, "_blank", "noopener,noreferrer");
};

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
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!operator) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <Building2 className="mx-auto h-16 w-16 text-muted-foreground/50" />
          <h2 className="mt-4 text-xl font-semibold text-foreground">
            Operadora não encontrada
          </h2>
          <Button
            variant="outline"
            className="mt-6"
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
      <div className="space-y-6 animate-fade-in">
        <Button
          variant="ghost"
          onClick={() => navigate("/mapa-turismo")}
          className="mb-2"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar ao diretório
        </Button>

        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="h-20 w-20 rounded-2xl bg-muted flex items-center justify-center border">
              <Building2 className="h-10 w-10 text-muted-foreground" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
                {operator.name}
              </h1>
              <Badge variant="secondary" className="mt-2">
                {operator.category}
              </Badge>
            </div>
          </div>
          <div className="flex gap-2">
            {operator.website && (
              <Button variant="outline" onClick={() => safeOpen(operator.website)}>
                <Globe className="mr-2 h-4 w-4" />
                Site
              </Button>
            )}
            {operator.instagram && (
              <Button variant="outline" onClick={() => safeOpen(operator.instagram)}>
                <Instagram className="mr-2 h-4 w-4" />
                Instagram
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {operator.how_to_sell && (
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <ShoppingCart className="h-5 w-5 text-primary" />
                    Como Vender
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-foreground whitespace-pre-wrap">
                    {operator.how_to_sell}
                  </p>
                </CardContent>
              </Card>
            )}

            {operator.sales_channels && (
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Users className="h-5 w-5 text-primary" />
                    Canal de Vendas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-foreground whitespace-pre-wrap">
                    {operator.sales_channels}
                  </p>
                </CardContent>
              </Card>
            )}

            {operator.commercial_contacts && (
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Phone className="h-5 w-5 text-primary" />
                    Contatos Comerciais
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-foreground whitespace-pre-wrap">
                    {operator.commercial_contacts}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {operator.specialties && (
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Tag className="h-5 w-5" />
                    Especialidades
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {operator.specialties.split(",").map((s: string, i: number) => (
                      <Badge
                        key={i}
                        variant="secondary"
                        className="bg-primary/10 text-primary"
                      >
                        {s.trim()}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {(operator.website || operator.instagram) && (
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="text-lg">Outras Redes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {operator.website && (
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => safeOpen(operator.website)}
                    >
                      <Globe className="h-4 w-4 mr-2" />
                      Website
                      <ExternalLink className="ml-auto h-3 w-3" />
                    </Button>
                  )}
                  {operator.instagram && (
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => safeOpen(operator.instagram)}
                    >
                      <Instagram className="h-4 w-4 mr-2" />
                      Instagram
                      <ExternalLink className="ml-auto h-3 w-3" />
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Info className="h-5 w-5" />
                  Informações da Empresa
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Categoria</p>
                  <p className="font-medium text-foreground">{operator.category}</p>
                </div>
                {operator.founded_year && (
                  <div>
                    <p className="text-muted-foreground">Ano de Fundação</p>
                    <p className="font-medium text-foreground">{operator.founded_year}</p>
                  </div>
                )}
                {operator.annual_revenue && (
                  <div>
                    <p className="text-muted-foreground">Faturamento Anual</p>
                    <p className="font-medium text-foreground">{operator.annual_revenue}</p>
                  </div>
                )}
                {operator.employees && (
                  <div>
                    <p className="text-muted-foreground">Funcionários</p>
                    <p className="font-medium text-foreground">{operator.employees}</p>
                  </div>
                )}
                {operator.executive_team && (
                  <div>
                    <p className="text-muted-foreground">Equipe Executiva</p>
                    <p className="font-medium text-foreground whitespace-pre-wrap">
                      {operator.executive_team}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
