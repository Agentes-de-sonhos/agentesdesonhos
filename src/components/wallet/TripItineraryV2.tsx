import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, ExternalLink, Link2, Unlink, ImageIcon, MapPin, CalendarDays, Plus } from "lucide-react";
import { useState } from "react";
import { AttachItineraryDialog } from "./AttachItineraryDialog";
import { detachItineraryFromTrip } from "@/lib/roteiro-domain";
import { useToast } from "@/hooks/use-toast";
import { parseLocalDate } from "@/lib/dateParsing";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Trip } from "@/types/trip";

interface Props {
  trip: Trip;
}

/**
 * Roteiro V2 dentro da Carteira Digital — apenas card resumo.
 * A edição completa acontece na rota /ferramentas-ia/criar-roteiro/:id.
 */
export function TripItineraryV2({ trip }: Props) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [attachOpen, setAttachOpen] = useState(false);
  const [detachOpen, setDetachOpen] = useState(false);
  const [isDetaching, setIsDetaching] = useState(false);

  const itineraryId = trip.itinerary_id ?? null;

  const { data: summary, isLoading } = useQuery({
    queryKey: ["trip-itinerary-summary", itineraryId],
    queryFn: async () => {
      if (!itineraryId) return null;
      const { data: it, error } = await supabase
        .from("itineraries")
        .select("id, destination, start_date, end_date, status, cover_image_url, public_access_code, share_token")
        .eq("id", itineraryId)
        .maybeSingle();
      if (error) throw error;
      if (!it) return null;
      const { count } = await supabase
        .from("itinerary_days")
        .select("id", { count: "exact", head: true })
        .eq("itinerary_id", itineraryId);
      return { ...it, days_count: count ?? 0 };
    },
    enabled: !!itineraryId,
    staleTime: 60_000,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["trip", trip.id] });
    queryClient.invalidateQueries({ queryKey: ["trip-itinerary-summary", itineraryId] });
  };

  const handleOpen = () => {
    if (!itineraryId) return;
    navigate(`/ferramentas-ia/criar-roteiro/${itineraryId}?fromTrip=${trip.id}`);
  };

  const handleDetach = async () => {
    setIsDetaching(true);
    try {
      await detachItineraryFromTrip(trip.id);
      toast({ title: "Roteiro desvinculado", description: "A cópia foi preservada em Meus Roteiros." });
      invalidate();
      setDetachOpen(false);
    } catch (err: any) {
      toast({ title: "Erro ao desvincular", description: err.message, variant: "destructive" });
    } finally {
      setIsDetaching(false);
    }
  };

  // Estado: roteiro vinculado mas sumiu (estado inconsistente) → trata como "none"
  const isLinked = !!itineraryId && !!summary;
  const isInconsistent = !!itineraryId && !isLoading && !summary;

  // EMPTY STATE
  if (!itineraryId || isInconsistent) {
    return (
      <>
        <Card className="border-dashed">
          <CardContent className="py-8 flex flex-col items-center text-center gap-3">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
              <MapPin className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">Nenhum roteiro vinculado</p>
              <p className="text-xs text-muted-foreground mt-1">
                Vincule um roteiro existente ou crie um novo para esta viagem.
              </p>
              {isInconsistent && (
                <p className="text-xs text-destructive mt-1">
                  O roteiro anterior não foi encontrado.
                </p>
              )}
            </div>
            <Button size="sm" onClick={() => setAttachOpen(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              Vincular roteiro
            </Button>
          </CardContent>
        </Card>
        <AttachItineraryDialog
          trip={trip}
          open={attachOpen}
          onOpenChange={setAttachOpen}
          onAttached={invalidate}
        />
      </>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando roteiro…
      </div>
    );
  }

  // LINKED STATE — card resumo
  const start = summary!.start_date ? format(parseLocalDate(summary!.start_date), "dd 'de' MMM", { locale: ptBR }) : "";
  const end = summary!.end_date ? format(parseLocalDate(summary!.end_date), "dd 'de' MMM yyyy", { locale: ptBR }) : "";
  const isPublished = summary!.status === "published";

  return (
    <>
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="w-full sm:w-40 h-32 sm:h-28 rounded-md overflow-hidden bg-muted flex items-center justify-center shrink-0">
              {summary!.cover_image_url ? (
                <img src={summary!.cover_image_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <ImageIcon className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h4 className="text-base font-semibold truncate">{summary!.destination}</h4>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-0.5">
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {start} — {end}
                    </span>
                    <span>{summary!.days_count} {summary!.days_count === 1 ? "dia" : "dias"}</span>
                  </div>
                </div>
                <Badge variant={isPublished ? "default" : "secondary"} className="shrink-0">
                  {isPublished ? "Publicado" : "Rascunho"}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button size="sm" onClick={handleOpen}>
                  <ExternalLink className="h-4 w-4 mr-1.5" />
                  Abrir roteiro
                </Button>
                <Button size="sm" variant="outline" onClick={() => setAttachOpen(true)}>
                  <Link2 className="h-4 w-4 mr-1.5" />
                  Trocar
                </Button>
                <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setDetachOpen(true)}>
                  <Unlink className="h-4 w-4 mr-1.5" />
                  Desvincular
                </Button>
              </div>
              <p className="text-xs text-muted-foreground pt-1">
                A edição completa acontece no módulo Criar Roteiros. Esta carteira mostra apenas um resumo.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <AttachItineraryDialog
        trip={trip}
        open={attachOpen}
        onOpenChange={setAttachOpen}
        onAttached={invalidate}
      />

      <AlertDialog open={detachOpen} onOpenChange={setDetachOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desvincular roteiro?</AlertDialogTitle>
            <AlertDialogDescription>
              A cópia do roteiro será preservada em Meus Roteiros. Você pode vinculá-la novamente a qualquer momento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDetaching}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); handleDetach(); }} disabled={isDetaching}>
              {isDetaching ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
              Desvincular
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}