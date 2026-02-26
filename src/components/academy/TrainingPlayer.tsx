import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle2, Play, FileText, Clock, User, ClipboardCheck } from "lucide-react";
import type { Training } from "@/types/academy";

interface TrainingPlayerProps {
  training: Training;
  isCompleted: boolean;
  onComplete: () => void;
}

function toEmbedUrl(url: string): string {
  try {
    const u = new URL(url);
    // youtube.com/watch?v=ID -> youtube.com/embed/ID
    if ((u.hostname.includes('youtube.com') || u.hostname.includes('youtu.be')) && !u.pathname.includes('/embed/')) {
      const videoId = u.hostname.includes('youtu.be')
        ? u.pathname.slice(1)
        : u.searchParams.get('v');
      if (videoId) return `https://www.youtube.com/embed/${videoId}`;
    }
    // vimeo.com/ID -> player.vimeo.com/video/ID
    if (u.hostname.includes('vimeo.com') && !u.hostname.includes('player.vimeo.com')) {
      const id = u.pathname.split('/').filter(Boolean).pop();
      if (id) return `https://player.vimeo.com/video/${id}`;
    }
    return url;
  } catch {
    return url;
  }
}

export function TrainingPlayer({ training, isCompleted, onComplete }: TrainingPlayerProps) {
  return (
    <div className="flex flex-col h-full gap-4">
      {/* Video Player - External embed only */}
      <div className="flex-1 bg-black rounded-lg overflow-hidden relative min-h-[300px]">
        {training.video_url ? (
          <iframe
            src={toEmbedUrl(training.video_url)}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <div className="flex items-center justify-center h-full text-white/60">
            <div className="text-center">
              <Play className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p>Vídeo não disponível</p>
            </div>
          </div>
        )}
      </div>

      <ScrollArea className="flex-shrink-0 max-h-[200px]">
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-semibold text-lg">{training.title}</h3>
              <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                <span className="flex items-center gap-1"><Clock className="h-4 w-4" />{training.duration_minutes} min</span>
                {training.instructor && <span className="flex items-center gap-1"><User className="h-4 w-4" />{training.instructor}</span>}
                <Badge variant="outline">{training.category}</Badge>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {training.materials_url && (
                <Button variant="outline" size="sm" onClick={() => window.open(training.materials_url!, "_blank")}>
                  <FileText className="h-4 w-4 mr-2" /> Material
                </Button>
              )}
              {isCompleted ? (
                <Button variant="outline" size="sm" disabled>
                  <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" /> Aprovado
                </Button>
              ) : (
                <Button size="sm" onClick={onComplete}>
                  <ClipboardCheck className="h-4 w-4 mr-2" /> Fazer Quiz
                </Button>
              )}
            </div>
          </div>
          {training.description && <p className="text-muted-foreground">{training.description}</p>}
        </div>
      </ScrollArea>
    </div>
  );
}
