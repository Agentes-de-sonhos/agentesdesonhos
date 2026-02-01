import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useMentorshipDetail } from "@/hooks/useMentorships";
import { useUserRole } from "@/hooks/useUserRole";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowLeft,
  Users,
  Target,
  Calendar,
  Video,
  BookOpen,
  FileText,
  Plus,
  Trash2,
  ExternalLink,
  Play,
  Clock,
  Lock,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function MentoriaDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useUserRole();
  const {
    mentorship,
    loadingMentorship,
    meetings,
    loadingMeetings,
    videos,
    loadingVideos,
    modules,
    loadingModules,
    lessons,
    materials,
    loadingMaterials,
    createMeeting,
    deleteMeeting,
    createVideo,
    deleteVideo,
    createModule,
    deleteModule,
    createLesson,
    deleteLesson,
    createMaterial,
    deleteMaterial,
  } = useMentorshipDetail(id);

  const [showMeetingDialog, setShowMeetingDialog] = useState(false);
  const [showVideoDialog, setShowVideoDialog] = useState(false);
  const [showModuleDialog, setShowModuleDialog] = useState(false);
  const [showLessonDialog, setShowLessonDialog] = useState<string | null>(null);
  const [showMaterialDialog, setShowMaterialDialog] = useState(false);

  // Form states
  const [meetingForm, setMeetingForm] = useState({
    title: "",
    description: "",
    meeting_date: "",
    meeting_url: "",
  });
  const [videoForm, setVideoForm] = useState({
    title: "",
    description: "",
    video_url: "",
    duration_minutes: 0,
  });
  const [moduleForm, setModuleForm] = useState({ title: "", description: "" });
  const [lessonForm, setLessonForm] = useState({ title: "", description: "", video_url: "" });
  const [materialForm, setMaterialForm] = useState({
    title: "",
    description: "",
    file_url: "",
    file_type: "pdf",
  });

  if (!isAdmin) {
    return (
      <DashboardLayout>
        <Card className="p-12 text-center">
          <Lock className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-xl font-semibold mb-2">Acesso Restrito</h3>
          <p className="text-muted-foreground mb-4">
            Esta área está disponível apenas para administradores.
          </p>
          <Button onClick={() => navigate("/mentorias")}>Voltar</Button>
        </Card>
      </DashboardLayout>
    );
  }

  if (loadingMentorship) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!mentorship) {
    return (
      <DashboardLayout>
        <Card className="p-12 text-center">
          <h3 className="text-xl font-semibold mb-2">Mentoria não encontrada</h3>
          <Button onClick={() => navigate("/mentorias")}>Voltar</Button>
        </Card>
      </DashboardLayout>
    );
  }

  const handleCreateMeeting = () => {
    createMeeting.mutate(
      { ...meetingForm, mentorship_id: id },
      {
        onSuccess: () => {
          setShowMeetingDialog(false);
          setMeetingForm({ title: "", description: "", meeting_date: "", meeting_url: "" });
        },
      }
    );
  };

  const handleCreateVideo = () => {
    createVideo.mutate(
      { ...videoForm, mentorship_id: id },
      {
        onSuccess: () => {
          setShowVideoDialog(false);
          setVideoForm({ title: "", description: "", video_url: "", duration_minutes: 0 });
        },
      }
    );
  };

  const handleCreateModule = () => {
    createModule.mutate(
      { ...moduleForm, mentorship_id: id },
      {
        onSuccess: () => {
          setShowModuleDialog(false);
          setModuleForm({ title: "", description: "" });
        },
      }
    );
  };

  const handleCreateLesson = (moduleId: string) => {
    createLesson.mutate(
      { ...lessonForm, module_id: moduleId },
      {
        onSuccess: () => {
          setShowLessonDialog(null);
          setLessonForm({ title: "", description: "", video_url: "" });
        },
      }
    );
  };

  const handleCreateMaterial = () => {
    createMaterial.mutate(
      { ...materialForm, mentorship_id: id },
      {
        onSuccess: () => {
          setShowMaterialDialog(false);
          setMaterialForm({ title: "", description: "", file_url: "", file_type: "pdf" });
        },
      }
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/mentorias")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{mentorship.name}</h1>
            <p className="text-muted-foreground">{mentorship.mentor_name}</p>
          </div>
          <Badge variant="secondary" className="ml-auto">
            {mentorship.specialty}
          </Badge>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Visão Geral</span>
            </TabsTrigger>
            <TabsTrigger value="meetings" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Encontros</span>
            </TabsTrigger>
            <TabsTrigger value="videos" className="flex items-center gap-2">
              <Video className="h-4 w-4" />
              <span className="hidden sm:inline">Gravados</span>
            </TabsTrigger>
            <TabsTrigger value="trails" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Trilhas</span>
            </TabsTrigger>
            <TabsTrigger value="materials" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Materiais</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Sobre o Mentor
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 mb-4">
                    {mentorship.mentor_photo_url ? (
                      <img
                        src={mentorship.mentor_photo_url}
                        alt={mentorship.mentor_name}
                        className="w-20 h-20 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
                        <Users className="h-10 w-10 text-primary" />
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold text-lg">{mentorship.mentor_name}</h3>
                      <p className="text-muted-foreground">{mentorship.specialty}</p>
                    </div>
                  </div>
                  <p className="text-muted-foreground">{mentorship.full_description}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Objetivos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">{mentorship.objectives}</p>
                  <div className="pt-4 border-t">
                    <h4 className="font-medium mb-2">Público Ideal</h4>
                    <p className="text-sm text-muted-foreground">{mentorship.target_audience}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Meetings Tab */}
          <TabsContent value="meetings" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Encontros Semanais</h3>
              <Dialog open={showMeetingDialog} onOpenChange={setShowMeetingDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Encontro
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Adicionar Encontro</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Título</Label>
                      <Input
                        value={meetingForm.title}
                        onChange={(e) => setMeetingForm({ ...meetingForm, title: e.target.value })}
                        placeholder="Ex: Introdução à Gestão de Clientes"
                      />
                    </div>
                    <div>
                      <Label>Descrição</Label>
                      <Textarea
                        value={meetingForm.description}
                        onChange={(e) =>
                          setMeetingForm({ ...meetingForm, description: e.target.value })
                        }
                        placeholder="Descrição do encontro"
                      />
                    </div>
                    <div>
                      <Label>Data e Hora</Label>
                      <Input
                        type="datetime-local"
                        value={meetingForm.meeting_date}
                        onChange={(e) =>
                          setMeetingForm({ ...meetingForm, meeting_date: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label>Link da Reunião</Label>
                      <Input
                        value={meetingForm.meeting_url}
                        onChange={(e) =>
                          setMeetingForm({ ...meetingForm, meeting_url: e.target.value })
                        }
                        placeholder="https://..."
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleCreateMeeting} disabled={createMeeting.isPending}>
                      Adicionar
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {loadingMeetings ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : meetings.length === 0 ? (
              <Card className="p-8 text-center">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">Nenhum encontro cadastrado</p>
              </Card>
            ) : (
              <div className="space-y-4">
                {meetings.map((meeting) => (
                  <Card key={meeting.id}>
                    <CardContent className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-lg bg-primary/10">
                          <Calendar className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h4 className="font-medium">{meeting.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(meeting.meeting_date), "dd 'de' MMMM, HH:mm", {
                              locale: ptBR,
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {meeting.meeting_url && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={meeting.meeting_url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remover Encontro?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteMeeting.mutate(meeting.id)}
                              >
                                Remover
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Videos Tab */}
          <TabsContent value="videos" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Conteúdos Gravados</h3>
              <Dialog open={showVideoDialog} onOpenChange={setShowVideoDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Vídeo
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Adicionar Vídeo</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Título</Label>
                      <Input
                        value={videoForm.title}
                        onChange={(e) => setVideoForm({ ...videoForm, title: e.target.value })}
                        placeholder="Título do vídeo"
                      />
                    </div>
                    <div>
                      <Label>Descrição</Label>
                      <Textarea
                        value={videoForm.description}
                        onChange={(e) =>
                          setVideoForm({ ...videoForm, description: e.target.value })
                        }
                        placeholder="Descrição do vídeo"
                      />
                    </div>
                    <div>
                      <Label>URL do Vídeo</Label>
                      <Input
                        value={videoForm.video_url}
                        onChange={(e) => setVideoForm({ ...videoForm, video_url: e.target.value })}
                        placeholder="https://..."
                      />
                    </div>
                    <div>
                      <Label>Duração (minutos)</Label>
                      <Input
                        type="number"
                        value={videoForm.duration_minutes}
                        onChange={(e) =>
                          setVideoForm({ ...videoForm, duration_minutes: parseInt(e.target.value) })
                        }
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleCreateVideo} disabled={createVideo.isPending}>
                      Adicionar
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {loadingVideos ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-48 w-full" />
                ))}
              </div>
            ) : videos.length === 0 ? (
              <Card className="p-8 text-center">
                <Video className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">Nenhum vídeo cadastrado</p>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {videos.map((video) => (
                  <Card key={video.id} className="overflow-hidden">
                    <div className="h-32 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                      <Play className="h-12 w-12 text-primary" />
                    </div>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium line-clamp-1">{video.title}</h4>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                            <Clock className="h-3 w-3" />
                            {video.duration_minutes} min
                          </div>
                        </div>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remover Vídeo?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteVideo.mutate(video.id)}>
                                Remover
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Trails Tab */}
          <TabsContent value="trails" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Trilhas de Aprendizado</h3>
              <Dialog open={showModuleDialog} onOpenChange={setShowModuleDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Módulo
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Adicionar Módulo</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Título</Label>
                      <Input
                        value={moduleForm.title}
                        onChange={(e) => setModuleForm({ ...moduleForm, title: e.target.value })}
                        placeholder="Título do módulo"
                      />
                    </div>
                    <div>
                      <Label>Descrição</Label>
                      <Textarea
                        value={moduleForm.description}
                        onChange={(e) =>
                          setModuleForm({ ...moduleForm, description: e.target.value })
                        }
                        placeholder="Descrição do módulo"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleCreateModule} disabled={createModule.isPending}>
                      Adicionar
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {loadingModules ? (
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))}
              </div>
            ) : modules.length === 0 ? (
              <Card className="p-8 text-center">
                <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">Nenhum módulo cadastrado</p>
              </Card>
            ) : (
              <div className="space-y-4">
                {modules.map((module, index) => (
                  <Card key={module.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                            {index + 1}
                          </span>
                          {module.title}
                        </CardTitle>
                        <div className="flex gap-2">
                          <Dialog
                            open={showLessonDialog === module.id}
                            onOpenChange={(open) => setShowLessonDialog(open ? module.id : null)}
                          >
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Plus className="h-4 w-4 mr-1" />
                                Aula
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Adicionar Aula</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <Label>Título</Label>
                                  <Input
                                    value={lessonForm.title}
                                    onChange={(e) =>
                                      setLessonForm({ ...lessonForm, title: e.target.value })
                                    }
                                    placeholder="Título da aula"
                                  />
                                </div>
                                <div>
                                  <Label>Descrição</Label>
                                  <Textarea
                                    value={lessonForm.description}
                                    onChange={(e) =>
                                      setLessonForm({ ...lessonForm, description: e.target.value })
                                    }
                                    placeholder="Descrição da aula"
                                  />
                                </div>
                                <div>
                                  <Label>URL do Vídeo</Label>
                                  <Input
                                    value={lessonForm.video_url}
                                    onChange={(e) =>
                                      setLessonForm({ ...lessonForm, video_url: e.target.value })
                                    }
                                    placeholder="https://..."
                                  />
                                </div>
                              </div>
                              <DialogFooter>
                                <Button
                                  onClick={() => handleCreateLesson(module.id)}
                                  disabled={createLesson.isPending}
                                >
                                  Adicionar
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remover Módulo?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Todas as aulas deste módulo também serão removidas.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteModule.mutate(module.id)}>
                                  Remover
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                      {module.description && (
                        <CardDescription>{module.description}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      {lessons.filter((l) => l.module_id === module.id).length === 0 ? (
                        <p className="text-sm text-muted-foreground">Nenhuma aula cadastrada</p>
                      ) : (
                        <div className="space-y-2">
                          {lessons
                            .filter((l) => l.module_id === module.id)
                            .map((lesson, lessonIndex) => (
                              <div
                                key={lesson.id}
                                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                              >
                                <div className="flex items-center gap-3">
                                  <span className="text-sm text-muted-foreground">
                                    {lessonIndex + 1}.
                                  </span>
                                  <span className="font-medium">{lesson.title}</span>
                                </div>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Remover Aula?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Esta ação não pode ser desfeita.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => deleteLesson.mutate(lesson.id)}
                                      >
                                        Remover
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Materials Tab */}
          <TabsContent value="materials" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Materiais Complementares</h3>
              <Dialog open={showMaterialDialog} onOpenChange={setShowMaterialDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Material
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Adicionar Material</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Título</Label>
                      <Input
                        value={materialForm.title}
                        onChange={(e) =>
                          setMaterialForm({ ...materialForm, title: e.target.value })
                        }
                        placeholder="Título do material"
                      />
                    </div>
                    <div>
                      <Label>Descrição</Label>
                      <Textarea
                        value={materialForm.description}
                        onChange={(e) =>
                          setMaterialForm({ ...materialForm, description: e.target.value })
                        }
                        placeholder="Descrição do material"
                      />
                    </div>
                    <div>
                      <Label>URL do Arquivo</Label>
                      <Input
                        value={materialForm.file_url}
                        onChange={(e) =>
                          setMaterialForm({ ...materialForm, file_url: e.target.value })
                        }
                        placeholder="https://..."
                      />
                    </div>
                    <div>
                      <Label>Tipo de Arquivo</Label>
                      <Input
                        value={materialForm.file_type}
                        onChange={(e) =>
                          setMaterialForm({ ...materialForm, file_type: e.target.value })
                        }
                        placeholder="pdf, doc, xlsx..."
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleCreateMaterial} disabled={createMaterial.isPending}>
                      Adicionar
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {loadingMaterials ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : materials.length === 0 ? (
              <Card className="p-8 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">Nenhum material cadastrado</p>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {materials.map((material) => (
                  <Card key={material.id}>
                    <CardContent className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-3 rounded-lg bg-primary/10">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h4 className="font-medium line-clamp-1">{material.title}</h4>
                          <Badge variant="outline" className="mt-1">
                            {material.file_type.toUpperCase()}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <a href={material.file_url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remover Material?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteMaterial.mutate(material.id)}
                              >
                                Remover
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
