import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Plus, Trash2, CheckCircle2, XCircle, ClipboardCheck, GraduationCap } from "lucide-react";
import { useAcademy, useAcademyAdmin } from "@/hooks/useAcademy";
import type { Training, LearningTrail } from "@/types/academy";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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

export function QuizManager() {
  const { trails, trainings, trailTrainings } = useAcademy();
  const { saveQuizQuestion, deleteQuizQuestion, saveExamQuestion, deleteExamQuestion } = useAcademyAdmin();

  const [activeTab, setActiveTab] = useState("quiz");
  const [selectedTrainingId, setSelectedTrainingId] = useState("");
  const [selectedTrailId, setSelectedTrailId] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // New question form
  const [questionText, setQuestionText] = useState("");
  const [questionType, setQuestionType] = useState<"single_choice" | "multiple_choice" | "true_false">("single_choice");
  const [options, setOptions] = useState<QuestionOption[]>([
    { option_text: "", is_correct: true, order_index: 0 },
    { option_text: "", is_correct: false, order_index: 1 },
  ]);

  // Fetch quiz questions for selected training
  const { data: quizQuestions = [], refetch: refetchQuiz } = useQuery({
    queryKey: ["admin-quiz-questions", selectedTrainingId],
    queryFn: async () => {
      if (!selectedTrainingId) return [];
      const { data: questions } = await supabase
        .from("quiz_questions")
        .select("*")
        .eq("training_id", selectedTrainingId)
        .order("order_index");
      if (!questions || questions.length === 0) return [];
      const questionIds = questions.map((q) => q.id);
      const { data: opts } = await supabase
        .from("quiz_options")
        .select("*")
        .in("question_id", questionIds)
        .order("order_index");
      return questions.map((q) => ({
        ...q,
        options: (opts || []).filter((o) => o.question_id === q.id),
      })) as ExistingQuestion[];
    },
    enabled: !!selectedTrainingId,
  });

  // Fetch exam questions for selected trail
  const { data: examQuestions = [], refetch: refetchExam } = useQuery({
    queryKey: ["admin-exam-questions", selectedTrailId],
    queryFn: async () => {
      if (!selectedTrailId) return [];
      const { data: questions } = await supabase
        .from("trail_exam_questions")
        .select("*")
        .eq("trail_id", selectedTrailId)
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
    enabled: !!selectedTrailId,
  });

  const resetForm = () => {
    setQuestionText("");
    setQuestionType("single_choice");
    setOptions([
      { option_text: "", is_correct: true, order_index: 0 },
      { option_text: "", is_correct: false, order_index: 1 },
    ]);
  };

  const handleOpenAddDialog = () => {
    resetForm();
    setAddDialogOpen(true);
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

  const handleAddOption = () => {
    setOptions([...options, { option_text: "", is_correct: false, order_index: options.length }]);
  };

  const handleRemoveOption = (index: number) => {
    if (options.length <= 2) return;
    const newOpts = options.filter((_, i) => i !== index).map((o, i) => ({ ...o, order_index: i }));
    setOptions(newOpts);
  };

  const handleToggleCorrect = (index: number) => {
    if (questionType === "single_choice" || questionType === "true_false") {
      setOptions(options.map((o, i) => ({ ...o, is_correct: i === index })));
    } else {
      setOptions(options.map((o, i) => i === index ? { ...o, is_correct: !o.is_correct } : o));
    }
  };

  const handleSaveQuestion = async () => {
    if (!questionText.trim() || options.some((o) => !o.option_text.trim())) return;
    if (!options.some((o) => o.is_correct)) return;

    const currentQuestions = activeTab === "quiz" ? quizQuestions : examQuestions;

    if (activeTab === "quiz" && selectedTrainingId) {
      await saveQuizQuestion.mutateAsync({
        trainingId: selectedTrainingId,
        question: {
          question_text: questionText,
          question_type: questionType,
          order_index: currentQuestions.length,
        },
        options: options.map((o) => ({
          option_text: o.option_text,
          is_correct: o.is_correct,
          order_index: o.order_index,
        })),
      });
      refetchQuiz();
    } else if (activeTab === "exam" && selectedTrailId) {
      await saveExamQuestion.mutateAsync({
        trailId: selectedTrailId,
        question: {
          question_text: questionText,
          question_type: questionType,
          order_index: currentQuestions.length,
        },
        options: options.map((o) => ({
          option_text: o.option_text,
          is_correct: o.is_correct,
          order_index: o.order_index,
        })),
      });
      refetchExam();
    }

    setAddDialogOpen(false);
    resetForm();
  };

  const handleDeleteQuestion = async () => {
    if (!deleteConfirmId) return;
    if (activeTab === "quiz") {
      await deleteQuizQuestion.mutateAsync(deleteConfirmId);
      refetchQuiz();
    } else {
      await deleteExamQuestion.mutateAsync(deleteConfirmId);
      refetchExam();
    }
    setDeleteConfirmId(null);
  };

  const selectedTraining = trainings.find((t) => t.id === selectedTrainingId);
  const selectedTrail = trails.find((t) => t.id === selectedTrailId);
  const currentQuestions = activeTab === "quiz" ? quizQuestions : examQuestions;
  const canAdd = activeTab === "quiz" ? !!selectedTrainingId : !!selectedTrailId;

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="quiz" className="flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4" /> Quiz dos Módulos
          </TabsTrigger>
          <TabsTrigger value="exam" className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4" /> Prova Final da Trilha
          </TabsTrigger>
        </TabsList>

        {/* Quiz Tab */}
        <TabsContent value="quiz">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
              <CardTitle className="text-lg flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5" /> Quiz do Treinamento
              </CardTitle>
              <div className="flex items-center gap-3 flex-wrap">
                <Select value={selectedTrainingId} onValueChange={setSelectedTrainingId}>
                  <SelectTrigger className="w-[280px]">
                    <SelectValue placeholder="Selecione um treinamento" />
                  </SelectTrigger>
                  <SelectContent>
                    {trainings.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {canAdd && (
                  <Button size="sm" onClick={handleOpenAddDialog}>
                    <Plus className="h-4 w-4 mr-1" /> Pergunta
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!selectedTrainingId ? (
                <p className="text-muted-foreground text-sm text-center py-8">
                  Selecione um treinamento acima para gerenciar o quiz.
                </p>
              ) : (
                <QuestionsList
                  questions={currentQuestions}
                  onDelete={(id) => setDeleteConfirmId(id)}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Exam Tab */}
        <TabsContent value="exam">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
              <CardTitle className="text-lg flex items-center gap-2">
                <GraduationCap className="h-5 w-5" /> Prova Final da Trilha
              </CardTitle>
              <div className="flex items-center gap-3 flex-wrap">
                <Select value={selectedTrailId} onValueChange={setSelectedTrailId}>
                  <SelectTrigger className="w-[280px]">
                    <SelectValue placeholder="Selecione uma trilha" />
                  </SelectTrigger>
                  <SelectContent>
                    {trails.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {canAdd && (
                  <Button size="sm" onClick={handleOpenAddDialog}>
                    <Plus className="h-4 w-4 mr-1" /> Pergunta
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!selectedTrailId ? (
                <p className="text-muted-foreground text-sm text-center py-8">
                  Selecione uma trilha acima para gerenciar a prova final.
                </p>
              ) : (
                <QuestionsList
                  questions={currentQuestions}
                  onDelete={(id) => setDeleteConfirmId(id)}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Question Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova Pergunta</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            <div>
              <Label>Texto da Pergunta</Label>
              <Input
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                placeholder="Ex: Qual é o parque mais visitado de Orlando?"
              />
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={questionType} onValueChange={(v) => handleSetQuestionType(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
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
                    className={`shrink-0 p-1 rounded-full transition-colors ${
                      opt.is_correct
                        ? "text-green-600 bg-green-100 dark:bg-green-950/40"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    title={opt.is_correct ? "Resposta correta" : "Marcar como correta"}
                  >
                    {opt.is_correct ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                  </button>
                  <Input
                    value={opt.option_text}
                    onChange={(e) => {
                      const newOpts = [...options];
                      newOpts[i].option_text = e.target.value;
                      setOptions(newOpts);
                    }}
                    placeholder={`Opção ${i + 1}`}
                    disabled={questionType === "true_false"}
                    className="flex-1"
                  />
                  {questionType !== "true_false" && options.length > 2 && (
                    <Button variant="ghost" size="icon" onClick={() => handleRemoveOption(i)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              {questionType !== "true_false" && options.length < 6 && (
                <Button variant="outline" size="sm" onClick={handleAddOption} className="w-full">
                  <Plus className="h-4 w-4 mr-1" /> Adicionar Opção
                </Button>
              )}
              {!options.some((o) => o.is_correct) && (
                <p className="text-xs text-destructive">Marque ao menos uma opção como correta.</p>
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
            <AlertDialogDescription>
              Tem certeza? A pergunta e suas opções serão removidas permanentemente.
            </AlertDialogDescription>
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

function QuestionsList({ questions, onDelete }: { questions: ExistingQuestion[]; onDelete: (id: string) => void }) {
  if (questions.length === 0) {
    return (
      <p className="text-muted-foreground text-sm text-center py-8">
        Nenhuma pergunta cadastrada. Clique em "+ Pergunta" para começar.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {questions.map((q, idx) => (
        <div key={q.id} className="border rounded-lg p-4 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">
                <span className="text-muted-foreground mr-2">{idx + 1}.</span>
                {q.question_text}
              </p>
              <Badge variant="outline" className="text-xs mt-1">
                {q.question_type === "single_choice" ? "Escolha Única" : q.question_type === "multiple_choice" ? "Múltipla Escolha" : "V/F"}
              </Badge>
            </div>
            <Button variant="ghost" size="icon" onClick={() => onDelete(q.id)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mt-2">
            {q.options.map((opt) => (
              <div
                key={opt.id}
                className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-md ${
                  opt.is_correct
                    ? "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400"
                    : "bg-muted/50"
                }`}
              >
                {opt.is_correct ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> : <XCircle className="h-3.5 w-3.5 shrink-0 opacity-30" />}
                {opt.option_text}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
