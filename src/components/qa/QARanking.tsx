import { useGamification } from "@/hooks/useGamification";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Medal, Award, Star } from "lucide-react";

const podiumIcons = [
  <Trophy className="h-5 w-5 text-yellow-500" />,
  <Medal className="h-5 w-5 text-gray-400" />,
  <Award className="h-5 w-5 text-amber-600" />,
];

export function QARanking() {
  const { ranking, isLoadingRanking, myPoints } = useGamification();

  return (
    <div className="space-y-4">
      {/* My points */}
      <Card className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
        <CardContent className="py-4 flex items-center gap-3">
          <Star className="h-6 w-6 text-warning" />
          <div>
            <p className="text-sm text-muted-foreground">Sua pontuação total</p>
            <p className="text-2xl font-bold text-primary">{myPoints} pontos</p>
          </div>
        </CardContent>
      </Card>

      {/* Points legend */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Como ganhar pontos</CardTitle>
        </CardHeader>
        <CardContent className="py-2">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="w-2 h-2 rounded-full bg-primary" />
              Login diário: <span className="font-semibold text-foreground">+1 pt</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="w-2 h-2 rounded-full bg-primary" />
              Fazer pergunta: <span className="font-semibold text-foreground">+2 pts</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="w-2 h-2 rounded-full bg-primary" />
              Responder: <span className="font-semibold text-foreground">+5 pts</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ranking */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-warning" />
            Ranking de Colaboração
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingRanking ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : ranking.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum ponto registrado ainda. Seja o primeiro!
            </p>
          ) : (
            <div className="space-y-2">
              {ranking.map((entry, index) => (
                <div
                  key={entry.user_id}
                  className={`flex items-center gap-3 p-3 rounded-lg ${
                    index < 3 ? "bg-muted/50" : ""
                  }`}
                >
                  <div className="w-8 text-center flex-shrink-0">
                    {index < 3 ? (
                      podiumIcons[index]
                    ) : (
                      <span className="text-sm font-medium text-muted-foreground">
                        {index + 1}º
                      </span>
                    )}
                  </div>
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={entry.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">
                      {(entry.user_name || "U").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{entry.user_name}</p>
                    {entry.agency_name && (
                      <p className="text-xs text-muted-foreground truncate">
                        {entry.agency_name}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm text-primary">{entry.total_points}</p>
                    <p className="text-[10px] text-muted-foreground">pontos</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
