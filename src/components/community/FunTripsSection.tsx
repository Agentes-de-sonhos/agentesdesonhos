import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar, Users, Building2, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { FunTrip } from "@/types/community";

interface FunTripsSectionProps {
  trips: FunTrip[];
}

export function FunTripsSection({ trips }: FunTripsSectionProps) {
  if (trips.length === 0) {
    return (
      <section>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          FunTrips & Oportunidades Exclusivas
        </h2>
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Nenhuma oportunidade disponível no momento.
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <section>
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <MapPin className="h-5 w-5 text-primary" />
        FunTrips & Oportunidades Exclusivas
      </h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {trips.map((trip) => (
          <Card key={trip.id} className="overflow-hidden hover:shadow-lg transition-shadow">
            {trip.image_url && (
              <div className="h-40 overflow-hidden">
                <img
                  src={trip.image_url}
                  alt={trip.destination}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">{trip.destination}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>{format(new Date(trip.trip_date), "dd 'de' MMMM, yyyy", { locale: ptBR })}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>{trip.available_spots} vagas disponíveis</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Building2 className="h-4 w-4" />
                <Badge variant="secondary">{trip.partner_company}</Badge>
              </div>
              {trip.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {trip.description}
                </p>
              )}
              <Button
                className="w-full mt-2"
                onClick={() => trip.registration_url && window.open(trip.registration_url, "_blank")}
                disabled={!trip.registration_url || trip.available_spots === 0}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Quero participar
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
