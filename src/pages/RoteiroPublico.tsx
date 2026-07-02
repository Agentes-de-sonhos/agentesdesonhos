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
  ChevronDown, FileText, Download, Eye, ExternalLink, Sparkles, Type,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import type { AgentProfile } from "@/hooks/useAgentProfile";
import { FormattedText } from "@/components/ui/formatted-text";
import { LocalClock, weatherIconFor } from "@/components/trip/TripCalendar";
import { useTripWeather, type DayWeather } from "@/hooks/useTripWeather";
import { PASSENGER_INTEREST_LABELS } from "@/types/itinerary";
import { useActivityPhoto } from "@/hooks/useActivityPhoto";
import { CollapsibleDayCard } from "@/components/itinerary/CollapsibleDayCard";
import { resolveSignatureContact, buildWhatsAppUrl } from "@/lib/commercialSignature";

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


export default function RoteiroPublico({ tokenOverride }: { tokenOverride?: string } = {}) {
  const params = useParams();
  const token = tokenOverride ?? params.token;
  const [itinerary, setItinerary] = useState<(Itinerary & { days: ItineraryDay[] }) | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDayIndex, setOpenDayIndex] = useState<number | null>(0);
  const [agentOpen, setAgentOpen] = useState(false);
  const [periodImages, setPeriodImages] = useState<Record<string, string>>({});
  const [fontScale, setFontScale] = useState<"sm" | "md" | "lg">(() => {
    if (typeof window === "undefined") return "md";
    const saved = window.localStorage.getItem("roteiro:fontScale");
    return saved === "sm" || saved === "lg" ? saved : "md";
  });
  useEffect(() => {
    try { window.localStorage.setItem("roteiro:fontScale", fontScale); } catch {}
  }, [fontScale]);

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
        .rpc("get_public_profile", { _user_id: itinerary.userId })
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

          // Legacy trip_itinerary_activities fallback removed — this page
          // renders itinerary_activities directly; documents/maps come from
          // the same row via (a as any).document_urls / maps_url.
          const tripActMap = new Map<string, any>();

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
        headline: (itineraryData as any).headline ?? null,
        passengers: ((itineraryData as any).passengers || []).map((p: any) => ({
          name: p?.name ?? "",
          age: p?.age ?? null,
        })),
        passengerInterests: (itineraryData as any).passenger_interests || [],
        // @ts-ignore — extra field passed through for SignatureSnapshot rendering
        signature_snapshot: (itineraryData as any).signature_snapshot || null,
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

  const sig = resolveSignatureContact((itinerary as any).signature_snapshot, agentProfile as any);
  const whatsappUrl = buildWhatsAppUrl(
    sig.whatsapp || sig.phone,
    `Olá! Vi o roteiro para ${itinerary.destination} e gostaria de mais informações.`,
  );

  const tripStart = parseLocalDate(itinerary.startDate);
  const tripEnd = parseLocalDate(itinerary.endDate);
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
    <div className={`min-h-screen bg-[hsl(var(--background))] pb-28 sm:pb-0 rt-scale-${fontScale}`}>
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

      {/* ─── HERO COMPACT PREMIUM ─── */}
      <section className="relative w-full overflow-hidden">
        <div className="relative w-full max-w-5xl mx-auto sm:px-4 sm:pt-4">
          <div className="relative aspect-[16/10] sm:aspect-[21/9] min-h-[280px] sm:min-h-[340px] max-h-[480px] w-full overflow-hidden sm:rounded-2xl">
            {coverImage ? (
              <img
                src={coverImage}
                alt={itinerary.destination}
                className="absolute inset-0 h-full w-full object-cover"
                loading="eager"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-primary/40 via-primary/20 to-slate-900" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10" />

            {agentProfile?.agency_logo_url && (
              <div className="absolute top-4 right-4 sm:top-5 sm:right-5 z-10 h-14 w-14 sm:h-16 sm:w-16 overflow-hidden rounded-full bg-white p-1.5 shadow-lg ring-1 ring-black/5 flex items-center justify-center">
                <img
                  src={agentProfile.agency_logo_url}
                  alt={agentProfile.agency_name || "Agência"}
                  translate="no"
                  className="h-full w-full object-contain"
                />
              </div>
            )}

            <div className="absolute inset-x-0 bottom-0 px-5 sm:px-7 pb-5 sm:pb-7 text-white animate-fade-up">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur-md border border-white/25 px-2.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.22em]">
                <MapPin className="h-2.5 w-2.5" /> {itinerary.destination}
              </span>
              <h1 className="mt-2 text-[1.85rem] sm:text-5xl font-extrabold leading-[1.05] tracking-[-0.025em] drop-shadow-[0_2px_18px_rgba(0,0,0,0.5)]">
                {itinerary.destination}
              </h1>
              <p className="mt-1.5 text-[13px] sm:text-base font-light text-white/90 leading-snug max-w-2xl">
                {itinerary.headline?.trim()
                  ? itinerary.headline
                  : `${itinerary.days.length} ${itinerary.days.length === 1 ? "dia" : "dias"} para viver ${itinerary.destination} de um jeito único.`}
              </p>

              <div className="mt-3 flex flex-wrap gap-1.5">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-white/12 backdrop-blur-md border border-white/20 px-2.5 py-1 text-[11px] sm:text-xs font-medium">
                  <Calendar className="h-3 w-3 opacity-80" />
                  {format(tripStart, "dd 'de' MMM", { locale: ptBR })} – {format(tripEnd, "dd 'de' MMM 'de' yyyy", { locale: ptBR })}
                </div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-white/12 backdrop-blur-md border border-white/20 px-2.5 py-1 text-[11px] sm:text-xs font-medium">
                  <Users className="h-3 w-3 opacity-80" />
                  {itinerary.travelersCount} viajante{itinerary.travelersCount > 1 ? "s" : ""}
                </div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-white/12 backdrop-blur-md border border-white/20 px-2.5 py-1 text-[11px] sm:text-xs font-medium capitalize">
                  {tripTypeLabels[itinerary.tripType] || itinerary.tripType.replace("_", " ")}
                </div>
                {itinerary.budgetLevel && (
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-white/12 backdrop-blur-md border border-white/20 px-2.5 py-1 text-[11px] sm:text-xs font-medium">
                    {budgetLabels[itinerary.budgetLevel] || itinerary.budgetLevel}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="max-w-4xl mx-auto px-4 sm:px-8 pt-6 sm:pt-10 pb-10 space-y-7 sm:space-y-9">

        {/* ─── Controle de tamanho de fonte ─── */}
        <div className="flex items-center justify-end -mb-3">
          <div className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-card/80 backdrop-blur px-1 py-1 shadow-sm">
            <Type className="h-3.5 w-3.5 text-muted-foreground mx-1.5" />
            <button
              type="button"
              onClick={() => setFontScale("sm")}
              aria-label="Diminuir fonte"
              className={`h-7 w-7 rounded-full text-[12px] font-semibold transition ${fontScale === "sm" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
            >A-</button>
            <button
              type="button"
              onClick={() => setFontScale("md")}
              aria-label="Fonte padrão"
              className={`h-7 w-7 rounded-full text-[13px] font-semibold transition ${fontScale === "md" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
            >A</button>
            <button
              type="button"
              onClick={() => setFontScale("lg")}
              aria-label="Aumentar fonte"
              className={`h-7 w-7 rounded-full text-[14px] font-semibold transition ${fontScale === "lg" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
            >A+</button>
          </div>
        </div>

        {/* ─── Destination intro: editorial gallery + left-aligned text ─── */}
        {showIntro && (introText || introImages.length > 0) && (
          <section className="rounded-2xl border border-border/50 bg-card p-3 sm:p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] space-y-4">
            {introImages.length > 0 && (
              <div className="-mx-3 sm:mx-0 overflow-x-auto scroll-smooth snap-x snap-mandatory scrollbar-hide">
                <div className="flex gap-2.5 px-3 sm:px-0">
                  {introImages.map((src, i) => (
                    <div key={i} className="snap-start shrink-0 overflow-hidden rounded-xl border border-border/40 bg-muted">
                      <img
                        src={src}
                        alt={`${itinerary.destination} ${i + 1}`}
                        loading={i < 2 ? "eager" : "lazy"}
                        className="h-32 w-32 sm:h-36 sm:w-44 object-cover hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
            {introText && (
              <p className="rt-body-lg text-foreground/85 leading-relaxed whitespace-pre-wrap break-words">
                <FormattedText>{introText}</FormattedText>
              </p>
            )}
          </section>
        )}

        {/* ─── Passageiros: avatares premium ─── */}
        {itinerary.passengers && itinerary.passengers.length > 0 && (
          <section className="rounded-2xl border border-border/50 bg-card p-4 sm:p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-primary mb-3 flex items-center gap-1.5">
              <Users className="h-3 w-3" /> Passageiros
            </p>
            <ul className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-3">
              {itinerary.passengers.map((p, i) => {
                const age = p.age;
                const isChild = typeof age === "number" && age < 18;
                const profile = isChild
                  ? age <= 2 ? "Bebê" : `Criança (${age} anos)`
                  : "Adulto";
                const initials = (p.name || "?").split(" ").filter(Boolean).slice(0, 2).map((s) => s.charAt(0).toUpperCase()).join("") || "?";
                const palette = [
                  "from-sky-400 to-sky-600",
                  "from-amber-400 to-orange-500",
                  "from-rose-400 to-pink-500",
                  "from-emerald-400 to-teal-500",
                  "from-violet-400 to-indigo-500",
                  "from-cyan-400 to-blue-500",
                ][i % 6];
                return (
                  <li key={i} className="flex items-center gap-2.5 min-w-0">
                    <div className={`shrink-0 h-9 w-9 rounded-full bg-gradient-to-br ${palette} text-white flex items-center justify-center text-[11px] font-bold shadow-sm ring-2 ring-white`}>
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-foreground leading-tight truncate">{p.name || "Passageiro"}</p>
                      <p className="text-[10.5px] text-muted-foreground leading-tight">{profile}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
            {itinerary.passengerInterests && itinerary.passengerInterests.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border/40 flex flex-wrap gap-1.5">
                {itinerary.passengerInterests.map((k) => (
                  <Badge key={k} variant="secondary" className="rounded-full font-normal text-[11px]">
                    {PASSENGER_INTEREST_LABELS[k as keyof typeof PASSENGER_INTEREST_LABELS] || k}
                  </Badge>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ─── Local time strip ─── */}
        {timezone && (
          <section>
            <LocalClock
              timezone={timezone}
              destinationLabel={itinerary.destination}
              weatherByDate={weatherByDate}
              standalone
            />
          </section>
        )}

        {/* ─── Horizontal day strip (app-like timeline) ─── */}
        {itinerary.days.length > 0 && (
          <section className="rounded-2xl border border-border/50 bg-card p-3 sm:p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <p className="text-center text-[10.5px] font-bold uppercase tracking-[0.22em] text-primary mb-3">
              Calendário da Viagem
            </p>
            <div className="relative">
              <div className="overflow-x-auto scroll-smooth snap-x snap-mandatory scrollbar-hide -mx-1 px-1">
                <div className="flex gap-2 min-w-min">
                  {itinerary.days.map((day, idx) => {
                    const d = parseLocalDate(day.date);
                    const isOpen = openDayIndex === idx;
                    const wx = weatherByDate?.[day.date];
                    const WxIcon = wx ? weatherIconFor(wx.code) : null;
                    return (
                      <button
                        key={day.id}
                        type="button"
                        onClick={() => {
                          setOpenDayIndex(idx);
                          scheduleDayScroll(day.dayNumber);
                        }}
                        className={`snap-start shrink-0 flex flex-col items-center justify-center w-[68px] sm:w-[80px] py-3 rounded-xl border transition-all ${
                          isOpen
                            ? "bg-primary text-primary-foreground border-primary shadow-md"
                            : "bg-white border-border/60 hover:border-primary/40 hover:bg-primary/5"
                        }`}
                      >
                        <span className={`text-[9.5px] font-bold uppercase tracking-widest ${isOpen ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                          {format(d, "EEE", { locale: ptBR }).slice(0, 3)}
                        </span>
                        <span className={`text-xl sm:text-2xl font-extrabold tabular-nums leading-none mt-1 ${isOpen ? "" : "text-foreground"}`}>
                          {format(d, "dd")}
                        </span>
                        <span className={`text-[9.5px] font-bold uppercase tracking-widest mt-1 ${isOpen ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                          {format(d, "MMM", { locale: ptBR }).replace(".", "")}
                        </span>
                        <span className={`mt-1.5 h-1 w-1 rounded-full ${isOpen ? "bg-white" : "bg-primary"}`} />
                        {WxIcon && !isOpen && (
                          <WxIcon className="mt-1 h-3 w-3 text-primary/70" strokeWidth={2.4} />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>
        )}

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
                  destination={itinerary.destination}
                />
              ))}
            </div>
          </section>
        )}

        {/* ─── Agent Signature (horizontal, premium) ─── */}
        {(agentProfile || (itinerary as any).signature_snapshot) && (
          <div className="rounded-2xl border border-border/50 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
            <div className="flex items-center gap-3 sm:gap-4 px-3.5 sm:px-5 py-3 sm:py-4">
              {sig.photo_url ? (
                <img src={sig.photo_url} alt={sig.name}
                  className="h-12 w-12 sm:h-14 sm:w-14 rounded-full object-cover ring-2 ring-primary/10 shrink-0" />
              ) : (
                <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground text-base font-bold ring-2 ring-white shrink-0">
                  {sig.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm sm:text-base font-bold text-foreground leading-tight">
                  Precisa de ajuda?
                </p>
                <p className="text-[12px] sm:text-[13px] text-muted-foreground leading-snug truncate">
                  Fale com seu consultor de viagens.
                </p>
              </div>
              {whatsappUrl && (
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
                  className="hidden sm:inline-flex items-center gap-2 rounded-full bg-[#25D366] hover:bg-[#20BD5A] text-white px-4 py-2.5 font-bold text-[13px] shadow-md hover:shadow-lg transition-all duration-200 shrink-0">
                  <WhatsAppIcon className="h-4 w-4" />
                  Falar no WhatsApp
                </a>
              )}
              <button
                type="button"
                onClick={() => setAgentOpen((v) => !v)}
                className="shrink-0 h-9 w-9 rounded-full flex items-center justify-center hover:bg-muted/60 transition-colors"
                aria-label="Ver consultor"
              >
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-300 ${agentOpen ? "rotate-180" : ""}`} />
              </button>
            </div>
            <div className={`overflow-hidden transition-all duration-300 ${agentOpen ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"}`}>
              <div className="px-5 pb-5 pt-1 border-t border-border/40 space-y-3">
                <div className="space-y-0.5">
                  <p className="text-sm font-bold text-foreground">{sig.name}</p>
                  {sig.title && <p className="text-[12px] text-muted-foreground font-medium">{sig.title}</p>}
                  {!sig.title && agentProfile?.agency_name && <BrandText as="p" className="text-[12px] text-muted-foreground font-medium">{agentProfile.agency_name}</BrandText>}
                  {agentProfile && (agentProfile.city || agentProfile.state) && (
                    <p className="text-[11px] text-muted-foreground">{[agentProfile.city, agentProfile.state].filter(Boolean).join(", ")}</p>
                  )}
                  {sig.email && <p className="text-[11px] text-muted-foreground">{sig.email}</p>}
                  {sig.custom_message && <p className="text-[12px] text-muted-foreground italic pt-1">{sig.custom_message}</p>}
                </div>
                {whatsappUrl && (
                  <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
                    className="sm:hidden inline-flex items-center justify-center gap-2 rounded-full bg-[#25D366] hover:bg-[#20BD5A] text-white px-5 py-2.5 font-bold text-sm shadow-md w-full">
                    <WhatsAppIcon className="h-4 w-4" />
                    Falar no WhatsApp
                  </a>
                )}
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
