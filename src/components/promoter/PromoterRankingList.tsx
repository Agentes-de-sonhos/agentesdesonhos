import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, Medal, TrendingUp, DollarSign } from "lucide-react";
import { useMonthlyRanking, usePromoterSettings, useMonthlyWinner } from "@/hooks/usePromoterRanking";
import { MONTH_NAMES } from "@/types/promoter";
import { Skeleton } from "@/components/ui/skeleton";

export function PromoterRankingList() {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

  const { data: ranking, isLoading } = useMonthlyRanking(selectedMonth, selectedYear);
  const { data: settings } = usePromoterSettings();
  const { data: winner } = useMonthlyWinner(selectedMonth, selectedYear);

  const years = Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - i);
  const sortedRanking = [...(ranking || [])].sort((a, b) => {
    if (settings?.ranking_criteria === 'revenue') {
      return b.total_revenue - a.total_revenue;
    }
    return b.sales_count - a.sales_count;
  });

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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Ranking de Promotores
          </CardTitle>
          <div className="flex gap-2">
            <Select
              value={selectedMonth.toString()}
              onValueChange={(v) => setSelectedMonth(parseInt(v))}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTH_NAMES.map((name, index) => (
                  <SelectItem key={index} value={(index + 1).toString()}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={selectedYear.toString()}
              onValueChange={(v) => setSelectedYear(parseInt(v))}
            >
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <p className="text-sm text-muted-foreground flex items-center gap-1">
          Critério: {settings?.ranking_criteria === 'revenue' ? (
            <><DollarSign className="h-3 w-3" /> Receita Gerada</>
          ) : (
            <><TrendingUp className="h-3 w-3" /> Número de Vendas</>
          )}
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <Skeleton className="h-4 flex-1" />
              </div>
            ))}
          </div>
        ) : sortedRanking.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Nenhuma venda registrada neste período.
          </p>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {sortedRanking.map((user, index) => {
                const isWinner = winner?.is_confirmed && winner.user_id === user.user_id;
                
                return (
                  <div
                    key={user.user_id}
                    className={`flex items-center gap-4 p-3 rounded-lg transition-colors ${
                      index === 0 
                        ? "bg-gradient-to-r from-yellow-100/50 to-amber-100/50 dark:from-yellow-950/30 dark:to-amber-950/30 border border-yellow-300/50" 
                        : index < 3 
                        ? "bg-gradient-to-r from-primary/5 to-accent/5" 
                        : ""
                    }`}
                  >
                    {getMedalIcon(index)}

                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user.avatar_url || undefined} />
                      <AvatarFallback>
                        {user.user_name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{user.user_name}</p>
                        {isWinner && (
                          <Badge className="bg-yellow-100 text-yellow-700 text-xs">
                            🏆 Campeão
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          {user.sales_count} vendas
                        </span>
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          R$ {user.total_revenue.toLocaleString("pt-BR")}
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
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
