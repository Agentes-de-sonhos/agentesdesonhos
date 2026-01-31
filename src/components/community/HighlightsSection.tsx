import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Trophy, Award, Star, Gift, Check } from "lucide-react";
import type { CommunityHighlight, MonthlyPrize } from "@/types/community";
import { MONTH_NAMES } from "@/types/community";

interface HighlightsSectionProps {
  highlights: CommunityHighlight[];
  prize: MonthlyPrize | null;
  currentMonth: number;
  currentYear: number;
  hasVoted: boolean;
  onVote: (highlightId: string) => void;
  isVoting: boolean;
}

export function HighlightsSection({
  highlights,
  prize,
  currentMonth,
  currentYear,
  hasVoted,
  onVote,
  isVoting,
}: HighlightsSectionProps) {
  const totalVotes = highlights.reduce((sum, h) => sum + h.vote_count, 0);
  const maxVotes = Math.max(...highlights.map((h) => h.vote_count), 1);

  return (
    <section>
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <Trophy className="h-5 w-5 text-primary" />
        Destaque do Mês & Prêmios
      </h2>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Monthly Prize */}
        <Card className="bg-gradient-to-br from-warning/10 to-warning/5 border-warning/30">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Gift className="h-5 w-5 text-warning" />
              Prêmio de {MONTH_NAMES[currentMonth - 1]}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {prize ? (
              <div className="text-center space-y-3">
                {prize.prize_image_url && (
                  <img
                    src={prize.prize_image_url}
                    alt={prize.prize_name}
                    className="w-24 h-24 mx-auto object-contain"
                  />
                )}
                <h3 className="font-bold text-lg">{prize.prize_name}</h3>
                {prize.prize_description && (
                  <p className="text-sm text-muted-foreground">{prize.prize_description}</p>
                )}
              </div>
            ) : (
              <p className="text-center text-muted-foreground text-sm py-4">
                Prêmio será anunciado em breve!
              </p>
            )}
          </CardContent>
        </Card>

        {/* Voting Rules */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              Regras de Votação
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-start gap-2">
              <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Cada usuário pode votar apenas uma vez por mês</span>
            </div>
            <div className="flex items-start gap-2">
              <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>O mesmo agente não pode vencer mais de uma vez no ano</span>
            </div>
            <div className="flex items-start gap-2">
              <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>O vencedor é anunciado no final do mês</span>
            </div>
            <div className="pt-2">
              {hasVoted ? (
                <Badge variant="secondary" className="w-full justify-center py-2">
                  <Check className="h-4 w-4 mr-1" />
                  Você já votou este mês
                </Badge>
              ) : (
                <Badge variant="outline" className="w-full justify-center py-2">
                  Escolha seu favorito abaixo
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Nominees / Voting Progress */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Star className="h-5 w-5 text-warning" />
              Indicados ({totalVotes} votos)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 max-h-72 overflow-y-auto">
            {highlights.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-4">
                Nenhum indicado este mês ainda.
              </p>
            ) : (
              highlights.map((highlight, index) => (
                <div key={highlight.id} className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={highlight.profile?.avatar_url || undefined} />
                        <AvatarFallback>
                          {highlight.profile?.name?.charAt(0) || "?"}
                        </AvatarFallback>
                      </Avatar>
                      {index === 0 && highlight.vote_count > 0 && (
                        <Trophy className="h-4 w-4 text-warning absolute -top-1 -right-1" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {highlight.profile?.name || "Agente"}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {highlight.contribution_summary}
                      </p>
                    </div>
                    {!hasVoted && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onVote(highlight.id)}
                        disabled={isVoting}
                      >
                        Votar
                      </Button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress
                      value={(highlight.vote_count / maxVotes) * 100}
                      className="h-2 flex-1"
                    />
                    <span className="text-xs text-muted-foreground w-8">
                      {highlight.vote_count}
                    </span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
