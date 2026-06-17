import type { CSSProperties, ReactNode } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { SERVICE_LABELS } from "@/lib/tripServiceLabels";
import type { TripService } from "@/types/trip";
import {
  Plane, Hotel, Car, Bus, Ticket, Shield, Ship, TrainFront, FileText,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

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
}: ServiceDetailOverlayProps) {
  const isMobile = useIsMobile();
  const Icon = icon ?? (service ? ICONS[service.service_type] ?? FileText : FileText);
  const label =
    title ?? (service ? SERVICE_LABELS[service.service_type] ?? "Serviço" : "Serviço");

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="max-h-[85vh] p-0 rounded-t-2xl flex flex-col"
        >
          <SheetHeader className="px-4 py-3 border-b text-left shrink-0">
            <SheetTitle className="flex items-center gap-2 text-base">
              <Icon className="h-5 w-5 text-primary" />
              {label}
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto p-4">{children}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] p-0 flex flex-col">
        <DialogHeader className="px-6 py-4 border-b text-left">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Icon className="h-5 w-5 text-primary" />
            {label}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </DialogContent>
    </Dialog>
  );
}