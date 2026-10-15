import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { SERVICE_LABELS } from "@/lib/tripServiceLabels";
import type { TripService } from "@/types/trip";
import {
  Plane, BedDouble, Hotel, Car, Bus, Ticket, Shield, Ship, TrainFront, FileText, Type, X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { tWallet } from "@/i18n/publicMaterials/wallet";
import type { PublicLocale } from "@/i18n/publicMaterials/locale";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  flight: Plane,
  hotel: Hotel,
  car_rental: Car,
  transfer: Bus,
  attraction: Ticket,
  insurance: Shield,
  cruise: Ship,
  train: TrainFront,
  other: FileText,
};

interface ServiceDetailOverlayProps {
  service?: TripService | null;
  // Optional overrides used when rendering a group/list (no single service)
  title?: string;
  icon?: LucideIcon;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  /** Inline CSS variables to theme the portal (e.g. agency brand color). */
  style?: CSSProperties;
  locale?: PublicLocale;
  flightPresentation?: boolean;
  hotelPresentation?: boolean;
}

/**
 * Responsive overlay that shows a single TripService in a focused view.
 * - Mobile: bottom Sheet (~92vh) with native swipe-to-dismiss.
 * - Desktop: centered Dialog (max 640px wide, internal scroll).
 * The actual service content is provided by `children` so the parent can
 * reuse its existing PublicServiceCard (keeping the VoucherAccess context
 * intact and avoiding component duplication).
 */
export function ServiceDetailOverlay({
  service,
  title,
  icon,
  open,
  onOpenChange,
  children,
  style,
  locale = "pt-BR",
  flightPresentation = false,
  hotelPresentation = false,
}: ServiceDetailOverlayProps) {
  const t = tWallet(locale);
  const isMobile = useIsMobile();
  const styledPresentation = flightPresentation || hotelPresentation;
  const Icon = hotelPresentation ? BedDouble : icon ?? (service ? ICONS[service.service_type] ?? FileText : FileText);
  const label =
    flightPresentation ? t("svcSectionFlight") : hotelPresentation ? t("serviceHotel") : title ?? (service ? SERVICE_LABELS[service.service_type] ?? t("fldServico") : t("fldServico"));

  const [fontScale, setFontScale] = useState<"sm" | "md" | "lg">(() => {
    if (typeof window === "undefined") return "md";
    const saved = window.localStorage.getItem("wallet:service:fontScale");
    return saved === "sm" || saved === "lg" ? saved : "md";
  });
  useEffect(() => {
    try { window.localStorage.setItem("wallet:service:fontScale", fontScale); } catch {}
  }, [fontScale]);

  const FontScaler = (
    <div
      className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-card/80 backdrop-blur px-1 py-1 shadow-sm shrink-0"
      onClick={(e) => e.stopPropagation()}
    >
      <Type className="h-3.5 w-3.5 text-muted-foreground mx-1" />
      <button
        type="button"
        onClick={() => setFontScale("sm")}
        aria-label={t("svcFontDecrease")}
        className={`h-6 w-6 rounded-full text-[11px] font-semibold transition ${fontScale === "sm" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
      >A-</button>
      <button
        type="button"
        onClick={() => setFontScale("md")}
        aria-label={t("svcFontDefault")}
        className={`h-6 w-6 rounded-full text-[12px] font-semibold transition ${fontScale === "md" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
      >A</button>
      <button
        type="button"
        onClick={() => setFontScale("lg")}
        aria-label={t("svcFontIncrease")}
        className={`h-6 w-6 rounded-full text-[13px] font-semibold transition ${fontScale === "lg" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
      >A+</button>
    </div>
  );

  const Header = (
    <div className={cn("flex items-center gap-3", styledPresentation && "flex-wrap pr-10")}>
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/15 shrink-0">
        <Icon className="h-[18px] w-[18px] text-primary" />
      </div>
      <div className="min-w-0">
        <span className={cn("block text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/80", styledPresentation && "hidden")}>
          {t("fldServico")}
        </span>
        <span className="block text-lg sm:text-xl font-semibold tracking-tight text-foreground break-words">
          {label}
        </span>
      </div>
      <div className="ml-auto" />
      {FontScaler}
    </div>
  );

  const zoom = styledPresentation ? (fontScale === "sm" ? 0.9 : fontScale === "lg" ? 1.15 : 1) : fontScale === "sm" ? 1 : fontScale === "lg" ? 1.25 : 1.18;
  const contentZoomStyle = { zoom } as CSSProperties;

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          hideCloseButton
          className={cn("p-0 rounded-t-3xl flex flex-col bg-background border-t border-border/50 overflow-hidden", flightPresentation ? "wallet-flight-theme" : hotelPresentation ? "wallet-hotel-theme" : undefined)}
          style={{
            ...style,
            marginTop: 'max(56px, env(safe-area-inset-top) + 40px)',
            height: 'calc(100dvh - max(56px, env(safe-area-inset-top) + 40px))',
            maxHeight: 'calc(100dvh - max(56px, env(safe-area-inset-top) + 40px))',
          }}
        >
          {/* Drag handle */}
          <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-muted-foreground/25 shrink-0" />

          {/* Custom close button — always visible, respects safe area */}
          <SheetClose
            className="absolute z-20 inline-flex items-center justify-center rounded-full bg-background/80 backdrop-blur-sm ring-1 ring-border/50 text-muted-foreground hover:text-foreground transition"
            style={{
              top: 'max(8px, env(safe-area-inset-top))',
              right: '16px',
              minWidth: '44px',
              minHeight: '44px',
            }}
          >
            <X className="h-5 w-5" />
            <span className="sr-only">{t("svcClose")}</span>
          </SheetClose>

          {/* Sticky/fixed header */}
          <SheetHeader className="px-5 pt-3 pb-4 border-b border-border/50 text-left shrink-0 bg-background">
            <SheetTitle asChild>
              {Header}
            </SheetTitle>
          </SheetHeader>

          {/* Scrollable content */}
          <div className={cn("flex-1 overflow-y-auto overscroll-contain px-4 py-5 bg-gradient-to-b from-muted/20 to-background", styledPresentation && "bg-none bg-background")}>
            <div style={contentZoomStyle}>{children}</div>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("max-w-2xl max-h-[88vh] p-0 flex flex-col rounded-2xl overflow-hidden border-border/40", flightPresentation ? "wallet-flight-theme" : hotelPresentation ? "wallet-hotel-theme" : undefined)} style={style}>
        <DialogHeader className="px-7 py-5 border-b border-border/50 text-left bg-card">
          <DialogTitle asChild>
            {Header}
          </DialogTitle>
        </DialogHeader>
        <div className={cn("flex-1 overflow-y-auto px-6 py-6 bg-gradient-to-b from-muted/20 to-background", styledPresentation && "bg-none bg-background")}>
          <div style={contentZoomStyle}>{children}</div>
        </div>
      </DialogContent>
    </Dialog>
  );
}