import { useGamification } from "@/hooks/useGamification";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Medal, Award } from "lucide-react";

const podiumIcons = [
  <Trophy key="1" className="h-4 w-4 text-warning" />,
  <Medal key="2" className="h-4 w-4 text-muted-foreground" />,
  <Award key="3" className="h-4 w-4 text-accent" />,
];

export function QARankingSidebar() {
  const { ranking, isLoadingRanking } = useGamification();

  return (
    <div className="space-y-4 lg:sticky lg:top-4">
      {/* How to earn */}
      <Card className="rounded-xl">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Como ganhar pontos</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-1">
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Login diário</span>
              <span className="font-semibold text-primary bg-primary/10 rounded-full px-2 py-0.5">+1 pt</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Fazer pergunta</span>
              <span className="font-semibold text-primary bg-primary/10 rounded-full px-2 py-0.5">+0.25 pt</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Responder</span>
              <span className="font-semibold text-primary bg-primary/10 rounded-full px-2 py-0.5">+4 pts</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ranking */}
      <Card className="rounded-xl">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Trophy className="h-4 w-4 text-warning" />
            Ranking
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-1">
          {isLoadingRanking ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-10 w-full rounded-lg" />
              ))}
            </div>
          ) : ranking.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">
              Nenhum ponto registrado ainda.
            </p>
          ) : (
            <div className="space-y-1">
              {ranking.slice(0, 10).map((entry, index) => (
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
        </CardContent>
      </Card>
    </div>
  );
}
