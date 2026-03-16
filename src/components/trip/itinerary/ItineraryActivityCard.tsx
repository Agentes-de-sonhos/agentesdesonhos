import { Clock, MapPin, Pencil, Trash2, Link2, StickyNote, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ItineraryActivity } from "@/hooks/useItineraryActivities";
import type { TripService, TripServiceType } from "@/types/trip";

const SERVICE_ICONS: Record<TripServiceType, string> = {
  flight: "✈️", hotel: "🏨", car_rental: "🚗", transfer: "🚐",
  attraction: "🎫", insurance: "🛡️", cruise: "🚢", train: "🚂", other: "📋",
};

const SERVICE_LABELS: Record<TripServiceType, string> = {
  flight: "Passagem Aérea", hotel: "Hospedagem", car_rental: "Locação de Veículo",
  transfer: "Transfer", attraction: "Ingressos/Atrações", insurance: "Seguro Viagem",
  cruise: "Cruzeiro", train: "Trem", other: "Outros",
};

interface Props {
  activity: ItineraryActivity;
  linkedService?: TripService;
  onEdit: () => void;
  onDelete: () => void;
  readOnly?: boolean;
}

export function ItineraryActivityCard({ activity, linkedService, onEdit, onDelete, readOnly }: Props) {
  return (
    <div className="flex gap-3 group">
      {/* Timeline dot & line */}
      <div className="flex flex-col items-center pt-1.5">
        <div className="w-2.5 h-2.5 rounded-full bg-primary shrink-0" />
        <div className="w-0.5 flex-1 bg-border mt-1" />
      </div>

      <div className="flex-1 pb-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {activity.start_time && (
                <span className="text-xs font-mono font-semibold text-primary flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {activity.start_time}
                </span>
              )}
              <span className="font-medium text-sm">{activity.title}</span>
            </div>
            {activity.description && (
              <p className="text-xs text-muted-foreground mt-0.5">{activity.description}</p>
            )}
            {activity.location && (
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {activity.location}
              </p>
            )}
            {activity.notes && (
              <p className="text-xs text-muted-foreground/70 mt-0.5 flex items-center gap-1 italic">
                <StickyNote className="h-3 w-3" /> {activity.notes}
              </p>
            )}

            {/* Linked service badge */}
            {linkedService && (
              <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-medium">
                <Link2 className="h-3 w-3" />
                {SERVICE_ICONS[linkedService.service_type]} {SERVICE_LABELS[linkedService.service_type]}
              </div>
            )}

            {/* Photo thumbnails */}
            {activity.photo_urls && activity.photo_urls.length > 0 && (
              <div className="flex gap-1.5 mt-2 flex-wrap">
                {activity.photo_urls.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                    <img src={url} alt="" className="w-12 h-12 rounded object-cover border hover:opacity-80 transition-opacity" />
                  </a>
                ))}
              </div>
            )}
          </div>

          {!readOnly && (
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}>
                <Pencil className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={onDelete}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
