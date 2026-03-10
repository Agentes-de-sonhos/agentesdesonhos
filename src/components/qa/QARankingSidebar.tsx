import { useState } from "react";
import { useGamification } from "@/hooks/useGamification";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Trophy, Medal, Award, Star, HelpCircle, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const podiumIcons = [
  <Trophy key="1" className="h-4 w-4 text-warning" />,
  <Medal key="2" className="h-4 w-4 text-muted-foreground" />,
  <Award key="3" className="h-4 w-4 text-accent" />,
];

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
      {/* My Points - simplified */}
      <Card className="rounded-xl">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-warning/15 flex items-center justify-center">
                <Star className="h-4.5 w-4.5 text-warning" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Seus pontos</p>
                <p className="text-xl font-bold text-foreground">{myPoints}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-primary h-auto p-0 hover:bg-transparent hover:underline"
              onClick={() => setShowRules(true)}
            >
              <HelpCircle className="h-3.5 w-3.5 mr-1" />
              Como ganhar pontos
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Ranking */}
      <Card className="rounded-xl">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Trophy className="h-4 w-4 text-warning" />
            Top agentes da comunidade
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-1">
          {isLoadingRanking ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 w-full rounded-lg" />
              ))}
            </div>
          ) : ranking.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">
              Nenhum ponto registrado ainda.
            </p>
          ) : (
            <div className="space-y-1">
              {ranking.slice(0, 5).map((entry, index) => (
                <div
                  key={entry.user_id}
                  className={`flex items-center gap-2.5 p-2 rounded-lg transition-colors ${
                    index < 3 ? "bg-muted/50" : "hover:bg-muted/30"
                  }`}
                >
                  <div className="w-6 text-center flex-shrink-0">
                    {index < 3 ? (
                      podiumIcons[index]
                    ) : (
                      <span className="text-[11px] font-medium text-muted-foreground">
                        {index + 1}º
                      </span>
                    )}
                  </div>
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={entry.avatar_url || undefined} />
                    <AvatarFallback className="text-[10px]">
                      {(entry.user_name || "U").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{entry.user_name}</p>
                  </div>
                  <p className="font-bold text-xs text-primary">{entry.total_points}</p>
                </div>
              ))}
            </div>
          )}
          {ranking.length > 5 && (
            <Button
              variant="link"
              size="sm"
              className="w-full text-xs mt-2 gap-1 h-auto py-1"
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
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Star className="h-4 w-4 text-warning" />
              Como ganhar pontos
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2.5 mt-2">
            {POINTS_RULES.map((rule) => (
              <div key={rule.action} className="flex items-center justify-between py-1.5">
                <span className="text-sm text-muted-foreground">{rule.action}</span>
                <span className="text-sm font-semibold text-primary bg-primary/10 rounded-full px-2.5 py-0.5">
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
