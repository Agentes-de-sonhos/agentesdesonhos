import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Gift, Search, Sparkles, Timer } from "lucide-react";
import { useMonthlyAward, getVotingPhase } from "@/hooks/useMonthlyAward";
import { MONTH_NAMES } from "@/types/community";

const INITIAL_VISIBLE = 12;
const PAGE_SIZE = 12;

function formatCountdown(ms: number): string {
  if (ms <= 0) return "0 dias";
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (days > 0) {
    return `${days} ${days === 1 ? "dia" : "dias"} e ${hours}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}min`;
  }
  return `${minutes} min`;
}

function initialsOf(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function MonthlyAwardSection() {
  const { award, nominees, isLoading } = useMonthlyAward(true);
  const [tick, setTick] = useState(0);
  const [search, setSearch] = useState("");
  const [visible, setVisible] = useState(INITIAL_VISIBLE);

  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const phase = useMemo(() => getVotingPhase(award), [award, tick]);

  const monthLabel = award
    ? MONTH_NAMES[award.reference_month - 1]
    : MONTH_NAMES[new Date().getMonth()];

  const filtered = useMemo(() => {
    if (!search.trim()) return nominees;
    const q = search
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    return nominees.filter((n) => {
      const name = (n.profile?.name ?? "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      const agency = (n.profile?.agency_name ?? "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      return name.includes(q) || agency.includes(q);
    });
  }, [nominees, search]);

  const shown = filtered.slice(0, visible);

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Trophy className="h-6 w-6 text-amber-500" />
          Destaques do Mês
        </h2>
        <p className="text-sm text-muted-foreground max-w-3xl">
          Reconheça quem compartilha conhecimento, ajuda outros agentes e faz a nossa comunidade crescer.
        </p>
        <p className="text-xs text-muted-foreground max-w-3xl">
          Durante o mês, todos que contribuírem com publicações, perguntas, respostas ou comentários poderão ser
          indicados. Na última semana, a comunidade escolhe o grande destaque.
        </p>
      </div>

      {/* Prize Card */}
      <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-orange-500/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Gift className="h-5 w-5 text-amber-500" />
            Prêmio de {monthLabel}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {award?.prize_title ? (
            <div className="flex flex-col sm:flex-row gap-4 items-start">
              {award.prize_image_url && (
                <img
                  src={award.prize_image_url}
                  alt={award.prize_title}
                  className="w-full sm:w-32 h-32 object-contain rounded-md bg-background/50"
                />
              )}
              <div className="flex-1 space-y-2">
                <h3 className="font-bold text-lg text-foreground">{award.prize_title}</h3>
                {award.prize_description && (
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {award.prize_description}
                  </p>
                )}
                {award.sponsor_name && (
                  <p className="text-xs text-muted-foreground">
                    Oferecido por <span className="font-medium">{award.sponsor_name}</span>
                  </p>
                )}
                {award.extra_link && (
                  <a
                    href={award.extra_link}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-xs text-primary hover:underline"
                  >
                    Saiba mais →
                  </a>
                )}
                {award.rules && (
                  <details className="text-xs text-muted-foreground mt-2">
                    <summary className="cursor-pointer text-foreground/80 hover:text-foreground">
                      Regulamento
                    </summary>
                    <p className="mt-2 whitespace-pre-wrap">{award.rules}</p>
                  </details>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4">
              O prêmio deste mês será anunciado em breve.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Voting phase banner */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="py-4 flex items-start gap-3">
          <Timer className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div className="text-sm">
            {phase.phase === "before" && (
              <>
                <p className="font-semibold text-foreground">A votação ainda não começou</p>
                <p className="text-muted-foreground">
                  Continue participando da comunidade. A votação para o Destaque do Mês será aberta na última semana.
                </p>
                {phase.startAt && (
                  <p className="text-xs text-primary mt-1 font-medium">
                    A votação começa em {formatCountdown(phase.msUntilStart)}
                  </p>
                )}
              </>
            )}
            {phase.phase === "voting" && (
              <>
                <p className="font-semibold text-foreground">Votação aberta em breve</p>
                <p className="text-muted-foreground">
                  Escolha o agente que mais contribuiu, compartilhou conhecimento ou ajudou outros membros neste mês.
                </p>
                <p className="text-xs text-primary mt-1 font-medium">
                  A votação termina em {formatCountdown(phase.msUntilEnd)}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  A funcionalidade de voto será liberada em breve.
                </p>
              </>
            )}
            {phase.phase === "closed" && (
              <>
                <p className="font-semibold text-foreground">A votação foi encerrada</p>
                <p className="text-muted-foreground">O resultado está sendo apurado.</p>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Participants */}
      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Participantes do mês
            </h3>
            <p className="text-xs text-muted-foreground">
              Estes são os agentes que contribuíram com a comunidade neste mês e estarão elegíveis para a votação.
            </p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome ou agência"
              className="pl-8 h-9"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-lg" />
            ))}
          </div>
        ) : shown.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center space-y-2">
              <Sparkles className="h-8 w-8 mx-auto text-muted-foreground/60" />
              <p className="font-medium text-foreground">Ainda não há participantes neste mês</p>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Faça uma publicação, compartilhe uma dúvida ou ajude outro agente para participar do Destaque do Mês.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {shown.map((n) => {
                const totalPostsAndQ = n.posts_count + n.questions_count;
                const totalReplies = n.answers_count + n.comments_count;
                return (
                  <Card key={n.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-11 w-11">
                          <AvatarImage src={n.profile?.avatar_url ?? undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                            {initialsOf(n.profile?.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm text-foreground truncate">
                            {n.profile?.name ?? "Agente"}
                          </p>
                          {n.profile?.agency_name && (
                            <p className="text-xs text-muted-foreground truncate">{n.profile.agency_name}</p>
                          )}
                          {(n.profile?.city || n.profile?.state) && (
                            <p className="text-[11px] text-muted-foreground truncate">
                              {[n.profile.city, n.profile.state].filter(Boolean).join(" · ")}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary" className="text-[10px]">
                          Participante do mês
                        </Badge>
                        <span className="text-[11px] text-muted-foreground">
                          {totalPostsAndQ} pub · {totalReplies} resp/com · {n.contributions_count} total
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            {visible < filtered.length && (
              <div className="flex justify-center pt-2">
                <Button variant="outline" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
                  Carregar mais participantes
                </Button>
              </div>
            )}
            <p className="text-[11px] text-muted-foreground text-center">
              {filtered.length} {filtered.length === 1 ? "participante elegível" : "participantes elegíveis"} neste mês
            </p>
          </>
        )}
      </div>

      {/* Últimos destaques placeholder for Phase 1 */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Trophy className="h-4 w-4 text-amber-500" />
          Últimos destaques
        </h3>
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            O primeiro Destaque do Mês será escolhido em breve. Participe da comunidade e ajude a construir essa história.
          </CardContent>
        </Card>
      </div>
    </section>
  );
}