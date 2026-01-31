import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trophy, Award, Clock, Medal } from "lucide-react";
import { useAcademyRanking } from "@/hooks/useAcademy";
import { Skeleton } from "@/components/ui/skeleton";

export function RankingBoard() {
  const { ranking, isLoading } = useAcademyRanking();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Ranking de Engajamento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <Skeleton className="h-4 flex-1" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const getMedalColor = (position: number) => {
    switch (position) {
      case 0:
        return "text-yellow-500";
      case 1:
        return "text-gray-400";
      case 2:
        return "text-amber-600";
      default:
        return "text-muted-foreground";
    }
  };

  const getMedalIcon = (position: number) => {
    if (position < 3) {
      return <Medal className={`h-6 w-6 ${getMedalColor(position)}`} />;
    }
    return <span className="w-6 text-center font-medium text-muted-foreground">{position + 1}</span>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          Ranking de Engajamento
        </CardTitle>
      </CardHeader>
      <CardContent>
        {ranking.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Nenhum usuário no ranking ainda. Complete treinamentos para aparecer!
          </p>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {ranking.map((user, index) => (
                <div
                  key={user.user_id}
                  className={`flex items-center gap-4 p-3 rounded-lg transition-colors ${
                    index < 3 ? "bg-gradient-to-r from-primary/5 to-accent/5" : ""
                  }`}
                >
                  {getMedalIcon(index)}

                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user.avatar_url || undefined} />
                    <AvatarFallback>
                      {user.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{user.name}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Award className="h-3 w-3" />
                        {user.trails_completed} trilhas
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {Math.round(user.total_watched_minutes / 60)}h assistidas
                      </span>
                    </div>
                  </div>

                  {index < 3 && (
                    <Badge
                      variant="secondary"
                      className={`${
                        index === 0
                          ? "bg-yellow-100 text-yellow-700"
                          : index === 1
                          ? "bg-gray-100 text-gray-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉"} Top {index + 1}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
