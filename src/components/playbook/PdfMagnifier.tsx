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

  const updateOrigin = useCallback((e: React.MouseEvent | MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setOrigin({ x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) });
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 2) {
      e.preventDefault();
      e.stopPropagation();
      setIsZoomed(true);
      updateOrigin(e);
    }
  }, [updateOrigin]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isZoomed) updateOrigin(e);
    },
    [isZoomed, updateOrigin]
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 2) {
        e.preventDefault();
        setIsZoomed(false);
      }
    },
    []
  );

  // Global mouseup fallback
  useEffect(() => {
    const handleGlobalUp = (e: MouseEvent) => {
      if (e.button === 2) setIsZoomed(false);
    };
    const preventCtx = (e: MouseEvent) => {
      if (containerRef.current?.contains(e.target as Node)) {
        e.preventDefault();
      }
    };
    window.addEventListener("mouseup", handleGlobalUp);
    window.addEventListener("contextmenu", preventCtx);
    return () => {
      window.removeEventListener("mouseup", handleGlobalUp);
      window.removeEventListener("contextmenu", preventCtx);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden bg-muted/20"
      style={{ height, minHeight }}
      onMouseEnter={() => setShowHint(true)}
      onMouseLeave={() => {
        setShowHint(false);
        setIsZoomed(false);
      }}
    >
      {/* PDF iframe */}
      <iframe
        src={src}
        className="border-0 w-full h-full"
        title={title}
        loading="eager"
        style={{
          pointerEvents: "none",
          transform: isZoomed ? `scale(${ZOOM_SCALE})` : "scale(1)",
          transformOrigin: `${origin.x}% ${origin.y}%`,
          transition: isZoomed ? "none" : "transform 0.2s ease-out",
        }}
      />

      {/* Interaction overlay - always on top to capture right-click */}
      <div
        className="absolute inset-0 z-10"
        style={{ cursor: isZoomed ? "none" : "default" }}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        onContextMenu={handleContextMenu}
      />

      {/* Custom cursor / magnifier indicator */}
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

      {/* Hint badge */}
      {showHint && !isZoomed && (
        <div className="absolute bottom-3 right-3 z-10 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-foreground/80 text-background text-[11px] font-medium backdrop-blur-sm pointer-events-none animate-in fade-in-0 duration-300">
          <Search className="h-3 w-3" />
          Clique direito para zoom
        </div>
      )}
    </div>
  );
}
