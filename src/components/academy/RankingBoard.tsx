import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Award, Medal, Building2 } from "lucide-react";
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
            Ranking da Academy
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

  const getMedalIcon = (position: number) => {
    if (position < 3) {
      const colors = ["text-yellow-500", "text-gray-400", "text-amber-600"];
      return <Medal className={`h-6 w-6 ${colors[position]}`} />;
    }
    return <span className="w-6 text-center font-medium text-muted-foreground">{position + 1}</span>;
  };

  // Agency ranking
  const agencyMap = new Map<string, { name: string; trails: number; avgScore: number; members: number }>();
  ranking.forEach((u) => {
    const agency = u.agency_name || "Independente";
    const existing = agencyMap.get(agency) || { name: agency, trails: 0, avgScore: 0, members: 0 };
    existing.trails += u.trails_completed;
    existing.avgScore += u.avg_exam_score;
    existing.members += 1;
    agencyMap.set(agency, existing);
  });
  const agencyRanking = Array.from(agencyMap.values())
    .map((a) => ({ ...a, avgScore: a.members > 0 ? Math.round(a.avgScore / a.members) : 0 }))
    .sort((a, b) => b.trails - a.trails || b.avgScore - a.avgScore);

  return (
    <Tabs defaultValue="individual" className="space-y-4">
      <TabsList>
        <TabsTrigger value="individual" className="flex items-center gap-2">
          <Trophy className="h-4 w-4" /> Ranking Individual
        </TabsTrigger>
        <TabsTrigger value="agency" className="flex items-center gap-2">
          <Building2 className="h-4 w-4" /> Ranking por Agência
        </TabsTrigger>
      </TabsList>

      <TabsContent value="individual">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Ranking Individual
            </CardTitle>
          </CardHeader>
          <CardContent>
            {ranking.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Nenhum usuário no ranking ainda.</p>
            ) : (
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-3">
                  {ranking.map((user, index) => (
                    <div key={user.user_id} className={`flex items-center gap-4 p-3 rounded-lg transition-colors ${index < 3 ? "bg-gradient-to-r from-primary/5 to-accent/5" : ""}`}>
                      {getMedalIcon(index)}
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={user.avatar_url || undefined} />
                        <AvatarFallback>{user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{user.name}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Award className="h-3 w-3" />{user.trails_completed} trilhas</span>
                          <span>Média: {user.avg_exam_score}%</span>
                          {user.agency_name && <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{user.agency_name}</span>}
                        </div>
                      </div>
                      {index < 3 && (
                        <Badge variant="secondary" className={`${index === 0 ? "bg-yellow-100 text-yellow-700" : index === 1 ? "bg-gray-100 text-gray-700" : "bg-amber-100 text-amber-700"}`}>
                          {["🥇", "🥈", "🥉"][index]} Top {index + 1}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="agency">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Top Agências
            </CardTitle>
          </CardHeader>
          <CardContent>
            {agencyRanking.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Nenhuma agência no ranking.</p>
            ) : (
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-3">
                  {agencyRanking.map((agency, index) => (
                    <div key={agency.name} className={`flex items-center gap-4 p-3 rounded-lg border ${index < 3 ? "bg-gradient-to-r from-primary/5 to-accent/5" : ""}`}>
                      {getMedalIcon(index)}
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Building2 className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{agency.name}</p>
                        <p className="text-xs text-muted-foreground">{agency.members} agente(s) · {agency.trails} trilhas · Média: {agency.avgScore}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
