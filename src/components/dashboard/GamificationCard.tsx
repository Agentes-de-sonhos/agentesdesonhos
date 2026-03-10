import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Trophy,
  Star,
  MessageCircleQuestion,
  ArrowRight,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { useGamification, POINTS_CONFIG } from "@/hooks/useGamification";

const categoryColors: Record<string, string> = {
  hotel: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  companhia_aerea: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  destino: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  operadora: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
  consolidadora: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
  seguro_viagem: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  locadora: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300",
  cruzeiro: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300",
  receptivo: "bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300",
  guia: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
  cambio: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  outro: "bg-muted text-muted-foreground",
};

const categoryLabels: Record<string, string> = {
  hotel: "Hotel",
  companhia_aerea: "Cia Aérea",
  destino: "Destino",
  operadora: "Operadora",
  consolidadora: "Consolidadora",
  seguro_viagem: "Seguro",
  locadora: "Locadora",
  cruzeiro: "Cruzeiro",
  receptivo: "Receptivo",
  guia: "Guia",
  cambio: "Câmbio",
  outro: "Outro",
};

export function GamificationCard() {
  const navigate = useNavigate();
  const {
    myPoints,
    ranking,
    isLoadingRanking,
    latestQuestions,
    isLoadingQuestions,
  } = useGamification();

  const myRank = ranking.findIndex((r) => r.total_points <= myPoints) + 1 || ranking.length + 1;

  return (
    <div className="grid gap-4 sm:gap-6 lg:grid-cols-2 items-stretch">
      {/* Points & Ranking */}
      <Card className="flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Gamificação
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 space-y-4">
          {/* My points */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/10">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <Star className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Meus Pontos</p>
                <p className="text-2xl font-bold text-primary">{myPoints.toFixed(2)}</p>
              </div>
            </div>
            <Badge variant="outline" className="text-xs">
              #{myRank}º lugar
            </Badge>
          </div>

          {/* Points info */}
          <div className="text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground text-sm mb-2">Como ganhar pontos:</p>
            <div className="grid grid-cols-2 gap-1">
              <span>🔑 Login diário: <strong>+{POINTS_CONFIG.daily_login}</strong></span>
              <span>❓ Fazer pergunta: <strong>+{POINTS_CONFIG.ask_question}</strong></span>
              <span>💬 Responder: <strong>+{POINTS_CONFIG.answer_question}</strong></span>
              <span>👍 Voto útil: <strong>+{POINTS_CONFIG.useful_vote_received}</strong></span>
              <span>⭐ Melhor resposta: <strong>+{POINTS_CONFIG.best_answer}</strong></span>
              <span>📂 Navegar menu: <strong>+{POINTS_CONFIG.menu_visit}</strong></span>
              <span>🏆 Certificado: <strong>+{POINTS_CONFIG.earn_certificate}</strong></span>
            </div>
          </div>

          {/* Top 5 ranking */}
          <div>
            <p className="text-sm font-medium mb-2">Top 5 Ranking</p>
            {isLoadingRanking ? (
              <p className="text-xs text-muted-foreground">Carregando...</p>
            ) : ranking.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhum ranking ainda</p>
            ) : (
              <div className="space-y-2">
                {ranking.slice(0, 5).map((entry, i) => (
                  <div key={entry.user_id} className="flex items-center gap-2 text-sm">
                    <span className="w-5 text-center font-bold text-muted-foreground">
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}º`}
                    </span>
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-xs">
                        {entry.user_name?.charAt(0) || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="flex-1 truncate">{entry.user_name}</span>
                    <span className="font-medium text-primary">{entry.total_points.toFixed(1)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => navigate("/perguntas-respostas")}
          >
            Ver ranking completo <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </CardContent>
      </Card>

      {/* Latest Q&A questions */}
      <Card className="flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageCircleQuestion className="h-5 w-5 text-primary" />
            Últimas Perguntas
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 space-y-3">
          {isLoadingQuestions ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : latestQuestions.length === 0 ? (
            <div className="text-center py-6">
              <MessageCircleQuestion className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">Nenhuma pergunta ainda</p>
              <Button
                size="sm"
                className="mt-3"
                onClick={() => navigate("/perguntas-respostas")}
              >
                Fazer primeira pergunta
              </Button>
            </div>
          ) : (
            <>
              {latestQuestions.map((q: any) => (
                <div
                  key={q.id}
                  className="p-3 rounded-lg border hover:border-primary/30 cursor-pointer transition-colors"
                  onClick={() => navigate("/perguntas-respostas")}
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{q.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge
                          variant="secondary"
                          className={`text-xs ${categoryColors[q.category] || categoryColors.outro}`}
                        >
                          {categoryLabels[q.category] || q.category}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          por {q.author_name}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                      {q.is_resolved ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <>
                          <Clock className="h-3 w-3" />
                          <span>{q.answers_count}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => navigate("/perguntas-respostas")}
              >
                Ver todas as perguntas <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
