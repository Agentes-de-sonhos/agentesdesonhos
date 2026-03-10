import { useState } from "react";
import { useQA, QA_CATEGORIES } from "@/hooks/useQA";
import { useGamification } from "@/hooks/useGamification";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, MessageCircle, CheckCircle2, Star, Filter } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { QAQuestionDetail } from "./QAQuestionDetail";

export function QAFeed() {
  const { questions, isLoading, selectedCategory, setSelectedCategory, createQuestion } = useQA();
  const { myPoints } = useGamification();
  const [showNewQuestion, setShowNewQuestion] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newCategory, setNewCategory] = useState("geral");

  const handleSubmit = async () => {
    if (!newTitle.trim()) return;
    await createQuestion.mutateAsync({
      title: newTitle.trim(),
      description: newDescription.trim() || undefined,
      category: newCategory,
    });
    setNewTitle("");
    setNewDescription("");
    setNewCategory("geral");
    setShowNewQuestion(false);
  };

  const getCategoryLabel = (value: string) =>
    QA_CATEGORIES.find((c) => c.value === value)?.label || value;

  if (selectedQuestion) {
    return (
      <QAQuestionDetail
        questionId={selectedQuestion}
        onBack={() => setSelectedQuestion(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Points banner */}
      <Card className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
        <CardContent className="py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Star className="h-5 w-5 text-warning" />
            <span className="font-medium text-sm">Seus pontos:</span>
            <span className="font-bold text-lg text-primary">{myPoints}</span>
          </div>
          <Dialog open={showNewQuestion} onOpenChange={setShowNewQuestion}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Nova Pergunta
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Fazer uma Pergunta</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Categoria</label>
                  <Select value={newCategory} onValueChange={setNewCategory}>
                    <SelectTrigger>
                      <SelectValue />
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
                  <label className="text-sm font-medium mb-1 block">Pergunta</label>
                  <Input
                    placeholder="Qual é a sua dúvida?"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    maxLength={200}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Detalhes (opcional)</label>
                  <Textarea
                    placeholder="Adicione mais contexto à sua pergunta..."
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    maxLength={1000}
                    rows={4}
                  />
                </div>
                <Button
                  onClick={handleSubmit}
                  disabled={!newTitle.trim() || createQuestion.isPending}
                  className="w-full"
                >
                  {createQuestion.isPending ? "Publicando..." : "Publicar Pergunta (+0.25 pts)"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {/* Category filter */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={selectedCategory === null ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedCategory(null)}
        >
          <Filter className="h-3.5 w-3.5 mr-1" />
          Todas
        </Button>
        {QA_CATEGORIES.map((cat) => (
          <Button
            key={cat.value}
            variant={selectedCategory === cat.value ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(selectedCategory === cat.value ? null : cat.value)}
          >
            {cat.label}
          </Button>
        ))}
      </div>

      {/* Questions list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="py-4">
                <Skeleton className="h-5 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : questions.length === 0 ? (
        <Card>
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
          {questions.map((q) => (
            <Card
              key={q.id}
              className="cursor-pointer hover:border-primary/40 transition-colors"
              onClick={() => setSelectedQuestion(q.id)}
            >
              <CardContent className="py-4">
                <div className="flex items-start gap-3">
                  <Avatar className="h-9 w-9 flex-shrink-0">
                    <AvatarImage src={q.author_avatar || undefined} />
                    <AvatarFallback className="text-xs">
                      {(q.author_name || "U").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-sm line-clamp-2">{q.title}</h3>
                      {q.is_resolved && (
                        <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <Badge variant="secondary" className="text-[10px]">
                        {getCategoryLabel(q.category)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {q.author_name}
                      </span>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(q.created_at), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </span>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <MessageCircle className="h-3 w-3" />
                        {q.answers_count}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
