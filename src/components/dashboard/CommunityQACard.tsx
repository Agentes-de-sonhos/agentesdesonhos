import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  MessageCircleQuestion,
  Send,
  ThumbsUp,
  MessageCircle,
  CheckCircle2,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Loader2,
  Star,
  Trash2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useGamification } from "@/hooks/useGamification";
import { QA_CATEGORIES } from "@/hooks/useQA";
import { toast } from "sonner";

export function CommunityQACard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { role } = useUserRole();
  const isAdmin = role === "admin";
  const { awardPoints } = useGamification();
  const queryClient = useQueryClient();

  // Quick ask state
  const [showAskForm, setShowAskForm] = useState(false);
  const [collapsed, setCollapsed] = useState(true);
  const [askTitle, setAskTitle] = useState("");
  const [askDescription, setAskDescription] = useState("");
  const [askCategory, setAskCategory] = useState("");
  const [askLink, setAskLink] = useState("");
  const [showAskLink, setShowAskLink] = useState(false);

  // Expanded question for inline answers
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [replyLink, setReplyLink] = useState("");
  const [showReplyLink, setShowReplyLink] = useState(false);

  // Fetch latest questions with author info
  const { data: questions = [], isLoading } = useQuery({
    queryKey: ["community-qa-dashboard"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("qa_questions")
        .select("id, title, category, answers_count, is_resolved, created_at, user_id, description")
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      if (!data || data.length === 0) return [];

      const userIds = [...new Set(data.map((q) => q.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, name, avatar_url")
        .in("user_id", userIds);

      const profileMap = new Map(
        (profiles || []).map((p) => [p.user_id, p])
      );

      // Get useful counts per question (sum of useful_count from answers)
      const questionIds = data.map((q) => q.id);
      const { data: answerStats } = await supabase
        .from("qa_answers")
        .select("question_id, useful_count")
        .in("question_id", questionIds);

      const usefulMap = new Map<string, number>();
      (answerStats || []).forEach((a: any) => {
        usefulMap.set(a.question_id, (usefulMap.get(a.question_id) || 0) + (a.useful_count || 0));
      });

      return data.map((q) => ({
        ...q,
        author_name: profileMap.get(q.user_id)?.name || "Agente",
        author_avatar: profileMap.get(q.user_id)?.avatar_url,
        total_useful: usefulMap.get(q.id) || 0,
      }));
    },
    enabled: !!user,
  });

  // Fetch answers for expanded question
  const { data: expandedAnswers = [], isLoading: isLoadingAnswers } = useQuery({
    queryKey: ["community-qa-answers", expandedQuestionId],
    queryFn: async () => {
      if (!expandedQuestionId) return [];
      const { data, error } = await supabase
        .from("qa_answers")
        .select("*")
        .eq("question_id", expandedQuestionId)
        .order("is_best_answer", { ascending: false })
        .order("useful_count", { ascending: false })
        .order("created_at", { ascending: true });
      if (error) throw error;

      const userIds = [...new Set((data || []).map((a: any) => a.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, name, avatar_url")
        .in("user_id", userIds);
      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

      // Get user's votes
      let myVotes = new Set<string>();
      if (user) {
        const answerIds = (data || []).map((a: any) => a.id);
        if (answerIds.length > 0) {
          const { data: votes } = await supabase
            .from("qa_answer_votes" as any)
            .select("answer_id")
            .eq("user_id", user.id)
            .in("answer_id", answerIds);
          myVotes = new Set((votes || []).map((v: any) => v.answer_id));
        }
      }

      return (data || []).map((a: any) => ({
        ...a,
        author_name: profileMap.get(a.user_id)?.name || "Agente",
        author_avatar: profileMap.get(a.user_id)?.avatar_url,
        has_voted: myVotes.has(a.id),
      }));
    },
    enabled: !!expandedQuestionId && !!user,
  });

  // Create question mutation
  const createQuestion = useMutation({
    mutationFn: async () => {
      if (!user || !askTitle.trim()) throw new Error("Dados inválidos");
      const description = [askDescription.trim(), askLink.trim() ? `🔗 ${askLink.trim()}` : ""]
        .filter(Boolean)
        .join("\n\n") || null;

      const { data, error } = await supabase
        .from("qa_questions")
        .insert({
          title: askTitle.trim(),
          description,
          category: askCategory,
          user_id: user.id,
        })
        .select()
        .single();
      if (error) throw error;
      await awardPoints(0.25, "ask_question", data.id);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-qa-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["qa-questions"] });
      queryClient.invalidateQueries({ queryKey: ["gamification"] });
      setAskTitle("");
      setAskDescription("");
      setAskCategory("");
      setShowAskForm(false);
      toast.success("🎉 Pergunta publicada! Você ganhou +0.25 pontos!", {
        duration: 4000,
        icon: "⭐",
      });
    },
    onError: () => toast.error("Erro ao publicar pergunta"),
  });

  // Create answer mutation
  const createAnswer = useMutation({
    mutationFn: async () => {
      if (!user || !expandedQuestionId || !replyContent.trim()) throw new Error("Dados inválidos");

      const { data, error } = await supabase
        .from("qa_answers")
        .insert({
          question_id: expandedQuestionId,
          content: replyContent.trim(),
          user_id: user.id,
        })
        .select()
        .single();
      if (error) throw error;
      await awardPoints(4, "answer_question", data.id);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-qa-answers", expandedQuestionId] });
      queryClient.invalidateQueries({ queryKey: ["community-qa-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["qa-questions"] });
      queryClient.invalidateQueries({ queryKey: ["gamification"] });
      setReplyContent("");
      toast.success("🎉 Resposta publicada! Você ganhou +4 pontos!", {
        duration: 4000,
        icon: "⭐",
      });
    },
    onError: () => toast.error("Erro ao publicar resposta"),
  });

  // Vote mutation
  const toggleVote = useMutation({
    mutationFn: async ({ answerId, hasVoted }: { answerId: string; hasVoted: boolean }) => {
      if (!user) throw new Error("Não autenticado");
      if (hasVoted) {
        await supabase
          .from("qa_answer_votes" as any)
          .delete()
          .eq("answer_id", answerId)
          .eq("user_id", user.id);
      } else {
        const { error } = await supabase
          .from("qa_answer_votes" as any)
          .insert({ answer_id: answerId, user_id: user.id });
        if (error) throw error;
        // Award 5 points to answer author for useful vote
        const answer = expandedAnswers.find((a: any) => a.id === answerId);
        if (answer && answer.user_id !== user.id) {
          await awardPoints(5, "useful_vote_received", answerId);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-qa-answers", expandedQuestionId] });
      queryClient.invalidateQueries({ queryKey: ["gamification"] });
    },
  });

  // Mark best answer mutation
  const markBest = useMutation({
    mutationFn: async ({ answerId, questionId }: { answerId: string; questionId: string }) => {
      await supabase
        .from("qa_answers")
        .update({ is_best_answer: false })
        .eq("question_id", questionId);
      await supabase
        .from("qa_answers")
        .update({ is_best_answer: true })
        .eq("id", answerId);
      await supabase
        .from("qa_questions")
        .update({ is_resolved: true })
        .eq("id", questionId);
      // Award 10 points to answer author
      const answer = expandedAnswers.find((a: any) => a.id === answerId);
      if (answer && user) {
        await awardPoints(10, "best_answer", answerId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-qa-answers", expandedQuestionId] });
      queryClient.invalidateQueries({ queryKey: ["community-qa-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["gamification"] });
      toast.success("🎉 Melhor resposta marcada! O autor ganhou +10 pontos!", {
        duration: 4000,
        icon: "⭐",
      });
    },
  });

  // Admin delete mutations
  const deleteQuestionMut = useMutation({
    mutationFn: async (questionId: string) => {
      await supabase.from("qa_answers").delete().eq("question_id", questionId);
      const { error } = await supabase.from("qa_questions").delete().eq("id", questionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-qa-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["qa-questions"] });
      setExpandedQuestionId(null);
      toast.success("Pergunta excluída");
    },
    onError: () => toast.error("Erro ao excluir"),
  });

  const deleteAnswerMut = useMutation({
    mutationFn: async (answerId: string) => {
      await supabase.from("qa_answer_likes").delete().eq("answer_id", answerId);
      const { error } = await supabase.from("qa_answers").delete().eq("id", answerId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-qa-answers", expandedQuestionId] });
      queryClient.invalidateQueries({ queryKey: ["community-qa-dashboard"] });
      toast.success("Resposta excluída");
    },
    onError: () => toast.error("Erro ao excluir"),
  });

  const expandedQuestion = questions.find((q: any) => q.id === expandedQuestionId);

  return (
    <Card className="border-0 shadow-card bg-gradient-to-br from-[hsl(var(--section-community))]/20 via-[hsl(var(--section-community))]/10 to-[hsl(var(--section-community))]/[0.03]">
      <CardContent className="pt-5 pb-4 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="w-fit">
            <h2 className="font-display text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-[hsl(var(--section-community))]" />
              Perguntas da Comunidade
            </h2>
            <div className="mt-2 h-1 w-full rounded-full bg-[hsl(var(--section-community))]" />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 -mt-1 text-muted-foreground hover:text-foreground transition-transform"
            onClick={() => setCollapsed((v) => !v)}
            aria-label={collapsed ? "Expandir seção" : "Recolher seção"}
            aria-expanded={!collapsed}
          >
            <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${collapsed ? "" : "rotate-180"}`} />
          </Button>
        </div>
        {/* Engagement banner — sempre visível (teaser da comunidade) */}
        <div className="rounded-xl bg-[hsl(var(--section-community))]/5 border border-[hsl(var(--section-community))]/15 p-3.5 space-y-1.5">
          <p className="text-sm font-semibold text-foreground">🚀 Essa é a sua comunidade!</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Tem dúvida, ideia ou dica? Joga aqui 👇 Pode ser simples: destino, fornecedor, cliente difícil…
          </p>
          <p className="text-[11px] text-muted-foreground/80 italic">
            👉 Quem pergunta aprende. Quem responde cresce.
          </p>
        </div>
        {!collapsed && (
        <>

        {/* Quick Ask Bar */}
        {!showAskForm ? (
          <div
            className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/60 cursor-pointer hover:border-[hsl(var(--section-community))]/40 transition-colors"
            onClick={() => setShowAskForm(true)}
          >
            <div className="h-8 w-8 rounded-full bg-[hsl(var(--section-community))]/10 flex items-center justify-center flex-shrink-0">
              <MessageCircleQuestion className="h-4 w-4 text-[hsl(var(--section-community))]" />
            </div>
            <span className="text-sm text-muted-foreground flex-1">
              Bora movimentar isso? Escreva a primeira pergunta!
            </span>
            <Button size="sm" variant="default" className="bg-[hsl(var(--section-community))] hover:bg-[hsl(var(--section-community))]/90 text-white">
              Perguntar
            </Button>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-card border border-[hsl(var(--section-community))]/30 space-y-3">
            <Input
              placeholder="Qual é a sua dúvida?"
              value={askTitle}
              onChange={(e) => setAskTitle(e.target.value)}
              maxLength={200}
              className="font-medium"
              autoFocus
            />
            <Select value={askCategory} onValueChange={setAskCategory}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione o tema" />
              </SelectTrigger>
              <SelectContent>
                {QA_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowAskForm(false)}>
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={() => createQuestion.mutate()}
                disabled={!askTitle.trim() || !askCategory || createQuestion.isPending}
                className="bg-[hsl(var(--section-community))] hover:bg-[hsl(var(--section-community))]/90 text-white"
              >
                {createQuestion.isPending ? "Enviando..." : "Publicar"}
              </Button>
            </div>
          </div>
        )}

        {/* Feed */}
        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : questions.length === 0 ? (
          <div className="text-center py-6">
            <MessageCircleQuestion className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">Nenhuma pergunta ainda. Seja o primeiro!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {questions.map((q: any) => {
              const isExpanded = expandedQuestionId === q.id;
              const isAuthor = user?.id === q.user_id;

               return (
                <div key={q.id} className="rounded-xl bg-card border border-border/60 overflow-hidden transition-all hover:shadow-sm hover:bg-muted/40 group/question cursor-pointer">
                  {/* Question row */}
                  <div
                    className="flex items-start gap-3 p-3.5 transition-colors"
                    onClick={() => setExpandedQuestionId(isExpanded ? null : q.id)}
                  >
                    <div className="pt-0.5 flex-shrink-0">
                      <MessageCircleQuestion className="h-4 w-4 text-[hsl(var(--section-community))]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold leading-snug text-foreground ${isExpanded ? '' : 'line-clamp-2'}`}>{q.title}</p>
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap text-xs text-muted-foreground">
                        <span className="font-medium text-foreground/70">{q.author_name}</span>
                        <span>•</span>
                        <span>
                          {formatDistanceToNow(new Date(q.created_at), {
                            addSuffix: false,
                            locale: ptBR,
                          })}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <MessageCircle className="h-3 w-3" />
                          {q.answers_count} {q.answers_count === 1 ? "resposta" : "respostas"}
                        </span>
                        {q.total_useful > 0 && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <ThumbsUp className="h-3 w-3" />
                              {q.total_useful} {q.total_useful === 1 ? "útil" : "úteis"}
                            </span>
                          </>
                        )}
                        {q.is_resolved && (
                          <Badge variant="default" className="bg-[hsl(var(--success))] text-white text-[10px] px-1.5 py-0 ml-1">
                            <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" /> Resolvida
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex-shrink-0 pt-1 flex items-center gap-1.5">
                      <span className="hidden sm:flex text-xs text-[hsl(var(--section-community))] font-medium opacity-0 group-hover/question:opacity-100 transition-opacity whitespace-nowrap items-center gap-1">
                        {q.answers_count > 0 ? "Responder" : "Responder"} <ArrowRight className="h-3 w-3" />
                      </span>
                      {isAdmin && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <button
                              className="text-destructive/50 hover:text-destructive transition-colors"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir pergunta?</AlertDialogTitle>
                              <AlertDialogDescription>Essa ação excluirá a pergunta e todas as respostas. Não pode ser desfeita.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteQuestionMut.mutate(q.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>

                  {/* Expanded answers section */}
                  {isExpanded && (
                    <div className="border-t border-border/50 bg-muted/30 px-3 pb-3 pt-2 space-y-2">
                      {q.description && (
                        <p className="text-xs text-muted-foreground whitespace-pre-wrap px-1 pb-1">
                          {q.description}
                        </p>
                      )}

                      {isLoadingAnswers ? (
                        <div className="flex justify-center py-3">
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        </div>
                      ) : expandedAnswers.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-2 text-center">
                          Nenhuma resposta ainda. Seja o primeiro!
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {expandedAnswers.map((a: any) => (
                            <div
                              key={a.id}
                              className={`rounded-lg p-2.5 text-sm ${
                                a.is_best_answer
                                  ? "bg-[hsl(var(--success))]/10 border border-[hsl(var(--success))]/30"
                                  : "bg-card border border-border/40"
                              }`}
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <Avatar className="h-5 w-5">
                                  <AvatarImage src={a.author_avatar || undefined} />
                                  <AvatarFallback className="text-[9px]">
                                    {(a.author_name || "A").charAt(0)}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-xs font-medium">{a.author_name}</span>
                                <span className="text-[10px] text-muted-foreground">
                                  {formatDistanceToNow(new Date(a.created_at), { addSuffix: false, locale: ptBR })}
                                </span>
                                {a.is_best_answer && (
                                  <Badge className="bg-[hsl(var(--success))] text-white text-[9px] px-1 py-0 gap-0.5">
                                    <Star className="h-2.5 w-2.5" /> Melhor
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs whitespace-pre-wrap leading-relaxed">{a.content}</p>
                              <div className="flex items-center gap-2 mt-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className={`h-6 px-2 text-xs gap-1 ${
                                    a.has_voted
                                      ? "text-[hsl(var(--section-community))] font-medium"
                                      : "text-muted-foreground"
                                  }`}
                                  onClick={() =>
                                    toggleVote.mutate({ answerId: a.id, hasVoted: a.has_voted })
                                  }
                                  disabled={a.user_id === user?.id}
                                >
                                  <ThumbsUp className="h-3 w-3" />
                                  {a.useful_count > 0 ? a.useful_count : ""} útil
                                </Button>
                                {isAuthor && !a.is_best_answer && !q.is_resolved && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 px-2 text-xs gap-1 text-[hsl(var(--success))]"
                                    onClick={() =>
                                      markBest.mutate({ answerId: a.id, questionId: q.id })
                                    }
                                  >
                                    <CheckCircle2 className="h-3 w-3" /> Melhor resposta
                                  </Button>
                                )}
                                {isAdmin && (
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="ghost" size="sm" className="h-6 px-2 text-xs gap-1 text-destructive/60 hover:text-destructive">
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Excluir resposta?</AlertDialogTitle>
                                        <AlertDialogDescription>Essa ação não pode ser desfeita.</AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => deleteAnswerMut.mutate(a.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Reply form */}
                      <div className="pt-1">
                        <div className="flex gap-2">
                          <Input
                            placeholder="Escreva sua resposta..."
                            value={replyContent}
                            onChange={(e) => setReplyContent(e.target.value)}
                            maxLength={2000}
                            className="text-sm h-8"
                          />
                          <Button
                            size="sm"
                            className="h-8 px-3 bg-[hsl(var(--section-community))] hover:bg-[hsl(var(--section-community))]/90 text-white"
                            onClick={() => createAnswer.mutate()}
                            disabled={!replyContent.trim() || createAnswer.isPending}
                          >
                            <Send className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div className="pt-2 border-t">
          <Button
            variant="ghost"
            className="w-full text-[hsl(var(--section-community))] hover:text-[hsl(var(--section-community))] hover:bg-[hsl(var(--section-community))]/5"
            onClick={() => navigate("/perguntas-respostas")}
          >
            Ver todas as perguntas
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
        </>
        )}
      </CardContent>
    </Card>
  );
}
