import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMarketplaceCourseDetail, useMarketplaceCourseMutations } from "@/hooks/useMarketplace";
import { COURSE_CATEGORIES, COURSE_LEVELS, PRODUCT_TYPES } from "@/types/marketplace";
import {
  ArrowLeft, Plus, Trash2, Send, BookOpen, Video, Calendar, Loader2,
  FileText, Link as LinkIcon, Save, CheckCircle, AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function CursoEditar() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    course, loadingCourse, modules, meetings,
    createModule, deleteModule, createLesson, deleteLesson,
    createMeeting, deleteMeeting,
  } = useMarketplaceCourseDetail(id);
  const { updateCourse, submitForReview } = useMarketplaceCourseMutations();

  // Local state for forms
  const [newModuleTitle, setNewModuleTitle] = useState("");
  const [newLessonForm, setNewLessonForm] = useState<Record<string, { title: string; video_url: string; description: string }>>({});
  const [newMeetingForm, setNewMeetingForm] = useState({ title: "", meeting_date: "", meeting_url: "", description: "" });
  const [editingInfo, setEditingInfo] = useState(false);
  const [infoForm, setInfoForm] = useState<any>(null);

  if (loadingCourse) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!course) {
    return (
      <DashboardLayout>
        <div className="text-center py-20">
          <h2 className="text-xl font-semibold">Curso não encontrado</h2>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/cursos")}>Voltar</Button>
        </div>
      </DashboardLayout>
    );
  }

  const handleAddModule = () => {
    if (!newModuleTitle.trim()) return;
    createModule.mutate({
      course_id: course.id,
      title: newModuleTitle,
      order_index: modules.length,
    });
    setNewModuleTitle("");
  };

  const handleAddLesson = (moduleId: string) => {
    const form = newLessonForm[moduleId];
    if (!form?.title?.trim()) return;
    createLesson.mutate({
      module_id: moduleId,
      title: form.title,
      video_url: form.video_url || undefined,
      description: form.description || undefined,
      order_index: (modules.find((m) => m.id === moduleId)?.lessons?.length || 0),
    });
    setNewLessonForm({ ...newLessonForm, [moduleId]: { title: "", video_url: "", description: "" } });
  };

  const handleAddMeeting = () => {
    if (!newMeetingForm.title.trim() || !newMeetingForm.meeting_date) return;
    createMeeting.mutate({
      course_id: course.id,
      title: newMeetingForm.title,
      meeting_date: newMeetingForm.meeting_date,
      meeting_url: newMeetingForm.meeting_url || undefined,
      description: newMeetingForm.description || undefined,
    });
    setNewMeetingForm({ title: "", meeting_date: "", meeting_url: "", description: "" });
  };

  const handleSaveInfo = () => {
    if (!infoForm) return;
    updateCourse.mutate({ id: course.id, ...infoForm });
    setEditingInfo(false);
  };

  const handleSubmitReview = () => {
    if (modules.length === 0) {
      toast.error("Adicione pelo menos um módulo com aulas antes de enviar.");
      return;
    }
    submitForReview.mutate(course.id);
  };

  const showMeetings = course.product_type === "mentorship" || course.product_type === "hybrid";

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/cursos")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{course.title}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={course.status === "approved" ? "default" : "secondary"}>
                {course.status === "draft" && "Rascunho"}
                {course.status === "pending_review" && "Em Análise"}
                {course.status === "approved" && "Aprovado"}
                {course.status === "rejected" && "Rejeitado"}
              </Badge>
              {course.rejection_reason && (
                <span className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> {course.rejection_reason}
                </span>
              )}
            </div>
          </div>
          {course.status === "draft" && (
            <Button onClick={handleSubmitReview} className="gap-1">
              <Send className="h-4 w-4" /> Enviar para Aprovação
            </Button>
          )}
        </div>

        <Tabs defaultValue="content">
          <TabsList>
            <TabsTrigger value="content" className="gap-1"><BookOpen className="h-4 w-4" /> Conteúdo</TabsTrigger>
            {showMeetings && (
              <TabsTrigger value="meetings" className="gap-1"><Calendar className="h-4 w-4" /> Encontros</TabsTrigger>
            )}
            <TabsTrigger value="info" className="gap-1"><FileText className="h-4 w-4" /> Informações</TabsTrigger>
          </TabsList>

          <TabsContent value="content" className="mt-6 space-y-6">
            {/* Modules */}
            <Accordion type="multiple" className="space-y-3">
              {modules.map((mod, idx) => (
                <AccordionItem key={mod.id} value={mod.id} className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-3 flex-1">
                      <Badge variant="outline">Módulo {idx + 1}</Badge>
                      <span className="font-semibold">{mod.title}</span>
                      <span className="text-xs text-muted-foreground">({mod.lessons?.length || 0} aulas)</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-2">
                    {/* Existing lessons */}
                    {mod.lessons?.map((lesson, li) => (
                      <div key={lesson.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                        <Video className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{li + 1}. {lesson.title}</p>
                          {lesson.video_url && (
                            <p className="text-xs text-muted-foreground truncate">{lesson.video_url}</p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => deleteLesson.mutate(lesson.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}

                    {/* Add lesson form */}
                    <div className="border rounded-lg p-3 space-y-3 bg-background">
                      <p className="text-sm font-medium">Adicionar Aula</p>
                      <Input
                        placeholder="Título da aula"
                        value={newLessonForm[mod.id]?.title || ""}
                        onChange={(e) =>
                          setNewLessonForm({
                            ...newLessonForm,
                            [mod.id]: { ...(newLessonForm[mod.id] || { title: "", video_url: "", description: "" }), title: e.target.value },
                          })
                        }
                      />
                      <Input
                        placeholder="URL do vídeo (YouTube, Vimeo, etc.)"
                        value={newLessonForm[mod.id]?.video_url || ""}
                        onChange={(e) =>
                          setNewLessonForm({
                            ...newLessonForm,
                            [mod.id]: { ...(newLessonForm[mod.id] || { title: "", video_url: "", description: "" }), video_url: e.target.value },
                          })
                        }
                      />
                      <Button size="sm" onClick={() => handleAddLesson(mod.id)} className="gap-1">
                        <Plus className="h-3 w-3" /> Adicionar Aula
                      </Button>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => deleteModule.mutate(mod.id)}
                    >
                      <Trash2 className="h-3 w-3 mr-1" /> Remover Módulo
                    </Button>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>

            {/* Add module */}
            <Card>
              <CardContent className="p-4 flex gap-3">
                <Input
                  placeholder="Nome do novo módulo"
                  value={newModuleTitle}
                  onChange={(e) => setNewModuleTitle(e.target.value)}
                />
                <Button onClick={handleAddModule} className="gap-1 flex-shrink-0">
                  <Plus className="h-4 w-4" /> Módulo
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {showMeetings && (
            <TabsContent value="meetings" className="mt-6 space-y-6">
              {meetings.map((m) => (
                <Card key={m.id}>
                  <CardContent className="p-4 flex items-center gap-4">
                    <Calendar className="h-5 w-5 text-primary flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-medium">{m.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(m.meeting_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                      {m.meeting_url && (
                        <a href={m.meeting_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1 mt-1">
                          <LinkIcon className="h-3 w-3" /> Link do encontro
                        </a>
                      )}
                    </div>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteMeeting.mutate(m.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}

              <Card>
                <CardHeader><CardTitle className="text-base">Novo Encontro</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <Input placeholder="Título" value={newMeetingForm.title} onChange={(e) => setNewMeetingForm({ ...newMeetingForm, title: e.target.value })} />
                  <Input type="datetime-local" value={newMeetingForm.meeting_date} onChange={(e) => setNewMeetingForm({ ...newMeetingForm, meeting_date: e.target.value })} />
                  <Input placeholder="Link da reunião (Zoom, Meet, etc.)" value={newMeetingForm.meeting_url} onChange={(e) => setNewMeetingForm({ ...newMeetingForm, meeting_url: e.target.value })} />
                  <Button onClick={handleAddMeeting} className="gap-1">
                    <Plus className="h-4 w-4" /> Adicionar Encontro
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          <TabsContent value="info" className="mt-6">
            <Card>
              <CardContent className="p-6 space-y-4">
                {!editingInfo ? (
                  <>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div><span className="text-muted-foreground">Tipo:</span> {PRODUCT_TYPES.find((t) => t.value === course.product_type)?.label}</div>
                      <div><span className="text-muted-foreground">Nível:</span> {COURSE_LEVELS.find((l) => l.value === course.level)?.label}</div>
                      <div><span className="text-muted-foreground">Categoria:</span> {COURSE_CATEGORIES.find((c) => c.value === course.category)?.label}</div>
                      <div><span className="text-muted-foreground">Preço:</span> {course.price > 0 ? `R$ ${Number(course.price).toFixed(2)}` : "Gratuito"}</div>
                    </div>
                    {course.description && <p className="text-sm text-muted-foreground">{course.description}</p>}
                    <Button variant="outline" onClick={() => { setEditingInfo(true); setInfoForm({ title: course.title, description: course.description || "", price: course.price, category: course.category, level: course.level, product_type: course.product_type }); }}>
                      Editar Informações
                    </Button>
                  </>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2"><Label>Nome</Label><Input value={infoForm.title} onChange={(e) => setInfoForm({ ...infoForm, title: e.target.value })} /></div>
                    <div className="space-y-2"><Label>Descrição</Label><Textarea value={infoForm.description} onChange={(e) => setInfoForm({ ...infoForm, description: e.target.value })} rows={3} /></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Tipo</Label>
                        <Select value={infoForm.product_type} onValueChange={(v) => setInfoForm({ ...infoForm, product_type: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{PRODUCT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2"><Label>Preço (R$)</Label><Input type="number" min="0" step="0.01" value={infoForm.price} onChange={(e) => setInfoForm({ ...infoForm, price: parseFloat(e.target.value) || 0 })} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Categoria</Label>
                        <Select value={infoForm.category} onValueChange={(v) => setInfoForm({ ...infoForm, category: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{COURSE_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Nível</Label>
                        <Select value={infoForm.level} onValueChange={(v) => setInfoForm({ ...infoForm, level: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{COURSE_LEVELS.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleSaveInfo} className="gap-1"><Save className="h-4 w-4" /> Salvar</Button>
                      <Button variant="outline" onClick={() => setEditingInfo(false)}>Cancelar</Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
