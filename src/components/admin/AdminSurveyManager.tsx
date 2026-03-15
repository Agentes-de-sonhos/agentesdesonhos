import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Pencil, Trash2, Eye, Download, Upload, Loader2, Music, FileText, ExternalLink, X, GripVertical } from "lucide-react";
import { ConfirmDeleteDialog } from "./ConfirmDeleteDialog";
import { toast } from "sonner";
import { format } from "date-fns";

interface SurveyQuestion {
  id: string;
  order_index: number;
  question_type: string;
  question_text: string | null;
  audio_url: string | null;
  options: string[];
}

export function AdminSurveyManager() {
  const queryClient = useQueryClient();
  const [editingSurvey, setEditingSurvey] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [viewingResponses, setViewingResponses] = useState<string | null>(null);
  const [managingQuestions, setManagingQuestions] = useState<string | null>(null);

  // Survey form state
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [senderName, setSenderName] = useState("Fernando");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [empathyAfter, setEmpathyAfter] = useState<string>("");
  const [empathyMessage, setEmpathyMessage] = useState("Interessante… muitos agentes de viagens comentam exatamente isso também.");
  const [finalMessage, setFinalMessage] = useState("Obrigado por responder! 🙏\nEstou finalizando uma nova plataforma para ajudar agentes de viagens a vender mais e trabalhar com mais eficiência.");
  const [giftMessage, setGiftMessage] = useState("Como agradecimento, preparei um presente para você.");
  const [giftType, setGiftType] = useState("link");
  const [giftUrl, setGiftUrl] = useState("");
  const [giftFileName, setGiftFileName] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [uploadingGift, setUploadingGift] = useState(false);

  const { data: surveys, isLoading } = useQuery({
    queryKey: ["admin-surveys"],
    queryFn: async () => {
      const { data, error } = await supabase.from("surveys").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title,
        slug: slug || title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
        sender_name: senderName,
        avatar_url: avatarUrl || null,
        empathy_after_question: empathyAfter ? parseInt(empathyAfter) : null,
        empathy_message: empathyMessage || null,
        final_message: finalMessage || null,
        gift_message: giftMessage || null,
        gift_type: giftType,
        gift_url: giftUrl || null,
        gift_file_name: giftFileName || null,
        is_active: isActive,
      };

      if (editingSurvey) {
        const { error } = await supabase.from("surveys").update(payload).eq("id", editingSurvey.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("surveys").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-surveys"] });
      toast.success(editingSurvey ? "Pesquisa atualizada" : "Pesquisa criada");
      resetForm();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("surveys").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-surveys"] });
      toast.success("Pesquisa excluída");
    },
  });

  const resetForm = () => {
    setShowForm(false);
    setEditingSurvey(null);
    setTitle("");
    setSlug("");
    setSenderName("Fernando");
    setAvatarUrl("");
    setEmpathyAfter("");
    setEmpathyMessage("Interessante… muitos agentes de viagens comentam exatamente isso também.");
    setFinalMessage("Obrigado por responder! 🙏\nEstou finalizando uma nova plataforma para ajudar agentes de viagens a vender mais e trabalhar com mais eficiência.");
    setGiftMessage("Como agradecimento, preparei um presente para você.");
    setGiftType("link");
    setGiftUrl("");
    setGiftFileName("");
    setIsActive(true);
  };

  const openEdit = (s: any) => {
    setEditingSurvey(s);
    setTitle(s.title);
    setSlug(s.slug);
    setSenderName(s.sender_name || "Fernando");
    setAvatarUrl(s.avatar_url || "");
    setEmpathyAfter(s.empathy_after_question?.toString() || "");
    setEmpathyMessage(s.empathy_message || "");
    setFinalMessage(s.final_message || "");
    setGiftMessage(s.gift_message || "");
    setGiftType(s.gift_type || "link");
    setGiftUrl(s.gift_url || "");
    setGiftFileName(s.gift_file_name || "");
    setIsActive(s.is_active);
    setShowForm(true);
  };

  const handleGiftUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingGift(true);
    const ext = file.name.split(".").pop();
    const fileName = `gift-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("survey-files").upload(fileName, file);
    if (error) {
      toast.error("Erro no upload");
      setUploadingGift(false);
      return;
    }
    const { data } = supabase.storage.from("survey-files").getPublicUrl(fileName);
    setGiftUrl(data.publicUrl);
    setGiftFileName(file.name);
    setGiftType("file");
    setUploadingGift(false);
    toast.success("Arquivo enviado");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Pesquisas Conversacionais</h2>
          <p className="text-sm text-muted-foreground">Crie pesquisas no estilo WhatsApp</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }} className="gap-2">
          <Plus className="h-4 w-4" /> Nova Pesquisa
        </Button>
      </div>

      {/* Survey Form Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => { if (!open) resetForm(); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingSurvey ? "Editar Pesquisa" : "Nova Pesquisa"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Título *</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Pesquisa Agentes 2026" />
              </div>
              <div>
                <Label>Slug (URL)</Label>
                <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="pesquisa-agentes" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nome do remetente</Label>
                <Input value={senderName} onChange={(e) => setSenderName(e.target.value)} />
              </div>
              <div>
                <Label>Avatar URL</Label>
                <Input value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://..." />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Empatia após pergunta nº</Label>
                <Input type="number" value={empathyAfter} onChange={(e) => setEmpathyAfter(e.target.value)} placeholder="Ex: 3" />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Switch checked={isActive} onCheckedChange={setIsActive} />
                <Label>Ativa</Label>
              </div>
            </div>
            <div>
              <Label>Mensagem de empatia</Label>
              <Input value={empathyMessage} onChange={(e) => setEmpathyMessage(e.target.value)} />
            </div>
            <div>
              <Label>Mensagem final</Label>
              <Textarea value={finalMessage} onChange={(e) => setFinalMessage(e.target.value)} rows={3} />
            </div>
            <div>
              <Label>Mensagem do presente</Label>
              <Input value={giftMessage} onChange={(e) => setGiftMessage(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo do presente</Label>
                <Select value={giftType} onValueChange={setGiftType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="link">Link externo</SelectItem>
                    <SelectItem value="file">Arquivo (PDF/Imagem)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                {giftType === "link" ? (
                  <>
                    <Label>URL do presente</Label>
                    <Input value={giftUrl} onChange={(e) => setGiftUrl(e.target.value)} placeholder="https://..." />
                  </>
                ) : (
                  <>
                    <Label>Arquivo do presente</Label>
                    <div className="flex items-center gap-2">
                      <Input type="file" onChange={handleGiftUpload} disabled={uploadingGift} accept=".pdf,.jpg,.jpeg,.png,.webp,.epub" />
                      {uploadingGift && <Loader2 className="h-4 w-4 animate-spin" />}
                    </div>
                    {giftFileName && <p className="text-xs text-muted-foreground mt-1">{giftFileName}</p>}
                  </>
                )}
              </div>
            </div>
            <Button onClick={() => saveMutation.mutate()} disabled={!title || saveMutation.isPending} className="w-full">
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editingSurvey ? "Atualizar" : "Criar Pesquisa"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Survey List */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : !surveys?.length ? (
            <p className="text-center text-muted-foreground py-8">Nenhuma pesquisa criada</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {surveys.map((s: any) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.title}</TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">/pesquisa/{s.slug}</code>
                    </TableCell>
                    <TableCell>
                      <Badge variant={s.is_active ? "default" : "secondary"}>
                        {s.is_active ? "Ativa" : "Inativa"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button size="sm" variant="ghost" onClick={() => setManagingQuestions(s.id)} title="Perguntas">
                        <FileText className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setViewingResponses(s.id)} title="Respostas">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => openEdit(s)} title="Editar">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <ConfirmDeleteDialog onConfirm={() => deleteMutation.mutate(s.id)} title="Excluir pesquisa" description="Tem certeza que deseja excluir permanentemente esta pesquisa?">
                        <Button size="sm" variant="ghost" className="text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </ConfirmDeleteDialog>
                      <Button size="sm" variant="ghost" asChild title="Visualizar">
                        <a href={`/pesquisa/${s.slug}`} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Questions Manager Dialog */}
      {managingQuestions && (
        <QuestionsManager surveyId={managingQuestions} onClose={() => setManagingQuestions(null)} />
      )}

      {/* Responses Viewer Dialog */}
      {viewingResponses && (
        <ResponsesViewer surveyId={viewingResponses} onClose={() => setViewingResponses(null)} />
      )}
    </div>
  );
}

// ============ Questions Manager ============
function QuestionsManager({ surveyId, onClose }: { surveyId: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [questionText, setQuestionText] = useState("");
  const [questionType, setQuestionType] = useState("text");
  const [audioUrl, setAudioUrl] = useState("");
  const [options, setOptions] = useState<string[]>([""]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data: questions, isLoading } = useQuery({
    queryKey: ["survey-questions", surveyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("survey_questions")
        .select("*")
        .eq("survey_id", surveyId)
        .order("order_index");
      if (error) throw error;
      return data.map((q: any) => ({ ...q, options: Array.isArray(q.options) ? q.options : [] }));
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const validOptions = options.filter((o) => o.trim());
      const payload = {
        survey_id: surveyId,
        question_type: questionType,
        question_text: questionText || null,
        audio_url: audioUrl || null,
        options: validOptions,
        order_index: editingId ? undefined : (questions?.length || 0),
      };

      if (editingId) {
        const { order_index, ...updatePayload } = payload;
        const { error } = await supabase.from("survey_questions").update(updatePayload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("survey_questions").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["survey-questions", surveyId] });
      toast.success(editingId ? "Pergunta atualizada" : "Pergunta adicionada");
      resetQuestionForm();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("survey_questions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["survey-questions", surveyId] });
      toast.success("Pergunta excluída");
    },
  });

  const resetQuestionForm = () => {
    setQuestionText("");
    setQuestionType("text");
    setAudioUrl("");
    setOptions([""]);
    setEditingId(null);
  };

  const editQuestion = (q: any) => {
    setEditingId(q.id);
    setQuestionText(q.question_text || "");
    setQuestionType(q.question_type);
    setAudioUrl(q.audio_url || "");
    setOptions(q.options.length > 0 ? q.options : [""]);
  };

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const fileName = `audio-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("survey-files").upload(fileName, file);
    if (error) {
      toast.error("Erro no upload");
      setUploading(false);
      return;
    }
    const { data } = supabase.storage.from("survey-files").getPublicUrl(fileName);
    setAudioUrl(data.publicUrl);
    setUploading(false);
    toast.success("Áudio enviado");
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gerenciar Perguntas</DialogTitle>
        </DialogHeader>

        {/* Add/Edit question form */}
        <Card>
          <CardContent className="pt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tipo</Label>
                <Select value={questionType} onValueChange={setQuestionType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Texto</SelectItem>
                    <SelectItem value="audio">Áudio</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {questionType === "audio" && (
                <div>
                  <Label>Arquivo de áudio</Label>
                  <Input type="file" accept="audio/*" onChange={handleAudioUpload} disabled={uploading} />
                  {uploading && <Loader2 className="h-4 w-4 animate-spin mt-1" />}
                  {audioUrl && <p className="text-xs text-green-600 mt-1">✓ Áudio carregado</p>}
                </div>
              )}
            </div>
            <div>
              <Label>Texto da pergunta {questionType === "audio" ? "(legenda opcional)" : "*"}</Label>
              <Textarea value={questionText} onChange={(e) => setQuestionText(e.target.value)} rows={2} />
            </div>
            <div>
              <Label>Opções de resposta</Label>
              <div className="space-y-2">
                {options.map((opt, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      value={opt}
                      onChange={(e) => {
                        const newOpts = [...options];
                        newOpts[i] = e.target.value;
                        setOptions(newOpts);
                      }}
                      placeholder={`Opção ${i + 1}`}
                    />
                    {options.length > 1 && (
                      <Button size="icon" variant="ghost" onClick={() => setOptions(options.filter((_, j) => j !== i))}>
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button size="sm" variant="outline" onClick={() => setOptions([...options, ""])} className="gap-1">
                  <Plus className="h-3 w-3" /> Adicionar opção
                </Button>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="gap-2">
                {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingId ? "Atualizar" : "Adicionar Pergunta"}
              </Button>
              {editingId && (
                <Button variant="outline" onClick={resetQuestionForm}>Cancelar</Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Questions list */}
        <div className="space-y-2">
          {isLoading ? (
            <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : !questions?.length ? (
            <p className="text-center text-muted-foreground py-4">Nenhuma pergunta adicionada</p>
          ) : (
            questions.map((q: any, idx: number) => (
              <Card key={q.id} className="border">
                <CardContent className="pt-3 pb-3 flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs">
                        {idx + 1}
                      </Badge>
                      <Badge variant="secondary" className="text-xs gap-1">
                        {q.question_type === "audio" ? <Music className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
                        {q.question_type === "audio" ? "Áudio" : "Texto"}
                      </Badge>
                    </div>
                    <p className="text-sm truncate">{q.question_text || "(sem texto)"}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {q.options.map((opt: string, i: number) => (
                        <Badge key={i} variant="outline" className="text-xs">{opt}</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="sm" variant="ghost" onClick={() => editQuestion(q)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <ConfirmDeleteDialog onConfirm={() => deleteMutation.mutate(q.id)}>
                      <Button size="sm" variant="ghost" className="text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </ConfirmDeleteDialog>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============ Responses Viewer ============
function ResponsesViewer({ surveyId, onClose }: { surveyId: string; onClose: () => void }) {
  const { data: responses, isLoading } = useQuery({
    queryKey: ["survey-responses", surveyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("survey_responses")
        .select("*")
        .eq("survey_id", surveyId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: questions } = useQuery({
    queryKey: ["survey-questions", surveyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("survey_questions")
        .select("*")
        .eq("survey_id", surveyId)
        .order("order_index");
      if (error) throw error;
      return data;
    },
  });

  const exportCSV = () => {
    if (!responses?.length) return;
    const questionTexts = (questions || []).map((q: any) => q.question_text || `Pergunta ${q.order_index + 1}`);
    const headers = ["Data", "Nome", "Contato", ...questionTexts];
    
    const rows = responses.map((r: any) => {
      const answers = Array.isArray(r.answers) ? r.answers : [];
      const answerValues = (questions || []).map((q: any) => {
        const a = answers.find((a: any) => a.questionId === q.id);
        return a?.answer || "";
      });
      return [
        r.created_at ? format(new Date(r.created_at), "dd/MM/yyyy HH:mm") : "",
        r.contact_name || "",
        r.contact_info || "",
        ...answerValues,
      ];
    });

    const csv = [headers, ...rows].map((row) => row.map((c: string) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `respostas-pesquisa-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Respostas ({responses?.length || 0})</span>
            <Button size="sm" variant="outline" onClick={exportCSV} className="gap-2">
              <Download className="h-4 w-4" /> Exportar CSV
            </Button>
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : !responses?.length ? (
          <p className="text-center text-muted-foreground py-8">Nenhuma resposta ainda</p>
        ) : (
          <div className="space-y-3">
            {responses.map((r: any) => {
              const answers = Array.isArray(r.answers) ? r.answers : [];
              return (
                <Card key={r.id} className="border">
                  <CardContent className="pt-3 pb-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {r.contact_name && <span className="font-medium text-sm">{r.contact_name}</span>}
                        {r.contact_info && <Badge variant="secondary" className="text-xs">{r.contact_info}</Badge>}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {r.created_at ? format(new Date(r.created_at), "dd/MM/yyyy HH:mm") : ""}
                      </span>
                    </div>
                    <div className="space-y-1">
                      {answers.map((a: any, i: number) => {
                        const q = (questions || []).find((q: any) => q.id === a.questionId);
                        return (
                          <div key={i} className="text-xs">
                            <span className="text-muted-foreground">{q?.question_text || `P${i + 1}`}: </span>
                            <span className="font-medium">{a.answer}</span>
                          </div>
                        );
                      })}
                    </div>
                    {!r.completed_at && (
                      <Badge variant="outline" className="text-xs text-amber-600">Incompleta</Badge>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
