import { useState } from "react";
import { useGamification } from "@/hooks/useGamification";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Trophy, Medal, Award, Star, HelpCircle, ArrowRight, Crown } from "lucide-react";
import { useNavigate } from "react-router-dom";

const POINTS_RULES = [
  { action: "Login diário", points: "+1 pt" },
  { action: "Visitar seção", points: "+0.25 pt" },
  { action: "Fazer pergunta", points: "+0.25 pt" },
  { action: "Responder", points: "+4 pts" },
  { action: "Voto útil recebido", points: "+5 pts" },
  { action: "Melhor resposta", points: "+10 pts" },
  { action: "Concluir treinamento", points: "+10 pts" },
  { action: "Certificação obtida", points: "+100 pts" },
];

export function QARankingSidebar() {
  const { ranking, isLoadingRanking, myPoints } = useGamification();
  const [showRules, setShowRules] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="space-y-4 lg:sticky lg:top-4">
      {/* My Points */}
      <Card className="rounded-2xl border-border/40 overflow-hidden">
        <CardContent className="p-0">
          <div className="bg-gradient-to-r from-warning/10 to-warning/5 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-warning/20 flex items-center justify-center">
                  <Star className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Seus pontos</p>
                  <p className="text-2xl font-bold text-foreground leading-none mt-0.5">{myPoints}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-[11px] text-primary h-7 rounded-full px-2.5 hover:bg-primary/10"
                onClick={() => setShowRules(true)}
              >
                <HelpCircle className="h-3 w-3 mr-1" />
                Regras
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ranking */}
      <Card className="rounded-2xl border-border/40">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Crown className="h-4 w-4 text-warning" />
            <h3 className="text-sm font-bold text-foreground">Top agentes</h3>
          </div>

          {isLoadingRanking ? (
            <div className="space-y-2.5">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-11 w-full rounded-xl" />
              ))}
            </div>
          ) : ranking.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">
              Nenhum ponto registrado ainda.
            </p>
          ) : (
            <div className="space-y-1.5">
              {ranking.slice(0, 5).map((entry, index) => {
                const isTop3 = index < 3;
                const medals = [
                  { icon: <Trophy className="h-3.5 w-3.5 text-warning" />, bg: "bg-warning/10 ring-1 ring-warning/20" },
                  { icon: <Medal className="h-3.5 w-3.5 text-muted-foreground" />, bg: "bg-muted/60 ring-1 ring-border/50" },
                  { icon: <Award className="h-3.5 w-3.5 text-accent" />, bg: "bg-accent/10 ring-1 ring-accent/20" },
                ];

                return (
                  <div
                    key={entry.user_id}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl transition-colors ${
                      isTop3 ? medals[index].bg : "hover:bg-muted/30"
                    }`}
                  >
                    <div className="w-6 text-center flex-shrink-0">
                      {isTop3 ? (
                        medals[index].icon
                      ) : (
                        <span className="text-[11px] font-semibold text-muted-foreground">
                          {index + 1}º
                        </span>
                      )}
                    </div>
                    <Avatar className="h-8 w-8 ring-2 ring-background shadow-sm">
                      <AvatarImage src={entry.avatar_url || undefined} />
                      <AvatarFallback className="text-[10px] font-semibold bg-muted">
                        {(entry.user_name || "U").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate text-foreground">{entry.user_name}</p>
                    </div>
                    <p className="font-bold text-xs text-primary tabular-nums">{entry.total_points}</p>
                  </div>
                );
              })}
            </div>
          )}
          {ranking.length > 5 && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-[11px] mt-3 gap-1 h-8 rounded-full text-primary hover:bg-primary/10"
              onClick={() => navigate("/gamificacao")}
            >
              Ver ranking completo
              <ArrowRight className="h-3 w-3" />
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Points Rules Dialog */}
      <Dialog open={showRules} onOpenChange={setShowRules}>
        <DialogContent className="sm:max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Star className="h-4 w-4 text-warning" />
              Como ganhar pontos
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-1 mt-2">
            {POINTS_RULES.map((rule) => (
              <div key={rule.action} className="flex items-center justify-between py-2 px-1">
                <span className="text-sm text-foreground/80">{rule.action}</span>
                <span className="text-xs font-bold text-primary bg-primary/10 rounded-full px-2.5 py-1">
                  {rule.points}
                </span>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
