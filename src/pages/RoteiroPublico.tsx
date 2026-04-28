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
  ChevronDown, Briefcase, FileText, Download, Eye, ExternalLink,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import type { AgentProfile } from "@/hooks/useAgentProfile";

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
  day, periodImages, isOpen, onToggle,
}: {
  day: ItineraryDay; periodImages: Record<string, string>; isOpen: boolean; onToggle: () => void;
}) {
  const dateFormatted = format(parseLocalDate(day.date), "EEEE, dd 'de' MMMM", { locale: ptBR });

  return (
    <div className="rounded-2xl border border-border/40 bg-card overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-border/80">
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
        <ChevronDown className={`h-5 w-5 opacity-60 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
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
                    <div key={activity.id} className="rounded-xl border border-border/40 bg-white p-4 space-y-3">
                      <h4 className="font-semibold text-foreground">{activity.title}</h4>
                      {activity.description && (
                        <p className="text-sm text-muted-foreground leading-relaxed">{activity.description}</p>
                      )}
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* ─── Premium Agency Header ─── */}
      <header className="border-b border-border/30 bg-white/90 backdrop-blur-md sticky top-0 z-10 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-6 flex items-center justify-center">
          {agentProfile?.agency_logo_url ? (
            <img
              src={agentProfile.agency_logo_url}
               alt={agentProfile.agency_name || "Agência"}
               translate="no"
              className="h-16 sm:h-20 max-w-[280px] object-contain"
            />
          ) : (
            <div className="flex items-center gap-3">
              <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Briefcase className="h-7 w-7 text-primary" />
              </div>
              <BrandText as="span" className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                {agentProfile?.agency_name || "Roteiro de Viagem"}
              </BrandText>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10 space-y-10">
        {/* ─── Hero Section ─── */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-primary">
            <MapPin className="h-3.5 w-3.5" />
            Roteiro de Viagem
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-foreground leading-tight tracking-tight">
            {itinerary.destination}
          </h1>
          <div className="flex flex-wrap items-center justify-center gap-4 text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {format(parseLocalDate(itinerary.startDate), "dd 'de' MMM", { locale: ptBR })} –{" "}
              {format(parseLocalDate(itinerary.endDate), "dd 'de' MMM 'de' yyyy", { locale: ptBR })}
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
        </div>

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
                  onToggle={() => setOpenDayIndex(prev => prev === index ? null : index)}
                />
              ))}
            </div>
          </section>
        )}

        {/* ─── Agent Signature ─── */}
        {agentProfile && (
          <div className="rounded-2xl border border-border/40 bg-white shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-muted/50 to-muted/20 px-6 py-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground text-center">Seu consultor de viagens</p>
            </div>
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
