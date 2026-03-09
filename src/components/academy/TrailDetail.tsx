import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
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
  Users,
} from "lucide-react";
import type { TrailWithProgress, Training, TrailMaterial } from "@/types/academy";
import { useAcademy, useQuizQuestions, useExamQuestions, useTrailMaterials, useTrailSpeakers } from "@/hooks/useAcademy";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { TrainingPlayer } from "./TrainingPlayer";
import { QuizPlayer } from "./QuizPlayer";
import { CertificatePDF } from "./CertificatePDF";
import { MATERIAL_CATEGORIES } from "@/types/academy";
import { PlaybookPDFViewer } from "@/components/playbook/PlaybookPDFViewer";
import { PlaybookMindMapsViewer } from "@/components/playbook/PlaybookMindMapsViewer";
import { PlaybookPdfSection } from "@/components/playbook/PlaybookPdfSection";
import { AttractionsExplorer } from "@/components/playbook/AttractionsExplorer";
import { PlaybookChecklistTab } from "@/components/playbook/PlaybookChecklistTab";
import { SpeakersTab } from "./SpeakersTab";
import { TabIntroBlock } from "./TabIntroBlock";
import type { PlaybookPDFFile } from "@/types/playbook";
import { usePlaybook, usePlaybookAdmin } from "@/hooks/usePlaybook";
import { PlaybookTabContent } from "@/components/playbook/PlaybookTabContent";
import { PlaybookComoVenderTab } from "@/components/playbook/PlaybookComoVenderTab";
import { PLAYBOOK_TABS } from "@/types/playbook";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { SocialPostCard } from "@/components/materials/SocialPostCard";
import { useMaterials } from "@/hooks/useMaterials";
import {
  Target,
  TrendingUp,
  Plane,
  Hotel,
  Car,
  Camera,
  UtensilsCrossed,
  Package,
  Shield,
  Route,
  AlertTriangle,
  Lightbulb,
  CheckSquare,
} from "lucide-react";

interface TrailDetailProps {
  trail: TrailWithProgress;
  onBack: () => void;
}

