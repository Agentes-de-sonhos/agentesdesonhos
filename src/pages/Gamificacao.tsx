import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Star, Clock, Gift, Target, Flame } from "lucide-react";
import { useGamification } from "@/hooks/useGamification";
import { ACTION_LABELS, LEVELS } from "@/lib/gamification";
import { LevelProgress } from "@/components/gamification/LevelProgress";
import { MissionsPanel } from "@/components/gamification/MissionsPanel";
import { RankingTabs } from "@/components/gamification/RankingTabs";
import { PointsInfoGrid } from "@/components/gamification/PointsInfoGrid";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Gamificacao() {
  const { user } = useAuth();
  const {
    myPoints,
    ranking,
    isLoadingRanking,
    missionsProgress,
    completeMission,
    level,
  } = useGamification();

  const myRank = (() => {
    const idx = ranking.findIndex((r) => r.user_id === user?.id);
    return idx >= 0 ? idx + 1 : ranking.length + 1;
  })();

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

  const completedMissions = missionsProgress.filter((m) => m.completed).length;
  const totalMissions = missionsProgress.length;

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
        <PageHeader
          pageKey="gamificacao"
          title="Gamificação"
          subtitle="Acompanhe seus pontos, ranking, missões e conquistas"
          icon={Trophy}
        />

        {/* Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="p-3 rounded-full bg-primary/10">
                <Star className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Meus Pontos</p>
                <p className="text-2xl font-bold text-primary">{myPoints.toFixed(0)}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="p-3 rounded-full bg-yellow-500/10">
                <Trophy className="h-6 w-6 text-yellow-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Posição</p>
                <p className="text-2xl font-bold">#{myRank}º</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="p-3 rounded-full bg-green-500/10">
                <Target className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Missões Completas</p>
                <p className="text-2xl font-bold">
                  {completedMissions}/{totalMissions}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Level Progress */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Flame className="h-5 w-5 text-orange-500" />
              Seu Nível
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LevelProgress points={myPoints} />
            {/* All Levels */}
            <div className="flex items-center gap-3 mt-4 pt-4 border-t overflow-x-auto pb-1">
              {LEVELS.map((l) => (
                <div
                  key={l.name}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${
                    l.name === level.name
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  <span>{l.icon}</span>
                  <span>{l.name}</span>
                  <span className="opacity-60">{l.max === Infinity ? "1200+" : `${l.min}-${l.max}`}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Missions + Rankings side by side */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Missions */}
          <Card className="flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="h-5 w-5 text-green-500" />
                Missões
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto max-h-[500px]">
              <MissionsPanel missions={missionsProgress} onComplete={completeMission} />
            </CardContent>
          </Card>

          {/* Rankings */}
          <Card className="flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                Rankings
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1">
              <RankingTabs />
            </CardContent>
          </Card>
        </div>

        {/* How to earn + History */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Gift className="h-5 w-5 text-primary" />
                Como ganhar pontos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PointsInfoGrid />
            </CardContent>
          </Card>

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
                <p className="text-sm text-muted-foreground">Nenhum ponto registrado ainda</p>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                  {history.map((entry: any) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 text-sm"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-xs">
                          {ACTION_LABELS[entry.action] || entry.action}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(entry.created_at), "dd MMM yyyy, HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-primary font-semibold text-xs">
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
