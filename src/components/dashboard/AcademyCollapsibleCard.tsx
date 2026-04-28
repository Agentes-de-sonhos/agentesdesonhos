import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  GraduationCap,
  ArrowRight,
  Loader2,
  MapPin,
  BookOpen,
  Clock,
  Award,
  Play,
  ChevronRight,
  Globe,
} from "lucide-react";
import { useAcademy } from "@/hooks/useAcademy";
import { TrailDetail } from "@/components/academy/TrailDetail";
import type { TrailWithProgress } from "@/types/academy";

interface AcademyCollapsibleCardProps {
  /** Maximum number of trails to display. Undefined = all */
  limit?: number;
}

function HorizontalTrailCard({
  trail,
  onSelect,
}: {
  trail: TrailWithProgress;
  onSelect: (t: TrailWithProgress) => void;
}) {
  const isCertified = trail.hasCertificate;
  const isCompleted = trail.progressPercent === 100;
  const isInProgress = trail.progressPercent > 0 && trail.progressPercent < 100;
  const totalMinutes =
    trail.trainings?.reduce(
      (sum, tt) => sum + (tt.training?.duration_minutes || 0),
      0
    ) || 0;

  return (
    <Card
      className="group cursor-pointer overflow-hidden transition-all duration-200 hover:shadow-md hover:border-primary/40 h-full"
      onClick={() => onSelect(trail)}
    >
      <div className="flex flex-col sm:flex-row h-full">
        {/* Image left */}
        <div className="relative sm:w-40 sm:flex-shrink-0 aspect-video sm:aspect-auto sm:self-stretch sm:h-auto bg-gradient-to-br from-primary/20 to-accent/20 overflow-hidden">
          {trail.image_url ? (
            <img
              src={trail.image_url}
              alt={trail.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <MapPin className="h-10 w-10 text-primary/40" />
            </div>
          )}
          <div className="absolute top-2 left-2 flex gap-1.5 flex-wrap">
            {isCertified && (
              <Badge className="bg-yellow-500 text-white shadow-md text-[10px]">
                <Award className="h-3 w-3 mr-1" /> Certificado
              </Badge>
            )}
            {isCompleted && !isCertified && (
              <Badge className="bg-green-500 text-white shadow-md text-[10px]">
                ✔ Concluído
              </Badge>
            )}
            {isInProgress && (
              <Badge className="bg-primary text-primary-foreground shadow-md text-[10px]">
                ▶ Em andamento
              </Badge>
            )}
          </div>
        </div>

        {/* Content right */}
        <CardContent className="flex-1 p-4 flex flex-col justify-between gap-2 min-w-0">
          <div className="space-y-1.5 min-w-0">
            <h3 className="font-semibold text-base group-hover:text-primary transition-colors leading-tight line-clamp-2">
              {trail.name}
            </h3>
            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1">
                <Globe className="h-3.5 w-3.5" />
                {trail.destination}
              </span>
              <span className="flex items-center gap-1">
                <BookOpen className="h-3.5 w-3.5" />
                {trail.totalCount} módulos
              </span>
              {(trail.total_hours > 0 || totalMinutes > 0) && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {trail.total_hours > 0
                    ? `${trail.total_hours}h`
                    : `${totalMinutes} min`}
                </span>
              )}
            </div>
          </div>

          {/* Progress + CTA */}
          <div className="space-y-2">
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-muted-foreground">
                  {trail.completedCount} de {trail.totalCount}
                </span>
                <span className="font-semibold text-foreground">
                  {trail.progressPercent}%
                </span>
              </div>
              <Progress value={trail.progressPercent} className="h-1.5" />
            </div>
            {isInProgress ? (
              <Button
                size="sm"
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <Play className="h-3.5 w-3.5 mr-1.5" />
                Continuar
              </Button>
            ) : (
              <Button size="sm" variant="ghost" className="w-full group-hover:bg-primary/10">
                {isCompleted ? "Ver trilha" : "Iniciar trilha"}
                <ChevronRight className="h-3.5 w-3.5 ml-1 group-hover:translate-x-1 transition-transform" />
              </Button>
            )}
          </div>
        </CardContent>
      </div>
    </Card>
  );
}

export function AcademyCollapsibleCard({ limit }: AcademyCollapsibleCardProps) {
  const navigate = useNavigate();
  const { trailsWithProgress, isLoading } = useAcademy();
  const [selectedTrail, setSelectedTrail] = useState<TrailWithProgress | null>(null);

  const visibleTrails = limit ? trailsWithProgress.slice(0, limit) : trailsWithProgress;

  return (
    <>
      <Card className="border-0 shadow-card h-full">
        <CardContent className="pt-5 pb-5 space-y-4 h-full flex flex-col">
          <div className="w-fit">
            <h2 className="font-display text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-emerald-600" />
              EducaTravel Academy
            </h2>
            <div className="mt-2 h-1 w-full rounded-full bg-emerald-600" />
          </div>

          <div className="flex-1 flex flex-col min-h-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-8 flex-1">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : visibleTrails.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm flex-1 flex items-center justify-center">
                Nenhuma trilha disponível no momento.
              </div>
            ) : (
              <div className="grid grid-cols-1 auto-rows-fr gap-3 overflow-y-auto pr-1 flex-1 min-h-0">
                {visibleTrails.map((trail) => (
                  <HorizontalTrailCard
                    key={trail.id}
                    trail={trail}
                    onSelect={setSelectedTrail}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="pt-2 border-t">
            <Button
              variant="ghost"
              className="w-full text-emerald-700 hover:text-emerald-800 hover:bg-emerald-600/5"
              onClick={() => navigate("/educa-academy")}
            >
              Mais treinamentos
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {selectedTrail && (
        <TrailDetail trail={selectedTrail} onBack={() => setSelectedTrail(null)} />
      )}
    </>
  );
}
