import { useState, useMemo, useEffect, useCallback } from "react";
import { useQA, QA_CATEGORIES } from "@/hooks/useQA";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useSubscription } from "@/hooks/useSubscription";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  MessageCircle, CheckCircle2, Filter, Clock, ThumbsUp, Eye,
  ArrowUpDown, ChevronDown, Send, Search, ChevronUp, MessageSquarePlus,
  AlertCircle, Heart, Lock, Trash2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { QAQuestionDetail } from "./QAQuestionDetail";
import { useQuery } from "@tanstack/react-query";

type SortMode = "recent" | "most_answered" | "unanswered";

export function QAFeed() {
  const { user } = useAuth();
  const { role } = useUserRole();
  const isAdmin = role === "admin";
  const { hasFeature } = useSubscription();
  const canComment = hasFeature("qa_comment");
  const { questions, isLoading, selectedCategory, setSelectedCategory, createQuestion, createAnswer, toggleAnswerLike, deleteQuestion, deleteAnswer, getAnswersQuery } = useQA();
  const [selectedQuestion, setSelectedQuestion] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState(() => sessionStorage.getItem("qa_draft_title") || "");
  const [newDescription, setNewDescription] = useState(() => sessionStorage.getItem("qa_draft_desc") || "");
  const [newCategory, setNewCategory] = useState(() => sessionStorage.getItem("qa_draft_cat") || "");

  // Persist drafts to sessionStorage
  useEffect(() => { sessionStorage.setItem("qa_draft_title", newTitle); }, [newTitle]);
  useEffect(() => { sessionStorage.setItem("qa_draft_desc", newDescription); }, [newDescription]);
  useEffect(() => { sessionStorage.setItem("qa_draft_cat", newCategory); }, [newCategory]);
  const [sortMode, setSortMode] = useState<SortMode>("recent");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [composeExpanded, setComposeExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);
  const [inlineAnswer, setInlineAnswer] = useState("");

  const handleSubmit = async () => {
    if (!newTitle.trim() || !newCategory) return;
    await createQuestion.mutateAsync({
      title: newTitle.trim(),
      description: newDescription.trim() || undefined,
      category: newCategory,
    });
    setNewTitle("");
    setNewDescription("");
    setNewCategory("");
    sessionStorage.removeItem("qa_draft_title");
    sessionStorage.removeItem("qa_draft_desc");
    sessionStorage.removeItem("qa_draft_cat");
    setComposeExpanded(false);
  };

  const handleInlineAnswer = async (questionId: string) => {
    if (!inlineAnswer.trim()) return;
    await createAnswer.mutateAsync({
      question_id: questionId,
      content: inlineAnswer.trim(),
    });
    setInlineAnswer("");
    setExpandedQuestionId(null);
  };

  const getCategoryLabel = (value: string) =>
    QA_CATEGORIES.find((c) => c.value === value)?.label || value;

  const filteredQuestions = useMemo(() => {
    let result = [...questions];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          (item.description && item.description.toLowerCase().includes(q))
      );
    }
    switch (sortMode) {
      case "most_answered":
        result.sort((a, b) => b.answers_count - a.answers_count);
        break;
      case "unanswered":
        result = result.filter((q) => q.answers_count === 0);
        break;
      default:
        break;
    }
    return result;
  }, [questions, searchQuery, sortMode]);

  if (selectedQuestion) {
    return (
      <QAQuestionDetail
        questionId={selectedQuestion}
        onBack={() => setSelectedQuestion(null)}
      />
    );
  }

  const activeFilterCount = (selectedCategory ? 1 : 0) + (sortMode !== "recent" ? 1 : 0);

  return (
    <div className="space-y-4">
      {/* ── Compose Box ── */}
      {/* Engagement banner */}
      <div className="rounded-2xl bg-primary/5 border border-primary/10 p-4 space-y-2">
        <p className="text-sm font-semibold text-foreground">🚀 Essa é a sua comunidade!</p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Tem dúvida, ideia ou dica? Joga aqui 👇<br />
          💡 Pode ser simples: destino, fornecedor, cliente difícil…
        </p>
        <p className="text-xs text-muted-foreground/80 italic">
          👉 Quem pergunta aprende. Quem responde cresce.
        </p>
      </div>

      <Card className="rounded-2xl border-border/50 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {!canComment ? (
            <div className="flex items-center gap-3 p-4 text-sm text-muted-foreground bg-muted/20">
              <Lock className="h-4 w-4 flex-shrink-0" />
              <span>Você pode visualizar as perguntas, mas para comentar ou perguntar é necessário o <strong>Plano Fundador</strong>.</span>
            </div>
          ) : !composeExpanded ? (
            <button
              onClick={() => setComposeExpanded(true)}
              className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/30 transition-colors"
            >
              <Avatar className="h-9 w-9 flex-shrink-0 ring-2 ring-primary/10">
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                  {user?.email?.charAt(0).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 h-10 rounded-full bg-muted/40 border border-border/40 flex items-center px-4 text-sm text-muted-foreground">
                <MessageSquarePlus className="h-4 w-4 mr-2.5 text-primary/50" />
                Bora movimentar isso? Escreva a primeira pergunta!
              </div>
            </button>
          ) : (
            <div className="p-4 space-y-3 bg-muted/10">
              <div className="flex items-start gap-3">
                <Avatar className="h-9 w-9 flex-shrink-0 mt-0.5 ring-2 ring-primary/10">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                    {user?.email?.charAt(0).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-3">
                  <Input
                    placeholder="Qual é a sua dúvida?"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    maxLength={200}
                    className="rounded-xl border-border/50 h-10 text-sm font-medium bg-background"
                    autoFocus
                  />
                  <Textarea
                    placeholder="Adicione mais detalhes (opcional)..."
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    maxLength={1000}
                    rows={3}
                    className="rounded-xl border-border/50 text-sm resize-none bg-background"
                  />
                  <div className="flex items-center justify-between gap-3">
                    <Select value={newCategory} onValueChange={setNewCategory}>
                      <SelectTrigger className="rounded-full w-48 h-9 text-xs bg-background border-border/50">
                        <SelectValue placeholder="Selecione a categoria *" />
                      </SelectTrigger>
                      <SelectContent>
                        {QA_CATEGORIES.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-9 rounded-full"
                        onClick={() => {
                          setComposeExpanded(false);
                          setNewTitle("");
                          setNewDescription("");
                          setNewCategory("");
                        }}
                      >
                        Cancelar
                      </Button>
                      <Button
                        onClick={handleSubmit}
                        disabled={!newTitle.trim() || !newCategory || createQuestion.isPending}
                        size="sm"
                        className="rounded-full h-9 gap-1.5 px-5 shadow-sm shadow-primary/20"
                      >
                        <Send className="h-3.5 w-3.5" />
                        {createQuestion.isPending ? "Publicando..." : "Publicar"}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Search + Sort + Filters toolbar ── */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
          <Input
            placeholder="Buscar perguntas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-9 rounded-full bg-muted/30 border-border/40 text-sm placeholder:text-muted-foreground/50"
          />
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            {(
              [
                { key: "recent", label: "Recentes" },
                { key: "most_answered", label: "Mais respondidas" },
                { key: "unanswered", label: "Sem resposta" },
              ] as { key: SortMode; label: string }[]
            ).map((s) => (
              <Button
                key={s.key}
                variant={sortMode === s.key ? "secondary" : "ghost"}
                size="sm"
                className={`h-7 text-[11px] rounded-full px-3 ${
                  sortMode === s.key ? "font-semibold shadow-sm" : "text-muted-foreground"
                }`}
                onClick={() => setSortMode(s.key)}
              >
                {s.label}
              </Button>
            ))}
          </div>
          <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1.5 h-7 text-[11px] rounded-full text-muted-foreground">
                <Filter className="h-3 w-3" />
                Categorias
                {activeFilterCount > 0 && (
                  <span className="h-4 w-4 rounded-full bg-primary text-primary-foreground text-[9px] flex items-center justify-center font-bold">
                    {activeFilterCount}
                  </span>
                )}
                <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${filtersOpen ? "rotate-180" : ""}`} />
              </Button>
            </CollapsibleTrigger>
          </Collapsible>
        </div>

        <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
          <CollapsibleContent>
            <div className="flex gap-1.5 flex-wrap p-3 bg-muted/20 rounded-xl border border-border/30">
              <Button
                variant={selectedCategory === null ? "default" : "ghost"}
                size="sm"
                className="h-7 text-[11px] rounded-full px-3"
                onClick={() => setSelectedCategory(null)}
              >
                Todas
              </Button>
              {QA_CATEGORIES.map((cat) => (
                <Button
                  key={cat.value}
                  variant={selectedCategory === cat.value ? "default" : "ghost"}
                  size="sm"
                  className="h-7 text-[11px] rounded-full px-3"
                  onClick={() => setSelectedCategory(selectedCategory === cat.value ? null : cat.value)}
                >
                  {cat.label}
                </Button>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* ── Questions list ── */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border border-border/40 p-4 space-y-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-3/4 mb-1.5" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
              <Skeleton className="h-3 w-full" />
            </div>
          ))}
        </div>
      ) : filteredQuestions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 py-16 text-center">
          <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
            <MessageCircle className="h-7 w-7 text-muted-foreground/40" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">Nenhuma pergunta encontrada</p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Seja o primeiro a perguntar!
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredQuestions.map((q) => (
            <QuestionCard
              key={q.id}
              question={q}
              getCategoryLabel={getCategoryLabel}
              onSelect={() => setSelectedQuestion(q.id)}
              isExpanded={expandedQuestionId === q.id}
              onToggleExpand={() => {
                setExpandedQuestionId(expandedQuestionId === q.id ? null : q.id);
                setInlineAnswer("");
              }}
              inlineAnswer={inlineAnswer}
              onInlineAnswerChange={setInlineAnswer}
              onSubmitInlineAnswer={() => handleInlineAnswer(q.id)}
              isSubmitting={createAnswer.isPending}
              getAnswersQuery={getAnswersQuery}
              onToggleLike={(answerId: string) => toggleAnswerLike.mutate({ answerId, questionId: q.id })}
              canComment={canComment}
              isAdmin={isAdmin}
              onDeleteQuestion={() => deleteQuestion.mutate(q.id)}
              onDeleteAnswer={(answerId: string) => deleteAnswer.mutate({ answerId, questionId: q.id })}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Question Card ── */

interface QuestionCardProps {
  question: any;
  getCategoryLabel: (v: string) => string;
  onSelect: () => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  inlineAnswer: string;
  onInlineAnswerChange: (v: string) => void;
  onSubmitInlineAnswer: () => void;
  isSubmitting: boolean;
  getAnswersQuery: (id: string) => any;
  onToggleLike: (answerId: string) => void;
  canComment: boolean;
  isAdmin: boolean;
  onDeleteQuestion: () => void;
  onDeleteAnswer: (answerId: string) => void;
}

function QuestionCard({
  question: q,
  getCategoryLabel,
  onSelect,
  isExpanded,
  onToggleExpand,
  inlineAnswer,
  onInlineAnswerChange,
  onSubmitInlineAnswer,
  isSubmitting,
  getAnswersQuery,
  onToggleLike,
  canComment,
  isAdmin,
  onDeleteQuestion,
  onDeleteAnswer,
}: QuestionCardProps) {
  const { user } = useAuth();
  const answersQuery = useQuery({ ...getAnswersQuery(q.id), enabled: isExpanded });
  const answers = (answersQuery.data || []) as any[];

  // Fetch likes for this question's answers
  const likesQuery = useQuery({
    queryKey: ["qa-answer-likes", q.id],
    queryFn: async () => {
      const answerIds = answers.map((a: any) => a.id);
      if (answerIds.length === 0) return { counts: {}, userLikes: new Set<string>() };
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
    enabled: isExpanded && answers.length > 0,
  });

  const likeCounts = likesQuery.data?.counts || {};
  const userLikes = likesQuery.data?.userLikes || new Set<string>();

  return (
    <Card className={`rounded-2xl border-border/40 transition-all duration-200 hover:shadow-md hover:border-border/60 group ${
      isExpanded ? "shadow-md border-primary/20 bg-card" : ""
    }`}>
      <CardContent className="p-4">
        {/* Question header */}
        <div className="flex items-start gap-3 cursor-pointer" onClick={onSelect}>
          <Avatar className="h-10 w-10 flex-shrink-0 ring-2 ring-background shadow-sm">
            <AvatarImage src={q.author_avatar || undefined} />
            <AvatarFallback className="text-xs bg-primary/10 text-primary font-bold">
              {(q.author_name || "U").charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            {/* Author + time row */}
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold text-foreground">
                {q.author_name}
              </span>
              <span className="text-[10px] text-muted-foreground/60">•</span>
              <span className="text-[10px] text-muted-foreground/60 flex items-center gap-0.5">
                <Clock className="h-2.5 w-2.5" />
                {formatDistanceToNow(new Date(q.created_at), {
                  addSuffix: true,
                  locale: ptBR,
                })}
              </span>
              <Badge variant="secondary" className="text-[9px] rounded-full font-medium h-[18px] px-2 ml-auto">
                {getCategoryLabel(q.category)}
              </Badge>
              {q.is_resolved && (
                <Badge className="bg-success/15 text-success border-success/20 gap-0.5 text-[9px] h-[18px] px-2">
                  <CheckCircle2 className="h-2.5 w-2.5" />
                  Resolvida
                </Badge>
              )}
            </div>
            {/* Title */}
            <h3 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors leading-snug line-clamp-2">
              {q.title}
            </h3>
            {/* Description preview */}
            {q.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{q.description}</p>
            )}
          </div>
        </div>

        {/* Stats + actions */}
        <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-border/30 ml-[52px]">
          <div className="flex items-center gap-3.5">
            <button className="text-[11px] text-muted-foreground flex items-center gap-1 hover:text-foreground transition-colors">
              <MessageCircle className="h-3.5 w-3.5" />
              {q.answers_count}
            </button>
            <button className="text-[11px] text-muted-foreground flex items-center gap-1 hover:text-primary transition-colors">
              <ThumbsUp className="h-3.5 w-3.5" />
              {(q as any).useful_count || 0}
            </button>
            <span className="text-[11px] text-muted-foreground/50 flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" />
              {(q as any).views_count || 0}
            </span>
            {isAdmin && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    className="text-[11px] text-destructive/60 hover:text-destructive flex items-center gap-1 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir pergunta?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Essa ação excluirá a pergunta e todas as respostas associadas. Não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={onDeleteQuestion} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Excluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
          <Button
            variant={isExpanded ? "secondary" : "ghost"}
            size="sm"
            className="h-7 text-[11px] gap-1.5 rounded-full px-3"
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand();
            }}
          >
            <MessageCircle className="h-3 w-3" />
            Responder
            {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </Button>
        </div>

        {/* No answers nudge */}
        {q.answers_count === 0 && !isExpanded && (
          <div className="mt-2.5 ml-[52px] flex items-center gap-1.5 text-[11px] text-muted-foreground/50">
            <AlertCircle className="h-3 w-3" />
            Sem respostas ainda — seja o primeiro a ajudar!
          </div>
        )}

        {/* Expanded: inline answers + reply */}
        {isExpanded && (
          <div className="mt-3 ml-[52px] space-y-3 border-t border-border/30 pt-3">
            {answersQuery.isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-14 w-full rounded-xl" />
              </div>
            ) : answers.length > 0 ? (
              <div className="space-y-2">
                {answers.slice(0, 3).map((a: any) => (
                  <div key={a.id} className={`flex items-start gap-2.5 p-3 rounded-xl ${
                    a.is_best_answer ? "bg-success/8 ring-1 ring-success/20" : "bg-muted/20"
                  }`}>
                    <Avatar className="h-7 w-7 flex-shrink-0">
                      <AvatarImage src={a.author_avatar || undefined} />
                      <AvatarFallback className="text-[10px] bg-muted font-medium">
                        {(a.author_name || "U").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold text-foreground">{a.author_name}</span>
                        <span className="text-[10px] text-muted-foreground/50">
                          {formatDistanceToNow(new Date(a.created_at), { addSuffix: true, locale: ptBR })}
                        </span>
                        {a.is_best_answer && (
                          <Badge className="bg-success/15 text-success border-success/20 text-[8px] h-4 gap-0.5 px-1.5">
                            <CheckCircle2 className="h-2.5 w-2.5" /> Melhor
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-foreground/80 mt-1 whitespace-pre-wrap line-clamp-3 leading-relaxed">{a.content}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <button
                          className={`flex items-center gap-1 text-[11px] transition-colors ${
                            userLikes.has(a.id) ? "text-red-500" : "text-muted-foreground hover:text-red-500"
                          }`}
                          onClick={(e) => { e.stopPropagation(); onToggleLike(a.id); }}
                        >
                          <Heart className={`h-3 w-3 ${userLikes.has(a.id) ? "fill-current" : ""}`} />
                          {likeCounts[a.id] || 0}
                        </button>
                        {isAdmin && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <button
                                className="text-[11px] text-destructive/50 hover:text-destructive flex items-center gap-1 transition-colors"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir resposta?</AlertDialogTitle>
                                <AlertDialogDescription>Essa ação não pode ser desfeita.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => onDeleteAnswer(a.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {answers.length > 3 && (
                  <Button variant="link" size="sm" className="text-[11px] h-auto p-0 text-primary" onClick={onSelect}>
                    Ver todas as {answers.length} respostas →
                  </Button>
                )}
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground/50 italic py-1">
                Sem respostas ainda. Seja o primeiro a ajudar!
              </p>
            )}

            {/* Inline reply */}
            {canComment ? (
              <div className="flex items-start gap-2.5">
                <Avatar className="h-7 w-7 flex-shrink-0 mt-0.5">
                  <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-medium">U</AvatarFallback>
                </Avatar>
                <div className="flex-1 flex gap-2">
                  <Textarea
                    placeholder="Escreva sua resposta..."
                    value={inlineAnswer}
                    onChange={(e) => onInlineAnswerChange(e.target.value)}
                    maxLength={2000}
                    rows={2}
                    className="rounded-xl text-xs resize-none border-border/40 flex-1 min-h-[56px] bg-background"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <Button
                    size="icon"
                    className="h-8 w-8 rounded-full flex-shrink-0 mt-auto shadow-sm shadow-primary/20"
                    disabled={!inlineAnswer.trim() || isSubmitting}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSubmitInlineAnswer();
                    }}
                  >
                    <Send className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 text-xs text-muted-foreground">
                <Lock className="h-3.5 w-3.5" />
                <span>Faça upgrade para o Plano Fundador para responder.</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
