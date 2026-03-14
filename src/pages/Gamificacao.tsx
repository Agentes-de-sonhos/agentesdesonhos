import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Trophy, Star, Clock, Gift } from "lucide-react";
import { useGamification, POINTS_CONFIG } from "@/hooks/useGamification";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PointsHistoryEntry {
  id: string;
  action: string;
  points: number;
  created_at: string;
}

const actionLabels: Record<string, string> = {
  daily_login: "Login diário",
  ask_question: "Pergunta feita",
  answer_question: "Resposta enviada",
  menu_visit: "Navegação no menu",
  earn_certificate: "Certificado conquistado",
};

export default function Gamificacao() {
  const { user } = useAuth();
  const { myPoints, ranking, isLoadingRanking } = useGamification();

  const myRank = (() => {
    const idx = ranking.findIndex((r) => r.user_id === user?.id);
    return idx >= 0 ? idx + 1 : ranking.length + 1;
  })();

  // Fetch points history
  const { data: history, isLoading: isLoadingHistory } = useQuery({
    queryKey: ["gamification", "history", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("gamification_points")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
        <PageHeader
          pageKey="gamificacao"
          title="Gamificação"
          subtitle="Acompanhe seus pontos, ranking e conquistas"
          icon={Trophy}
        />

        {/* Points + Rank summary */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="p-3 rounded-full bg-primary/10">
                <Star className="h-7 w-7 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Meus Pontos</p>
                <p className="text-3xl font-bold text-primary">
                  {myPoints.toFixed(2)}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="p-3 rounded-full bg-yellow-500/10">
                <Trophy className="h-7 w-7 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Posição no Ranking
                </p>
                <p className="text-3xl font-bold text-foreground">
                  #{myRank}º lugar
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* How to earn points */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Gift className="h-5 w-5 text-primary" />
              Como ganhar pontos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <span className="text-lg">🔑</span>
                <div className="flex-1">
                  <p className="text-sm font-medium">Login diário</p>
                </div>
                <Badge variant="secondary">+{POINTS_CONFIG.daily_login} pt</Badge>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <span className="text-lg">❓</span>
                <div className="flex-1">
                  <p className="text-sm font-medium">Fazer pergunta</p>
                </div>
                <Badge variant="secondary">+{POINTS_CONFIG.ask_question} pts</Badge>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <span className="text-lg">💬</span>
                <div className="flex-1">
                  <p className="text-sm font-medium">Responder pergunta</p>
                </div>
                <Badge variant="secondary">+{POINTS_CONFIG.answer_question} pts</Badge>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <span className="text-lg">📂</span>
                <div className="flex-1">
                  <p className="text-sm font-medium">Navegar pelo menu</p>
                </div>
                <Badge variant="secondary">+{POINTS_CONFIG.menu_visit} pt</Badge>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <span className="text-lg">🏆</span>
                <div className="flex-1">
                  <p className="text-sm font-medium">Certificado conquistado</p>
                </div>
                <Badge variant="secondary">+{POINTS_CONFIG.earn_certificate} pts</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Full ranking */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                Ranking Completo
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingRanking ? (
                <p className="text-sm text-muted-foreground">Carregando...</p>
              ) : ranking.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum ranking ainda
                </p>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                  {ranking.map((entry, i) => (
                    <div
                      key={entry.user_id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 text-sm"
                    >
                      <span className="w-7 text-center font-bold text-muted-foreground">
                        {i === 0
                          ? "🥇"
                          : i === 1
                          ? "🥈"
                          : i === 2
                          ? "🥉"
                          : `${i + 1}º`}
                      </span>
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className="text-xs">
                          {entry.user_name?.charAt(0) || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <span className="truncate block">{entry.user_name}</span>
                        {entry.agency_name && (
                          <span className="text-xs text-muted-foreground truncate block">
                            {entry.agency_name}
                          </span>
                        )}
                      </div>
                      <span className="font-semibold text-primary">
                        {entry.total_points.toFixed(1)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* History */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5 text-muted-foreground" />
                Histórico de Pontos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingHistory ? (
                <p className="text-sm text-muted-foreground">Carregando...</p>
              ) : !history || history.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum ponto registrado ainda
                </p>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                  {history.map((entry: any) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 text-sm"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">
                          {actionLabels[entry.action] || entry.action}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(entry.created_at), "dd MMM yyyy, HH:mm", {
                            locale: ptBR,
                          })}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className="text-primary font-semibold"
                      >
                        +{entry.points}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
