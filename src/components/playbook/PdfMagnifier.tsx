import { useState, useRef, useCallback, useEffect } from "react";
import { Search } from "lucide-react";

interface PdfMagnifierProps {
  src: string;
  title?: string;
  height?: string;
  minHeight?: string;
}

export function PdfMagnifier({ src, title = "PDF", height, minHeight }: PdfMagnifierProps) {
  const [isZoomed, setIsZoomed] = useState(false);
  const [origin, setOrigin] = useState({ x: 50, y: 50 });
  const [showHint, setShowHint] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const ZOOM_SCALE = 2;

  const handleOverlayMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) {
      e.preventDefault();
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        setOrigin({ x, y });
        setIsZoomed(true);
      }
    }
  }, []);

  const handleOverlayMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isZoomed) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      setOrigin({ x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) });
    }
  }, [isZoomed]);

  const handleOverlayMouseUp = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsZoomed(false);
    }
  }, []);

  // Global mouseup fallback
  useEffect(() => {
    const up = (e: MouseEvent) => { if (e.button === 0) setIsZoomed(false); };
    if (isZoomed) {
      window.addEventListener("mouseup", up);
      return () => window.removeEventListener("mouseup", up);
    }
  }, [isZoomed]);

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden bg-muted/20"
      style={{ height, minHeight }}
      onMouseEnter={() => setShowHint(true)}
      onMouseLeave={() => { setShowHint(false); setIsZoomed(false); }}
    >
      {/* PDF iframe - interactive when NOT zoomed so scrollbars work */}
      <iframe
        src={src}
        className="border-0 w-full h-full"
        title={title}
        loading="eager"
        style={{
          pointerEvents: isZoomed ? "none" : "auto",
          transform: isZoomed ? `scale(${ZOOM_SCALE})` : "scale(1)",
          transformOrigin: `${origin.x}% ${origin.y}%`,
          transition: isZoomed ? "none" : "transform 0.2s ease-out",
        }}
      />

      {/* Overlay: only captures events when zoomed (for panning), 
           otherwise pointer-events:none so iframe scrollbars work.
           We use a SECOND always-visible overlay just for the cursor + initial click */}
      
      {/* Cursor overlay - thin, only captures mousedown to START zoom */}
      {!isZoomed && (
        <div
          className="absolute inset-0 z-10"
          style={{ cursor: "zoom-in" }}
          onMouseDown={handleOverlayMouseDown}
        />
      )}

      {/* Panning overlay - active only while zoomed */}
      {isZoomed && (
        <div
          className="absolute inset-0 z-10"
          style={{ cursor: "none" }}
          onMouseMove={handleOverlayMouseMove}
          onMouseUp={handleOverlayMouseUp}
        />
      )}

      {/* Magnifier cursor indicator */}
      {isZoomed && (
        <div
          className="absolute z-20 pointer-events-none"
          style={{
            left: `calc(${origin.x}% - 20px)`,
            top: `calc(${origin.y}% - 20px)`,
          }}
        >
          <div className="w-10 h-10 rounded-full border-2 border-primary/60 bg-primary/10 flex items-center justify-center shadow-lg">
            <Search className="h-4 w-4 text-primary" />
          </div>
        </div>
      )}

      {/* Hint */}
      {showHint && !isZoomed && (
        <div className="absolute bottom-3 right-3 z-20 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-foreground/80 text-background text-[11px] font-medium backdrop-blur-sm pointer-events-none animate-in fade-in-0 duration-300">
          <Search className="h-3 w-3" />
          Clique para zoom
        </div>
      )}
    </div>
  );
}
