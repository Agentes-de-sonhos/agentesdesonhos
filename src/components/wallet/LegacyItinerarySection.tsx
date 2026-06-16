import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { TripItinerary } from "@/components/trip/itinerary/TripItinerary";
import { TripItineraryV2 } from "@/components/wallet/TripItineraryV2";
import type { Trip } from "@/types/trip";

interface Props {
  trip: Trip;
  onRequestAddService: () => void;
}

/**
 * Renderiza o roteiro legacy da carteira.
 * Se NÃO houver nenhuma atividade legada cadastrada, oferece
 * um botão para atualizar a carteira para o Roteiro V2.
 */
export function LegacyItinerarySection({ trip, onRequestAddService }: Props) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [upgrading, setUpgrading] = useState(false);

  const { data: legacyCount, isLoading } = useQuery({
    queryKey: ["trip-legacy-activity-count", trip.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("trip_itinerary_activities")
        .select("id", { count: "exact", head: true })
        .eq("trip_id", trip.id);
      if (error) throw error;
      return count ?? 0;
    },
    staleTime: 30_000,
  });

  const handleUpgrade = async () => {
    setUpgrading(true);
    try {
      const { error } = await supabase
        .from("trips")
        .update({ itinerary_mode: "none" })
        .eq("id", trip.id);
      if (error) throw error;
      toast({
        title: "Carteira atualizada",
        description: "Agora você pode vincular ou criar um Roteiro na nova versão.",
      });
      queryClient.invalidateQueries({ queryKey: ["trip", trip.id] });
      queryClient.invalidateQueries({ queryKey: ["trips"] });
    } catch (err: any) {
      toast({
        title: "Erro ao atualizar",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setUpgrading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando roteiro…
      </div>
    );
  }

  // Sem atividades legadas → oferece upgrade
  if ((legacyCount ?? 0) === 0) {
    return (
      <Card className="border-dashed border-primary/40 bg-primary/5">
        <CardContent className="py-6 flex flex-col items-center text-center gap-3">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold">Nova versão do Roteiro disponível</p>
            <p className="text-xs text-muted-foreground max-w-md">
              Esta carteira está usando o formato antigo de Roteiro, mas ainda não tem
              nenhuma atividade cadastrada. Atualize para a nova versão e tenha acesso
              ao editor completo, mapas, fotos e documentos por dia.
            </p>
          </div>
          <Button size="sm" onClick={handleUpgrade} disabled={upgrading}>
            {upgrading ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-1.5" />
            )}
            Atualizar para a nova versão
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Tem atividades legadas → mantém o roteiro antigo
  return (
    <TripItinerary
      tripId={trip.id}
      destination={trip.destination}
      startDate={trip.start_date}
      endDate={trip.end_date}
      services={trip.services || []}
      onRequestAddService={onRequestAddService}
    />
  );
}

// Re-export for convenience in TripWallet
export { TripItineraryV2 };