import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, BookOpen, Award, ChevronRight, Clock, Lock } from "lucide-react";
import type { TrailWithProgress } from "@/types/academy";

interface TrailCardProps {
  trail: TrailWithProgress;
  onSelect: (trail: TrailWithProgress) => void;
}

export function TrailCard({ trail, onSelect }: TrailCardProps) {
  const isCertified = trail.hasCertificate;
  const isCompleted = trail.progressPercent === 100;

  return (
    <Card 
      className="group cursor-pointer transition-all duration-300 hover:shadow-lg hover:border-primary/50 overflow-hidden"
      onClick={() => onSelect(trail)}
    >
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
        {isCertified && (
          <div className="absolute top-2 left-2">
            <Badge className="bg-yellow-500 text-white shadow-md">
              <Award className="h-3 w-3 mr-1" /> Certificado
            </Badge>
          </div>
        )}
        {isCompleted && !isCertified && (
          <div className="absolute top-2 right-2">
            <Badge className="bg-green-500 text-white">Módulos Concluídos</Badge>
          </div>
        )}
      </div>
      
      <CardHeader className="pb-2">
        <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
          {trail.name}
        </h3>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{trail.destination}</span>
          {trail.total_hours > 0 && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{trail.total_hours}h</span>}
        </div>
      </CardHeader>

      <CardContent className="pb-3">
        {trail.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{trail.description}</p>
        )}
        
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <BookOpen className="h-4 w-4" />
          <span>{trail.totalCount} módulos</span>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Progresso</span>
            <span className="font-medium">{trail.progressPercent}%</span>
          </div>
          <Progress value={trail.progressPercent} className="h-2" />
        </div>
      </CardContent>

      <CardFooter className="pt-0">
        <Button variant="ghost" className="w-full group-hover:bg-primary/10">
          {trail.progressPercent > 0 && trail.progressPercent < 100 ? "Continuar" : "Ver trilha"}
          <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
        </Button>
      </CardFooter>
    </Card>
  );
}
