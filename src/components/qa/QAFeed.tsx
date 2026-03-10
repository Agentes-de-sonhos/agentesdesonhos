import { useState, useMemo, useEffect } from "react";
import { useQA, QA_CATEGORIES } from "@/hooks/useQA";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { MessageCircle, CheckCircle2, Filter, Clock, ThumbsUp, Eye, ArrowUpDown, ChevronDown, Sparkles, Send } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { QAQuestionDetail } from "./QAQuestionDetail";

interface QAFeedProps {
  searchQuery?: string;
  showNewQuestionDialog?: boolean;
  onCloseNewQuestion?: () => void;
}

type SortMode = "recent" | "most_answered" | "unanswered";

export function QAFeed({ searchQuery = "", showNewQuestionDialog = false, onCloseNewQuestion }: QAFeedProps) {
  const { questions, isLoading, selectedCategory, setSelectedCategory, createQuestion } = useQA();
  const [showNewQuestion, setShowNewQuestion] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("recent");
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    if (showNewQuestionDialog) setShowNewQuestion(true);
  }, [showNewQuestionDialog]);

  const handleCloseDialog = (open: boolean) => {
    setShowNewQuestion(open);
    if (!open) onCloseNewQuestion?.();
  };

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
    handleCloseDialog(false);
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
      </div>

      {/* Collapsible category filters */}
      <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2 h-8 text-xs rounded-lg">
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
        <CollapsibleContent className="mt-3">
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
                className={`h-7 text-xs rounded-full px-3 ${
                  selectedCategory === cat.value ? "" : "bg-background"
                }`}
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
            <Card
              key={q.id}
              className="cursor-pointer rounded-xl transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:border-primary/30 group"
              onClick={() => setSelectedQuestion(q.id)}
            >
              <CardContent className="py-4">
                <div className="flex items-start gap-3">
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
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <Badge variant="secondary" className="text-[10px] rounded-full font-medium">
                        {getCategoryLabel(q.category)}
                      </Badge>
                      <span className="text-xs text-muted-foreground font-medium">
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
                    </div>
                    <div className="flex items-center gap-4 mt-2.5">
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
                        {(q as any).views_count || 0} visualizações
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* New Question Dialog - Premium style */}
      <Dialog open={showNewQuestion} onOpenChange={handleCloseDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-primary/15 flex items-center justify-center">
                <Sparkles className="h-4.5 w-4.5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-lg">Fazer uma Pergunta</DialogTitle>
                <DialogDescription className="text-xs">
                  Compartilhe sua dúvida com a comunidade e ganhe +0.25 pontos
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Tema da pergunta *</label>
              <Select value={newCategory} onValueChange={setNewCategory}>
                <SelectTrigger className="rounded-xl">
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
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Sua pergunta *</label>
              <Input
                placeholder="Qual é a sua dúvida?"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                maxLength={200}
                className="rounded-xl"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Detalhes (opcional)</label>
              <Textarea
                placeholder="Adicione mais contexto à sua pergunta..."
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                maxLength={1000}
                rows={4}
                className="rounded-xl"
              />
            </div>
            <Button
              onClick={handleSubmit}
              disabled={!newTitle.trim() || !newCategory || createQuestion.isPending}
              className="w-full rounded-xl h-11 gap-2 shadow-lg shadow-primary/20"
            >
              <Send className="h-4 w-4" />
              {createQuestion.isPending ? "Publicando..." : "Publicar Pergunta"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
