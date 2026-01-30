import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { Itinerary, ItineraryDay, Activity } from "@/types/itinerary";
import { MapPin, Calendar, Users, Sun, Sunset, Moon, Clock, DollarSign, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const periodIcons = {
  manha: Sun,
  tarde: Sunset,
  noite: Moon,
};

const periodLabels = {
  manha: "Manhã",
  tarde: "Tarde",
  noite: "Noite",
};

const tripTypeLabels: Record<string, string> = {
  familia: "Viagem em Família",
  casal: "Viagem de Casal",
  lua_de_mel: "Lua de Mel",
  sozinho: "Viagem Solo",
  corporativo: "Viagem Corporativa",
};

const budgetLabels: Record<string, string> = {
  economico: "Econômico ⭐⭐⭐",
  conforto: "Conforto ⭐⭐⭐⭐",
  luxo: "Luxo ⭐⭐⭐⭐⭐",
};

export default function RoteiroPublico() {
  const { token } = useParams();
  const [itinerary, setItinerary] = useState<(Itinerary & { days: ItineraryDay[] }) | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      loadItinerary(token);
    }
  }, [token]);

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

      const daysWithActivities = await Promise.all(
        (days || []).map(async (day) => {
          const { data: activities } = await supabase
            .from("itinerary_activities")
            .select("*")
            .eq("day_id", day.id)
            .order("order_index", { ascending: true });

          return {
            id: day.id as string,
            dayNumber: day.day_number as number,
            date: day.date as string,
            activities: (activities || []).map((a) => ({
              id: a.id as string,
              period: a.period as Activity["period"],
              title: a.title as string,
              description: a.description as string | null,
              location: a.location as string | null,
              estimatedDuration: a.estimated_duration as string | null,
              estimatedCost: a.estimated_cost as string | null,
              orderIndex: a.order_index as number,
              isApproved: a.is_approved as boolean,
            })),
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2">
            <MapPin className="h-5 w-5 text-primary" />
            <span className="font-medium text-primary">Roteiro de Viagem</span>
          </div>
          <h1 className="font-display text-4xl font-bold text-foreground md:text-5xl">
            {itinerary.destination}
          </h1>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {format(new Date(itinerary.startDate), "dd 'de' MMM", { locale: ptBR })} -{" "}
              {format(new Date(itinerary.endDate), "dd 'de' MMM 'de' yyyy", { locale: ptBR })}
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {itinerary.travelersCount} viajante(s)
            </span>
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Badge variant="secondary">{tripTypeLabels[itinerary.tripType]}</Badge>
            <Badge variant="outline">{budgetLabels[itinerary.budgetLevel]}</Badge>
          </div>
        </div>

        {/* Days */}
        <div className="space-y-6">
          {itinerary.days.map((day) => (
            <Card key={day.id}>
              <CardHeader className="bg-gradient-to-r from-primary/10 to-transparent">
                <CardTitle>Dia {day.dayNumber}</CardTitle>
                <CardDescription>
                  {format(new Date(day.date), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-6">
                  {(["manha", "tarde", "noite"] as const).map((period) => {
                    const activities = day.activities.filter((a) => a.period === period);
                    if (activities.length === 0) return null;
                    const Icon = periodIcons[period];

                    return (
                      <div key={period}>
                        <div className="mb-3 flex items-center gap-2 font-medium text-primary">
                          <Icon className="h-5 w-5" />
                          {periodLabels[period]}
                        </div>
                        <div className="space-y-3 pl-7">
                          {activities.map((activity) => (
                            <div
                              key={activity.id}
                              className="rounded-lg border bg-card p-4"
                            >
                              <h4 className="font-semibold">{activity.title}</h4>
                              {activity.description && (
                                <p className="mt-1 text-sm text-muted-foreground">
                                  {activity.description}
                                </p>
                              )}
                              <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
                                {activity.location && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="h-4 w-4" />
                                    {activity.location}
                                  </span>
                                )}
                                {activity.estimatedDuration && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-4 w-4" />
                                    {activity.estimatedDuration}
                                  </span>
                                )}
                                {activity.estimatedCost && (
                                  <span className="flex items-center gap-1">
                                    <DollarSign className="h-4 w-4" />
                                    {activity.estimatedCost}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-sm text-muted-foreground">
          <p>Roteiro criado com ❤️ por Agentes de Sonhos</p>
        </div>
      </div>
    </div>
  );
}
