import { useState } from "react";
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
} from "lucide-react";
import type { TrailWithProgress, Training, TrailMaterial } from "@/types/academy";
import { useAcademy, useQuizQuestions, useExamQuestions, useTrailMaterials } from "@/hooks/useAcademy";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { TrainingPlayer } from "./TrainingPlayer";
import { QuizPlayer } from "./QuizPlayer";
import { CertificatePDF } from "./CertificatePDF";
import { MATERIAL_CATEGORIES } from "@/types/academy";
import { useEffect, useState as useStateAlias } from "react";

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

  // Check if a module is unlocked (all previous quizzes passed)
  const isModuleUnlocked = (index: number) => {
    if (index === 0) return true;
    for (let i = 0; i < index; i++) {
      const trainingId = trail.trainings[i]?.training?.id;
      if (trainingId && !hasPassedQuiz(trainingId)) return false;
    }
    return true;
  };

  const freeMaterials = trailMaterials.filter((m) => !m.is_premium);
  const premiumMaterials = trailMaterials.filter((m) => m.is_premium);

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

      <Tabs defaultValue="modules" className="space-y-4">
        <TabsList>
          <TabsTrigger value="modules" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" /> Módulos
          </TabsTrigger>
          <TabsTrigger value="exam" className="flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4" /> Prova Final
          </TabsTrigger>
          <TabsTrigger value="materials" className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4" /> Materiais
          </TabsTrigger>
        </TabsList>

        {/* Modules Tab */}
        <TabsContent value="modules">
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

        {/* Materials Tab */}
        <TabsContent value="materials">
          <div className="space-y-4">
            {freeMaterials.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2"><Unlock className="h-5 w-5 text-green-500" /> Materiais Livres</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {freeMaterials.map((m) => (
                      <MaterialItem key={m.id} material={m} locked={false} />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2"><Lock className="h-5 w-5 text-amber-500" /> Materiais Premium</CardTitle>
              </CardHeader>
              <CardContent>
                {premiumMaterials.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">Nenhum material premium nesta trilha.</p>
                ) : !isCertified ? (
                  <div className="text-center py-6">
                    <Lock className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
                    <p className="font-medium">Conclua a trilha para desbloquear os materiais exclusivos</p>
                    <p className="text-sm text-muted-foreground mt-1">{premiumMaterials.length} materiais premium disponíveis após certificação</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {premiumMaterials.map((m) => (
                      <MaterialItem key={m.id} material={m} locked={false} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
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

function MaterialItem({ material, locked }: { material: TrailMaterial; locked: boolean }) {
  const icons: Record<string, typeof FileText> = {
    pdf: FileText,
    video: Play,
    audio: Clock,
    image: FileText,
    link: FileText,
  };
  const Icon = icons[material.material_type] || FileText;
  const categoryLabel = MATERIAL_CATEGORIES.find((c) => c.value === material.category)?.label || material.category;

  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border ${locked ? "opacity-50" : "hover:border-primary/50"}`}>
      <div className="p-2 rounded-lg bg-primary/10">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{material.title}</p>
        <p className="text-xs text-muted-foreground">{categoryLabel}</p>
      </div>
      {!locked && material.file_url && (
        <Button variant="ghost" size="sm" onClick={() => window.open(material.file_url!, "_blank")}>
          <Download className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
