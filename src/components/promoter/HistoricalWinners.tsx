import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, Trophy, Gift, Calendar } from "lucide-react";
import { useHistoricalWinners } from "@/hooks/usePromoterRanking";
import { MONTH_NAMES } from "@/types/promoter";
import { Skeleton } from "@/components/ui/skeleton";

export function HistoricalWinners() {
  const { data: winners, isLoading } = useHistoricalWinners();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Histórico de Campeões
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Histórico de Campeões
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!winners || winners.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Nenhum vencedor registrado ainda.
          </p>
        ) : (
          <ScrollArea className="h-[350px] pr-4">
            <div className="space-y-4">
              {winners.map((winner) => (
                <div
                  key={winner.id}
                  className="flex items-start gap-4 p-4 bg-muted/50 rounded-lg"
                >
                  <Avatar className="h-12 w-12 border-2 border-yellow-400">
                    <AvatarImage src={winner.profile?.avatar_url || undefined} />
                    <AvatarFallback className="bg-yellow-100 text-yellow-700">
                      {winner.profile?.name
                        ?.split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold">{winner.profile?.name || "Promotor"}</p>
                      <Badge className="bg-yellow-100 text-yellow-700">
                        <Trophy className="h-3 w-3 mr-1" />
                        Campeão
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {MONTH_NAMES[winner.month - 1]} {winner.year}
                    </div>

                    <div className="flex flex-wrap gap-2 mt-2">
                      <Badge variant="outline" className="text-xs">
                        {winner.total_sales_count} vendas
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        R$ {winner.total_revenue.toLocaleString("pt-BR")}
                      </Badge>
                    </div>

                    {winner.prize_name && (
                      <div className="mt-2 text-sm flex items-center gap-1 text-primary">
                        <Gift className="h-3 w-3" />
                        {winner.prize_name}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
