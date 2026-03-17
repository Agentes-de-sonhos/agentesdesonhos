import { Clock, MapPin, Pencil, Trash2, Link2, StickyNote, Image, Paperclip, ExternalLink, Download, FileText, ImageIcon } from "lucide-react";
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

function getDocFileName(url: string) {
  try {
    const parts = url.split("/");
    const fullName = decodeURIComponent(parts[parts.length - 1]);
    return fullName.replace(/^\d+_/, "");
  } catch {
    return "documento";
  }
}

function isImageUrl(url: string) {
  return /\.(jpg|jpeg|png|webp)$/i.test(url);
}

function getMapsLink(mapsUrl: string): string {
  if (mapsUrl.startsWith("http")) return mapsUrl;
  return `https://www.google.com/maps/search/${encodeURIComponent(mapsUrl)}`;
}

export function ItineraryActivityCard({ activity, linkedService, onEdit, onDelete, readOnly }: Props) {
  const hasDocuments = activity.document_urls && activity.document_urls.length > 0;
  const hasMapsUrl = !!activity.maps_url;

  return (
    <div className="flex gap-3 group">
      {/* Timeline dot & line */}
      <div className="flex flex-col items-center pt-1.5">
        <div className="w-2.5 h-2.5 rounded-full bg-primary shrink-0" />
        <div className="w-0.5 flex-1 bg-border mt-1" />
      </div>

      <div className="flex-1 pb-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0 space-y-2">
            {/* — Info section — */}
            <div>
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
            </div>

            {/* — Location / Google Maps section — */}
            {hasMapsUrl && (
              <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-md border border-border/50">
                <MapPin className="h-4 w-4 text-primary shrink-0" />
                <span className="text-xs text-muted-foreground truncate flex-1">
                  {activity.maps_url!.startsWith("http")
                    ? "Localização no mapa"
                    : activity.maps_url}
                </span>
                <a
                  href={getMapsLink(activity.maps_url!)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline shrink-0"
                >
                  <ExternalLink className="h-3 w-3" /> Ver no mapa
                </a>
              </div>
            )}

            {/* — Photo thumbnails — */}
            {activity.photo_urls && activity.photo_urls.length > 0 && (
              <div className="flex gap-1.5 flex-wrap">
                {activity.photo_urls.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                    <img src={url} alt="" className="w-12 h-12 rounded object-cover border hover:opacity-80 transition-opacity" />
                  </a>
                ))}
              </div>
            )}

            {/* — Documents section — */}
            {hasDocuments && (
              <div className="space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                  <Paperclip className="h-3 w-3" /> Documentos
                </p>
                <div className="flex flex-col gap-1">
                  {activity.document_urls.map((url, i) => {
                    const fileName = getDocFileName(url);
                    const isImg = isImageUrl(url);
                    return (
                      <div key={i} className="flex items-center gap-2 text-xs bg-muted/30 rounded px-2 py-1.5 border border-border/50">
                        {isImg ? <ImageIcon className="h-3.5 w-3.5 text-primary shrink-0" /> : <FileText className="h-3.5 w-3.5 text-primary shrink-0" />}
                        <span className="truncate flex-1">{fileName}</span>
                        <a href={url} target="_blank" rel="noopener noreferrer" title="Visualizar" className="text-primary hover:text-primary/80">
                          <ExternalLink className="h-3 w-3" />
                        </a>
                        <a href={url} download title="Download" className="text-primary hover:text-primary/80">
                          <Download className="h-3 w-3" />
                        </a>
                      </div>
                    );
                  })}
                </div>
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
