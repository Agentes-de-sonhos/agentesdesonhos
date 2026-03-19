import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMarketplaceCourseDetail, useMarketplaceCourseMutations } from "@/hooks/useMarketplace";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  ArrowLeft, BookOpen, Video, Calendar, Check, Play, Lock, DollarSign,
  MessageSquare, Send, Loader2, Link as LinkIcon, Users, Clock,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function CursoDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    course, loadingCourse, modules, meetings, enrollment,
    comments, markLessonComplete, addComment,
    isLessonCompleted, totalLessons, completedLessons, progressPercent,
  } = useMarketplaceCourseDetail(id);
  const { enrollFree } = useMarketplaceCourseMutations();

  const [selectedLesson, setSelectedLesson] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");

  const isCreator = course?.creator_id === user?.id;
  const isEnrolled = !!enrollment;
  const canAccess = isEnrolled || isCreator;

  // Find next uncompleted lesson
  const nextLesson = useMemo(() => {
    for (const mod of modules) {
      for (const lesson of mod.lessons || []) {
        if (!isLessonCompleted(lesson.id)) return lesson;
      }
    }
    return null;
  }, [modules, isLessonCompleted]);

  const currentLesson = useMemo(() => {
    if (selectedLesson) {
      for (const mod of modules) {
        const found = mod.lessons?.find((l) => l.id === selectedLesson);
        if (found) return found;
      }
    }
    return nextLesson;
  }, [selectedLesson, modules, nextLesson]);

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

  const handleBuy = async () => {
    if (course.price <= 0) {
      enrollFree.mutate(course.id);
      return;
    }
    try {
      const { data, error } = await supabase.functions.invoke("create-course-checkout", {
        body: { course_id: course.id },
      });
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch {
      toast.error("Erro ao iniciar pagamento");
    }
  };

  const handleComment = () => {
    if (!commentText.trim()) return;
    addComment.mutate({
      course_id: course.id,
      lesson_id: currentLesson?.id || undefined,
      content: commentText,
    });
    setCommentText("");
  };

  const getVideoEmbed = (url: string) => {
    if (url.includes("youtube.com") || url.includes("youtu.be")) {
      const videoId = url.includes("youtu.be")
        ? url.split("/").pop()?.split("?")[0]
        : new URL(url).searchParams.get("v");
      return `https://www.youtube.com/embed/${videoId}`;
    }
    if (url.includes("vimeo.com")) {
      const videoId = url.split("/").pop();
      return `https://player.vimeo.com/video/${videoId}`;
    }
    return url;
  };

  const showMeetings = course.product_type === "mentorship" || course.product_type === "hybrid";
  const levelMap: Record<string, string> = { iniciante: "Iniciante", intermediario: "Intermediário", avancado: "Avançado" };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/cursos")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{course.title}</h1>
            <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground flex-wrap">
              {course.creator_name && <span>por {course.creator_name}</span>}
              <Badge variant="secondary">{levelMap[course.level]}</Badge>
              <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" /> {totalLessons} aulas</span>
              {course.enrolled_count > 0 && <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {course.enrolled_count} alunos</span>}
            </div>
          </div>
          {!canAccess && (
            <Button onClick={handleBuy} size="lg" className="gap-2">
              {course.price > 0 ? (
                <><DollarSign className="h-4 w-4" /> R$ {Number(course.price).toFixed(2)}</>
              ) : (
                <>Inscrever-se Gratuitamente</>
              )}
            </Button>
          )}
        </div>

        {/* Progress bar for enrolled */}
        {isEnrolled && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Progresso</span>
                <span className="text-sm text-muted-foreground">{completedLessons}/{totalLessons} aulas ({progressPercent}%)</span>
              </div>
              <Progress value={progressPercent} className="h-2" />
            </CardContent>
          </Card>
        )}

        {canAccess ? (
          /* Student Area */
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Video player */}
            <div className="lg:col-span-2 space-y-4">
              {currentLesson?.video_url ? (
                <div className="aspect-video bg-black rounded-lg overflow-hidden">
                  <iframe
                    src={getVideoEmbed(currentLesson.video_url)}
                    className="w-full h-full"
                    allowFullScreen
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  />
                </div>
              ) : (
                <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                  <Video className="h-16 w-16 text-muted-foreground/30" />
                </div>
              )}

              {currentLesson && (
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">{currentLesson.title}</h3>
                    {currentLesson.description && <p className="text-sm text-muted-foreground mt-1">{currentLesson.description}</p>}
                  </div>
                  {isEnrolled && !isLessonCompleted(currentLesson.id) && (
                    <Button onClick={() => markLessonComplete.mutate(currentLesson.id)} className="gap-1">
                      <Check className="h-4 w-4" /> Concluir Aula
                    </Button>
                  )}
                  {isLessonCompleted(currentLesson.id) && (
                    <Badge className="bg-green-100 text-green-800"><Check className="h-3 w-3 mr-1" /> Concluída</Badge>
                  )}
                </div>
              )}

              {/* Comments/Interaction */}
              <Tabs defaultValue="comments">
                <TabsList>
                  <TabsTrigger value="comments" className="gap-1"><MessageSquare className="h-4 w-4" /> Comentários</TabsTrigger>
                  {showMeetings && <TabsTrigger value="meetings" className="gap-1"><Calendar className="h-4 w-4" /> Encontros</TabsTrigger>}
                </TabsList>
                <TabsContent value="comments" className="mt-4 space-y-4">
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Deixe um comentário ou dúvida..."
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      rows={2}
                    />
                    <Button onClick={handleComment} size="icon" className="self-end">
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {comments.map((c) => (
                      <div key={c.id} className="flex gap-3 p-3 bg-muted/50 rounded-lg">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={c.user_avatar || ""} />
                          <AvatarFallback>{(c.user_name || "U")[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{c.user_name || "Usuário"}</p>
                          <p className="text-sm text-muted-foreground">{c.content}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(c.created_at), "dd/MM/yyyy HH:mm")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>
                {showMeetings && (
                  <TabsContent value="meetings" className="mt-4 space-y-3">
                    {meetings.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-6">Nenhum encontro agendado ainda.</p>
                    ) : meetings.map((m) => (
                      <Card key={m.id}>
                        <CardContent className="p-4 flex items-center gap-4">
                          <Calendar className="h-5 w-5 text-primary flex-shrink-0" />
                          <div className="flex-1">
                            <p className="font-medium text-sm">{m.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(m.meeting_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </p>
                          </div>
                          {m.meeting_url && (
                            <Button size="sm" asChild>
                              <a href={m.meeting_url} target="_blank" rel="noopener noreferrer">
                                <LinkIcon className="h-3 w-3 mr-1" /> Entrar
                              </a>
                            </Button>
                          )}
                          {m.recording_url && (
                            <Button size="sm" variant="outline" asChild>
                              <a href={m.recording_url} target="_blank" rel="noopener noreferrer">
                                <Video className="h-3 w-3 mr-1" /> Gravação
                              </a>
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </TabsContent>
                )}
              </Tabs>
            </div>

            {/* Sidebar: module list */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm uppercase text-muted-foreground">Conteúdo do Curso</h3>
              <Accordion type="multiple" defaultValue={modules.map((m) => m.id)}>
                {modules.map((mod, idx) => (
                  <AccordionItem key={mod.id} value={mod.id}>
                    <AccordionTrigger className="text-sm hover:no-underline">
                      <span className="font-medium">Módulo {idx + 1}: {mod.title}</span>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-1 pb-3">
                      {mod.lessons?.map((lesson) => {
                        const completed = isLessonCompleted(lesson.id);
                        const isCurrent = currentLesson?.id === lesson.id;
                        return (
                          <button
                            key={lesson.id}
                            onClick={() => setSelectedLesson(lesson.id)}
                            className={`w-full text-left flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                              isCurrent ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"
                            }`}
                          >
                            {completed ? (
                              <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                            ) : isCurrent ? (
                              <Play className="h-4 w-4 text-primary flex-shrink-0" />
                            ) : (
                              <Video className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            )}
                            <span className="truncate">{lesson.title}</span>
                          </button>
                        );
                      })}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        ) : (
          /* Course detail for non-enrolled */
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              {course.cover_image_url && (
                <img src={course.cover_image_url} alt={course.title} className="w-full rounded-lg aspect-video object-cover" />
              )}
              {course.description && (
                <Card>
                  <CardHeader><CardTitle className="text-base">Sobre o Curso</CardTitle></CardHeader>
                  <CardContent><p className="text-sm text-muted-foreground whitespace-pre-wrap">{course.description}</p></CardContent>
                </Card>
              )}
              <Card>
                <CardHeader><CardTitle className="text-base">Conteúdo Programático</CardTitle></CardHeader>
                <CardContent>
                  <Accordion type="multiple">
                    {modules.map((mod, idx) => (
                      <AccordionItem key={mod.id} value={mod.id}>
                        <AccordionTrigger className="text-sm">Módulo {idx + 1}: {mod.title} ({mod.lessons?.length || 0} aulas)</AccordionTrigger>
                        <AccordionContent>
                          {mod.lessons?.map((lesson, li) => (
                            <div key={lesson.id} className="flex items-center gap-2 py-1.5 text-sm text-muted-foreground">
                              <Lock className="h-3 w-3" />
                              {li + 1}. {lesson.title}
                            </div>
                          ))}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            </div>
            <div>
              <Card className="sticky top-6">
                <CardContent className="p-6 space-y-4 text-center">
                  <p className="text-3xl font-bold text-primary">
                    {course.price > 0 ? `R$ ${Number(course.price).toFixed(2)}` : "Gratuito"}
                  </p>
                  <Button onClick={handleBuy} size="lg" className="w-full gap-2">
                    {course.price > 0 ? "Comprar Agora" : "Inscrever-se"}
                  </Button>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p className="flex items-center justify-center gap-1"><BookOpen className="h-3 w-3" /> {totalLessons} aulas</p>
                    {showMeetings && <p className="flex items-center justify-center gap-1"><Calendar className="h-3 w-3" /> {meetings.length} encontros ao vivo</p>}
                    <p className="flex items-center justify-center gap-1"><Clock className="h-3 w-3" /> Acesso imediato</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
