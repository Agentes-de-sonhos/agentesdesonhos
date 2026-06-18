import {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ChevronDown, FileText, Paperclip, LayoutGrid, Rows3 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TripService, TripServiceType } from "@/types/trip";
import {
  CATEGORY_CONFIG,
  collectAttachments,
  getServiceShortName,
  getServiceThumbnail,
  hasAdditionalDetails,
  resolveStatusBadge,
} from "./categoryPresentation";

interface CategoryServiceViewProps {
  type: TripServiceType;
  services: TripService[];
  /** Render full details for the expanded body (typically PublicServiceCard). */
  renderFullCard: (service: TripService) => ReactNode;
}

export function CategoryServiceView({
  type,
  services,
  renderFullCard,
}: CategoryServiceViewProps) {
  const cfg = CATEGORY_CONFIG[type];
  const total = services.length;
  const [gridMode, setGridMode] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [scrollToAttachId, setScrollToAttachId] = useState<string | null>(null);
  const [scrollToCardId, setScrollToCardId] = useState<string | null>(null);

  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const attachRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const isSingleService = total === 1;
  const showSmartSummary = total >= 4;

  const prefersReducedMotion = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  const focusCard = useCallback(
    (id: string) => {
      const el = cardRefs.current[id];
      if (el && typeof el.scrollIntoView === "function") {
        el.scrollIntoView({
          behavior: prefersReducedMotion ? "auto" : "smooth",
          block: "start",
        });
      }
      setHighlightId(id);
      window.setTimeout(() => {
        setHighlightId((prev) => (prev === id ? null : prev));
      }, 1500);
    },
    [prefersReducedMotion],
  );

  const handleToggle = useCallback((id: string) => {
    setOpenId((prev) => {
      const next = prev === id ? null : id;
      // Only scroll when expanding, never when collapsing.
      if (next === id) setScrollToCardId(id);
      return next;
    });
  }, []);

  const handleOpenAttachments = useCallback((id: string) => {
    setOpenId(id);
    setScrollToAttachId(id);
  }, []);

  // Scroll the card top into view after expansion has rendered.
  useEffect(() => {
    if (!scrollToCardId) return;
    if (openId !== scrollToCardId) return;
    const id = scrollToCardId;
    const raf = window.requestAnimationFrame(() => {
      const t = window.setTimeout(() => {
        const el = cardRefs.current[id];
        if (el && typeof el.scrollIntoView === "function") {
          el.scrollIntoView({
            behavior: prefersReducedMotion ? "auto" : "smooth",
            block: "start",
          });
        }
        setScrollToCardId(null);
      }, 180);
      // store cleanup
      (window as any).__catScrollTimer = t;
    });
    return () => {
      window.cancelAnimationFrame(raf);
      const t = (window as any).__catScrollTimer;
      if (t) window.clearTimeout(t);
    };
  }, [openId, scrollToCardId, prefersReducedMotion]);

  // Scroll to attachments section once the card has expanded and rendered.
  useEffect(() => {
    if (!scrollToAttachId) return;
    if (openId !== scrollToAttachId) return;
    const id = scrollToAttachId;
    const t = window.setTimeout(() => {
      const el = attachRefs.current[id];
      if (el && typeof el.scrollIntoView === "function") {
        el.scrollIntoView({
          behavior: prefersReducedMotion ? "auto" : "smooth",
          block: "start",
        });
      }
      setScrollToAttachId(null);
    }, 200);
    return () => window.clearTimeout(t);
  }, [openId, scrollToAttachId, prefersReducedMotion]);

  // Single service: render the full card directly, no summary, no toggle.
  if (isSingleService) {
    const only = services[0];
    return (
      <div className="space-y-5">
        <div>
          <h2 className="text-base sm:text-lg font-semibold text-foreground tracking-tight">
            {cfg.summaryTitle}
          </h2>
          <p className="mt-0.5 text-xs sm:text-sm text-[hsl(var(--wallet-brand))] font-medium inline-flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            {cfg.countWord(total)}
          </p>
        </div>
        <div id={`service-card-${only.id}`}>{renderFullCard(only)}</div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Summary header */}
      <div>
        <h2 className="text-base sm:text-lg font-semibold text-foreground tracking-tight">
          {cfg.summaryTitle}
        </h2>
        <p className="mt-0.5 text-xs sm:text-sm text-[hsl(var(--wallet-brand))] font-medium inline-flex items-center gap-1.5">
          <FileText className="h-3.5 w-3.5" />
          {cfg.countWord(total)}
        </p>
      </div>

      {/* Summary thumbnails — only when 4+ services */}
      {showSmartSummary && (
        <div>
          {gridMode ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {services.map((s) => (
                <SummaryItem
                  key={s.id}
                  service={s}
                  type={type}
                  onClick={() => focusCard(s.id)}
                />
              ))}
            </div>
          ) : (
            <div
              className="-mx-1 overflow-x-auto scrollbar-none"
              style={{ scrollSnapType: "x proximity" }}
            >
              <div className="flex gap-3 px-1 items-start">
                {services.map((s) => (
                  <div
                    key={s.id}
                    className="shrink-0 w-[96px] snap-start"
                  >
                    <SummaryItem
                      service={s}
                      type={type}
                      onClick={() => focusCard(s.id)}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => setGridMode((v) => !v)}
            aria-label={gridMode ? "Ver em carrossel" : cfg.seeAllLabel}
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[hsl(var(--wallet-brand))] hover:opacity-80 transition"
          >
            {gridMode ? (
              <>
                <Rows3 className="h-4 w-4" aria-hidden />
                Ver em carrossel
              </>
            ) : (
              <>
                <LayoutGrid className="h-4 w-4" aria-hidden />
                {cfg.seeAllLabel}
              </>
            )}
          </button>
        </div>
      )}

      {/* Compact cards list */}
      <div className="space-y-2.5">
        {services.map((s) => (
          <CompactServiceCard
            key={s.id}
            ref={(el) => (cardRefs.current[s.id] = el)}
            service={s}
            type={type}
            isOpen={openId === s.id}
            isHighlighted={highlightId === s.id}
            onToggle={() => handleToggle(s.id)}
            onOpenAttachments={() => handleOpenAttachments(s.id)}
            attachAnchorRef={(el) => (attachRefs.current[s.id] = el)}
            renderFullCard={renderFullCard}
          />
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Summary item
// ─────────────────────────────────────────────────────────────────────────────

function SummaryItem({
  service,
  type,
  onClick,
}: {
  service: TripService;
  type: TripServiceType;
  onClick: () => void;
}) {
  const cfg = CATEGORY_CONFIG[type];
  const Icon = cfg.icon;
  const name = getServiceShortName(service);

  return (
    <button
      type="button"
      onClick={onClick}
      title={name}
      className="group flex w-full flex-col items-start gap-1.5 text-left focus:outline-none min-h-[44px]"
    >
      <div
        className={cn(
          "relative w-full aspect-square rounded-2xl overflow-hidden border border-border/40 shadow-sm transition group-hover:shadow-md group-active:scale-[0.97] flex items-center justify-center",
          cfg.thumbBg,
        )}
      >
        <Icon className={cn("h-7 w-7", cfg.thumbIconColor)} aria-hidden />
      </div>
      <span className="w-full text-[11px] leading-snug font-medium text-foreground/80 whitespace-normal break-words">
        {name}
      </span>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Compact card
// ─────────────────────────────────────────────────────────────────────────────

interface CompactCardProps {
  service: TripService;
  type: TripServiceType;
  isOpen: boolean;
  isHighlighted: boolean;
  onToggle: () => void;
  onOpenAttachments: () => void;
  attachAnchorRef: (el: HTMLDivElement | null) => void;
  renderFullCard: (s: TripService) => ReactNode;
}

const CompactServiceCard = forwardRef<HTMLDivElement, CompactCardProps>(
  function CompactServiceCard(
    {
      service,
      type,
      isOpen,
      isHighlighted,
      onToggle,
      onOpenAttachments,
      attachAnchorRef,
      renderFullCard,
    },
    ref,
  ) {
      const cfg = CATEGORY_CONFIG[type];
      const Icon = cfg.icon;
      const compact = cfg.getCompactFields(service);
      const thumb = getServiceThumbnail(service);
      const status = resolveStatusBadge(compact.rawStatus);
      const attachments = collectAttachments(service);
      const expandable = hasAdditionalDetails(service);

      return (
        <div
          ref={ref}
          id={`service-card-${service.id}`}
          className={cn(
            "rounded-2xl bg-card border transition-all duration-300 scroll-mt-20",
            isHighlighted
              ? "border-[hsl(var(--wallet-brand)/0.55)] shadow-[0_0_0_3px_hsl(var(--wallet-brand)/0.15)] bg-[hsl(var(--wallet-brand-soft)/0.4)]"
              : "border-border/50 shadow-sm",
          )}
        >
          <button
            type="button"
            onClick={expandable ? onToggle : undefined}
            aria-expanded={expandable ? isOpen : undefined}
            aria-label={
              expandable
                ? `${isOpen ? "Recolher" : "Expandir"} detalhes de ${compact.title}`
                : undefined
            }
            className={cn(
              "w-full flex items-start gap-3 p-3 sm:p-3.5 text-left",
              expandable && "cursor-pointer hover:bg-muted/30 rounded-2xl",
            )}
            disabled={!expandable}
          >
            {/* Thumbnail */}
            <div
              className={cn(
                "relative w-20 sm:w-24 aspect-[4/3] rounded-xl overflow-hidden shrink-0 border border-border/40",
                !thumb && cfg.thumbBg,
              )}
            >
              {thumb ? (
                <img
                  src={thumb}
                  alt={compact.title}
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Icon
                    className={cn("h-6 w-6", cfg.thumbIconColor)}
                    aria-hidden
                  />
                </div>
              )}
            </div>

            {/* Main content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-2">
                <h3 className="flex-1 min-w-0 text-[15px] sm:text-base font-semibold text-foreground leading-tight break-words">
                  {compact.title}
                </h3>
                {status && (
                  <span
                    className={cn(
                      "shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold border",
                      status.className,
                    )}
                  >
                    {status.label}
                  </span>
                )}
              </div>
              {compact.secondary && (
                <p className="mt-0.5 text-[13px] text-muted-foreground leading-tight truncate">
                  {compact.secondary}
                </p>
              )}
              <div className="mt-1.5 flex items-center justify-between gap-2">
                <span className="text-[12px] text-muted-foreground/90">
                  {compact.quantity || ""}
                </span>
                <div className="flex items-center gap-1.5">
                  {attachments.length > 0 && (
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenAttachments();
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          e.stopPropagation();
                          onOpenAttachments();
                        }
                      }}
                      aria-label={`${compact.title} possui ${attachments.length} ${attachments.length === 1 ? "documento" : "documentos"}`}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold text-[hsl(var(--wallet-brand))] bg-[hsl(var(--wallet-brand-soft)/0.6)] hover:bg-[hsl(var(--wallet-brand-soft))] transition"
                    >
                      <Paperclip className="h-3.5 w-3.5" />
                      {attachments.length}
                    </span>
                  )}
                  {expandable && (
                    <ChevronDown
                      aria-hidden
                      className={cn(
                        "h-4 w-4 text-muted-foreground transition-transform",
                        isOpen && "rotate-180",
                      )}
                    />
                  )}
                </div>
              </div>
            </div>
          </button>

          {/* Expanded */}
          {expandable && isOpen && (
            <div className="border-t border-border/40 px-3 sm:px-4 py-4 bg-muted/10 rounded-b-2xl">
              <div ref={attachAnchorRef} />
              {renderFullCard(service)}
            </div>
          )}
        </div>
      );
    },
);

export default CategoryServiceView;