export function TrailDetail({ trail, onBack }: TrailDetailProps) {
  const navigate = useNavigate();
  const { hasPassedQuiz, hasPassedExam, bestExamScore, submitQuiz, submitExam, generateCertificate, hasCertificate, certificates } = useAcademy();
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const [selectedTraining, setSelectedTraining] = useState<Training | null>(null);
  const [showQuiz, setShowQuiz] = useState<string | null>(null);
  const [showExam, setShowExam] = useState(false);
  const [showCertificate, setShowCertificate] = useState(false);
  const [userName, setUserName] = useState<string>("Agente de Viagens");
  const [playbookTab, setPlaybookTab] = useState<string>(PLAYBOOK_TABS[0].key);

  // Find matching playbook for this trail using the linked playbook_destination_id
  const { destinations: allPlaybookDestinations } = usePlaybook();
  const linkedSlug = trail.playbook_destination_id
    ? allPlaybookDestinations.find((d) => d.id === trail.playbook_destination_id)?.slug
    : undefined;
  const { destination: playbookDestination, sections: playbookSections } = usePlaybook(linkedSlug);
  const { upsertSection } = usePlaybookAdmin();

  const { data: quizQuestions = [] } = useQuizQuestions(showQuiz);
  const { data: examQuestions = [] } = useExamQuestions(showExam ? trail.id : null);
  const { data: trailMaterials = [] } = useTrailMaterials(trail.id);
  const { data: trailSpeakers = [] } = useTrailSpeakers(trail.id);
  const { groupIntoGalleries } = useMaterials();

  // Fetch linked materials for this trail (junction table)
  const { data: linkedMaterials = [] } = useQuery({
    queryKey: ["trail-linked-materials-full", trail.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trail_linked_materials")
        .select("material_id, materials(*, trade_suppliers(id, name))")
        .eq("trail_id", trail.id);
      if (error) throw error;
      return (data || []).map((r: any) => r.materials).filter(Boolean);
    },
  });

  // Fetch materials exclusively assigned to this trail (trail_id column)
  const { data: exclusiveMaterials = [] } = useQuery({
    queryKey: ["trail-exclusive-materials", trail.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("materials")
        .select("*, trade_suppliers(id, name)")
        .eq("trail_id", trail.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Combine both sources, deduplicating by id
  const allTrailMaterialsCombined = useMemo(() => {
    const map = new Map<string, any>();
    [...exclusiveMaterials, ...linkedMaterials].forEach(m => {
      if (!map.has(m.id)) map.set(m.id, m);
    });
    return Array.from(map.values());
  }, [linkedMaterials, exclusiveMaterials]);

  const linkedGalleries = groupIntoGalleries(allTrailMaterialsCombined);

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
  const videoMaterials = trailMaterials.filter((m) => m.category === 'videos');
  const complementaryMaterials = trailMaterials.filter(
    (m) => !['mapas_mentais', 'apresentacoes', 'videos'].includes(m.category)
  );

  const toPlaybookFiles = (materials: TrailMaterial[]): PlaybookPDFFile[] =>
    materials
      .filter((m) => m.file_url)
      .map((m) => ({
        id: m.id,
        name: m.title,
        description: m.description || undefined,
        category: undefined,
        pdf_url: m.file_url!,
        thumbnail_url: m.thumbnail_url || undefined,
      }));

  const mindMapFiles = toPlaybookFiles(mindMapMaterials);
  const presentationFiles = toPlaybookFiles(presentationMaterials);

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

      {/* Banner Image */}
      {(trail as any).banner_url && (
        <div className="relative w-full overflow-hidden rounded-2xl shadow-lg">
          <img
            src={(trail as any).banner_url}
            alt={trail.name}
            className="w-full h-40 sm:h-52 md:h-64 object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/40 via-transparent to-transparent" />
          <div className="absolute bottom-4 left-6 right-6">
            <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-white drop-shadow-lg">
              {trail.name}
            </h3>
            <p className="text-sm sm:text-base text-white/80 drop-shadow-md mt-1">
              {trail.destination}
            </p>
          </div>
        </div>
      )}

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

      <Tabs defaultValue="videos" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="videos" className="flex items-center gap-2">
            <Video className="h-4 w-4" /> Módulos
          </TabsTrigger>
          <TabsTrigger value="mapas_mentais" className="flex items-center gap-2">
            <GitBranch className="h-4 w-4" /> Mapas Mentais
          </TabsTrigger>
          <TabsTrigger value="apresentacoes" className="flex items-center gap-2">
            <Presentation className="h-4 w-4" /> Apresentações
          </TabsTrigger>
          <TabsTrigger value="videos_drive" className="flex items-center gap-2">
            <Play className="h-4 w-4" /> Vídeos
          </TabsTrigger>
          <TabsTrigger value="materiais" className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4" /> Materiais de Divulgação
          </TabsTrigger>
          <TabsTrigger value="palestrantes" className="flex items-center gap-2">
            <Users className="h-4 w-4" /> Palestrantes
          </TabsTrigger>
          {playbookDestination && linkedSlug && (
            <button
              type="button"
              onClick={() => navigate(`/playbook/${linkedSlug}`)}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <BookOpen className="h-4 w-4" /> Playbook
            </button>
          )}
        </TabsList>


        {/* Mapas Mentais Tab */}
        <TabsContent value="mapas_mentais">
          <TabIntroBlock
            icon={GitBranch}
            title="Mapas Mentais"
            description="Resumos visuais e estratégicos para facilitar a memorização dos conteúdos. Ideal para revisar rapidamente os pontos-chave antes de atender um cliente ou fechar uma venda."
          />
          <PlaybookMindMapsViewer files={mindMapFiles} />
        </TabsContent>

        {/* Apresentações Tab */}
        <TabsContent value="apresentacoes">
          <TabIntroBlock
            icon={Presentation}
            title="Apresentações"
            description={"Nesta aba estão disponíveis os slides utilizados pelos palestrantes nos módulos da trilha, como material de apoio ao seu aprendizado.\nApenas as apresentações previamente autorizadas pelos palestrantes e parceiros do destino são disponibilizadas, respeitando diretrizes institucionais e políticas de uso de conteúdo."}
          />
          <PlaybookMindMapsViewer files={presentationFiles} />
        </TabsContent>

        {/* Vídeos (Drive) Tab */}
        <TabsContent value="videos_drive">
          <TabIntroBlock
            icon={Play}
            title="Vídeos"
            description={"Nesta aba você encontrará conteúdos em vídeo organizados em duas seções: os vídeos apresentados nos módulos da trilha e vídeos complementares selecionados para aprofundar os temas, com explicações práticas e dicas de vendas.\nOs materiais tornam o aprendizado mais dinâmico e reforçam os conteúdos da trilha."}
          />
          {videoMaterials.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="p-5 rounded-2xl bg-muted mb-5">
                <Play className="h-12 w-12 text-muted-foreground/40" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-1">Vídeos</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Os vídeos desta trilha ainda não foram adicionados. Em breve estarão disponíveis aqui.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {videoMaterials.map((m) => (
                <Card key={m.id} className="cursor-pointer hover:border-primary/50 transition-colors group overflow-hidden" onClick={() => window.open(m.file_url || '', '_blank')}>
                  {m.thumbnail_url && (
                    <div className="aspect-[4/3] overflow-hidden bg-white flex items-center justify-center">
                      <img src={m.thumbnail_url} alt={m.title} className="max-w-full max-h-full object-contain" />
                    </div>
                  )}
                  <CardContent className="p-5 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                        <Play className="h-5 w-5 text-primary" />
                      </div>
                      <h4 className="font-medium flex-1 line-clamp-2">{m.title}</h4>
                    </div>
                    {m.description && (
                      <p className="text-sm text-muted-foreground line-clamp-3">{m.description}</p>
                    )}
                    <p className="text-xs text-primary flex items-center gap-1 mt-2">
                      Clique para abrir <Share2 className="h-3 w-3" />
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Vídeos (Módulos) Tab */}
        <TabsContent value="videos">
          <TabIntroBlock
            icon={Video}
            title="Módulos"
            description={"Aqui você acessa o conteúdo principal da trilha, organizado por empresas e parceiros do destino.\nApós assistir ao conteúdo e responder o quiz de cada módulo, o próximo será liberado automaticamente, permitindo que você avance de forma estruturada na trilha."}
          />
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

          {/* Prova Final - inline after modules */}
          <div className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ClipboardCheck className="h-5 w-5 text-primary" /> Prova Final
                </CardTitle>
              </CardHeader>
              <CardContent>
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
          </div>
        </TabsContent>

        {/* Materiais Complementares Tab */}
        <TabsContent value="materiais">
          <TabIntroBlock
            icon={FolderOpen}
            title="Divulgação"
            description={"Nesta aba você encontra materiais prontos para divulgação do destino, como lâminas, carrosséis, reels, artes para redes sociais e WhatsApp.\nTambém há links editáveis no Canva para personalização das lâminas de pacotes, permitindo que os agentes adaptem os conteúdos conforme sua estratégia de vendas."}
          />

          {/* Social Posts from linked materials */}
          {linkedGalleries.length > 0 && (
            <div className="space-y-4 mb-8">
              <div className="flex items-center gap-2 mb-2">
                <FolderOpen className="h-5 w-5 text-primary" />
                <h3 className="text-base font-semibold">Posts de Divulgação</h3>
                <p className="text-sm text-muted-foreground">— Baixe e compartilhe nas redes sociais</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 justify-items-center">
                {linkedGalleries.map((gallery) => (
                  <SocialPostCard key={gallery.id} gallery={gallery} />
                ))}
              </div>
            </div>
          )}

          {/* Existing complementary materials */}
          {complementaryMaterials.length === 0 && linkedGalleries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="p-5 rounded-2xl bg-muted mb-5">
                <FolderOpen className="h-12 w-12 text-muted-foreground/40" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-1">Materiais de Divulgação</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Lâminas, PDFs e vídeos para baixar e compartilhar com seus contatos. Em breve estarão disponíveis aqui.
              </p>
            </div>
          ) : complementaryMaterials.length > 0 ? (
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
          ) : null}
        </TabsContent>

        {/* Palestrantes Tab */}
        <TabsContent value="palestrantes">
          <TabIntroBlock
            icon={Users}
            title="Palestrantes"
            description={"Conheça os especialistas e parceiros que contribuíram com a trilha de treinamento, compartilhando experiências práticas, conhecimentos do mercado e insights valiosos sobre o destino.\nNesta aba também estarão disponíveis os contatos profissionais, como LinkedIn, WhatsApp e e-mail, para conexão direta com os palestrantes."}
          />
          <SpeakersTab speakers={trailSpeakers} />
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

const playbookIconMap: Record<string, typeof Target> = {
  LayoutDashboard, Target, TrendingUp, FileText, Plane, MapPin, Hotel, Car, Camera,
  UtensilsCrossed, Package, Shield, Users, Route, AlertTriangle, Lightbulb, CheckSquare, GitBranch,
};

function PlaybookEmbedded({
  destination,
  sections,
  isAdmin,
  upsertSection,
  activeTab,
  setActiveTab,
}: {
  destination: any;
  sections: any[];
  isAdmin: boolean;
  upsertSection: any;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}) {
  const activeSection = sections.find((s: any) => s.tab_key === activeTab);
  const activeTabData = PLAYBOOK_TABS.find((t) => t.key === activeTab)!;

  const handleSaveSection = useCallback(
    async (content: any) => {
      if (!destination || !isAdmin) return;
      await upsertSection.mutateAsync({
        destination_id: destination.id,
        tab_key: activeTab,
        title: activeTabData?.label || activeTab,
        content,
        order_index: PLAYBOOK_TABS.findIndex((t) => t.key === activeTab),
      });
    },
    [destination, activeTab, activeTabData, isAdmin, upsertSection]
  );

  return (
    <div className="space-y-4 mt-4">
      {/* Playbook Tab Navigation */}
      <div className="flex flex-wrap gap-1.5">
        {PLAYBOOK_TABS.map((tab) => {
          const Icon = playbookIconMap[tab.icon] || Target;
          const isActive = activeTab === tab.key;
          const hasContent = sections.some((s: any) => s.tab_key === tab.key);

          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all duration-200 border",
                isActive
                  ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20"
                  : hasContent
                  ? "bg-card text-foreground border-border hover:border-primary/40 hover:bg-primary/5"
                  : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Playbook Tab Content */}
      <div className="min-h-[300px]">
        {activeTab === 'mapa' ? (
          <PlaybookPdfSection
            pdfUrl={activeSection?.content?.pdf_url}
            onSavePdfUrl={isAdmin ? async (url: string | null) => {
              if (!destination) return;
              const currentContent = activeSection?.content || {};
              await upsertSection.mutateAsync({
                destination_id: destination.id,
                tab_key: activeTab,
                title: activeTabData?.label || activeTab,
                content: { ...currentContent, pdf_url: url || undefined },
                order_index: PLAYBOOK_TABS.findIndex((t) => t.key === activeTab),
              });
            } : undefined}
            tabLabel="Mapa da Cidade"
          />
        ) : activeTab === 'atracoes' ? (
          <AttractionsExplorer
            destinationName={destination?.name}
          />
        ) : activeTab === 'como_vender' ? (
          <PlaybookComoVenderTab
            section={activeSection}
            onSaveSection={isAdmin ? handleSaveSection : undefined}
          />
        ) : activeTab === 'checklist_final' ? (
          <PlaybookChecklistTab
            section={activeSection}
            destinationSlug={destination?.slug || ''}
            onSaveSection={isAdmin ? handleSaveSection : undefined}
          />
        ) : (
          <PlaybookTabContent
            section={activeSection}
            tabLabel={activeTabData.label}
            onSaveSection={isAdmin ? handleSaveSection : undefined}
          />
        )}
      </div>
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
