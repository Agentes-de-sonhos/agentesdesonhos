import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePromoterPresentation } from "@/hooks/usePromoterPresentation";
import { 
  Presentation, 
  Users, 
  Calendar, 
  MapPin, 
  TrendingUp,
  CheckCircle2,
  Clock
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FEATURE_LABELS, TrackableFeature } from "@/types/promoter-presentation";

export default function Promotores() {
  const { user } = useAuth();
  const { activePresentation, usageData } = usePromoterPresentation();

  // Fetch promoter's presentation history
  const { data: presentations } = useQuery({
    queryKey: ["my-presentations", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("promoter_presentations")
        .select("*")
        .eq("promoter_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Stats
  const totalPresentations = presentations?.length || 0;
  const totalLeads = presentations?.length || 0;
  const uniqueCities = new Set(presentations?.map(p => p.city)).size;
  const uniqueStates = new Set(presentations?.map(p => p.state)).size;

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">
            Painel do Promotor
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie suas apresentações e acompanhe seus resultados
          </p>
        </div>

        {/* Active Presentation Card */}
        {activePresentation && (
          <Card className="border-primary bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <Presentation className="h-5 w-5" />
                Apresentação em Andamento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Agência</p>
                  <p className="font-medium">{activePresentation.agency_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Agente</p>
                  <p className="font-medium">{activePresentation.agent_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Localização</p>
                  <p className="font-medium">
                    {activePresentation.city}/{activePresentation.state}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Funcionalidades Usadas</p>
                  <p className="font-medium">{usageData?.length || 0}/4</p>
                </div>
              </div>

              {usageData && usageData.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm text-muted-foreground mb-2">Recursos utilizados:</p>
                  <div className="flex flex-wrap gap-2">
                    {usageData.map((u) => (
                      <Badge key={u.id} variant="secondary">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        {FEATURE_LABELS[u.feature_name as TrackableFeature] || u.feature_name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Apresentações</p>
                  <p className="text-2xl font-bold">{totalPresentations}</p>
                </div>
                <div className="p-3 rounded-full bg-primary/10 text-primary">
                  <Presentation className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Leads Gerados</p>
                  <p className="text-2xl font-bold">{totalLeads}</p>
                </div>
                <div className="p-3 rounded-full bg-accent/10 text-accent">
                  <Users className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Cidades</p>
                  <p className="text-2xl font-bold">{uniqueCities}</p>
                </div>
                <div className="p-3 rounded-full bg-secondary/50 text-secondary-foreground">
                  <MapPin className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Estados</p>
                  <p className="text-2xl font-bold">{uniqueStates}</p>
                </div>
                <div className="p-3 rounded-full bg-muted text-muted-foreground">
                  <TrendingUp className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Presentations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Histórico de Apresentações
            </CardTitle>
          </CardHeader>
          <CardContent>
            {presentations?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Presentation className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma apresentação realizada ainda</p>
                <p className="text-sm mt-1">Inicie sua primeira apresentação para ver o histórico aqui</p>
              </div>
            ) : (
              <div className="space-y-3">
                {presentations?.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-full bg-muted">
                        <Presentation className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium">{p.agency_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {p.agent_name} • {p.city}/{p.state}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right hidden sm:block">
                        <p className="text-sm">
                          {format(new Date(p.started_at), "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(p.started_at), "HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                      <Badge variant={p.is_active ? "default" : "secondary"}>
                        {p.is_active ? (
                          <>
                            <Clock className="h-3 w-3 mr-1" />
                            Ativa
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Concluída
                          </>
                        )}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
