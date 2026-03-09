import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { LaunchCountdownBanner } from "@/components/subscription/LaunchCountdownBanner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
import { FeatureGate } from "@/components/subscription/FeatureGate";
import { PlaybookList } from "@/components/playbook/PlaybookList";
import type { TrailWithProgress, UserCertificate, LearningTrail } from "@/types/academy";

export default function EducaAcademy() {
  const { trailsWithProgress, certificates, isLoading, userAchievements } = useAcademy();
  const { isAdmin } = useUserRole();
  const { hasFeature, plan } = useSubscription();
  const isEducaPass = plan === "educa_pass";
  const [selectedTrail, setSelectedTrail] = useState<TrailWithProgress | null>(null);
  const [selectedCertificate, setSelectedCertificate] = useState<{
    certificate: UserCertificate;
    trail: LearningTrail;
  } | null>(null);

  const totalProgress = trailsWithProgress.length > 0
    ? Math.round(trailsWithProgress.reduce((sum, t) => sum + t.progressPercent, 0) / trailsWithProgress.length)
    : 0;

  const inProgressTrails = trailsWithProgress.filter((t) => t.progressPercent > 0 && !t.hasCertificate);

  const handleViewCertificate = (certificateId: string) => {
    const cert = certificates.find((c) => c.id === certificateId);
    if (cert) {
      const trail = trailsWithProgress.find((t) => t.id === cert.trail_id);
      if (trail) setSelectedCertificate({ certificate: cert, trail });
    }
  };

  const canAccessCertificates = hasFeature("certificates");
  const canAccessRanking = hasFeature("ranking");

  // If a trail is selected, show its detail view
  if (selectedTrail) {
    return (
      <DashboardLayout>
        <TrailDetail trail={selectedTrail} onBack={() => setSelectedTrail(null)} />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Countdown Banner for Educa Pass users */}
        {isEducaPass && <LaunchCountdownBanner />}
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <GraduationCap className="h-8 w-8 text-primary" />
            Educatravel Academy
          </h1>
          <p className="text-muted-foreground mt-1">
            Trilhas de aprendizado, certificação e materiais premium para especialistas em destinos
          </p>
        </div>

        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="flex-wrap">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <LayoutDashboard className="h-4 w-4" /> Meu Painel
            </TabsTrigger>
            <TabsTrigger value="playbooks" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" /> Playbooks
            </TabsTrigger>
            <TabsTrigger value="ranking" className="flex items-center gap-2">
              <Trophy className="h-4 w-4" /> Ranking
              {!canAccessRanking && <Lock className="h-3 w-3 ml-1" />}
            </TabsTrigger>
            <TabsTrigger value="certificates" className="flex items-center gap-2">
              <Award className="h-4 w-4" /> Certificados
              {!canAccessCertificates && <Lock className="h-3 w-3 ml-1" />}
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="admin" className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" /> Gerenciar
              </TabsTrigger>
            )}
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard">
            <div className="space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10"><MapPin className="h-5 w-5 text-primary" /></div>
                      <div>
                        <p className="text-xs text-muted-foreground">Trilhas Disponíveis</p>
                        <p className="text-xl font-bold">{trailsWithProgress.length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10"><TrendingUp className="h-5 w-5 text-primary" /></div>
                      <div>
                        <p className="text-xs text-muted-foreground">Progresso Geral</p>
                        <p className="text-xl font-bold">{totalProgress}%</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-yellow-500/10"><Award className="h-5 w-5 text-yellow-500" /></div>
                      <div>
                        <p className="text-xs text-muted-foreground">Certificados</p>
                        <p className="text-xl font-bold">{certificates.length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                {userAchievements.length > 0 && (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-accent/10"><Medal className="h-5 w-5 text-accent" /></div>
                        <div>
                          <p className="text-xs text-muted-foreground">Medalhas</p>
                          <p className="text-xl font-bold">{userAchievements.length}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* In Progress Trails */}
              {inProgressTrails.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Continuar Aprendendo</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {inProgressTrails.map((trail) => (
                        <div
                          key={trail.id}
                          className="flex items-center gap-4 p-3 rounded-lg border cursor-pointer hover:border-primary/50 transition-colors"
                          onClick={() => setSelectedTrail(trail)}
                        >
                          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                            {trail.image_url ? (
                              <img src={trail.image_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <MapPin className="h-5 w-5 text-primary" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{trail.name}</p>
                            <p className="text-xs text-muted-foreground">{trail.completedCount}/{trail.totalCount} módulos</p>
                          </div>
                          <div className="w-24">
                            <Progress value={trail.progressPercent} className="h-2" />
                            <p className="text-xs text-right text-muted-foreground mt-1">{trail.progressPercent}%</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Achievements */}
              {userAchievements.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2"><Medal className="h-5 w-5 text-yellow-500" /> Medalhas Conquistadas</CardTitle>
                  </CardHeader>
                  <CardContent>
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
                        <CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader>
                        <CardContent><Skeleton className="h-2 w-full" /></CardContent>
                      </Card>
                    ))}
                  </div>
                ) : trailsWithProgress.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <MapPin className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
                      <p className="text-lg font-medium">Nenhuma trilha disponível</p>
                      <p className="text-muted-foreground">Em breve novas trilhas serão adicionadas!</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {trailsWithProgress.map((trail) => (
                      <TrailCard key={trail.id} trail={trail} onSelect={setSelectedTrail} />
                    ))}
                  </div>
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
            <TabsContent value="admin"><AdminAcademyManager /></TabsContent>
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
