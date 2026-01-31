import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle2, Play, FileText, Clock, User } from "lucide-react";
import type { Training } from "@/types/academy";

interface TrainingPlayerProps {
  training: Training;
  isCompleted: boolean;
  onComplete: () => void;
}

export function TrainingPlayer({ training, isCompleted, onComplete }: TrainingPlayerProps) {
  const isLive = training.training_type === "live";

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Video Player Area */}
      <div className="flex-1 bg-black rounded-lg overflow-hidden relative min-h-[300px]">
        {training.video_url ? (
          <iframe
            src={training.video_url}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <div className="flex items-center justify-center h-full text-white/60">
            <div className="text-center">
              <Play className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p>Vídeo não disponível</p>
              {isLive && <p className="text-sm mt-2">O link será disponibilizado no horário do evento</p>}
            </div>
          </div>
        )}
      </div>

      {/* Training Info */}
      <ScrollArea className="flex-shrink-0 max-h-[200px]">
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-semibold text-lg">{training.title}</h3>
              <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {training.duration_minutes} minutos
                </span>
                {training.instructor && (
                  <span className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    {training.instructor}
                  </span>
                )}
                <Badge variant="outline">{training.category}</Badge>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {training.materials_url && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(training.materials_url!, "_blank")}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Material
                </Button>
              )}

              {isCompleted ? (
                <Button variant="outline" size="sm" disabled>
                  <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
                  Concluído
                </Button>
              ) : (
                <Button size="sm" onClick={onComplete}>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Marcar como Concluído
                </Button>
              )}
            </div>
          </div>

          {training.description && (
            <p className="text-muted-foreground">{training.description}</p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
