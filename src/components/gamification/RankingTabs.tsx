import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { RankingEntry } from "@/hooks/useGamification";
import { useAuth } from "@/hooks/useAuth";
import { useGamification } from "@/hooks/useGamification";

function RankingList({
  entries,
  isLoading,
  currentUserId,
}: {
  entries: RankingEntry[];
  isLoading: boolean;
  currentUserId?: string;
}) {
  if (isLoading) return <p className="text-sm text-muted-foreground py-4">Carregando...</p>;
  if (entries.length === 0)
    return <p className="text-sm text-muted-foreground py-4">Nenhum ranking ainda</p>;

  return (
    <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
      {entries.map((entry, i) => {
        const isMe = entry.user_id === currentUserId;
        return (
          <div
            key={entry.user_id}
            className={`flex items-center gap-3 p-2.5 rounded-lg text-sm transition-colors ${
              isMe ? "bg-primary/10 border border-primary/20" : "hover:bg-muted/50"
            }`}
          >
            <span className="w-7 text-center font-bold text-muted-foreground">
              {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}º`}
            </span>
            <Avatar className="h-7 w-7">
              {entry.avatar_url && <AvatarImage src={entry.avatar_url} />}
              <AvatarFallback className="text-xs">
                {entry.user_name?.charAt(0) || "?"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <span className="truncate block font-medium">
                {entry.user_name}
                {isMe && " (você)"}
              </span>
              {entry.agency_name && (
                <span className="text-xs text-muted-foreground truncate block">
                  {entry.agency_name}
                </span>
              )}
            </div>
            <span className="font-semibold text-primary">{entry.total_points}</span>
          </div>
        );
      })}
    </div>
  );
}

export function RankingTabs() {
  const { user } = useAuth();
  const {
    ranking,
    weeklyRanking,
    isLoadingRanking,
    vendasRanking,
    conteudoRanking,
    educacaoRanking,
    isLoadingCategoryRanking,
  } = useGamification();

  return (
    <Tabs defaultValue="geral" className="w-full">
      <TabsList className="grid w-full grid-cols-5">
        <TabsTrigger value="geral" className="text-xs">Geral</TabsTrigger>
        <TabsTrigger value="semanal" className="text-xs">Semanal</TabsTrigger>
        <TabsTrigger value="vendas" className="text-xs">Vendas</TabsTrigger>
        <TabsTrigger value="conteudo" className="text-xs">Conteúdo</TabsTrigger>
        <TabsTrigger value="educacao" className="text-xs">Educação</TabsTrigger>
      </TabsList>
      <TabsContent value="geral" className="mt-4">
        <RankingList entries={ranking} isLoading={isLoadingRanking} currentUserId={user?.id} />
      </TabsContent>
      <TabsContent value="semanal" className="mt-4">
        <RankingList entries={weeklyRanking} isLoading={isLoadingRanking} currentUserId={user?.id} />
      </TabsContent>
      <TabsContent value="vendas" className="mt-4">
        <RankingList entries={vendasRanking} isLoading={isLoadingCategoryRanking} currentUserId={user?.id} />
      </TabsContent>
      <TabsContent value="conteudo" className="mt-4">
        <RankingList entries={conteudoRanking} isLoading={isLoadingCategoryRanking} currentUserId={user?.id} />
      </TabsContent>
      <TabsContent value="educacao" className="mt-4">
        <RankingList entries={educacaoRanking} isLoading={isLoadingCategoryRanking} currentUserId={user?.id} />
      </TabsContent>
    </Tabs>
  );
}
