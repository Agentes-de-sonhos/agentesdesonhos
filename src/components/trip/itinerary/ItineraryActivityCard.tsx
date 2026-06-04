import { Clock, MapPin, Pencil, Trash2, Link2, StickyNote, Paperclip, ExternalLink, Download, FileText, ImageIcon, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteDialog } from "@/components/admin/ConfirmDeleteDialog";
import type { ItineraryActivity } from "@/hooks/useItineraryActivities";
import type { TripService, TripServiceType } from "@/types/trip";
import { useResolvedVoucherUrl } from "@/lib/itineraryAssetUrl";

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
  originBadge?: { label: string; className: string };
  dragHandleProps?: {
    attributes?: Record<string, any>;
    listeners?: Record<string, any>;
    setActivatorNodeRef?: (el: HTMLElement | null) => void;
  };
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

function ResolvedPhoto({ path }: { path: string }) {
  const url = useResolvedVoucherUrl(path);
  if (!url) {
    return <div className="w-14 h-14 rounded-md border bg-muted animate-pulse" />;
  }
  return (
    <a href={url} target="_blank" rel="noopener noreferrer">
      <img src={url} alt="" className="w-14 h-14 rounded-md object-cover border hover:opacity-80 transition-opacity" />
    </a>
  );
}

function FirstPhotoThumb({ path }: { path: string }) {
  const url = useResolvedVoucherUrl(path);
  if (!url) {
    return <div className="h-16 w-16 sm:h-20 sm:w-20 shrink-0 rounded-md border bg-muted/50 animate-pulse" />;
  }
  return (
    <div className="shrink-0 overflow-hidden rounded-md border bg-muted/50 h-16 w-16 sm:h-20 sm:w-20">
      <img src={url} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
    </div>
  );
}

function ResolvedDocRow({ path }: { path: string }) {
  const url = useResolvedVoucherUrl(path);
  const fileName = getDocFileName(path);
  const isImg = isImageUrl(path);
  return (
    <div className="flex items-center gap-2 text-xs bg-muted/30 rounded px-2 py-1.5 border border-border/50">
      {isImg ? <ImageIcon className="h-3.5 w-3.5 text-primary shrink-0" /> : <FileText className="h-3.5 w-3.5 text-primary shrink-0" />}
      <span className="truncate flex-1">{fileName}</span>
      {url ? (
        <>
          <a href={url} target="_blank" rel="noopener noreferrer" title="Visualizar" className="text-primary hover:text-primary/80">
            <ExternalLink className="h-3 w-3" />
          </a>
          <a href={url} download title="Download" className="text-primary hover:text-primary/80">
            <Download className="h-3 w-3" />
          </a>
        </>
      ) : (
        <span className="text-muted-foreground text-[10px]">carregando…</span>
      )}
    </div>
  );
}

function getMapsLink(mapsUrl: string): string {
  if (mapsUrl.startsWith("http")) return mapsUrl;
  return `https://www.google.com/maps/search/${encodeURIComponent(mapsUrl)}`;
}

export function ItineraryActivityCard({ activity, linkedService, onEdit, onDelete, readOnly, originBadge, dragHandleProps }: Props) {
  const hasDocuments = activity.document_urls && activity.document_urls.length > 0;
  const hasMapsUrl = !!activity.maps_url;
  const photos = activity.photo_urls || [];
  const extraPhotos = photos.slice(1);

  return (
    <div className="rounded-lg border border-border bg-card p-3 transition-all duration-150 hover:border-primary/30 hover:shadow-sm">
      <div className="flex items-start gap-3">
        {/* Drag handle (left) */}
        {!readOnly && dragHandleProps && (
          <button
            ref={(el) => dragHandleProps.setActivatorNodeRef?.(el)}
            type="button"
            aria-label="Arrastar atividade"
            className="flex h-8 w-6 shrink-0 cursor-grab items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground touch-none active:cursor-grabbing"
            {...(dragHandleProps.attributes || {})}
            {...(dragHandleProps.listeners || {})}
          >
            <GripVertical className="h-4 w-4" />
          </button>
        )}

        {/* Featured photo */}
        {photos.length > 0 && <FirstPhotoThumb path={photos[0]} />}

        {/* Main content */}
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            {activity.start_time && (
              <span className="text-xs font-mono font-semibold text-primary flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {activity.start_time}
              </span>
            )}
            <h4 className="font-medium text-sm leading-snug">{activity.title}</h4>
            {originBadge && (
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${originBadge.className}`}>
                {originBadge.label}
              </span>
            )}
          </div>

          {activity.description && (
            <p className="text-xs text-muted-foreground">{activity.description}</p>
          )}

          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {activity.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {activity.location}
              </span>
            )}
            {activity.notes && (
              <span className="flex items-center gap-1 italic text-muted-foreground/80">
                <StickyNote className="h-3 w-3" /> {activity.notes}
              </span>
            )}
          </div>

          {linkedService && (
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-medium">
              <Link2 className="h-3 w-3" />
              {SERVICE_ICONS[linkedService.service_type]} {SERVICE_LABELS[linkedService.service_type]}
            </div>
          )}

          {hasMapsUrl && (
            <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-md border border-border/50">
              <MapPin className="h-4 w-4 text-primary shrink-0" />
              <span className="text-xs text-muted-foreground truncate flex-1">
                {activity.maps_url!.startsWith("http") ? "Localização no mapa" : activity.maps_url}
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

          {extraPhotos.length > 0 && (
            <div className="flex gap-1.5 flex-wrap pt-1">
              {extraPhotos.map((url, i) => (
                <ResolvedPhoto key={i} path={url} />
              ))}
            </div>
          )}

          {hasDocuments && (
            <div className="space-y-1 pt-1">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                <Paperclip className="h-3 w-3" /> Documentos
              </p>
              <div className="flex flex-col gap-1">
                {activity.document_urls.map((url, i) => (
                  <ResolvedDocRow key={i} path={url} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        {!readOnly && (
          <div className="flex gap-1 shrink-0">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit} title="Editar">
              <Pencil className="h-4 w-4" />
            </Button>
            <ConfirmDeleteDialog
              onConfirm={onDelete}
              title="Excluir atividade?"
              description="Esta atividade será removida permanentemente do roteiro. Tem certeza?"
            >
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </ConfirmDeleteDialog>
          </div>
        )}
      </div>
    </div>
  );
}
