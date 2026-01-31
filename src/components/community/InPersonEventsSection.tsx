import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar, Building, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { InPersonEvent } from "@/types/community";

interface InPersonEventsSectionProps {
  events: InPersonEvent[];
}

export function InPersonEventsSection({ events }: InPersonEventsSectionProps) {
  if (events.length === 0) {
    return (
      <section>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Building className="h-5 w-5 text-primary" />
          Encontros Presenciais Mensais
        </h2>
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Nenhum encontro presencial agendado.
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <section>
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <Building className="h-5 w-5 text-primary" />
        Encontros Presenciais Mensais
      </h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {events.map((event) => (
          <Card key={event.id} className="overflow-hidden hover:shadow-lg transition-shadow">
            {event.image_url && (
              <div className="h-32 overflow-hidden">
                <img
                  src={event.image_url}
                  alt={event.theme}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline">{event.city}</Badge>
              </div>
              <CardTitle className="text-lg mt-2">{event.theme}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>{format(new Date(event.event_date), "dd 'de' MMMM, yyyy", { locale: ptBR })}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{event.location}</span>
              </div>
              <Button
                className="w-full mt-2"
                onClick={() => event.registration_url && window.open(event.registration_url, "_blank")}
                disabled={!event.registration_url}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Inscrever-se
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
