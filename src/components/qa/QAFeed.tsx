import { useState, useMemo } from "react";
import { useQA, QA_CATEGORIES } from "@/hooks/useQA";
import { useAuth } from "@/hooks/useAuth";
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
  MessageCircle, CheckCircle2, Filter, Clock, ThumbsUp, Eye,
  ArrowUpDown, ChevronDown, Send, Search, ChevronUp, MessageSquarePlus,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { QAQuestionDetail } from "./QAQuestionDetail";
import { useQuery } from "@tanstack/react-query";

type SortMode = "recent" | "most_answered" | "unanswered";

export function QAFeed() {
  const { user } = useAuth();
  const { questions, isLoading, selectedCategory, setSelectedCategory, createQuestion, createAnswer, getAnswersQuery } = useQA();
  const [selectedQuestion, setSelectedQuestion] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newCategory, setNewCategory] = useState("");
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
      {/* Inline compose box */}
      <Card className="rounded-xl border-border/60 shadow-sm">
        <CardContent className="p-4">
          {!composeExpanded ? (
            <button
              onClick={() => setComposeExpanded(true)}
              className="w-full flex items-center gap-3 text-left"
            >
              <Avatar className="h-9 w-9 flex-shrink-0">
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                  {user?.email?.charAt(0).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 h-10 rounded-xl bg-muted/50 border border-border/50 flex items-center px-4 text-sm text-muted-foreground hover:bg-muted/80 transition-colors cursor-text">
                <MessageSquarePlus className="h-4 w-4 mr-2 text-muted-foreground/60" />
                Faça uma pergunta para a comunidade...
              </div>
            </button>
          ) : (
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Avatar className="h-9 w-9 flex-shrink-0 mt-0.5">
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
                    className="rounded-xl border-border/60 h-10 text-sm"
                    autoFocus
                  />
                  <Textarea
                    placeholder="Adicione mais detalhes (opcional)..."
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    maxLength={1000}
                    rows={3}
                    className="rounded-xl border-border/60 text-sm resize-none"
                  />
                  <div className="flex items-center justify-between gap-3">
                    <Select value={newCategory} onValueChange={setNewCategory}>
                      <SelectTrigger className="rounded-xl w-48 h-9 text-xs">
                        <SelectValue placeholder="Categoria *" />
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
                        className="text-xs h-9"
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
                        className="rounded-xl h-9 gap-1.5 px-4 shadow-sm"
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

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar perguntas na comunidade..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 h-10 rounded-xl bg-background border-border/60 text-sm"
        />
      </div>

      {/* Sort bar + Collapsible filters */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
          {(
            [
              { key: "recent", label: "Recentes" },
              { key: "most_answered", label: "Mais respondidas" },
              { key: "unanswered", label: "Sem resposta" },
            ] as { key: SortMode; label: string }[]
          ).map((s) => (
            <Button
              key={s.key}
              variant={sortMode === s.key ? "default" : "ghost"}
              size="sm"
              className="h-8 text-xs rounded-lg"
              onClick={() => setSortMode(s.key)}
            >
              {s.label}
            </Button>
          ))}
        </div>
        <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs rounded-lg">
              <Filter className="h-3.5 w-3.5" />
              Filtros
              {activeFilterCount > 0 && (
                <Badge variant="default" className="h-4 w-4 p-0 flex items-center justify-center text-[9px] rounded-full">
                  {activeFilterCount}
                </Badge>
              )}
              <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${filtersOpen ? "rotate-180" : ""}`} />
            </Button>
          </CollapsibleTrigger>
        </Collapsible>
      </div>

      {/* Category filter chips (collapsible) */}
      <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
        <CollapsibleContent>
          <div className="flex gap-2 flex-wrap p-3 bg-muted/30 rounded-xl border border-border/50">
            <Button
              variant={selectedCategory === null ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs rounded-full px-3"
              onClick={() => setSelectedCategory(null)}
            >
              Todas
            </Button>
            {QA_CATEGORIES.map((cat) => (
              <Button
                key={cat.value}
                variant={selectedCategory === cat.value ? "default" : "outline"}
                size="sm"
                className={`h-7 text-xs rounded-full px-3 ${selectedCategory === cat.value ? "" : "bg-background"}`}
                onClick={() => setSelectedCategory(selectedCategory === cat.value ? null : cat.value)}
              >
                {cat.label}
              </Button>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Questions list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="rounded-xl">
              <CardContent className="py-4">
                <Skeleton className="h-5 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredQuestions.length === 0 ? (
        <Card className="rounded-xl">
          <CardContent className="py-12 text-center">
            <MessageCircle className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground">Nenhuma pergunta encontrada.</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Seja o primeiro a perguntar!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
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
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Individual Question Card with inline reply ── */

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
}: QuestionCardProps) {
  const answersQuery = useQuery({ ...getAnswersQuery(q.id), enabled: isExpanded });
  const answers = (answersQuery.data || []) as any[];

  return (
    <Card className="rounded-xl transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:border-primary/20 group">
      <CardContent className="py-4">
        {/* Question header - clickable to detail */}
        <div
          className="flex items-start gap-3 cursor-pointer"
          onClick={onSelect}
        >
          <Avatar className="h-10 w-10 flex-shrink-0 ring-2 ring-background">
            <AvatarImage src={q.author_avatar || undefined} />
            <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
              {(q.author_name || "U").charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-sm line-clamp-2 text-foreground group-hover:text-primary transition-colors">
                {q.title}
              </h3>
              {q.is_resolved && (
                <Badge variant="default" className="bg-success text-success-foreground gap-1 text-[10px] h-5">
                  <CheckCircle2 className="h-3 w-3" />
                  Resolvida
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-xs font-medium text-foreground/80">
                {q.author_name}
              </span>
              <span className="text-xs text-muted-foreground">•</span>
              <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                <Clock className="h-3 w-3" />
                {formatDistanceToNow(new Date(q.created_at), {
                  addSuffix: true,
                  locale: ptBR,
                })}
              </span>
              <span className="text-xs text-muted-foreground">•</span>
              <Badge variant="secondary" className="text-[10px] rounded-full font-medium h-5">
                {getCategoryLabel(q.category)}
              </Badge>
            </div>
          </div>
        </div>

        {/* Stats + actions row */}
        <div className="flex items-center justify-between mt-3 ml-[52px]">
          <div className="flex items-center gap-4">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <MessageCircle className="h-3.5 w-3.5" />
              {q.answers_count} {q.answers_count === 1 ? "resposta" : "respostas"}
            </span>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <ThumbsUp className="h-3.5 w-3.5" />
              {(q as any).useful_count || 0} úteis
            </span>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" />
              {(q as any).views_count || 0}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs gap-1.5 text-primary hover:text-primary rounded-lg"
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand();
            }}
          >
            <MessageCircle className="h-3.5 w-3.5" />
            Responder
            {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </Button>
        </div>

        {/* No answers nudge */}
        {q.answers_count === 0 && !isExpanded && (
          <p className="text-xs text-muted-foreground/70 mt-2 ml-[52px] italic">
            Sem respostas ainda. Seja o primeiro a ajudar!
          </p>
        )}

        {/* Expanded: inline answers + reply */}
        {isExpanded && (
          <div className="mt-4 ml-[52px] space-y-3 border-t border-border/50 pt-4">
            {/* Existing answers */}
            {answersQuery.isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-16 w-full rounded-lg" />
              </div>
            ) : answers.length > 0 ? (
              <div className="space-y-2.5">
                {answers.slice(0, 3).map((a: any) => (
                  <div key={a.id} className={`flex items-start gap-2.5 p-3 rounded-lg ${a.is_best_answer ? "bg-success/10 border border-success/20" : "bg-muted/30"}`}>
                    <Avatar className="h-7 w-7 flex-shrink-0">
                      <AvatarImage src={a.author_avatar || undefined} />
                      <AvatarFallback className="text-[10px]">
                        {(a.author_name || "U").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium">{a.author_name}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(a.created_at), { addSuffix: true, locale: ptBR })}
                        </span>
                        {a.is_best_answer && (
                          <Badge className="bg-success text-success-foreground text-[9px] h-4 gap-0.5">
                            <CheckCircle2 className="h-2.5 w-2.5" /> Melhor
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-foreground/90 mt-1 whitespace-pre-wrap line-clamp-3">{a.content}</p>
                    </div>
                  </div>
                ))}
                {answers.length > 3 && (
                  <Button variant="link" size="sm" className="text-xs h-auto p-0" onClick={onSelect}>
                    Ver todas as {answers.length} respostas →
                  </Button>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground/70 italic">
                Sem respostas ainda. Seja o primeiro a ajudar!
              </p>
            )}

            {/* Inline reply field */}
            <div className="flex items-start gap-2.5 pt-1">
              <Avatar className="h-7 w-7 flex-shrink-0 mt-0.5">
                <AvatarFallback className="text-[10px] bg-primary/10 text-primary">U</AvatarFallback>
              </Avatar>
              <div className="flex-1 flex gap-2">
                <Textarea
                  placeholder="Escreva sua resposta..."
                  value={inlineAnswer}
                  onChange={(e) => onInlineAnswerChange(e.target.value)}
                  maxLength={2000}
                  rows={2}
                  className="rounded-xl text-xs resize-none border-border/60 flex-1 min-h-[60px]"
                  onClick={(e) => e.stopPropagation()}
                />
                <Button
                  size="icon"
                  className="h-9 w-9 rounded-xl flex-shrink-0 mt-auto shadow-sm"
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
          </div>
        )}
      </CardContent>
    </Card>
  );
}
