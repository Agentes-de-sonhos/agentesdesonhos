import { useState, useRef, useCallback, useEffect } from "react";
import { Search, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface PdfMagnifierProps {
  src: string;
  title?: string;
  height?: string;
  minHeight?: string;
}

export function PdfMagnifier({ src, title = "PDF", height, minHeight }: PdfMagnifierProps) {
  const [magnifierMode, setMagnifierMode] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [origin, setOrigin] = useState({ x: 50, y: 50 });
  const containerRef = useRef<HTMLDivElement>(null);

  const ZOOM_SCALE = 2;

  const handleOverlayMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) {
      e.preventDefault();
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        setOrigin({
          x: ((e.clientX - rect.left) / rect.width) * 100,
          y: ((e.clientY - rect.top) / rect.height) * 100,
        });
        setIsZoomed(true);
      }
    }
  }, []);

  const handleOverlayMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isZoomed) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      setOrigin({
        x: Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)),
        y: Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100)),
      });
    }
  }, [isZoomed]);

  const handleOverlayMouseUp = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) setIsZoomed(false);
  }, []);

  // Global mouseup fallback
  useEffect(() => {
    if (!isZoomed) return;
    const up = (e: MouseEvent) => { if (e.button === 0) setIsZoomed(false); };
    window.addEventListener("mouseup", up);
    return () => window.removeEventListener("mouseup", up);
  }, [isZoomed]);

  // Turn off zoom when leaving magnifier mode
  useEffect(() => {
    if (!magnifierMode) setIsZoomed(false);
  }, [magnifierMode]);

  return (
    <div className="relative" style={{ height, minHeight }}>
      {/* PDF container */}
      <div
        ref={containerRef}
        className="w-full h-full overflow-hidden bg-muted/20"
      >
        <iframe
          src={src}
          className="border-0 w-full h-full"
          title={title}
          loading="eager"
          style={{
            pointerEvents: magnifierMode ? "none" : "auto",
            transform: isZoomed ? `scale(${ZOOM_SCALE})` : "scale(1)",
            transformOrigin: `${origin.x}% ${origin.y}%`,
            transition: isZoomed ? "none" : "transform 0.2s ease-out",
          }}
        />

        {/* Magnifier overlay - only rendered in magnifier mode */}
        {magnifierMode && (
          <div
            className="absolute inset-0 z-10"
            style={{ cursor: isZoomed ? "none" : "zoom-in" }}
            onMouseDown={handleOverlayMouseDown}
            onMouseMove={handleOverlayMouseMove}
            onMouseUp={handleOverlayMouseUp}
          />
        )}

        {/* Custom magnifier cursor while zoomed */}
        {isZoomed && (
          <div
            className="absolute z-20 pointer-events-none"
            style={{ left: `calc(${origin.x}% - 20px)`, top: `calc(${origin.y}% - 20px)` }}
          >
            <div className="w-10 h-10 rounded-full border-2 border-primary/60 bg-primary/10 flex items-center justify-center shadow-lg backdrop-blur-sm">
              <Search className="h-4 w-4 text-primary" />
            </div>
          </div>
        )}
      </div>

      {/* Floating magnifier toggle */}
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={magnifierMode ? "default" : "secondary"}
              size="icon"
              className={cn(
                "absolute bottom-4 right-4 z-30 h-10 w-10 rounded-full shadow-lg transition-all",
                magnifierMode
                  ? "bg-primary text-primary-foreground hover:bg-primary/90 ring-2 ring-primary/30"
                  : "bg-card/90 text-foreground hover:bg-card backdrop-blur-sm border border-border"
              )}
              onClick={() => setMagnifierMode((v) => !v)}
            >
              {magnifierMode ? <SearchX className="h-4.5 w-4.5" /> : <Search className="h-4.5 w-4.5" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            {magnifierMode ? "Desativar lupa (ativar rolagem)" : "Ativar lupa (clique e segure para zoom)"}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Mode indicator */}
      {magnifierMode && !isZoomed && (
        <div className="absolute bottom-4 right-16 z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-[11px] font-medium shadow-lg pointer-events-none animate-in fade-in-0 slide-in-from-right-2 duration-300">
          <Search className="h-3 w-3" />
          Lupa ativa — clique e segure
        </div>
      )}
    </div>
  );
}
