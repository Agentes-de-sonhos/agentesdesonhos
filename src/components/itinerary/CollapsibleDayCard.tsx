import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Calendar, ChevronDown, MapPin, Clock, DollarSign, Sun, Sunset, Moon,
  FileText, Download, Eye, ExternalLink, ArrowRight,
} from "lucide-react";
import { parseLocalDate, formatItineraryDayHeader } from "@/lib/dateParsing";
import type { ItineraryDay } from "@/types/itinerary";
import { weatherIconFor } from "@/components/trip/TripCalendar";
import type { DayWeather } from "@/hooks/useTripWeather";
import { useActivityPhoto } from "@/hooks/useActivityPhoto";
import type { TripService } from "@/types/trip";
import { SERVICE_CHIP_LABELS, SERVICE_ICONS } from "@/lib/tripServiceLabels";

const periodIcons = { manha: Sun, tarde: Sunset, noite: Moon } as const;
const periodLabels = { manha: "Manhã", tarde: "Tarde", noite: "Noite" } as const;

export function getFileName(url: string) {
  try { return decodeURIComponent(url.split("/").pop()?.split("?")[0] || "arquivo"); }
  catch { return "arquivo"; }
}

export function isImageUrl(url: string) {
  return /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(url);
}

/**
 * Renders the activity photo. Falls back to a lazy lookup via activity-photo
 * edge function when no persisted URL exists.
 */
export function ActivityImage({
  activity,
  destination,
  FallbackIcon,
}: {
  activity: any;
  destination?: string;
  FallbackIcon: any;
}) {
  const persisted: string | null = activity?.photoUrl ?? null;
  const { data } = useActivityPhoto({
    query: activity?.title,
    location: activity?.location,
    destination,
    enabled: !persisted,
  });
  const url = persisted || data?.photo_url || data?.thumb_url || null;

  if (url) {
    return (
      <div className="shrink-0 sm:self-center overflow-hidden sm:rounded-xl sm:border sm:border-border/30 bg-muted w-full h-44 sm:h-[120px] sm:w-[120px]">
        <img
          src={url}
          alt={activity.title}
          loading="lazy"
          decoding="async"
          className="block w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
      </div>
    );
  }
  return (
    <div className="shrink-0 sm:self-center w-full h-44 sm:h-[120px] sm:w-[120px] sm:rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border-b sm:border border-primary/10 flex items-center justify-center">
      <FallbackIcon className="h-6 w-6 text-primary/40" />
    </div>
  );
}

/**
 * Shared day-by-day card used by both the public itinerary link
 * (RoteiroPublico) and the public digital wallet (ViagemPublica) so the
 * visual layout stays consistent across both surfaces.
 */
