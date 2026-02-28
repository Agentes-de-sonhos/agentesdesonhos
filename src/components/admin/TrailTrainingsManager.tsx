import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight, ClipboardCheck, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAcademyAdmin } from "@/hooks/useAcademy";
import { TRAINING_CATEGORIES, type Training } from "@/types/academy";
import { toast as sonnerToast } from "sonner";

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

export function TrailTrainingsManager({ trailId }: Props) {
  const { createTraining, updateTraining, deleteTraining, linkTrainingToTrail, unlinkTrainingFromTrail, saveQuizQuestion, deleteQuizQuestion } = useAcademyAdmin();

  const [trainingDialogOpen, setTrainingDialogOpen] = useState(false);
  const [editingTraining, setEditingTraining] = useState<Training | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [expandedQuizId, setExpandedQuizId] = useState<string | null>(null);

  // Quiz add dialog state
  const [quizDialogTrainingId, setQuizDialogTrainingId] = useState<string | null>(null);
  const [questionText, setQuestionText] = useState("");
  const [questionType, setQuestionType] = useState<"single_choice" | "multiple_choice" | "true_false">("single_choice");
  const [options, setOptions] = useState<QuestionOption[]>([
    { option_text: "", is_correct: true, order_index: 0 },
    { option_text: "", is_correct: false, order_index: 1 },
  ]);
  const [deleteQuestionId, setDeleteQuestionId] = useState<string | null>(null);

  const [trainingForm, setTrainingForm] = useState({
    title: "",
    description: "",
    category: "geral",
    training_type: "recorded" as "live" | "recorded",
    video_url: "",
    duration_minutes: 0,
    thumbnail_url: "",
    materials_url: "",
    instructor: "",
    scheduled_at: "",
    order_index: 0,
    is_active: true,
  });

  // Fetch trail trainings
  const { data: trailTrainings = [], refetch: refetchTrainings } = useQuery({
    queryKey: ["trail-trainings-detail", trailId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trail_trainings")
        .select("*, training:trainings(*)")
        .eq("trail_id", trailId)
        .order("order_index", { ascending: true });
      if (error) throw error;
      return data as { id: string; trail_id: string; training_id: string; order_index: number; training: Training }[];
    },
    enabled: !!trailId,
  });

  const handleOpenTrainingDialog = (training?: Training) => {
    if (training) {
      setEditingTraining(training);
      setTrainingForm({
        title: training.title,
        description: training.description || "",
        category: training.category,
        training_type: training.training_type as "live" | "recorded",
        video_url: training.video_url || "",
        duration_minutes: training.duration_minutes,
        thumbnail_url: training.thumbnail_url || "",
        materials_url: training.materials_url || "",
        instructor: training.instructor || "",
        scheduled_at: training.scheduled_at || "",
        order_index: training.order_index,
        is_active: training.is_active,
      });
    } else {
      setEditingTraining(null);
      setTrainingForm({
        title: "",
        description: "",
        category: "geral",
        training_type: "recorded",
        video_url: "",
        duration_minutes: 0,
        thumbnail_url: "",
        materials_url: "",
        instructor: "",
        scheduled_at: "",
        order_index: trailTrainings.length,
        is_active: true,
      });
    }
    setTrainingDialogOpen(true);
  };

  const handleSaveTraining = async () => {
    const data = {
      ...trainingForm,
      scheduled_at: trainingForm.scheduled_at || null,
    };
    try {
      if (editingTraining) {
        await updateTraining.mutateAsync({ id: editingTraining.id, ...data });
      } else {
        // Create training and link to trail
        const { data: newTraining, error } = await supabase
          .from("trainings")
          .insert(data as any)
          .select()
          .single();
        if (error) throw error;
        await linkTrainingToTrail.mutateAsync({
          trailId,
          trainingId: newTraining.id,
          orderIndex: trailTrainings.length,
        });
      }
      setTrainingDialogOpen(false);
      refetchTrainings();
    } catch (err: any) {
      sonnerToast.error("Erro ao salvar treinamento: " + err.message);
    }
  };

  const handleDeleteTraining = async () => {
    if (!deleteConfirmId) return;
    try {
      // Unlink first, then delete training
      await unlinkTrainingFromTrail.mutateAsync({ trailId, trainingId: deleteConfirmId });
      await deleteTraining.mutateAsync(deleteConfirmId);
      refetchTrainings();
    } catch (err: any) {
      sonnerToast.error("Erro ao excluir: " + err.message);
    }
    setDeleteConfirmId(null);
  };

  // Quiz question functions
  const resetQuizForm = () => {
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
    if (!quizDialogTrainingId || !questionText.trim() || options.some((o) => !o.option_text.trim()) || !options.some((o) => o.is_correct)) return;
    await saveQuizQuestion.mutateAsync({
      trainingId: quizDialogTrainingId,
      question: {
        question_text: questionText,
        question_type: questionType,
        order_index: 0,
      },
      options: options.map((o) => ({
        option_text: o.option_text,
        is_correct: o.is_correct,
        order_index: o.order_index,
      })),
    });
    setQuizDialogTrainingId(null);
    resetQuizForm();
  };

  const handleDeleteQuestion = async () => {
    if (!deleteQuestionId) return;
    await deleteQuizQuestion.mutateAsync(deleteQuestionId);
    setDeleteQuestionId(null);
  };

  return (
    <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-2">
      {trailTrainings.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-6">
          Nenhum treinamento nesta trilha. Adicione o primeiro!
        </p>
      ) : (
        trailTrainings.map((tt, idx) => (
          <TrainingItem
            key={tt.id}
            training={tt.training}
            index={idx}
            isQuizExpanded={expandedQuizId === tt.training_id}
            onToggleQuiz={() => setExpandedQuizId(expandedQuizId === tt.training_id ? null : tt.training_id)}
            onEdit={() => handleOpenTrainingDialog(tt.training)}
            onDelete={() => setDeleteConfirmId(tt.training_id)}
            onAddQuestion={() => { resetQuizForm(); setQuizDialogTrainingId(tt.training_id); }}
            onDeleteQuestion={(id) => setDeleteQuestionId(id)}
          />
        ))
      )}

      <Button variant="outline" className="w-full" onClick={() => handleOpenTrainingDialog()}>
        <Plus className="h-4 w-4 mr-2" /> Novo Treinamento
      </Button>

      {/* Training Dialog */}
      <Dialog open={trainingDialogOpen} onOpenChange={setTrainingDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingTraining ? "Editar Treinamento" : "Novo Treinamento"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <div>
              <Label>Título</Label>
              <Input value={trainingForm.title} onChange={(e) => setTrainingForm({ ...trainingForm, title: e.target.value })} placeholder="Título do treinamento" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Categoria</Label>
                <Select value={trainingForm.category} onValueChange={(v) => setTrainingForm({ ...trainingForm, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TRAINING_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tipo</Label>
                <Select value={trainingForm.training_type} onValueChange={(v) => setTrainingForm({ ...trainingForm, training_type: v as "live" | "recorded" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recorded">Gravado</SelectItem>
                    <SelectItem value="live">Ao vivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea value={trainingForm.description} onChange={(e) => setTrainingForm({ ...trainingForm, description: e.target.value })} />
            </div>
            <div>
              <Label>URL do Vídeo</Label>
              <Input value={trainingForm.video_url} onChange={(e) => setTrainingForm({ ...trainingForm, video_url: e.target.value })} placeholder="https://youtube.com/embed/..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Duração (minutos)</Label>
                <Input type="number" value={trainingForm.duration_minutes} onChange={(e) => setTrainingForm({ ...trainingForm, duration_minutes: parseInt(e.target.value) || 0 })} />
              </div>
              <div>
                <Label>Instrutor</Label>
                <Input value={trainingForm.instructor} onChange={(e) => setTrainingForm({ ...trainingForm, instructor: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>URL de Material Complementar</Label>
              <Input value={trainingForm.materials_url} onChange={(e) => setTrainingForm({ ...trainingForm, materials_url: e.target.value })} />
            </div>
            {trainingForm.training_type === "live" && (
              <div>
                <Label>Data/Hora (ao vivo)</Label>
                <Input type="datetime-local" value={trainingForm.scheduled_at} onChange={(e) => setTrainingForm({ ...trainingForm, scheduled_at: e.target.value })} />
              </div>
            )}
            <div className="flex items-center gap-2">
              <Switch checked={trainingForm.is_active} onCheckedChange={(v) => setTrainingForm({ ...trainingForm, is_active: v })} />
              <Label>Treinamento ativo</Label>
            </div>
            <Button onClick={handleSaveTraining} className="w-full">Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Quiz Question Dialog */}
      <Dialog open={!!quizDialogTrainingId} onOpenChange={() => setQuizDialogTrainingId(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova Pergunta do Quiz</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            <div>
              <Label>Texto da Pergunta</Label>
              <Input value={questionText} onChange={(e) => setQuestionText(e.target.value)} placeholder="Ex: Qual é o parque mais visitado?" />
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

      {/* Delete Training Confirm */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Treinamento</AlertDialogTitle>
            <AlertDialogDescription>O treinamento e seu quiz serão removidos permanentemente.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTraining}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Question Confirm */}
      <AlertDialog open={!!deleteQuestionId} onOpenChange={() => setDeleteQuestionId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Pergunta</AlertDialogTitle>
            <AlertDialogDescription>A pergunta e suas opções serão removidas.</AlertDialogDescription>
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

// Individual training item with inline quiz
function TrainingItem({
  training,
  index,
  isQuizExpanded,
  onToggleQuiz,
  onEdit,
  onDelete,
  onAddQuestion,
  onDeleteQuestion,
}: {
  training: Training;
  index: number;
  isQuizExpanded: boolean;
  onToggleQuiz: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddQuestion: () => void;
  onDeleteQuestion: (id: string) => void;
}) {
  const { data: quizQuestions = [] } = useQuery({
    queryKey: ["admin-quiz-questions", training.id],
    queryFn: async () => {
      const { data: questions } = await supabase
        .from("quiz_questions")
        .select("*")
        .eq("training_id", training.id)
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
    enabled: isQuizExpanded,
  });

  return (
    <div className="border rounded-lg bg-muted/20">
      {/* Training header */}
      <div className="flex items-center gap-3 p-3">
        <div className="flex items-center justify-center h-7 w-7 rounded-full bg-primary/10 text-xs font-bold text-primary shrink-0">
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{training.title}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <Badge variant="outline" className="text-xs">{training.category}</Badge>
            <Badge variant={training.training_type === "live" ? "destructive" : "secondary"} className="text-xs">
              {training.training_type === "live" ? "Ao vivo" : "Gravado"}
            </Badge>
            <span className="text-xs text-muted-foreground">{training.duration_minutes} min</span>
          </div>
        </div>
        <Button variant="ghost" size="sm" className="h-7" onClick={onEdit}>
          <Pencil className="h-3 w-3" />
        </Button>
        <Button variant="ghost" size="sm" className="h-7" onClick={onDelete}>
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>

      {/* Quiz collapsible */}
      <Collapsible open={isQuizExpanded} onOpenChange={onToggleQuiz}>
        <CollapsibleTrigger asChild>
          <button className="flex items-center gap-2 w-full px-3 py-2 border-t text-xs text-muted-foreground hover:bg-muted/30 transition-colors">
            {isQuizExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            <ClipboardCheck className="h-3.5 w-3.5" />
            Quiz do Módulo
            {quizQuestions.length > 0 && (
              <Badge variant="secondary" className="text-xs ml-1">{quizQuestions.length} perguntas</Badge>
            )}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-3 pb-3 space-y-2">
            {quizQuestions.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-3">Nenhuma pergunta. Adicione a primeira!</p>
            ) : (
              quizQuestions.map((q, idx) => (
                <div key={q.id} className="border rounded p-3 space-y-1.5 bg-background">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-medium flex-1">
                      <span className="text-muted-foreground mr-1">{idx + 1}.</span>
                      {q.question_text}
                    </p>
                    <Button variant="ghost" size="sm" className="h-6 px-1" onClick={() => onDeleteQuestion(q.id)}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
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
              ))
            )}
            <Button variant="outline" size="sm" className="w-full" onClick={onAddQuestion}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar Pergunta
            </Button>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
