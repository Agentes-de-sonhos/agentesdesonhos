import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  Video,
  Calendar,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { TrailWithProgress, Training } from "@/types/academy";
import { useAcademy } from "@/hooks/useAcademy";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { TrainingPlayer } from "./TrainingPlayer";
import { CertificatePDF } from "./CertificatePDF";

interface TrailDetailProps {
  trail: TrailWithProgress;
  onBack: () => void;
}

export function TrailDetail({ trail, onBack }: TrailDetailProps) {
  const { userProgress, markTrainingComplete, generateCertificate, hasCertificate, certificates } = useAcademy();
  const { user } = useAuth();
  const [selectedTraining, setSelectedTraining] = useState<Training | null>(null);
  const [showCertificate, setShowCertificate] = useState(false);
  const [userName, setUserName] = useState<string>("Agente de Viagens");

  useEffect(() => {
    const fetchUserName = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("name")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data?.name) {
        setUserName(data.name);
      }
    };
    fetchUserName();
  }, [user]);

  const isTrainingCompleted = (trainingId: string) => {
    return userProgress.some((p) => p.training_id === trainingId && p.is_completed);
  };

  const handleGenerateCertificate = async () => {
    await generateCertificate.mutateAsync({ trailId: trail.id, agentName: userName });
    setShowCertificate(true);
  };

  const certificate = certificates.find((c) => c.trail_id === trail.id);
  const canGenerateCertificate = trail.progressPercent === 100 && !hasCertificate(trail.id);

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
            {trail.progressPercent === 100 && (
              <Badge className="bg-green-500 text-white">
                <Award className="h-3 w-3 mr-1" />
                Concluída
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            {trail.destination}
          </p>
        </div>

        {canGenerateCertificate && (
          <Button onClick={handleGenerateCertificate} disabled={generateCertificate.isPending}>
            <Award className="h-4 w-4 mr-2" />
            Gerar Certificado
          </Button>
        )}

        {certificate && (
          <Button variant="outline" onClick={() => setShowCertificate(true)}>
            <Download className="h-4 w-4 mr-2" />
            Ver Certificado
          </Button>
        )}
      </div>

      {/* Progress Card */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              <span className="font-medium">Seu progresso</span>
            </div>
            <span className="text-lg font-bold text-primary">{trail.progressPercent}%</span>
          </div>
          <Progress value={trail.progressPercent} className="h-3" />
          <p className="text-sm text-muted-foreground mt-2">
            {trail.completedCount} de {trail.totalCount} treinamentos concluídos
          </p>
        </CardContent>
      </Card>

      {/* Description */}
      {trail.description && (
        <Card>
          <CardContent className="py-4">
            <p className="text-muted-foreground">{trail.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Trainings List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Treinamentos da Trilha</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {trail.trainings.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum treinamento cadastrado nesta trilha ainda.
                </p>
              ) : (
                trail.trainings.map((tt, index) => {
                  const training = tt.training;
                  const completed = isTrainingCompleted(training.id);
                  const isLive = training.training_type === "live";

                  return (
                    <div
                      key={tt.id}
                      className={`flex items-center gap-4 p-4 rounded-lg border transition-all cursor-pointer hover:border-primary/50 ${
                        completed ? "bg-green-50 dark:bg-green-950/20 border-green-200" : ""
                      }`}
                      onClick={() => setSelectedTraining(training)}
                    >
                      <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                        completed ? "bg-green-500 text-white" : "bg-muted"
                      }`}>
                        {completed ? (
                          <CheckCircle2 className="h-5 w-5" />
                        ) : (
                          <span className="font-medium">{index + 1}</span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium truncate">{training.title}</h4>
                          {isLive && (
                            <Badge variant="secondary" className="bg-red-100 text-red-700">
                              <Video className="h-3 w-3 mr-1" />
                              Ao vivo
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {training.duration_minutes} min
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {training.category}
                          </Badge>
                          {isLive && training.scheduled_at && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(training.scheduled_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {training.materials_url && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(training.materials_url!, "_blank");
                            }}
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                        )}
                        <Button variant={completed ? "outline" : "default"} size="sm">
                          <Play className="h-4 w-4 mr-1" />
                          {completed ? "Rever" : "Assistir"}
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Training Player Dialog */}
      <Dialog open={!!selectedTraining} onOpenChange={() => setSelectedTraining(null)}>
        <DialogContent className="max-w-4xl h-[80vh]">
          <DialogHeader>
            <DialogTitle>{selectedTraining?.title}</DialogTitle>
          </DialogHeader>
          {selectedTraining && (
            <TrainingPlayer
              training={selectedTraining}
              isCompleted={isTrainingCompleted(selectedTraining.id)}
              onComplete={() => {
                markTrainingComplete.mutate({
                  trainingId: selectedTraining.id,
                  watchedMinutes: selectedTraining.duration_minutes,
                });
              }}
            />
          )}
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
