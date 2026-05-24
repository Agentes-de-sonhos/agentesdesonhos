import { useEffect, useState } from "react";
import { BrandText } from "@/components/ui/brand-text";
import { setOgMeta } from "@/lib/ogMeta";
import { useParams, Link } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { parseLocalDate } from "@/lib/dateParsing";
import { Itinerary, ItineraryDay, Activity } from "@/types/itinerary";
import {
  MapPin, Calendar, Users, Sun, Sunset, Moon, Clock, DollarSign, Loader2,
  ChevronDown, FileText, Download, Eye, ExternalLink, Sparkles, Headset,
  ChevronLeft, ChevronRight, Tag,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import type { AgentProfile } from "@/hooks/useAgentProfile";
import { FormattedText } from "@/components/ui/formatted-text";
import { LocalClock, weatherIconFor } from "@/components/trip/TripCalendar";
import { useTripWeather, type DayWeather } from "@/hooks/useTripWeather";
import { PASSENGER_INTEREST_LABELS } from "@/types/itinerary";

const periodIcons = { manha: Sun, tarde: Sunset, noite: Moon };
const periodLabels = { manha: "Manhã", tarde: "Tarde", noite: "Noite" };

const tripTypeLabels: Record<string, string> = {
  familia: "Viagem em Família", casal: "Viagem de Casal",
  lua_de_mel: "Lua de Mel", sozinho: "Viagem Solo", corporativo: "Viagem Corporativa",
};
const budgetLabels: Record<string, string> = {
  economico: "Econômico ⭐⭐⭐", conforto: "Conforto ⭐⭐⭐⭐", luxo: "Luxo ⭐⭐⭐⭐⭐",
};

const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

function getFileName(url: string) {
  try { return decodeURIComponent(url.split("/").pop()?.split("?")[0] || "arquivo"); }
  catch { return "arquivo"; }
}

function isImageUrl(url: string) {
  return /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(url);
}

function CollapsibleDayCard({
  day, periodImages, isOpen, onToggle, weather,
}: {
  day: ItineraryDay; periodImages: Record<string, string>; isOpen: boolean; onToggle: () => void;
  weather?: DayWeather;
}) {
  const dateFormatted = format(parseLocalDate(day.date), "EEEE, dd 'de' MMMM", { locale: ptBR });
  const WxIcon = weather ? weatherIconFor(weather.code) : null;

  return (
    <div
      id={`day-${day.dayNumber}`}
      data-date={day.date}
      className={`scroll-mt-24 rounded-2xl border bg-card overflow-hidden transition-all duration-300 hover:shadow-lg ${
        isOpen ? "border-primary/40 shadow-md ring-1 ring-primary/10" : "border-border/40 hover:border-border/80"
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full bg-gradient-to-r from-primary/15 to-primary/5 text-primary px-5 py-3 flex items-center justify-between cursor-pointer transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/80 shadow-sm">
            <Calendar className="h-5 w-5 text-primary" />
          </div>
          <div className="flex flex-col items-start gap-0.5">
            <span className="text-sm font-bold uppercase tracking-wide">Dia {day.dayNumber}</span>
            <span className="text-xs opacity-70 font-medium capitalize">{dateFormatted}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {weather && WxIcon && (
            <div className="flex items-center gap-1.5 rounded-full bg-white/80 border border-primary/15 px-2.5 py-1 text-xs font-semibold tabular-nums shadow-sm">
              <WxIcon className="h-3.5 w-3.5 text-primary/80" strokeWidth={2.4} />
              <span>{weather.tmin}° / {weather.tmax}°C</span>
            </div>
          )}
          <ChevronDown className={`h-5 w-5 opacity-60 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
        </div>
      </button>

      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? "max-h-[5000px] opacity-100" : "max-h-0 opacity-0"}`}>
        <div className="px-5 py-4 space-y-6">
          {(["manha", "tarde", "noite"] as const).map((period) => {
            const activities = day.activities.filter((a) => a.period === period);
            if (activities.length === 0) return null;
            const Icon = periodIcons[period];
            const periodKey = `${day.date}_${period}`;
            const periodImage = periodImages[periodKey];

            return (
              <div key={period}>
                <div className="mb-3 flex items-center gap-2 font-semibold text-primary">
                  <Icon className="h-5 w-5" />
                  {periodLabels[period]}
                </div>

                {periodImage && (
                  <div className="mb-3 rounded-xl overflow-hidden border border-border/30">
                    <img src={periodImage} alt={periodLabels[period]} className="w-full h-48 sm:h-56 object-cover" />
                  </div>
                )}

                <div className="space-y-3 pl-7">
                  {activities.map((activity) => (
                    <div
                      key={activity.id}
                      className="rounded-xl border border-border/40 bg-white p-4 sm:flex sm:gap-4 sm:items-start sm:p-4 space-y-3 sm:space-y-0"
                    >
                      {(activity as any).photoUrl && (
                        <div className="overflow-hidden rounded-lg border border-border/30 sm:shrink-0">
                          <img
                            src={(activity as any).photoUrl}
                            alt={activity.title}
                            loading="lazy"
                            decoding="async"
                            className="w-full h-44 object-cover sm:h-36 sm:w-36 sm:rounded-lg"
                          />
                        </div>
                      )}
                      <div className="sm:flex-1 sm:min-w-0 space-y-3">
                      <h4 className="font-semibold text-foreground">{activity.title}</h4>
                      {activity.description && (
                        <p className="text-sm text-muted-foreground leading-relaxed">{activity.description}</p>
                      )}
                      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
                        {activity.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" /> {activity.location}
                          </span>
                        )}
                        {activity.estimatedDuration && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" /> {activity.estimatedDuration}
                          </span>
                        )}
                        {activity.estimatedCost && (
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4" /> {activity.estimatedCost}
                          </span>
                        )}
                      </div>

                      {/* Maps URL */}
                      {(activity as any).mapsUrl && (
                        <div>
                          <a
                            href={(activity as any).mapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                          >
                            <MapPin className="h-3.5 w-3.5" />
                            Ver no mapa
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      )}

                      {/* Documents */}
                      {(activity as any).documentUrls?.length > 0 && (
                        <div className="space-y-2 pt-1">
                          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                            <FileText className="h-3.5 w-3.5" /> Documentos
                          </p>
                          <div className="space-y-1.5">
                            {(activity as any).documentUrls.map((url: string, i: number) => {
                              const name = getFileName(url);
                              const isImg = isImageUrl(url);
                              return (
                                <div key={i} className="flex items-center gap-2 text-xs bg-muted/50 rounded-lg px-3 py-2">
                                  {isImg ? <Eye className="h-3.5 w-3.5 text-muted-foreground shrink-0" /> : <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                                  <span className="flex-1 truncate text-muted-foreground">{name}</span>
                                  <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                                    {isImg ? <Eye className="h-3.5 w-3.5" /> : <Download className="h-3.5 w-3.5" />}
                                  </a>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      </div>
                    </div>
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

export default function RoteiroPublico({ tokenOverride }: { tokenOverride?: string } = {}) {
  const params = useParams();
  const token = tokenOverride ?? params.token;
  const [itinerary, setItinerary] = useState<(Itinerary & { days: ItineraryDay[] }) | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDayIndex, setOpenDayIndex] = useState<number | null>(0);
  const [agentOpen, setAgentOpen] = useState(false);
  const [periodImages, setPeriodImages] = useState<Record<string, string>>({});

  useEffect(() => {
    setOgMeta({
      title: "Seu roteiro de viagem está pronto ✈️",
      description: "Acesse seu roteiro completo e viaje com tudo organizado na palma da mão.",
    });
    if (token) loadItinerary(token);
  }, [token]);

  const { data: agentProfile } = useQuery({
    queryKey: ["agent-profile-itinerary", itinerary?.userId],
    queryFn: async () => {
      if (!itinerary?.userId) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("name, phone, avatar_url, agency_name, agency_logo_url, city, state")
        .eq("user_id", itinerary.userId)
        .maybeSingle();
      if (error || !data) return null;
      return data as AgentProfile;
    },
    enabled: !!itinerary?.userId,
  });

  // Weather + timezone (hook must be called unconditionally before any early return)
  const weatherDestination = itinerary?.destination;
  const weatherStart = itinerary ? parseLocalDate(itinerary.startDate) : new Date();
  const weatherEnd = itinerary ? parseLocalDate(itinerary.endDate) : new Date();
  const { weatherByDate, timezone } = useTripWeather(weatherDestination, weatherStart, weatherEnd);

  const loadItinerary = async (shareToken: string) => {
    try {
      const { data: itineraryData, error: itineraryError } = await supabase
        .from("itineraries")
        .select("*")
        .eq("share_token", shareToken)
        .eq("status", "published")
        .single();

      if (itineraryError || !itineraryData) {
        setError("Roteiro não encontrado ou não está público");
        setIsLoading(false);
        return;
      }

      const { data: days, error: daysError } = await supabase
        .from("itinerary_days")
        .select("*")
        .eq("itinerary_id", itineraryData.id)
        .order("day_number", { ascending: true });

      if (daysError) throw daysError;

      // Load period images for the itinerary
      const { data: periodImgs } = await supabase
        .from("trip_itinerary_period_images")
        .select("*")
        .eq("trip_id", itineraryData.id);

      const imgMap: Record<string, string> = {};
      (periodImgs || []).forEach((img: any) => {
        imgMap[`${img.date}_${img.period}`] = img.image_url;
      });
      setPeriodImages(imgMap);

      const daysWithActivities = await Promise.all(
        (days || []).map(async (day) => {
          const { data: activities } = await supabase
            .from("itinerary_activities")
            .select("*")
            .eq("day_id", day.id)
            .order("order_index", { ascending: true });

          // Also try trip_itinerary_activities for documents & maps
          const { data: tripActivities } = await supabase
            .from("trip_itinerary_activities" as any)
            .select("title, document_urls, maps_url")
            .eq("day_id", day.id) as { data: any[] | null };

          const tripActMap = new Map<string, any>();
          (tripActivities || []).forEach((ta: any) => {
            tripActMap.set(ta.title, ta);
          });

          return {
            id: day.id as string,
            dayNumber: day.day_number as number,
            date: day.date as string,
            activities: (activities || []).map((a) => {
              const tripAct = tripActMap.get(a.title);
              return {
                id: a.id as string,
                period: a.period as Activity["period"],
                title: a.title as string,
                description: a.description as string | null,
                location: a.location as string | null,
                estimatedDuration: a.estimated_duration as string | null,
                estimatedCost: a.estimated_cost as string | null,
                orderIndex: a.order_index as number,
                isApproved: a.is_approved as boolean,
                mapsUrl: (a as any).maps_url || tripAct?.maps_url || null,
                documentUrls: (a as any).document_urls || tripAct?.document_urls || [],
                photoUrl: (a as any).photo_url || null,
              };
            }),
          };
        })
      );

      const mappedItinerary: Itinerary & { days: ItineraryDay[] } = {
        id: itineraryData.id,
        userId: itineraryData.user_id,
        destination: itineraryData.destination,
        startDate: itineraryData.start_date,
        endDate: itineraryData.end_date,
        travelersCount: itineraryData.travelers_count,
        tripType: itineraryData.trip_type,
        budgetLevel: itineraryData.budget_level,
        status: itineraryData.status as Itinerary["status"],
        shareToken: itineraryData.share_token,
        publicAccessCode: (itineraryData as any).public_access_code || null,
        createdAt: itineraryData.created_at,
        updatedAt: itineraryData.updated_at,
        days: daysWithActivities,
        coverImageUrl: (itineraryData as any).cover_image_url || null,
        destinationIntroText: (itineraryData as any).destination_intro_text || null,
        destinationIntroImages: (itineraryData as any).destination_intro_images || [],
        showDestinationIntro: (itineraryData as any).show_destination_intro ?? true,
        passengers: ((itineraryData as any).passengers || []).map((p: any) => ({
          name: p?.name ?? "",
          age: p?.age ?? null,
        })),
        passengerInterests: (itineraryData as any).passenger_interests || [],
      };

      setItinerary(mappedItinerary);
    } catch (err) {
      console.error("Error loading itinerary:", err);
      setError("Erro ao carregar roteiro");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !itinerary) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-4">
        <h1 className="text-2xl font-bold text-foreground">Roteiro não encontrado</h1>
        <p className="text-muted-foreground">{error || "O link pode estar incorreto ou o roteiro não está mais disponível."}</p>
        <Button asChild>
          <Link to="/">Ir para o início</Link>
        </Button>
      </div>
    );
  }

  const whatsappNumber = agentProfile?.phone?.replace(/\D/g, "") || "";
  const whatsappMessage = encodeURIComponent(`Olá! Vi o roteiro para ${itinerary.destination} e gostaria de mais informações.`);
  const whatsappUrl = whatsappNumber
    ? `https://wa.me/${whatsappNumber.startsWith("55") ? whatsappNumber : `55${whatsappNumber}`}?text=${whatsappMessage}`
    : "";

  const tripStart = parseLocalDate(itinerary.startDate);
  const tripEnd = parseLocalDate(itinerary.endDate);
  const itineraryDates = new Set(itinerary.days.map((d) => d.date));
  const coverImage =
    itinerary.coverImageUrl ||
    (itinerary.destinationIntroImages && itinerary.destinationIntroImages[0]) ||
    null;
  const showIntro = itinerary.showDestinationIntro !== false;
  const introText = itinerary.destinationIntroText || null;
  const introImages = itinerary.destinationIntroImages || [];

  const scrollToDayStart = (dayNumber: number) => {
    const el = document.getElementById(`day-${dayNumber}`);
    if (!el) return;

    const headerHeight = document.querySelector("header")?.getBoundingClientRect().height ?? 0;
    const top = el.getBoundingClientRect().top + window.scrollY - headerHeight - 12;

    window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  };

  const scheduleDayScroll = (dayNumber: number) => {
    requestAnimationFrame(() => scrollToDayStart(dayNumber));
    window.setTimeout(() => scrollToDayStart(dayNumber), 360);
  };

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] pb-28 sm:pb-0">
      {/* ─── Slim Premium Header (mirrors Orçamento) ─── */}
      <header className="border-b border-border/20 bg-white/85 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-5 py-3 flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" /> Roteiro de Viagem
          </span>
          <BrandText as="span" className="text-sm sm:text-base font-semibold tracking-tight text-foreground/85 truncate max-w-[55%] text-right">
            {agentProfile?.agency_name || "Sua viagem"}
          </BrandText>
        </div>
      </header>

      {/* ─── HERO PREMIUM (mirrors Orçamento) ─── */}
      <section className="relative w-full overflow-hidden">
        <div className="relative min-h-[460px] sm:min-h-[560px] w-full">
          {coverImage ? (
            <img
              src={coverImage}
              alt={itinerary.destination}
              className="absolute inset-0 h-full w-full object-cover scale-[1.02]"
              loading="eager"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-primary/40 via-primary/20 to-slate-900" />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/30 to-black/85" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(0,0,0,0.55),transparent_65%)]" />

          {agentProfile?.agency_logo_url && (
            <div className="absolute top-6 sm:top-8 left-1/2 -translate-x-1/2 z-10 h-28 w-28 sm:h-36 sm:w-36 overflow-hidden rounded-full bg-white p-3 sm:p-4 shadow-[0_20px_60px_-12px_rgba(0,0,0,0.55)] ring-1 ring-black/[0.06] flex items-center justify-center">
              <img
                src={agentProfile.agency_logo_url}
                alt={agentProfile.agency_name || "Agência"}
                translate="no"
                className="h-full w-full object-contain"
              />
            </div>
          )}

          <div className={`relative max-w-4xl mx-auto px-5 sm:px-8 ${agentProfile?.agency_logo_url ? "pt-40 sm:pt-52" : "pt-24 sm:pt-32"} pb-20 sm:pb-24 flex flex-col text-white animate-fade-up`}>
            <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-white/15 backdrop-blur-md border border-white/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em]">
              <MapPin className="h-3 w-3" /> {itinerary.destination}
            </span>
            <h1 className="mt-4 text-[2.4rem] sm:text-6xl font-extrabold leading-[1.02] tracking-[-0.025em] max-w-3xl drop-shadow-[0_2px_24px_rgba(0,0,0,0.45)]">
              {itinerary.destination}
            </h1>
            <p className="mt-4 text-base sm:text-lg font-light text-white/90 max-w-2xl leading-relaxed">
              {itinerary.days.length} {itinerary.days.length === 1 ? "dia" : "dias"} para viver {itinerary.destination} de um jeito único.
            </p>

            <div className="mt-7 flex flex-wrap gap-2 sm:gap-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/12 backdrop-blur-md border border-white/20 px-3.5 py-1.5 text-xs sm:text-sm font-medium">
                <Calendar className="h-4 w-4 opacity-80" />
                {format(tripStart, "dd 'de' MMM", { locale: ptBR })} – {format(tripEnd, "dd 'de' MMM 'de' yyyy", { locale: ptBR })}
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/12 backdrop-blur-md border border-white/20 px-3.5 py-1.5 text-xs sm:text-sm font-medium">
                <Users className="h-4 w-4 opacity-80" />
                {itinerary.travelersCount} viajante{itinerary.travelersCount > 1 ? "s" : ""}
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/12 backdrop-blur-md border border-white/20 px-3.5 py-1.5 text-xs sm:text-sm font-medium capitalize">
                {tripTypeLabels[itinerary.tripType] || itinerary.tripType.replace("_", " ")}
              </div>
              {itinerary.budgetLevel && (
                <div className="inline-flex items-center gap-2 rounded-full bg-white/12 backdrop-blur-md border border-white/20 px-3.5 py-1.5 text-xs sm:text-sm font-medium">
                  {budgetLabels[itinerary.budgetLevel] || itinerary.budgetLevel}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <main className="max-w-4xl mx-auto px-4 sm:px-8 pt-10 sm:pt-14 pb-10 space-y-12">
        {/* ─── Trip meta (legacy fallback hidden when hero covers it) ─── */}
        {false && (
        <div className="text-center space-y-3">
          <div className="flex flex-wrap items-center justify-center gap-4 text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {format(tripStart, "dd 'de' MMM", { locale: ptBR })} –{" "}
              {format(tripEnd, "dd 'de' MMM 'de' yyyy", { locale: ptBR })}
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {itinerary.travelersCount} viajante(s)
            </span>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <Badge variant="secondary">{tripTypeLabels[itinerary.tripType]}</Badge>
            <Badge variant="outline">{budgetLabels[itinerary.budgetLevel]}</Badge>
          </div>
        </div>)}

        {/* ─── Destination intro (text + gallery) ─── */}
        {showIntro && (introText || introImages.length > 0) && (
          <DestinationIntroPublic
            text={introText}
            images={introImages}
            destination={itinerary.destination}
          />
        )}

        {/* ─── Passageiros + Perfil da viagem ─── */}
        {((itinerary.passengers && itinerary.passengers.length > 0) ||
          (itinerary.passengerInterests && itinerary.passengerInterests.length > 0)) && (
          <section className="rounded-2xl border border-border/40 bg-card p-4 sm:p-5 space-y-3">
            {itinerary.passengers && itinerary.passengers.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" /> Passageiros
                </p>
                <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-1">
                  {itinerary.passengers.map((p, i) => (
                    <li key={i} className="text-sm font-medium text-foreground truncate">
                      {p.name}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {itinerary.passengerInterests && itinerary.passengerInterests.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                  ✨ Perfil da viagem
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {itinerary.passengerInterests.map((k) => (
                    <Badge key={k} variant="secondary">
                      {PASSENGER_INTEREST_LABELS[k as keyof typeof PASSENGER_INTEREST_LABELS] || k}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* ─── Local time + Calendar with weather ─── */}
        <section className="space-y-3 sm:max-w-xl sm:mx-auto">
          {timezone && (
            <LocalClock
              timezone={timezone}
              destinationLabel={itinerary.destination}
              weatherByDate={weatherByDate}
              standalone
            />
          )}
          <TripCalendar
            startDate={tripStart}
            endDate={tripEnd}
            itineraryDates={itineraryDates}
            weatherByDate={weatherByDate}
            timezone={timezone}
            destinationLabel={itinerary.destination}
            onDayClick={(dateStr) => {
              const idx = itinerary.days.findIndex((d) => d.date === dateStr);
              if (idx < 0) return;
              setOpenDayIndex(idx);
              scheduleDayScroll(itinerary.days[idx].dayNumber);
            }}
          />
        </section>

        {/* ─── Collapsible Days (accordion — one open at a time) ─── */}
        {itinerary.days.length > 0 && (
          <section className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border/60" />
              <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Dia a Dia</h2>
              <div className="h-px flex-1 bg-border/60" />
            </div>
            <div className="space-y-3">
              {itinerary.days.map((day, index) => (
                <CollapsibleDayCard
                  key={day.id}
                  day={day}
                  periodImages={periodImages}
                  isOpen={openDayIndex === index}
                  onToggle={() => {
                    setOpenDayIndex(prev => {
                      const next = prev === index ? null : index;
                      if (next !== null) {
                        scheduleDayScroll(day.dayNumber);
                      }
                      return next;
                    });
                  }}
                  weather={weatherByDate?.[day.date]}
                />
              ))}
            </div>
          </section>
        )}

        {/* ─── Agent Signature (collapsible) ─── */}
        {agentProfile && (
          <div className="rounded-2xl border border-border/40 bg-white shadow-sm overflow-hidden">
            <button
              type="button"
              onClick={() => setAgentOpen((v) => !v)}
              className="w-full bg-gradient-to-r from-muted/50 to-muted/20 px-6 py-3 flex items-center justify-between hover:from-muted/70 transition-colors"
            >
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
                  <HelpCircle className="h-4 w-4 text-primary" />
                </span>
                Precisa de ajuda? Fale com seu consultor de viagens
              </p>
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-300 ${agentOpen ? "rotate-180" : ""}`} />
            </button>
            <div className={`overflow-hidden transition-all duration-300 ${agentOpen ? "max-h-[800px] opacity-100" : "max-h-0 opacity-0"}`}>
            <div className="p-6 sm:p-8">
              <div className="flex flex-col items-center text-center space-y-5">
                {agentProfile.avatar_url ? (
                  <img src={agentProfile.avatar_url} alt={agentProfile.name} className="h-28 w-28 rounded-full object-cover border-4 border-primary/10 shadow-lg ring-2 ring-white" />
                ) : (
                  <div className="h-28 w-28 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground text-4xl font-bold shadow-lg ring-2 ring-white">
                    {agentProfile.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="space-y-1">
                  <p className="text-xl font-bold text-foreground">{agentProfile.name}</p>
                  {agentProfile.agency_name && <BrandText as="p" className="text-sm text-muted-foreground font-medium">{agentProfile.agency_name}</BrandText>}
                  {(agentProfile.city || agentProfile.state) && (
                    <p className="text-xs text-muted-foreground">{[agentProfile.city, agentProfile.state].filter(Boolean).join(", ")}</p>
                  )}
                </div>
                {whatsappUrl && (
                  <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2.5 rounded-full bg-[#25D366] hover:bg-[#20BD5A] text-white px-8 py-3.5 font-bold text-sm shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105">
                    <WhatsAppIcon className="h-5 w-5" />
                    Falar no WhatsApp
                  </a>
                )}
              </div>
            </div>
            </div>
          </div>
        )}



      </main>

      {/* ─── Mobile floating WhatsApp ─── */}
      {whatsappUrl && (
        <div className="fixed bottom-6 right-6 sm:hidden z-20">
          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
            className="flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-2xl hover:scale-110 transition-transform">
            <WhatsAppIcon className="h-7 w-7" />
          </a>
        </div>
      )}
    </div>
  );
}
