import { useState, useRef, useEffect, useCallback, memo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
    if ((u.hostname.includes('youtube.com') || u.hostname.includes('youtu.be')) && !u.pathname.includes('/embed/')) {
      const videoId = u.hostname.includes('youtu.be')
        ? u.pathname.slice(1)
        : u.searchParams.get('v');
      if (videoId) return `https://www.youtube.com/embed/${videoId}`;
    }
    if (u.hostname.includes('vimeo.com') && !u.hostname.includes('player.vimeo.com')) {
      const id = u.pathname.split('/').filter(Boolean).pop();
      if (id) return `https://player.vimeo.com/video/${id}`;
    }
    return url;
  } catch {
    return url;
  }
}

/**
 * Memoised iframe that only re-renders when the actual video URL changes.
 * This prevents the iframe from being destroyed/recreated on parent re-renders
 * or tab switches, preserving the user's playback position.
 */
const StableIframe = memo(function StableIframe({ src }: { src: string }) {
  return (
    <iframe
      src={src}
      className="absolute inset-0 w-full h-full"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
    />
  );
}, (prev, next) => prev.src === next.src);

export function TrainingPlayer({ training, isCompleted, onComplete }: TrainingPlayerProps) {
  const embedUrl = training.video_url ? toEmbedUrl(training.video_url) : null;

  return (
    <div className="flex flex-col gap-4">
      {/* Video Player - 16:9 aspect ratio */}
      <div className="w-full rounded-xl overflow-hidden bg-black shadow-lg">
        <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
          {embedUrl ? (
            <StableIframe src={embedUrl} />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-white/60">
              <div className="text-center">
                <Play className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Vídeo não disponível</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Training Info */}
      <div className="space-y-3 px-1">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-lg leading-tight">{training.title}</h3>
            <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1.5 flex-wrap">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {training.duration_minutes} min
              </span>
              {training.instructor && (
                <span className="flex items-center gap-1">
                  <User className="h-3.5 w-3.5" />
                  {training.instructor}
                </span>
              )}
              <Badge variant="outline" className="text-xs">{training.category}</Badge>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {training.materials_url && (
              <Button variant="outline" size="sm" onClick={() => window.open(training.materials_url!, "_blank")}>
                <FileText className="h-4 w-4 mr-1.5" /> Material
              </Button>
            )}
            {isCompleted ? (
              <Button variant="outline" size="sm" disabled className="text-green-600 border-green-200">
                <CheckCircle2 className="h-4 w-4 mr-1.5" /> Aprovado
              </Button>
            ) : (
              <Button size="sm" onClick={onComplete}>
                <ClipboardCheck className="h-4 w-4 mr-1.5" /> Fazer Quiz
              </Button>
            )}
          </div>
        </div>
        {training.description && (
          <p className="text-sm text-muted-foreground leading-relaxed">{training.description}</p>
        )}
      </div>
    </div>
  );
}
