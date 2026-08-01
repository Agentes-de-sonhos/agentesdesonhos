import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ExpandableBannerProps {
  src: string;
  alt: string;
  /** Fraction (0-1) of the artwork height visible while collapsed. Default 0.25 */
  revealRatio?: number;
  /** Delay in ms before collapsing after mouse leave. Default 450 */
  collapseDelay?: number;
  className?: string;
  imageClassName?: string;
  /** Overlay rendered above the artwork (CTA, texts...). Must handle its own pointer events. */
  overlay?: React.ReactNode;
  /** Extra chrome (arrows, dots) rendered above everything. */
  chrome?: React.ReactNode;
  onImageError?: () => void;
  labelExpand?: string;
  labelCollapse?: string;
  /** Called when the banner surface (not the toggle) is activated. */
  onActivate?: () => void;
  /** Aspect ratio (height / width) used before the image reports its natural size. */
  fallbackRatio?: number;
}

let bannerIdCounter = 0;

export function ExpandableBanner({
  src,
  alt,
  revealRatio = 0.25,
  collapseDelay = 450,
  className,
  imageClassName,
  overlay,
  chrome,
  onImageError,
  labelExpand = "Ver banner completo",
  labelCollapse = "Recolher",
  onActivate,
  fallbackRatio = 0.35,
}: ExpandableBannerProps) {
  // Always starts collapsed to avoid layout shift.
  const [expanded, setExpanded] = useState(false);
  const [ratio, setRatio] = useState<number | null>(null);
  const [canHover, setCanHover] = useState(false);
  const timerRef = useRef<number | null>(null);
  const idRef = useRef(`expandable-banner-${++bannerIdCounter}`);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia("(hover: hover) and (pointer: fine)");
    const update = () => setCanHover(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, []);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => clearTimer, [clearTimer]);

  // Collapse again whenever the artwork changes (carousel slides).
  useEffect(() => {
    setExpanded(false);
    setRatio(null);
  }, [src]);

  const handleMouseEnter = () => {
    if (!canHover) return;
    clearTimer();
    setExpanded(true);
  };

  const handleMouseLeave = () => {
    if (!canHover) return;
    clearTimer();
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      setExpanded(false);
    }, collapseDelay);
  };

  const effectiveRatio = ratio ?? fallbackRatio;
  const clampedReveal = Math.min(1, Math.max(0.05, revealRatio));
  const paddingBottom = `${effectiveRatio * (expanded ? 1 : clampedReveal) * 100}%`;

  return (
    <div
      className={cn("relative w-full rounded-2xl overflow-hidden bg-muted group", className)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      data-expanded={expanded ? "true" : "false"}
    >
      <div
        id={idRef.current}
        className="relative w-full overflow-hidden transition-[padding-bottom] duration-300 ease-out motion-reduce:transition-none"
        style={{ paddingBottom }}
        onClick={onActivate}
        role={onActivate ? "link" : undefined}
        tabIndex={onActivate ? 0 : undefined}
        onKeyDown={
          onActivate
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onActivate();
                }
              }
            : undefined
        }
      >
        {/* Single artwork anchored to its bottom strip */}
        <img
          src={src}
          alt={alt}
          className={cn("absolute bottom-0 left-0 block w-full h-auto", imageClassName)}
          onLoad={(e) => {
            const img = e.currentTarget;
            if (img.naturalWidth > 0) setRatio(img.naturalHeight / img.naturalWidth);
          }}
          onError={onImageError}
        />
        {overlay}
      </div>

      {chrome}

      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={idRef.current}
        onClick={(e) => {
          e.stopPropagation();
          clearTimer();
          setExpanded((v) => !v);
        }}
        className="absolute bottom-2 right-2 z-30 inline-flex items-center gap-1 rounded-full bg-background/80 px-3 py-1 text-[11px] font-medium text-foreground shadow-sm backdrop-blur transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {expanded ? labelCollapse : labelExpand}
        {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>
    </div>
  );
}