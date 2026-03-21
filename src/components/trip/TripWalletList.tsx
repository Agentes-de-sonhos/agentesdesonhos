import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { format, isAfter, isBefore, isWithinInterval, startOfDay } from "date-fns";

function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}
import { ptBR } from "date-fns/locale";
import {
  Wallet, Plus, MapPin, Calendar, ExternalLink, Copy, Trash2, Eye, Pencil, Lock, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useTrips } from "@/hooks/useTrips";
import { useToast } from "@/hooks/use-toast";
import type { Trip } from "@/types/trip";

type FilterType = "all" | "future" | "active" | "past";

function getTripStatus(trip: Trip): { label: string; variant: "default" | "secondary" | "outline" } {
  const today = startOfDay(new Date());
  const start = startOfDay(parseLocalDate(trip.start_date));
  const end = startOfDay(parseLocalDate(trip.end_date));

  if (isAfter(start, today)) return { label: "Futura", variant: "secondary" };
  if (isBefore(end, today)) return { label: "Concluída", variant: "outline" };
  return { label: "Em andamento", variant: "default" };
}

function filterTrips(trips: Trip[], filter: FilterType): Trip[] {
  if (filter === "all") return trips;
  const today = startOfDay(new Date());

  return trips.filter((trip) => {
    const start = startOfDay(parseLocalDate(trip.start_date));
    const end = startOfDay(parseLocalDate(trip.end_date));

    switch (filter) {
      case "future": return isAfter(start, today);
      case "active": return isWithinInterval(today, { start, end }) || start.getTime() === today.getTime();
      case "past": return isBefore(end, today);
      default: return true;
    }
  });
}

export function TripWalletList() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { trips, isLoading, deleteTrip } = useTrips();
  const [filter, setFilter] = useState<FilterType>("all");

  const filteredTrips = filterTrips(trips, filter);

  const handleCopyLink = (trip: Trip) => {
    const origin = PUBLIC_DOMAIN;
    const url = trip.slug 
      ? `${origin}/c/${trip.slug}`
      : trip.share_token 
        ? `${origin}/viagem/${trip.share_token}` 
        : '';
    if (!url) return;
    navigator.clipboard.writeText(url);
    toast({ title: "Link copiado!", description: "Link da carteira copiado para a área de transferência." });
  };

  const handleCopyPassword = (trip: Trip) => {
    if (!trip.access_password) return;
    navigator.clipboard.writeText(trip.access_password);
    toast({ title: "Senha copiada!", description: "Senha da carteira copiada." });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="font-display text-xl font-bold flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            Minhas Carteiras
          </h2>
          <p className="text-sm text-muted-foreground">{trips.length} carteira{trips.length !== 1 ? 's' : ''} criada{trips.length !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={() => navigate("/ferramentas-ia/trip-wallet/nova")}>
          <Plus className="mr-2 h-4 w-4" /> Nova Carteira
        </Button>
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterType)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">Todas</TabsTrigger>
          <TabsTrigger value="future">Futuras</TabsTrigger>
          <TabsTrigger value="active">Em andamento</TabsTrigger>
          <TabsTrigger value="past">Passadas</TabsTrigger>
        </TabsList>
      </Tabs>

      {filteredTrips.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Wallet className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">
              {filter === "all"
                ? "Nenhuma carteira criada ainda"
                : `Nenhuma carteira ${filter === "future" ? "futura" : filter === "active" ? "em andamento" : "passada"}`
              }
            </p>
            {filter === "all" && (
              <Button className="mt-4" onClick={() => navigate("/ferramentas-ia/trip-wallet/nova")}>
                <Plus className="mr-2 h-4 w-4" /> Criar primeira carteira
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filteredTrips.map((trip) => {
            const status = getTripStatus(trip);
            return (
              <Card key={trip.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-semibold truncate">{trip.client_name}</h3>
                        <Badge variant={status.variant} className="text-xs shrink-0">
                          {status.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" /> {trip.destination}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {format(parseLocalDate(trip.start_date), "dd/MM", { locale: ptBR })} - {format(parseLocalDate(trip.end_date), "dd/MM/yy", { locale: ptBR })}
                        </span>
                      </div>
                      {trip.access_password && (
                        <button
                          onClick={() => handleCopyPassword(trip)}
                          className="flex items-center gap-1 text-xs text-muted-foreground mt-1.5 hover:text-foreground transition-colors"
                        >
                          <Lock className="h-3 w-3" /> Senha: {trip.access_password}
                          <Copy className="h-3 w-3 ml-1" />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/ferramentas-ia/trip-wallet/${trip.id}`)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/ferramentas-ia/trip-wallet/${trip.id}?edit=true`)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleCopyLink(trip)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir carteira?</AlertDialogTitle>
                            <AlertDialogDescription>
                              A carteira de {trip.client_name} será excluída permanentemente, incluindo todos os serviços e documentos.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteTrip(trip.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
