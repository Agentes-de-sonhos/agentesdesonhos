import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, BookOpen, Award, Play, Clock, ChevronRight, Globe } from "lucide-react";
import type { TrailWithProgress } from "@/types/academy";

interface TrailCardProps {
  trail: TrailWithProgress;
  onSelect: (trail: TrailWithProgress) => void;
}

export function TrailCard({ trail, onSelect }: TrailCardProps) {
  const isCertified = trail.hasCertificate;
  const isCompleted = trail.progressPercent === 100;
  const isInProgress = trail.progressPercent > 0 && trail.progressPercent < 100;
  const certificateAvailable = (trail as any).certificate_available !== false;

  const totalMinutes = trail.trainings?.reduce(
    (sum, tt) => sum + (tt.training?.duration_minutes || 0),
    0
  ) || 0;

  return (
    <Card 
      className="group cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-primary/50 overflow-hidden h-full flex flex-col"
      onClick={() => onSelect(trail)}
    >
      {/* Image */}
      <div className="relative h-36 bg-gradient-to-br from-primary/20 to-accent/20 overflow-hidden">
        {trail.image_url ? (
          <img 
            src={trail.image_url} 
            alt={trail.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <MapPin className="h-12 w-12 text-primary/40" />
          </div>
        )}
        {/* Badges */}
        <div className="absolute top-2 left-2 flex gap-1.5 flex-wrap">
          {isCertified && (
            <Badge className="bg-yellow-500 text-white shadow-md">
              <Award className="h-3 w-3 mr-1" /> Certificado
            </Badge>
          )}
          {isCompleted && !isCertified && (
            <Badge className="bg-green-500 text-white shadow-md">✔ Concluído</Badge>
          )}
          {isInProgress && (
            <Badge className="bg-primary text-primary-foreground shadow-md text-[10px]">
              ▶ Em andamento
            </Badge>
          )}
          {!certificateAvailable && !isCertified && (
            <Badge variant="secondary" className="shadow-md text-[10px]">
              <Clock className="h-3 w-3 mr-1" /> Certificado em breve
            </Badge>
          )}
        </div>
      </div>
      
      {/* Content */}
      <CardContent className="pt-4 pb-3 flex-1 flex flex-col">
        <h3 className="font-semibold text-lg group-hover:text-primary transition-colors leading-tight">
          {trail.name}
        </h3>
        
        {/* Destination info - avoids redundancy */}
        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1.5">
          <span className="flex items-center gap-1">
            <Globe className="h-3.5 w-3.5" />
            {trail.destination}
          </span>
        </div>

        {trail.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mt-2">{trail.description}</p>
        )}

        {/* Meta info */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-3">
          <span className="flex items-center gap-1.5">
            <BookOpen className="h-4 w-4" />
            {trail.totalCount} módulos
          </span>
          {(trail.total_hours > 0 || totalMinutes > 0) && (
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              {trail.total_hours > 0 ? `${trail.total_hours}h` : `${totalMinutes} min`}
            </span>
          )}
        </div>

        {/* Progress */}
        <div className="mt-auto pt-3 space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">
              {trail.completedCount} de {trail.totalCount} módulos
            </span>
            <span className="font-semibold text-foreground">{trail.progressPercent}%</span>
          </div>
          <Progress value={trail.progressPercent} className="h-2" />
        </div>
      </CardContent>

      <CardFooter className="pt-0 pb-4">
        {isInProgress ? (
          <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm group-hover:shadow-md transition-all">
            <Play className="h-4 w-4 mr-2" />
            Continuar curso
          </Button>
        ) : (
          <Button variant="ghost" className="w-full group-hover:bg-primary/10">
            {isCompleted ? "Ver trilha" : "Iniciar trilha"}
            <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
