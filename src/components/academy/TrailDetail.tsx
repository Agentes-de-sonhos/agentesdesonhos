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
  Sparkles,
  GraduationCap,
  Trophy,
  Zap,
  ChevronRight,
} from "lucide-react";
import type { TrailWithProgress, Training, TrailMaterial } from "@/types/academy";
import { useAcademy, useQuizQuestions, useExamQuestions, useTrailMaterials, useTrailSpeakers } from "@/hooks/useAcademy";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { TrainingPlayer } from "./TrainingPlayer";
import { QuizPlayer } from "./QuizPlayer";
import { CertificatePDF } from "./CertificatePDF";
import { CertificateNameConfirmDialog } from "./CertificateNameConfirmDialog";
import { MATERIAL_CATEGORIES } from "@/types/academy";
import { PlaybookPDFViewer } from "@/components/playbook/PlaybookPDFViewer";
import { PlaybookMindMapsViewer } from "@/components/playbook/PlaybookMindMapsViewer";
import { PlaybookPdfSection } from "@/components/playbook/PlaybookPdfSection";
import { AttractionsExplorer } from "@/components/playbook/AttractionsExplorer";
import { PlaybookChecklistTab } from "@/components/playbook/PlaybookChecklistTab";
import { SpeakersTab } from "./SpeakersTab";
import { TabIntroBlock } from "./TabIntroBlock";
import type { PlaybookPDFFile } from "@/types/playbook";
import { usePlaybook } from "@/hooks/usePlaybook";
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
  const [showNameConfirm, setShowNameConfirm] = useState(false);
  const [userName, setUserName] = useState<string>("Agente de Viagens");

  const { destinations: allPlaybookDestinations } = usePlaybook();
  const linkedSlug = trail.playbook_destination_id
    ? allPlaybookDestinations.find((d) => d.id === trail.playbook_destination_id)?.slug
    : undefined;
  const { destination: playbookDestination } = usePlaybook(linkedSlug);

  const { data: quizQuestions = [] } = useQuizQuestions(showQuiz);
  const { data: examQuestions = [] } = useExamQuestions(showExam ? trail.id : null);
  const { data: trailMaterials = [] } = useTrailMaterials(trail.id);
  const { data: trailSpeakers = [] } = useTrailSpeakers(trail.id);
  const { groupIntoGalleries } = useMaterials();

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

  // Find next module to continue
  const nextModuleIndex = trail.trainings.findIndex((tt) => !hasPassedQuiz(tt.training?.id));
  const nextModule = nextModuleIndex >= 0 ? trail.trainings[nextModuleIndex]?.training : null;

  // Total estimated time remaining
  const totalMinutes = trail.trainings.reduce((sum, tt) => sum + (tt.training?.duration_minutes || 0), 0);
  const remainingMinutes = trail.trainings
    .filter((tt) => !hasPassedQuiz(tt.training?.id))
    .reduce((sum, tt) => sum + (tt.training?.duration_minutes || 0), 0);

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
      {/* Back Button */}
      <Button variant="ghost" size="sm" onClick={onBack} className="gap-2 -mb-2">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Button>

      {/* Title - always above banner */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h2 className="text-2xl md:text-3xl font-bold">{trail.name}</h2>
          {isCertified && (
            <Badge className="bg-success text-success-foreground gap-1">
              <Award className="h-3 w-3" /> Certificada
            </Badge>
          )}
          {trail.progressPercent > 0 && !isCertified && (
            <Badge variant="secondary">▶ Em andamento</Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground flex items-center gap-1">
          <MapPin className="h-3.5 w-3.5" /> {trail.destination}
        </p>
      </div>

      {/* Banner Image */}
      {(trail as any).banner_url && (
        <div className="relative w-full overflow-hidden rounded-2xl shadow-lg">
          <img
            src={(trail as any).banner_url}
            alt={trail.name}
            className="w-full h-40 sm:h-52 md:h-56 object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/40 via-transparent to-transparent" />
        </div>
      )}

      {/* Quick Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-card border">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <BookOpen className="h-4.5 w-4.5 text-primary" />
          </div>
          <div>
            <p className="text-lg font-bold text-foreground leading-tight">{trail.totalCount}</p>
            <p className="text-[10px] text-muted-foreground font-medium">módulos</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-card border">
          <div className="h-9 w-9 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
            <Clock className="h-4.5 w-4.5 text-accent" />
          </div>
          <div>
            <p className="text-lg font-bold text-foreground leading-tight">{totalMinutes} min</p>
            <p className="text-[10px] text-muted-foreground font-medium">de conteúdo</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-card border">
          <div className="h-9 w-9 rounded-lg bg-success/10 flex items-center justify-center flex-shrink-0">
            <GraduationCap className="h-4.5 w-4.5 text-success" />
          </div>
          <div>
            <p className="text-lg font-bold text-foreground leading-tight">{isCertified ? "Sim" : "Disponível"}</p>
            <p className="text-[10px] text-muted-foreground font-medium">certificado</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-card border">
          <div className="h-9 w-9 rounded-lg bg-warning/10 flex items-center justify-center flex-shrink-0">
            <Zap className="h-4.5 w-4.5 text-warning" />
          </div>
          <div>
            <p className="text-lg font-bold text-foreground leading-tight">{trail.progressPercent}%</p>
            <p className="text-[10px] text-muted-foreground font-medium">concluído</p>
          </div>
        </div>
      </div>

      {/* Progress + Continue Learning */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Progress Card */}
        <Card className="lg:col-span-3 rounded-xl">
          <CardContent className="py-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                <span className="font-semibold text-sm">Progresso da Trilha</span>
              </div>
              <span className="text-2xl font-bold text-primary">{trail.progressPercent}%</span>
            </div>
            <Progress value={trail.progressPercent} className="h-3 rounded-full" />
            <div className="flex items-center justify-between mt-3">
              <p className="text-sm text-muted-foreground">
                {trail.completedCount} de {trail.totalCount} módulos concluídos
              </p>
              {remainingMinutes > 0 && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {remainingMinutes} min restantes
                </p>
              )}
            </div>
            {!trail.allQuizzesPassed && trail.totalCount > 0 && (
              <div className="mt-3 p-2.5 rounded-lg bg-primary/5 border border-primary/10">
                <p className="text-xs text-primary font-medium flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  {trail.totalCount - trail.completedCount === 1
                    ? "Falta 1 módulo para desbloquear a prova final!"
                    : `Faltam ${trail.totalCount - trail.completedCount} módulos para desbloquear a prova final.`
                  }
                </p>
              </div>
            )}
            {/* Certificate actions */}
            <div className="flex items-center gap-2 mt-3">
              {canGenerateCertificate && (
                <Button onClick={() => setShowNameConfirm(true)} className="gap-2">
                  <Award className="h-4 w-4" /> Gerar Certificado
                </Button>
              )}
              {certificate && (
                <Button variant="outline" className="gap-2" onClick={() => {
                  const pdfUrl = (certificate as any).certificate_pdf_url;
                  if (pdfUrl) {
                    const a = document.createElement("a");
                    a.href = pdfUrl;
                    a.download = `Certificado_${certificate.certificate_number}.pdf`;
                    a.target = "_blank";
                    a.click();
                  } else {
                    setShowCertificate(true);
                  }
                }}>
                  <Download className="h-4 w-4" /> Baixar Certificado
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Continue Learning */}
        {nextModule && (
          <Card className="lg:col-span-2 rounded-xl border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5 overflow-hidden">
            <CardContent className="py-5 h-full flex flex-col">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-7 w-7 rounded-lg bg-primary/15 flex items-center justify-center">
                  <Play className="h-3.5 w-3.5 text-primary" />
                </div>
                <span className="text-xs font-semibold uppercase tracking-wider text-primary">Continue sua jornada</span>
              </div>
              <div className="flex-1">
                <p className="text-[11px] text-muted-foreground mb-1">Próximo módulo:</p>
                <h4 className="font-semibold text-foreground leading-snug line-clamp-2">{nextModule.title}</h4>
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {nextModule.duration_minutes} min
                  </span>
                  <Badge variant="outline" className="text-[10px] h-5">{nextModule.category}</Badge>
                </div>
              </div>
              <Button
                className="w-full mt-4 gap-2 shadow-lg shadow-primary/20 rounded-xl"
                onClick={() => setSelectedTraining(nextModule)}
              >
                <Play className="h-4 w-4" /> Assistir agora
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Certified state replacement */}
        {!nextModule && isCertified && (
          <Card className="lg:col-span-2 rounded-xl border-success/20 bg-gradient-to-br from-success/5 to-success/10 overflow-hidden">
            <CardContent className="py-5 h-full flex flex-col items-center justify-center text-center">
              <div className="h-14 w-14 rounded-2xl bg-success/15 flex items-center justify-center mb-3">
                <Trophy className="h-7 w-7 text-success" />
              </div>
              <h4 className="font-bold text-foreground">Trilha Concluída!</h4>
              <p className="text-xs text-muted-foreground mt-1">
                Você é Especialista em {trail.destination}
              </p>
              <Badge className="bg-success text-success-foreground mt-3 gap-1">
                <GraduationCap className="h-3 w-3" /> Certificado emitido
              </Badge>
            </CardContent>
          </Card>
        )}
      </div>

      <Tabs defaultValue="videos" className="space-y-4">
        <TabsList className="h-auto flex-nowrap overflow-x-auto justify-start w-full">
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
          {/* TabIntroBlock for Módulos hidden by request */}

          {/* Module Cards */}
          <div className="space-y-3">
            {trail.trainings.length === 0 ? (
              <Card className="rounded-xl">
                <CardContent className="py-12">
                  <p className="text-center text-muted-foreground">Nenhum módulo cadastrado nesta trilha.</p>
                </CardContent>
              </Card>
            ) : (
              trail.trainings.map((tt, index) => {
                const training = tt.training;
                const quizPassed = hasPassedQuiz(training.id);
                const unlocked = isModuleUnlocked(index);
                const isNext = nextModuleIndex === index;

                return (
                  <Card
                    key={tt.id}
                    className={cn(
                      "rounded-xl transition-all duration-200",
                      quizPassed
                        ? "border-success/30 bg-success/5"
                        : !unlocked
                        ? "opacity-60"
                        : isNext
                        ? "border-primary/40 shadow-md shadow-primary/10 ring-1 ring-primary/20"
                        : "hover:shadow-md hover:-translate-y-0.5 hover:border-primary/30 cursor-pointer"
                    )}
                    onClick={() => unlocked && !quizPassed && setSelectedTraining(training)}
                  >
                    <CardContent className="py-4">
                      <div className="flex items-start gap-4">
                        {/* Module Number */}
                        <div className="relative flex-shrink-0">
                          <div className={cn(
                            "flex items-center justify-center w-12 h-12 rounded-xl font-bold text-sm",
                            quizPassed
                              ? "bg-success/15 text-success border-2 border-success/30"
                              : !unlocked
                              ? "bg-muted text-muted-foreground border-2 border-muted-foreground/20"
                              : isNext
                              ? "bg-primary/15 text-primary border-2 border-primary/40"
                              : "bg-primary/10 text-primary border-2 border-primary/20"
                          )}>
                            {quizPassed ? (
                              <CheckCircle2 className="h-5 w-5" />
                            ) : !unlocked ? (
                              <Lock className="h-4 w-4" />
                            ) : (
                              index + 1
                            )}
                          </div>
                        </div>

                        {/* Module Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                              Módulo {index + 1}
                            </p>
                            {isNext && !quizPassed && (
                              <Badge className="bg-primary text-primary-foreground text-[10px] h-5 gap-1">
                                <Sparkles className="h-3 w-3" /> Módulo atual
                              </Badge>
                            )}
                            {quizPassed && (
                              <Badge className="bg-success/15 text-success border-success/30 text-[10px] h-5 gap-1">
                                <CheckCircle2 className="h-3 w-3" /> Concluído
                              </Badge>
                            )}
                          </div>
                          <h4 className="font-semibold text-foreground mt-0.5 line-clamp-1">{training.title}</h4>
                          <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" /> {training.duration_minutes} min
                            </span>
                            <Badge variant="outline" className="text-[10px] h-5 rounded-full">{training.category}</Badge>
                          </div>

                          {/* Locked message */}
                          {!unlocked && (
                            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
                              <Lock className="h-3 w-3" /> Disponível após concluir o módulo anterior
                            </p>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {quizPassed ? (
                            <Button variant="ghost" size="sm" className="text-success gap-1 text-xs pointer-events-none">
                              <CheckCircle2 className="h-4 w-4" /> Aprovado
                            </Button>
                          ) : unlocked ? (
                            <div className="flex items-center gap-2">
                              <Button size="sm" className="gap-1.5 rounded-lg" onClick={(e) => { e.stopPropagation(); setSelectedTraining(training); }}>
                                <Play className="h-3.5 w-3.5" /> Assistir aula
                              </Button>
                              <Button variant="outline" size="sm" className="gap-1.5 rounded-lg" onClick={(e) => { e.stopPropagation(); setShowQuiz(training.id); }}>
                                <ClipboardCheck className="h-3.5 w-3.5" /> Fazer quiz
                              </Button>
                            </div>
                          ) : (
                            <Badge variant="secondary" className="gap-1">
                              <Lock className="h-3 w-3" /> Bloqueado
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>

          {/* Prova Final - inline after modules */}
          <div className="mt-8">
            <Card className={cn(
              "rounded-xl overflow-hidden",
              trail.allQuizzesPassed && !trail.examPassed
                ? "border-warning/30 ring-1 ring-warning/20"
                : trail.examPassed
                ? "border-success/30"
                : ""
            )}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-primary" /> Prova Final
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!trail.allQuizzesPassed ? (
                  <div className="text-center py-8">
                    <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                      <Lock className="h-8 w-8 text-muted-foreground/40" />
                    </div>
                    <p className="text-base font-semibold text-foreground">Prova Final Bloqueada</p>
                    <p className="text-sm text-muted-foreground mt-1.5 max-w-sm mx-auto">
                      Complete todos os {trail.totalCount} módulos para desbloquear a certificação.
                    </p>
                    <div className="mt-4 max-w-xs mx-auto">
                      <Progress value={trail.progressPercent} className="h-2" />
                      <p className="text-xs text-muted-foreground mt-1.5">
                        {trail.completedCount} de {trail.totalCount} módulos concluídos
                      </p>
                    </div>
                  </div>
                ) : trail.examPassed ? (
                  <div className="text-center py-8">
                    <div className="h-16 w-16 rounded-2xl bg-success/15 flex items-center justify-center mx-auto mb-4">
                      <Trophy className="h-8 w-8 text-success" />
                    </div>
                    <p className="text-base font-semibold text-foreground">Prova Final Aprovada! 🎉</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Sua melhor nota: <span className="font-bold text-primary">{bestExamScore(trail.id)}%</span>
                    </p>
                    {canGenerateCertificate && (
                      <Button className="mt-4 gap-2" onClick={() => setShowNameConfirm(true)}>
                        <Award className="h-4 w-4" /> Gerar Certificado
                      </Button>
                    )}
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
                    <div className="h-16 w-16 rounded-2xl bg-warning/15 flex items-center justify-center mx-auto mb-4">
                      <Unlock className="h-8 w-8 text-warning" />
                    </div>
                    <p className="text-base font-semibold text-foreground">🏆 Prova Final Liberada!</p>
                    <p className="text-sm text-muted-foreground mt-1.5 mb-4 max-w-sm mx-auto">
                      Nota mínima para aprovação: 75%. Boa sorte!
                    </p>
                    <Button onClick={() => setShowExam(true)} className="gap-2 shadow-lg shadow-primary/20">
                      <ClipboardCheck className="h-4 w-4" /> Iniciar Prova Final
                    </Button>
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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

      {/* Name Confirmation Dialog */}
      <CertificateNameConfirmDialog
        open={showNameConfirm}
        onOpenChange={setShowNameConfirm}
        defaultName={userName}
        onConfirm={async (name) => {
          await generateCertificate.mutateAsync({ trailId: trail.id, agentName: name });
          setShowNameConfirm(false);
        }}
      />
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
    <Card className="hover:border-primary/40 hover:shadow-md transition-all duration-200 rounded-xl">
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
