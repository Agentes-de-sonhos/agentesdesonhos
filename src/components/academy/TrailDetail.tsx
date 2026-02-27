import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  MapPin,
  BookOpen,
  Play,
  CheckCircle2,
  Clock,
  Award,
  Download,
  FileText,
  Lock,
  Unlock,
  ClipboardCheck,
  FolderOpen,
  LayoutDashboard,
  GitBranch,
  Presentation,
  Video,
  Share2,
} from "lucide-react";
import type { TrailWithProgress, Training, TrailMaterial } from "@/types/academy";
import { useAcademy, useQuizQuestions, useExamQuestions, useTrailMaterials } from "@/hooks/useAcademy";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { TrainingPlayer } from "./TrainingPlayer";
import { QuizPlayer } from "./QuizPlayer";
import { CertificatePDF } from "./CertificatePDF";
import { MATERIAL_CATEGORIES } from "@/types/academy";
import { PlaybookPDFViewer } from "@/components/playbook/PlaybookPDFViewer";
import { PlaybookMindMapsViewer } from "@/components/playbook/PlaybookMindMapsViewer";
import type { PlaybookPDFFile } from "@/types/playbook";

interface TrailDetailProps {
  trail: TrailWithProgress;
  onBack: () => void;
}

export function TrailDetail({ trail, onBack }: TrailDetailProps) {
  const { hasPassedQuiz, hasPassedExam, bestExamScore, submitQuiz, submitExam, generateCertificate, hasCertificate, certificates } = useAcademy();
  const { user } = useAuth();
  const [selectedTraining, setSelectedTraining] = useState<Training | null>(null);
  const [showQuiz, setShowQuiz] = useState<string | null>(null);
  const [showExam, setShowExam] = useState(false);
  const [showCertificate, setShowCertificate] = useState(false);
  const [userName, setUserName] = useState<string>("Agente de Viagens");

  const { data: quizQuestions = [] } = useQuizQuestions(showQuiz);
  const { data: examQuestions = [] } = useExamQuestions(showExam ? trail.id : null);
  const { data: trailMaterials = [] } = useTrailMaterials(trail.id);

  const certificate = certificates.find((c) => c.trail_id === trail.id);
  const canTakeExam = trail.allQuizzesPassed && !trail.examPassed;
  const canGenerateCertificate = trail.allQuizzesPassed && trail.examPassed && !trail.hasCertificate;
  const isCertified = trail.hasCertificate;

  useEffect(() => {
    const fetchUserName = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("name")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data?.name) setUserName(data.name);
    };
    fetchUserName();
  }, [user]);

  const isModuleUnlocked = (index: number) => {
    if (index === 0) return true;
    for (let i = 0; i < index; i++) {
      const trainingId = trail.trainings[i]?.training?.id;
      if (trainingId && !hasPassedQuiz(trainingId)) return false;
    }
    return true;
  };

  // Categorize materials
  const mindMapMaterials = trailMaterials.filter((m) => m.category === 'mapas_mentais');
  const presentationMaterials = trailMaterials.filter((m) => m.category === 'apresentacoes');
  const complementaryMaterials = trailMaterials.filter(
    (m) => !['mapas_mentais', 'apresentacoes'].includes(m.category)
  );

  // Convert mind map materials to PlaybookPDFFile format for the viewer
  const mindMapFiles: PlaybookPDFFile[] = mindMapMaterials
    .filter((m) => m.file_url)
    .map((m) => ({
      id: m.id,
      name: m.title,
      description: m.description || undefined,
      category: undefined,
      pdf_url: m.file_url!,
    }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-2xl font-bold">{trail.name}</h2>
            {isCertified && (
              <Badge className="bg-green-500 text-white">
                <Award className="h-3 w-3 mr-1" /> Certificada
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3 text-muted-foreground text-sm">
            <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{trail.destination}</span>
            {trail.total_hours > 0 && <span className="flex items-center gap-1"><Clock className="h-4 w-4" />{trail.total_hours}h de carga horária</span>}
          </div>
        </div>
        {canGenerateCertificate && (
          <Button onClick={() => generateCertificate.mutateAsync({ trailId: trail.id, agentName: userName }).then(() => setShowCertificate(true))}>
            <Award className="h-4 w-4 mr-2" /> Gerar Certificado
          </Button>
        )}
        {certificate && (
          <Button variant="outline" onClick={() => setShowCertificate(true)}>
            <Download className="h-4 w-4 mr-2" /> Ver Certificado
          </Button>
        )}
      </div>

      {/* Progress Card */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              <span className="font-medium">Progresso da Trilha</span>
            </div>
            <span className="text-lg font-bold text-primary">{trail.progressPercent}%</span>
          </div>
          <Progress value={trail.progressPercent} className="h-3" />
          <p className="text-sm text-muted-foreground mt-2">
            {trail.completedCount} de {trail.totalCount} módulos concluídos (quiz aprovado)
          </p>
        </CardContent>
      </Card>

      <Tabs defaultValue="visao_geral" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="visao_geral" className="flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4" /> Visão Geral
          </TabsTrigger>
          <TabsTrigger value="mapas_mentais" className="flex items-center gap-2">
            <GitBranch className="h-4 w-4" /> Mapas Mentais
          </TabsTrigger>
          <TabsTrigger value="apresentacoes" className="flex items-center gap-2">
            <Presentation className="h-4 w-4" /> Apresentações
          </TabsTrigger>
          <TabsTrigger value="videos" className="flex items-center gap-2">
            <Video className="h-4 w-4" /> Vídeos
          </TabsTrigger>
          <TabsTrigger value="exam" className="flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4" /> Prova Final
          </TabsTrigger>
          <TabsTrigger value="materiais" className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4" /> Materiais Complementares
          </TabsTrigger>
        </TabsList>

        {/* Visão Geral Tab */}
        <TabsContent value="visao_geral">
          <PlaybookPDFViewer
            pdfUrl={trail.overview_pdf_url || undefined}
            title="Visão Geral"
            subtitle={`Resumo Estratégico — ${trail.name}`}
          />
        </TabsContent>

        {/* Mapas Mentais Tab */}
        <TabsContent value="mapas_mentais">
          <PlaybookMindMapsViewer files={mindMapFiles} />
        </TabsContent>

        {/* Apresentações Tab */}
        <TabsContent value="apresentacoes">
          {presentationMaterials.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="p-5 rounded-2xl bg-muted mb-5">
                <Presentation className="h-12 w-12 text-muted-foreground/40" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-1">Apresentações</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                As apresentações desta trilha ainda não foram adicionadas. Em breve estarão disponíveis aqui.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {presentationMaterials.map((m) => (
                <MaterialDownloadCard key={m.id} material={m} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Vídeos (Módulos) Tab */}
        <TabsContent value="videos">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Módulos da Trilha</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[450px] pr-4">
                <div className="space-y-3">
                  {trail.trainings.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">Nenhum módulo cadastrado nesta trilha.</p>
                  ) : (
                    trail.trainings.map((tt, index) => {
                      const training = tt.training;
                      const quizPassed = hasPassedQuiz(training.id);
                      const unlocked = isModuleUnlocked(index);

                      return (
                        <div
                          key={tt.id}
                          className={`flex items-center gap-4 p-4 rounded-lg border transition-all ${
                            quizPassed ? "bg-green-50 dark:bg-green-950/20 border-green-200" :
                            !unlocked ? "opacity-50 bg-muted/50" : "cursor-pointer hover:border-primary/50"
                          }`}
                          onClick={() => unlocked && setSelectedTraining(training)}
                        >
                          <div className="relative flex items-center justify-center w-10 h-10">
                            <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                              quizPassed ? "bg-green-500/15 border-2 border-green-500" : !unlocked ? "bg-muted border-2 border-muted-foreground/20" : "bg-primary/10 border-2 border-primary/30"
                            }`}>
                              <span className={`font-bold text-sm ${quizPassed ? "text-green-600" : !unlocked ? "text-muted-foreground" : "text-primary"}`}>{index + 1}</span>
                            </div>
                            {quizPassed && <CheckCircle2 className="absolute -top-1 -right-1 h-4 w-4 text-green-500 bg-background rounded-full" />}
                            {!unlocked && <Lock className="absolute -top-1 -right-1 h-4 w-4 text-muted-foreground bg-background rounded-full" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium truncate">{training.title}</h4>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                              <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{training.duration_minutes} min</span>
                              <Badge variant="outline" className="text-xs">{training.category}</Badge>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {quizPassed ? (
                              <Badge className="bg-green-100 text-green-700">✓ Aprovado</Badge>
                            ) : unlocked ? (
                              <>
                                <Button variant="default" size="sm" onClick={(e) => { e.stopPropagation(); setSelectedTraining(training); }}>
                                  <Play className="h-4 w-4 mr-1" /> Assistir
                                </Button>
                                <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setShowQuiz(training.id); }}>
                                  <ClipboardCheck className="h-4 w-4 mr-1" /> Quiz
                                </Button>
                              </>
                            ) : (
                              <Badge variant="secondary"><Lock className="h-3 w-3 mr-1" /> Bloqueado</Badge>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Exam Tab */}
        <TabsContent value="exam">
          <Card>
            <CardContent className="py-6">
              {!trail.allQuizzesPassed ? (
                <div className="text-center py-8">
                  <Lock className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
                  <p className="text-lg font-medium">Prova Final Bloqueada</p>
                  <p className="text-muted-foreground">Complete todos os módulos (quizzes) para desbloquear a prova final.</p>
                </div>
              ) : trail.examPassed ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="h-16 w-16 mx-auto text-green-500 mb-4" />
                  <p className="text-lg font-medium">Prova Final Aprovada! 🎉</p>
                  <p className="text-muted-foreground">Sua melhor nota: <span className="font-bold text-primary">{bestExamScore(trail.id)}%</span></p>
                </div>
              ) : showExam ? (
                <QuizPlayer
                  questions={examQuestions}
                  passingScore={75}
                  title="Prova Final"
                  onSubmit={(answers, score, passed) => {
                    submitExam.mutate({ trailId: trail.id, answers, score, passed });
                    if (passed) setShowExam(false);
                  }}
                />
              ) : (
                <div className="text-center py-8">
                  <ClipboardCheck className="h-16 w-16 mx-auto text-primary/50 mb-4" />
                  <p className="text-lg font-medium">Prova Final Disponível</p>
                  <p className="text-muted-foreground mb-4">Nota mínima para aprovação: 75%</p>
                  <Button onClick={() => setShowExam(true)}>Iniciar Prova Final</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Materiais Complementares Tab */}
        <TabsContent value="materiais">
          {complementaryMaterials.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="p-5 rounded-2xl bg-muted mb-5">
                <FolderOpen className="h-12 w-12 text-muted-foreground/40" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-1">Materiais Complementares</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Lâminas, PDFs e vídeos para baixar e compartilhar com seus contatos. Em breve estarão disponíveis aqui.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <FolderOpen className="h-5 w-5 text-primary" />
                <h3 className="text-base font-semibold">Materiais Complementares</h3>
                <p className="text-sm text-muted-foreground">— Baixe e compartilhe com seus contatos</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {complementaryMaterials.map((m) => (
                  <MaterialDownloadCard key={m.id} material={m} />
                ))}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Training Player Dialog */}
      <Dialog open={!!selectedTraining} onOpenChange={() => setSelectedTraining(null)}>
        <DialogContent className="max-w-4xl h-[80vh]">
          <DialogHeader>
            <DialogTitle>{selectedTraining?.title}</DialogTitle>
          </DialogHeader>
          {selectedTraining && (
            <TrainingPlayer
              training={selectedTraining}
              isCompleted={hasPassedQuiz(selectedTraining.id)}
              onComplete={() => setShowQuiz(selectedTraining.id)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Quiz Dialog */}
      <Dialog open={!!showQuiz} onOpenChange={() => setShowQuiz(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Quiz do Módulo</DialogTitle>
          </DialogHeader>
          <QuizPlayer
            questions={quizQuestions}
            passingScore={100}
            title="Quiz do Módulo"
            onSubmit={(answers, score, passed) => {
              if (showQuiz) {
                submitQuiz.mutate({ trainingId: showQuiz, answers, score, passed });
                if (passed) setTimeout(() => setShowQuiz(null), 2000);
              }
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Certificate Dialog */}
      <Dialog open={showCertificate} onOpenChange={setShowCertificate}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Certificado de Conclusão</DialogTitle>
          </DialogHeader>
          {certificate && <CertificatePDF certificate={certificate} trail={trail} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MaterialDownloadCard({ material }: { material: TrailMaterial }) {
  const icons: Record<string, typeof FileText> = {
    pdf: FileText,
    video: Play,
    audio: Clock,
    image: FileText,
    link: FileText,
  };
  const Icon = icons[material.material_type] || FileText;
  const categoryLabel = MATERIAL_CATEGORIES.find((c) => c.value === material.category)?.label || material.category;

  const handleDownload = () => {
    if (material.file_url) {
      const a = document.createElement("a");
      a.href = material.file_url;
      a.download = material.title;
      a.target = "_blank";
      a.click();
    }
  };

  const handleShare = async () => {
    if (material.file_url && navigator.share) {
      try {
        await navigator.share({
          title: material.title,
          text: material.description || `Confira: ${material.title}`,
          url: material.file_url,
        });
      } catch {
        // User cancelled or share not supported
      }
    } else if (material.file_url) {
      await navigator.clipboard.writeText(material.file_url);
    }
  };

  return (
    <Card className="hover:border-primary/40 hover:shadow-md transition-all duration-200">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 shrink-0">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm truncate">{material.title}</h4>
            {material.description && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{material.description}</p>
            )}
            <Badge variant="outline" className="text-xs mt-1.5">{categoryLabel}</Badge>
          </div>
        </div>
        {material.file_url && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
            <Button variant="outline" size="sm" className="flex-1" onClick={handleDownload}>
              <Download className="h-3.5 w-3.5 mr-1.5" /> Baixar
            </Button>
            <Button variant="ghost" size="sm" className="flex-1" onClick={handleShare}>
              <Share2 className="h-3.5 w-3.5 mr-1.5" /> Compartilhar
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
