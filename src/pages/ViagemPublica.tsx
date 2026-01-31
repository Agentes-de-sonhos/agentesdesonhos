import { useParams } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Wallet, MapPin, Calendar, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TripServiceList } from "@/components/trip/TripServiceCard";
import { generateTripPDF } from "@/components/trip/TripPDF";
import { usePublicTrip } from "@/hooks/useTrips";

export default function ViagemPublica() {
  const { token } = useParams();
  const { trip, agentProfile, isLoading } = usePublicTrip(token);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <h1 className="text-xl font-bold mb-2">Viagem não encontrada</h1>
            <p className="text-muted-foreground">
              O link pode ter expirado ou a viagem foi removida.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const startDate = new Date(trip.start_date);
  const endDate = new Date(trip.end_date);
  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30">
      <div className="container max-w-4xl mx-auto py-8 px-4">
        {/* Agency Logo Header */}
        {agentProfile?.agency_logo_url ? (
          <div className="text-center mb-6">
            <img 
              src={agentProfile.agency_logo_url} 
              alt={agentProfile.agency_name || 'Logo'}
              className="h-16 max-w-48 object-contain mx-auto"
            />
          </div>
        ) : agentProfile?.agency_name ? (
          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold text-primary">{agentProfile.agency_name}</h2>
          </div>
        ) : null}

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Wallet className="h-8 w-8 text-primary" />
          </div>
          <h1 className="font-display text-3xl font-bold text-primary mb-2">
            Trip Wallet
          </h1>
          <p className="text-muted-foreground">
            Organizador de Viagem
          </p>
        </div>

        {/* Trip Info */}
        <Card className="mb-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="pt-6">
            <h2 className="text-2xl font-bold mb-4">{trip.client_name}</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Destino</p>
                  <p className="font-medium">{trip.destination}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Período</p>
                  <p className="font-medium">
                    {format(startDate, "dd/MM", { locale: ptBR })} - {format(endDate, "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Duração</p>
                  <p className="font-medium">{days} dias</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Services */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Serviços da Viagem</CardTitle>
          </CardHeader>
          <CardContent>
            <TripServiceList 
              services={trip.services || []} 
              showActions={false}
              groupByType={true}
            />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-center">
          <Button size="lg" onClick={() => generateTripPDF(trip, agentProfile)}>
            <FileText className="mr-2 h-5 w-5" />
            Baixar PDF
          </Button>
        </div>

        {/* Agent Signature Footer */}
        <div className="mt-12 pt-6 border-t">
          {agentProfile ? (
            <div className="flex items-center justify-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={agentProfile.avatar_url || undefined} />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {agentProfile.name?.charAt(0).toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
              <div className="text-left">
                <p className="font-semibold">{agentProfile.name}</p>
                {agentProfile.phone && (
                  <p className="text-sm text-muted-foreground">📱 {agentProfile.phone}</p>
                )}
                {agentProfile.agency_name && (
                  <p className="text-sm text-muted-foreground">{agentProfile.agency_name}</p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-center text-sm text-muted-foreground">
              Agentes de Sonhos • Sua viagem começa aqui
            </p>
          )}
        </div>

        {/* Platform Branding */}
        <div className="mt-8 text-center">
          <p className="text-xs text-muted-foreground/60">
            Desenvolvido por{" "}
            <span className="font-medium text-muted-foreground/80">
              Nobre Digital Hub
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