export function CollapsibleDayCard({
  day, periodImages, isOpen, onToggle, weather, destination,
  servicesById, onOpenService,
}: {
  day: ItineraryDay;
  periodImages: Record<string, string>;
  isOpen: boolean;
  onToggle: () => void;
  weather?: DayWeather;
  destination?: string;
  /**
   * Optional map of `trip_services.id → TripService`. When provided, activities
   * whose `linkedTripServiceId` resolves to one of these services render a
   * clickable "Ver serviço" chip. Only used inside the Carteira Digital.
   */
  servicesById?: Map<string, TripService>;
  onOpenService?: (service: TripService) => void;
}) {
  const dateFormatted = formatItineraryDayHeader(parseLocalDate(day.date));
  const WxIcon = weather ? weatherIconFor(weather.code) : null;
  const totalActivities = day.activities.length;

  return (
    <div
      id={`day-${day.dayNumber}`}
      data-date={day.date}
      className={`scroll-mt-24 rounded-2xl border bg-card overflow-hidden transition-all duration-300 ${
        isOpen
          ? "border-primary/40 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.12)]"
          : "border-border/60 hover:border-border hover:shadow-sm"
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-4 sm:px-5 py-3.5 flex items-center justify-between cursor-pointer text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-11 w-11 flex-col items-center justify-center rounded-xl bg-primary/8 border border-primary/15 shrink-0">
            <Calendar className="h-4 w-4 text-primary" strokeWidth={2.2} />
          </div>
          <div className="flex flex-col items-start gap-0.5 min-w-0">
            <span className="text-[13px] font-bold tracking-tight text-primary uppercase">
              Dia {day.dayNumber}
            </span>
            <span className="text-xs text-muted-foreground font-medium truncate">
              {dateFormatted}
              {!isOpen && totalActivities > 0 && (
                <span className="text-muted-foreground/60"> · {totalActivities} {totalActivities === 1 ? "atividade" : "atividades"}</span>
              )}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {weather && WxIcon && (
            <div className="hidden xs:flex items-center gap-1.5 rounded-full bg-muted/60 px-2.5 py-1 text-[11px] font-semibold tabular-nums text-foreground/80">
              <WxIcon className="h-3.5 w-3.5 text-primary/70" strokeWidth={2.4} />
              <span>{weather.tmin}° / {weather.tmax}°C</span>
            </div>
          )}
          <ChevronDown className={`h-4 w-4 text-muted-foreground/60 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
        </div>
      </button>

      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? "max-h-[8000px] opacity-100" : "max-h-0 opacity-0"}`}>
        <div className="px-4 sm:px-5 pb-5 pt-1 space-y-7 border-t border-border/40">
          {(["manha", "tarde", "noite"] as const).map((period) => {
            const activities = day.activities.filter((a) => a.period === period);
            if (activities.length === 0) return null;
            const Icon = periodIcons[period];
            const periodKey = `${day.date}_${period}`;
            const periodImage = periodImages[periodKey];

            return (
              <div key={period}>
                <div className="mt-5 mb-3 flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
                    <Icon className="h-3.5 w-3.5 text-primary" strokeWidth={2.4} />
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary/80">
                    {periodLabels[period]}
                  </span>
                  <div className="h-px flex-1 bg-border/50" />
                </div>

                {periodImage && (
                  <div className="mb-4 rounded-xl overflow-hidden border border-border/40">
                    <img src={periodImage} alt={periodLabels[period]} className="w-full h-40 sm:h-48 object-cover" />
                  </div>
                )}

                <div className="space-y-3">
                  {activities.map((activity) => (
                    <article
                      key={activity.id}
                      className="group rounded-2xl border border-border/50 bg-white overflow-hidden sm:overflow-visible sm:p-4 flex flex-col sm:flex-row sm:gap-4 hover:border-border hover:shadow-sm transition-all"
                    >
                      <ActivityImage
                        activity={activity}
                        destination={destination}
                        FallbackIcon={Icon}
                      />

                      <div className="flex-1 min-w-0 space-y-2 p-3 sm:p-0">
                        <h4 className="font-semibold text-foreground text-[15px] leading-tight tracking-tight">
                          {activity.title}
                        </h4>

                        {activity.description && (
                          <p className="rt-body text-muted-foreground leading-relaxed whitespace-pre-line break-words">
                            {activity.description}
                          </p>
                        )}

                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11.5px] text-muted-foreground/90 pt-0.5">
                          {activity.location && (
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-3 w-3" /> {activity.location}
                            </span>
                          )}
                          {activity.estimatedDuration && (
                            <span className="inline-flex items-center gap-1">
                              <Clock className="h-3 w-3" /> {activity.estimatedDuration}
                            </span>
                          )}
                          {activity.estimatedCost && (
                            <span className="inline-flex items-center gap-1 font-semibold text-foreground/80">
                              <DollarSign className="h-3 w-3" /> {activity.estimatedCost}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 pt-0.5">
                          {(activity as any).mapsUrl && (
                            <a
                              href={(activity as any).mapsUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                            >
                              <MapPin className="h-3 w-3" />
                              Ver no mapa
                              <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                          )}

                          {(() => {
                            const linkedId = (activity as any).linkedTripServiceId as string | null | undefined;
                            if (!linkedId || !servicesById) return null;
                            const svc = servicesById.get(linkedId);
                            if (!svc) return null;
                            return (
                              <button
                                type="button"
                                onClick={() => onOpenService?.(svc)}
                                className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 hover:bg-primary/15 text-primary text-[11.5px] font-semibold px-2.5 py-1 transition-colors"
                              >
                                <span aria-hidden>{SERVICE_ICONS[svc.service_type]}</span>
                                {SERVICE_CHIP_LABELS[svc.service_type]}
                                <ArrowRight className="h-3 w-3" />
                              </button>
                            );
                          })()}
                        </div>

                        {(activity as any).documentUrls?.length > 0 && (
                          <div className="space-y-1.5 pt-1">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 flex items-center gap-1">
                              <FileText className="h-3 w-3" /> Documentos
                            </p>
                            <div className="space-y-1">
                              {(activity as any).documentUrls.map((url: string, i: number) => {
                                const name = getFileName(url);
                                const isImg = isImageUrl(url);
                                return (
                                  <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                                    className="flex items-center gap-2 text-[11px] bg-muted/50 hover:bg-muted rounded-lg px-2.5 py-1.5 transition-colors">
                                    {isImg ? <Eye className="h-3 w-3 text-muted-foreground shrink-0" /> : <FileText className="h-3 w-3 text-muted-foreground shrink-0" />}
                                    <span className="flex-1 truncate text-muted-foreground">{name}</span>
                                    {isImg ? <Eye className="h-3 w-3 text-primary" /> : <Download className="h-3 w-3 text-primary" />}
                                  </a>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}