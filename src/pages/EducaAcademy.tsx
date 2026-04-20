import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/layout/PageHeader";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  GraduationCap,
  MapPin,
  Trophy,
  Award,
  BookOpen,
  TrendingUp,
  Lock,
  Medal,
  LayoutDashboard,
  Play,
  Clock,
} from "lucide-react";
import { useAcademy } from "@/hooks/useAcademy";
import { useUserRole } from "@/hooks/useUserRole";
import { useSubscription } from "@/hooks/useSubscription";
import { TrailCard } from "@/components/academy/TrailCard";
import { TrailDetail } from "@/components/academy/TrailDetail";
import { RankingBoard } from "@/components/academy/RankingBoard";
import { MyCertificates } from "@/components/academy/MyCertificates";
import { CertificatePDF } from "@/components/academy/CertificatePDF";
import { AdminAcademyManager } from "@/components/admin/AdminAcademyManager";
import { AcademyHeroBannerManager } from "@/components/admin/AcademyHeroBannerManager";
import { FeatureGate } from "@/components/subscription/FeatureGate";
import { PlaybookList } from "@/components/playbook/PlaybookList";
import type { TrailWithProgress, UserCertificate, LearningTrail } from "@/types/academy";

export default function EducaAcademy() {
  const { trailsWithProgress, certificates, isLoading, userAchievements } = useAcademy();
  const { isAdmin } = useUserRole();
  const { hasFeature, plan } = useSubscription();
  const [selectedTrail, setSelectedTrail] = useState<TrailWithProgress | null>(null);
  const [selectedCertificate, setSelectedCertificate] = useState<{
    certificate: UserCertificate;
    trail: LearningTrail;
  } | null>(null);



  // Start plan users only have access to the 3 most recent trails
  const isStartPlan = plan === "start";
  const visibleTrails = isStartPlan ? trailsWithProgress.slice(0, 3) : trailsWithProgress;

  const totalProgress = visibleTrails.length > 0
    ? Math.round(visibleTrails.reduce((sum, t) => sum + t.progressPercent, 0) / visibleTrails.length)
    : 0;

  const inProgressTrails = visibleTrails.filter((t) => t.progressPercent > 0 && !t.hasCertificate);

  const handleViewCertificate = (certificateId: string) => {
    const cert = certificates.find((c) => c.id === certificateId);
    if (cert) {
      const trail = trailsWithProgress.find((t) => t.id === cert.trail_id);
      if (trail) setSelectedCertificate({ certificate: cert, trail });
    }
  };

  const canAccessCertificates = hasFeature("certificates");
  const canAccessRanking = hasFeature("ranking");

  if (selectedTrail) {
    return (
      <DashboardLayout>
        <TrailDetail trail={selectedTrail} onBack={() => setSelectedTrail(null)} />
      </DashboardLayout>
    );
  }

  // Find the next incomplete module for a trail
  const getNextModule = (trail: TrailWithProgress) => {
    if (!trail.trainings || trail.trainings.length === 0) return null;
    const sorted = [...trail.trainings].sort((a, b) => a.order_index - b.order_index);
    // Find first training not yet completed (no passed quiz)
    for (const tt of sorted) {
      if (tt.training) {
        // We check if it's NOT passed via completedCount logic
        // Simple heuristic: the (completedCount + 1)th item
        const idx = sorted.indexOf(tt);
        if (idx >= trail.completedCount) return tt.training;
      }
    }
    return sorted[sorted.length - 1]?.training || null;
  };

  // Circular progress component
  const CircularProgress = ({ value, size = 72 }: { value: number; size?: number }) => {
    const strokeWidth = 6;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (value / 100) * circumference;
    
    return (
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold">{value}%</span>
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <PageHeader
          pageKey="educa-academy"
          title="EducaTravel Academy"
          subtitle="Trilhas de aprendizado, certificação e materiais premium para especialistas em destinos"
          icon={GraduationCap}
          adminTab="academy"
        />

        <Tabs defaultValue="dashboard" className="space-y-6">
          {/* Pill-style tabs */}
          <TabsList className="flex-wrap bg-muted/50 p-1 rounded-xl gap-1">
            <TabsTrigger
              value="dashboard"
              className="flex items-center gap-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all"
            >
              <LayoutDashboard className="h-4 w-4" /> Meu Painel
            </TabsTrigger>
            <TabsTrigger
              value="playbooks"
              className="flex items-center gap-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all"
            >
              <BookOpen className="h-4 w-4" /> Playbooks
            </TabsTrigger>
            <TabsTrigger
              value="ranking"
              className="flex items-center gap-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all"
            >
              <Trophy className="h-4 w-4" /> Ranking
              {!canAccessRanking && <Lock className="h-3 w-3 ml-1" />}
            </TabsTrigger>
            <TabsTrigger
              value="certificates"
              className="flex items-center gap-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all"
            >
              <Award className="h-4 w-4" /> Certificados
              {!canAccessCertificates && <Lock className="h-3 w-3 ml-1" />}
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger
                value="admin"
                className="flex items-center gap-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all"
              >
                <BookOpen className="h-4 w-4" /> Gerenciar
              </TabsTrigger>
            )}
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard">
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Trilhas Disponíveis */}
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-6 pb-5">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-primary/10">
                        <BookOpen className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Trilhas Disponíveis</p>
                        <p className="text-2xl font-bold mt-0.5">{visibleTrails.length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Progresso Geral - with circular indicator */}
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-6 pb-5">
                    <div className="flex items-center gap-4">
                      <CircularProgress value={totalProgress} />
                      <div>
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Progresso Geral</p>
                        <p className="text-sm font-medium text-foreground mt-0.5">{totalProgress}% concluído</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Certificados */}
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-6 pb-5">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-yellow-500/10">
                        <Trophy className="h-6 w-6 text-yellow-500" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Certificados</p>
                        <p className="text-2xl font-bold mt-0.5">{certificates.length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Medalhas */}
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-6 pb-5">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-accent/10">
                        <Medal className="h-6 w-6 text-accent" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Medalhas</p>
                        <p className="text-2xl font-bold mt-0.5">{userAchievements.length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Continue Learning - Enhanced */}
              {inProgressTrails.length > 0 && (
                <Card className="border-primary/20 bg-gradient-to-r from-primary/[0.03] to-transparent">
                  <CardContent className="pt-6 pb-5">
                    <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                      <Play className="h-5 w-5 text-primary" />
                      Continuar Aprendendo
                    </h3>
                    <div className="space-y-3">
                      {inProgressTrails.map((trail) => {
                        const nextModule = getNextModule(trail);
                        const totalMinutes = trail.trainings.reduce(
                          (sum, tt) => sum + (tt.training?.duration_minutes || 0),
                          0
                        );

                        return (
                          <div
                            key={trail.id}
                            className="flex items-center gap-4 p-4 rounded-xl border bg-card cursor-pointer hover:border-primary/50 hover:shadow-md transition-all group"
                            onClick={() => setSelectedTrail(trail)}
                          >
                            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                              {trail.image_url ? (
                                <img src={trail.image_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <MapPin className="h-6 w-6 text-primary" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-semibold truncate">{trail.name}</p>
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary shrink-0">
                                  ▶ Em andamento
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {trail.completedCount} de {trail.totalCount} módulos concluídos
                                {totalMinutes > 0 && (
                                  <span className="inline-flex items-center gap-1 ml-2">
                                    <Clock className="h-3 w-3" /> {totalMinutes} min
                                  </span>
                                )}
                              </p>
                              {nextModule && (
                                <p className="text-xs text-muted-foreground/80 mt-0.5 truncate">
                                  Próximo: <span className="font-medium text-foreground/70">{nextModule.title}</span>
                                </p>
                              )}
                              <div className="mt-2">
                                <Progress value={trail.progressPercent} className="h-2" />
                              </div>
                            </div>
                            <Button
                              size="sm"
                              className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm group-hover:shadow-md transition-all shrink-0"
                            >
                              <Play className="h-3.5 w-3.5 mr-1.5" />
                              Continuar curso
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Achievements */}
              {userAchievements.length > 0 && (
                <Card>
                  <CardContent className="pt-6">
                    <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                      <Medal className="h-5 w-5 text-yellow-500" /> Medalhas Conquistadas
                    </h3>
                    <div className="flex flex-wrap gap-3">
                      {userAchievements.map((ua) => (
                        <Badge key={ua.id} variant="secondary" className="px-3 py-2 text-sm bg-yellow-50 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-400">
                          <Medal className="h-4 w-4 mr-2" /> {ua.achievement?.name || "Medalha"}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* All Trails */}
              <div className="space-y-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  Trilhas Disponíveis
                </h2>
                {isLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map((i) => (
                      <Card key={i}>
                        <Skeleton className="h-36 rounded-t-lg" />
                        <CardContent className="pt-4 space-y-2">
                          <Skeleton className="h-6 w-3/4" />
                          <Skeleton className="h-4 w-1/2" />
                          <Skeleton className="h-2 w-full" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : visibleTrails.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <MapPin className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
                      <p className="text-lg font-medium">Nenhuma trilha disponível</p>
                      <p className="text-muted-foreground">Em breve novas trilhas serão adicionadas!</p>
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {visibleTrails.map((trail) => (
                        <TrailCard key={trail.id} trail={trail} onSelect={setSelectedTrail} />
                      ))}
                    </div>
                    {isStartPlan && trailsWithProgress.length > 3 && (
                      <Card className="border-dashed border-2 border-primary/30 bg-primary/5">
                        <CardContent className="py-6 text-center space-y-2">
                          <Lock className="h-8 w-8 mx-auto text-primary/70" />
                          <p className="text-sm font-medium">
                            Você tem acesso às 3 trilhas mais recentes no plano Start.
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Faça upgrade para acessar todas as {trailsWithProgress.length} trilhas disponíveis.
                          </p>
                          <Button
                            size="sm"
                            onClick={() => (window.location.href = "/planos")}
                            className="mt-2"
                          >
                            Ver planos
                          </Button>
                        </CardContent>
                      </Card>
                    )}
                  </>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="playbooks"><PlaybookList /></TabsContent>

          <TabsContent value="ranking">
            <FeatureGate feature="ranking"><RankingBoard /></FeatureGate>
          </TabsContent>

          <TabsContent value="certificates">
            <FeatureGate feature="certificates">
              <MyCertificates onViewCertificate={handleViewCertificate} />
            </FeatureGate>
          </TabsContent>

          {isAdmin && (
            <TabsContent value="admin">
              <div className="space-y-6">
                <AcademyHeroBannerManager />
                <AdminAcademyManager />
              </div>
            </TabsContent>
          )}
        </Tabs>

        <Dialog open={!!selectedCertificate} onOpenChange={() => setSelectedCertificate(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader><DialogTitle>Certificado de Conclusão</DialogTitle></DialogHeader>
            {selectedCertificate && <CertificatePDF certificate={selectedCertificate.certificate} trail={selectedCertificate.trail} />}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
