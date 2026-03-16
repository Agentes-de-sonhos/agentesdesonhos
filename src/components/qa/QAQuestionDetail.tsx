import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useQA, QA_CATEGORIES } from "@/hooks/useQA";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, CheckCircle2, Star, Send, Heart, Lock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  questionId: string;
  onBack: () => void;
}

export function QAQuestionDetail({ questionId, onBack }: Props) {
  const { user } = useAuth();
  const { createAnswer, markBestAnswer, toggleAnswerLike, getAnswersQuery } = useQA();
  const [newAnswer, setNewAnswer] = useState(() => sessionStorage.getItem(`qa_answer_draft_${questionId}`) || "");

  useEffect(() => { sessionStorage.setItem(`qa_answer_draft_${questionId}`, newAnswer); }, [newAnswer, questionId]);

  // Fetch single question
  const questionQuery = useQuery({
    queryKey: ["qa-question", questionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("qa_questions")
        .select("*")
        .eq("id", questionId)
        .single();
      if (error) throw error;

      const { data: profile } = await supabase
        .from("profiles")
        .select("name, avatar_url")
        .eq("user_id", data.user_id)
        .maybeSingle();

      return {
        ...data,
        author_name: profile?.name || "Usuário",
        author_avatar: profile?.avatar_url,
      };
    },
  });

  const answersQuery = useQuery(getAnswersQuery(questionId));

  const question = questionQuery.data;
  const answers = answersQuery.data || [];

  const handleSubmitAnswer = async () => {
    if (!newAnswer.trim()) return;
    await createAnswer.mutateAsync({
      question_id: questionId,
      content: newAnswer.trim(),
    });
    setNewAnswer("");
    sessionStorage.removeItem(`qa_answer_draft_${questionId}`);
  };

  // Fetch likes for answers
  const likesQuery = useQuery({
    queryKey: ["qa-answer-likes-detail", questionId],
    queryFn: async () => {
      const answerIds = answers.map((a: any) => a.id);
      if (answerIds.length === 0) return { counts: {} as Record<string, number>, userLikes: new Set<string>() };
      const { data: allLikes } = await supabase
        .from("qa_answer_likes")
        .select("answer_id, user_id")
        .in("answer_id", answerIds);
      const counts: Record<string, number> = {};
      const userLikes = new Set<string>();
      (allLikes || []).forEach((l: any) => {
        counts[l.answer_id] = (counts[l.answer_id] || 0) + 1;
        if (l.user_id === user?.id) userLikes.add(l.answer_id);
      });
      return { counts, userLikes };
    },
    enabled: answers.length > 0,
  });

  const likeCounts = likesQuery.data?.counts || {};
  const userLikes = likesQuery.data?.userLikes || new Set<string>();

  const getCategoryLabel = (value: string) =>
    QA_CATEGORIES.find((c) => c.value === value)?.label || value;

  if (questionQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!question) return null;

  const isAuthor = user?.id === question.user_id;

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack} className="gap-2">
        <ArrowLeft className="h-4 w-4" />
        Voltar
      </Button>

      {/* Question */}
      <Card>
        <CardContent className="py-5">
          <div className="flex items-start gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={question.author_avatar || undefined} />
              <AvatarFallback>
                {(question.author_name || "U").charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-bold text-lg">{question.title}</h2>
                {question.is_resolved && (
                  <Badge variant="default" className="bg-green-500 text-white gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Resolvida
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="text-[10px]">
                  {getCategoryLabel(question.category)}
                </Badge>
                <span className="text-xs text-muted-foreground">{question.author_name}</span>
                <span className="text-xs text-muted-foreground">•</span>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(question.created_at), {
                    addSuffix: true,
                    locale: ptBR,
                  })}
                </span>
              </div>
              {question.description && (
                <p className="text-sm text-muted-foreground mt-3 whitespace-pre-wrap">
                  {question.description}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Answers */}
      <div>
        <h3 className="font-semibold text-sm mb-3">
          {answers.length} {answers.length === 1 ? "resposta" : "respostas"}
        </h3>

        {answersQuery.isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {answers.map((a) => (
              <Card
                key={a.id}
                className={a.is_best_answer ? "border-green-500/50 bg-green-50/50 dark:bg-green-950/20" : ""}
              >
                <CardContent className="py-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={a.author_avatar || undefined} />
                      <AvatarFallback className="text-xs">
                        {(a.author_name || "U").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{a.author_name}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(a.created_at), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </span>
                        {a.is_best_answer && (
                          <Badge variant="default" className="bg-green-500 text-white gap-1 text-[10px]">
                            <Star className="h-3 w-3" />
                            Melhor Resposta
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm mt-2 whitespace-pre-wrap">{a.content}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <button
                          className={`flex items-center gap-1 text-xs transition-colors ${
                            userLikes.has(a.id) ? "text-red-500" : "text-muted-foreground hover:text-red-500"
                          }`}
                          onClick={() => toggleAnswerLike.mutate({ answerId: a.id, questionId: question.id })}
                        >
                          <Heart className={`h-3.5 w-3.5 ${userLikes.has(a.id) ? "fill-current" : ""}`} />
                          {likeCounts[a.id] || 0}
                        </button>
                        {isAuthor && !a.is_best_answer && !question.is_resolved && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-green-600 hover:text-green-700 h-auto p-0"
                            onClick={() =>
                              markBestAnswer.mutate({
                                answerId: a.id,
                                questionId: question.id,
                              })
                            }
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                            Marcar como melhor resposta
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* New answer form */}
      <Card>
        <CardContent className="py-4">
          <h4 className="text-sm font-medium mb-2">Sua Resposta (+4 pontos)</h4>
          <Textarea
            placeholder="Escreva sua resposta para ajudar o colega..."
            value={newAnswer}
            onChange={(e) => setNewAnswer(e.target.value)}
            maxLength={2000}
            rows={3}
          />
          <Button
            onClick={handleSubmitAnswer}
            disabled={!newAnswer.trim() || createAnswer.isPending}
            className="mt-3 gap-2"
            size="sm"
          >
            <Send className="h-4 w-4" />
            {createAnswer.isPending ? "Enviando..." : "Responder"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
