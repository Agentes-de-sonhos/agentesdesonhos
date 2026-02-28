import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Trash2, CheckCircle2, XCircle, GraduationCap } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAcademyAdmin } from "@/hooks/useAcademy";

interface QuestionOption {
  option_text: string;
  is_correct: boolean;
  order_index: number;
}

interface ExistingQuestion {
  id: string;
  question_text: string;
  question_type: string;
  order_index: number;
  options: { id: string; option_text: string; is_correct: boolean; order_index: number }[];
}

interface Props {
  trailId: string;
}

export function TrailExamManager({ trailId }: Props) {
  const { saveExamQuestion, deleteExamQuestion } = useAcademyAdmin();

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [questionText, setQuestionText] = useState("");
  const [questionType, setQuestionType] = useState<"single_choice" | "multiple_choice" | "true_false">("single_choice");
  const [options, setOptions] = useState<QuestionOption[]>([
    { option_text: "", is_correct: true, order_index: 0 },
    { option_text: "", is_correct: false, order_index: 1 },
  ]);

  const { data: examQuestions = [], refetch } = useQuery({
    queryKey: ["admin-exam-questions", trailId],
    queryFn: async () => {
      const { data: questions } = await supabase
        .from("trail_exam_questions")
        .select("*")
        .eq("trail_id", trailId)
        .order("order_index");
      if (!questions || questions.length === 0) return [];
      const questionIds = questions.map((q) => q.id);
      const { data: opts } = await supabase
        .from("trail_exam_options")
        .select("*")
        .in("question_id", questionIds)
        .order("order_index");
      return questions.map((q) => ({
        ...q,
        options: (opts || []).filter((o) => o.question_id === q.id),
      })) as ExistingQuestion[];
    },
    enabled: !!trailId,
  });

  const resetForm = () => {
    setQuestionText("");
    setQuestionType("single_choice");
    setOptions([
      { option_text: "", is_correct: true, order_index: 0 },
      { option_text: "", is_correct: false, order_index: 1 },
    ]);
  };

  const handleSetQuestionType = (type: "single_choice" | "multiple_choice" | "true_false") => {
    setQuestionType(type);
    if (type === "true_false") {
      setOptions([
        { option_text: "Verdadeiro", is_correct: true, order_index: 0 },
        { option_text: "Falso", is_correct: false, order_index: 1 },
      ]);
    }
  };

  const handleToggleCorrect = (index: number) => {
    if (questionType === "single_choice" || questionType === "true_false") {
      setOptions(options.map((o, i) => ({ ...o, is_correct: i === index })));
    } else {
      setOptions(options.map((o, i) => i === index ? { ...o, is_correct: !o.is_correct } : o));
    }
  };

  const handleSaveQuestion = async () => {
    if (!questionText.trim() || options.some((o) => !o.option_text.trim()) || !options.some((o) => o.is_correct)) return;
    await saveExamQuestion.mutateAsync({
      trailId,
      question: {
        question_text: questionText,
        question_type: questionType,
        order_index: examQuestions.length,
      },
      options: options.map((o) => ({
        option_text: o.option_text,
        is_correct: o.is_correct,
        order_index: o.order_index,
      })),
    });
    setAddDialogOpen(false);
    resetForm();
    refetch();
  };

  const handleDeleteQuestion = async () => {
    if (!deleteConfirmId) return;
    await deleteExamQuestion.mutateAsync(deleteConfirmId);
    setDeleteConfirmId(null);
    refetch();
  };

  return (
    <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-primary" />
          <Label className="text-sm font-semibold">Prova Final da Trilha</Label>
          {examQuestions.length > 0 && (
            <Badge variant="secondary" className="text-xs">{examQuestions.length} perguntas</Badge>
          )}
        </div>
        <Button size="sm" onClick={() => { resetForm(); setAddDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Pergunta
        </Button>
      </div>

      {examQuestions.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-8">
          Nenhuma pergunta cadastrada. Clique em "+ Pergunta" para começar.
        </p>
      ) : (
        <div className="space-y-2">
          {examQuestions.map((q, idx) => (
            <div key={q.id} className="border rounded-lg p-3 space-y-1.5 bg-muted/20">
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium text-sm flex-1">
                  <span className="text-muted-foreground mr-2">{idx + 1}.</span>
                  {q.question_text}
                </p>
                <Button variant="ghost" size="sm" className="h-7 px-1" onClick={() => setDeleteConfirmId(q.id)}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
              <Badge variant="outline" className="text-xs">
                {q.question_type === "single_choice" ? "Escolha Única" : q.question_type === "multiple_choice" ? "Múltipla Escolha" : "V/F"}
              </Badge>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 mt-1">
                {q.options.map((opt) => (
                  <div
                    key={opt.id}
                    className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded ${
                      opt.is_correct
                        ? "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400"
                        : "bg-muted/50"
                    }`}
                  >
                    {opt.is_correct ? <CheckCircle2 className="h-3 w-3 shrink-0" /> : <XCircle className="h-3 w-3 shrink-0 opacity-30" />}
                    {opt.option_text}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Question Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova Pergunta da Prova Final</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            <div>
              <Label>Texto da Pergunta</Label>
              <Input value={questionText} onChange={(e) => setQuestionText(e.target.value)} placeholder="Ex: Qual é o principal atrativo?" />
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={questionType} onValueChange={(v) => handleSetQuestionType(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="single_choice">Escolha Única</SelectItem>
                  <SelectItem value="multiple_choice">Múltipla Escolha</SelectItem>
                  <SelectItem value="true_false">Verdadeiro/Falso</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Opções</Label>
              {options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleCorrect(i)}
                    className={`shrink-0 p-1 rounded-full transition-colors ${opt.is_correct ? "text-green-600 bg-green-100 dark:bg-green-950/40" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    {opt.is_correct ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                  </button>
                  <Input
                    value={opt.option_text}
                    onChange={(e) => { const n = [...options]; n[i].option_text = e.target.value; setOptions(n); }}
                    placeholder={`Opção ${i + 1}`}
                    disabled={questionType === "true_false"}
                    className="flex-1"
                  />
                  {questionType !== "true_false" && options.length > 2 && (
                    <Button variant="ghost" size="icon" onClick={() => setOptions(options.filter((_, j) => j !== i).map((o, j) => ({ ...o, order_index: j })))}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              {questionType !== "true_false" && options.length < 6 && (
                <Button variant="outline" size="sm" onClick={() => setOptions([...options, { option_text: "", is_correct: false, order_index: options.length }])} className="w-full">
                  <Plus className="h-4 w-4 mr-1" /> Adicionar Opção
                </Button>
              )}
            </div>
            <Button
              onClick={handleSaveQuestion}
              className="w-full"
              disabled={!questionText.trim() || options.some((o) => !o.option_text.trim()) || !options.some((o) => o.is_correct)}
            >
              Salvar Pergunta
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Pergunta</AlertDialogTitle>
            <AlertDialogDescription>A pergunta e suas opções serão removidas permanentemente.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteQuestion}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
