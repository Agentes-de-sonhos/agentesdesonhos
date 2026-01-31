import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  GraduationCap,
  MapPin,
  Search,
  Trophy,
  Award,
  BookOpen,
  TrendingUp,
  Lock,
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
import type { TrailWithProgress, UserCertificate, LearningTrail } from "@/types/academy";

export default function EducaAcademy() {
  const { trailsWithProgress, certificates, isLoading } = useAcademy();
  const { isAdmin } = useUserRole();
  const { hasFeature } = useSubscription();
  const [selectedTrail, setSelectedTrail] = useState<TrailWithProgress | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCertificate, setSelectedCertificate] = useState<{
    certificate: UserCertificate;
    trail: LearningTrail;
  } | null>(null);

  const filteredTrails = trailsWithProgress.filter(
    (trail) =>
      trail.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      trail.destination.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalProgress = trailsWithProgress.length > 0
    ? Math.round(
        trailsWithProgress.reduce((sum, t) => sum + t.progressPercent, 0) / trailsWithProgress.length
      )
    : 0;

  const completedTrails = trailsWithProgress.filter((t) => t.progressPercent === 100).length;

  const handleViewCertificate = (certificateId: string) => {
    const cert = certificates.find((c) => c.id === certificateId);
    if (cert) {
      const trail = trailsWithProgress.find((t) => t.id === cert.trail_id);
      if (trail) {
        setSelectedCertificate({ certificate: cert, trail });
      }
    }
  };

  const canAccessCertificates = hasFeature("certificates");
  const canAccessRanking = hasFeature("ranking");

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <GraduationCap className="h-8 w-8 text-primary" />
              Educa Travel Academy
            </h1>
            <p className="text-muted-foreground mt-1">
              Trilhas de aprendizado para especialistas em destinos
            </p>
          </div>
        </div>

        <Tabs defaultValue="trails" className="space-y-6">
          <TabsList>
            <TabsTrigger value="trails" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Trilhas
            </TabsTrigger>
            <TabsTrigger value="ranking" className="flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Ranking
              {!canAccessRanking && <Lock className="h-3 w-3 ml-1" />}
            </TabsTrigger>
            <TabsTrigger value="certificates" className="flex items-center gap-2">
              <Award className="h-4 w-4" />
              Meus Certificados
              {!canAccessCertificates && <Lock className="h-3 w-3 ml-1" />}
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="admin" className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Gerenciar
              </TabsTrigger>
            )}
          </TabsList>

          {/* Trails Tab */}
          <TabsContent value="trails">
            {selectedTrail ? (
              <TrailDetail
                trail={selectedTrail}
                onBack={() => setSelectedTrail(null)}
              />
            ) : (
              <div className="space-y-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-lg bg-primary/10">
                          <MapPin className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Total de Trilhas</p>
                          <p className="text-2xl font-bold">{trailsWithProgress.length}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-lg bg-primary/10">
                          <Award className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Trilhas Concluídas</p>
                          <p className="text-2xl font-bold">{completedTrails}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-lg bg-primary/10">
                          <TrendingUp className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Progresso Geral</p>
                          <p className="text-2xl font-bold">{totalProgress}%</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-lg bg-primary/10">
                          <Trophy className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Certificados</p>
                          <p className="text-2xl font-bold">{certificates.length}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Search */}
                <div className="relative max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar trilhas por nome ou destino..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Trails Grid */}
                {isLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <Card key={i}>
                        <Skeleton className="h-32 rounded-t-lg" />
                        <CardHeader>
                          <Skeleton className="h-6 w-3/4" />
                          <Skeleton className="h-4 w-1/2" />
                        </CardHeader>
                        <CardContent>
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-2 w-full mt-4" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : filteredTrails.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <MapPin className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
                      <p className="text-lg font-medium">Nenhuma trilha encontrada</p>
                      <p className="text-muted-foreground">
                        {searchQuery
                          ? "Tente buscar por outro termo"
                          : "Em breve novas trilhas serão adicionadas!"}
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredTrails.map((trail) => (
                      <TrailCard
                        key={trail.id}
                        trail={trail}
                        onSelect={setSelectedTrail}
                        hasCertificate={certificates.some((c) => c.trail_id === trail.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* Ranking Tab */}
          <TabsContent value="ranking">
            <FeatureGate feature="ranking">
              <RankingBoard />
            </FeatureGate>
          </TabsContent>

          {/* Certificates Tab */}
          <TabsContent value="certificates">
            <FeatureGate feature="certificates">
              <MyCertificates onViewCertificate={handleViewCertificate} />
            </FeatureGate>
          </TabsContent>

          {/* Admin Tab */}
          {isAdmin && (
            <TabsContent value="admin">
              <AdminAcademyManager />
            </TabsContent>
          )}
        </Tabs>

        {/* Certificate View Dialog */}
        <Dialog
          open={!!selectedCertificate}
          onOpenChange={() => setSelectedCertificate(null)}
        >
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Certificado de Conclusão</DialogTitle>
            </DialogHeader>
            {selectedCertificate && (
              <CertificatePDF
                certificate={selectedCertificate.certificate}
                trail={selectedCertificate.trail}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
