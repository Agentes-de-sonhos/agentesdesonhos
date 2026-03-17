import { useParams } from "react-router-dom";
import { usePublicQuote } from "@/hooks/useQuotes";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2, MapPin, Calendar, Users, Baby, Plane, Hotel, Car, ArrowRightLeft, Ticket, Shield, Ship, Package } from "lucide-react";
import type { QuoteService, ServiceType } from "@/types/quote";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AgentProfile } from "@/hooks/useAgentProfile";

const SERVICE_LABELS: Record<ServiceType, string> = {
  flight: "Passagem Aérea",
  hotel: "Hospedagem",
  car_rental: "Locação de Veículo",
  transfer: "Transfer",
  attraction: "Ingressos/Atrações",
  insurance: "Seguro Viagem",
  cruise: "Cruzeiro",
  other: "Outros Serviços",
};

const SERVICE_ICONS: Record<ServiceType, React.ReactNode> = {
  flight: <Plane className="h-4 w-4" />,
  hotel: <Hotel className="h-4 w-4" />,
  car_rental: <Car className="h-4 w-4" />,
  transfer: <ArrowRightLeft className="h-4 w-4" />,
  attraction: <Ticket className="h-4 w-4" />,
  insurance: <Shield className="h-4 w-4" />,
  cruise: <Ship className="h-4 w-4" />,
  other: <Package className="h-4 w-4" />,
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatDate(dateStr: string) {
  try {
    return format(new Date(dateStr), "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return dateStr;
  }
}

function getServiceDetails(service: QuoteService): string[] {
  const data = service.service_data as any;
  const details: string[] = [];
  switch (service.service_type) {
    case "flight":
      details.push(`${data.origin_city} → ${data.destination_city}`);
      details.push(`Companhia: ${data.airline}`);
      details.push(`Ida: ${formatDate(data.departure_date)} | Volta: ${formatDate(data.return_date)}`);
      if (data.includes_baggage) details.push("✓ Bagagem incluída");
      if (data.includes_boarding_fee) details.push("✓ Taxa de embarque incluída");
      if (data.notes) details.push(`Obs: ${data.notes}`);
      break;
    case "hotel":
      details.push(`${data.hotel_name} — ${data.city}`);
      details.push(`Check-in: ${formatDate(data.check_in)} | Check-out: ${formatDate(data.check_out)}`);
      details.push(`Quarto: ${data.room_type} | Regime: ${data.meal_plan}`);
      if (data.notes) details.push(`Obs: ${data.notes}`);
      break;
    case "car_rental":
      details.push(`Tipo: ${data.car_type} | ${data.days} diária(s)`);
      details.push(`Retirada: ${data.pickup_location}`);
      details.push(`Devolução: ${data.dropoff_location}`);
      if (data.notes) details.push(`Obs: ${data.notes}`);
      break;
    case "transfer":
      details.push(`Tipo: ${data.transfer_type === "arrival" ? "Chegada" : "Saída"}`);
      details.push(`Local: ${data.location}`);
      details.push(`Data: ${formatDate(data.date)}`);
      break;
    case "attraction":
      details.push(data.name);
      details.push(`Data: ${formatDate(data.date)} | Quantidade: ${data.quantity}`);
      break;
    case "insurance":
      details.push(`Seguradora: ${data.provider}`);
      details.push(`Período: ${formatDate(data.start_date)} a ${formatDate(data.end_date)}`);
      details.push(`Cobertura: ${data.coverage}`);
      break;
    case "cruise":
      details.push(`Navio: ${data.ship_name}`);
      details.push(`Rota: ${data.route}`);
      details.push(`Período: ${formatDate(data.start_date)} a ${formatDate(data.end_date)}`);
      details.push(`Cabine: ${data.cabin_type}`);
      break;
    case "other":
      details.push(data.description);
      break;
  }
  return details;
}

function ServiceCard({ service }: { service: QuoteService }) {
  const type = service.service_type as ServiceType;
  const details = getServiceDetails(service);
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            {SERVICE_ICONS[type]}
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {SERVICE_LABELS[type]}
          </span>
        </div>
        <span className="text-lg font-bold text-primary whitespace-nowrap">
          {formatCurrency(service.amount)}
        </span>
      </div>
      <div className="space-y-1 pl-[46px]">
        {details.map((d, i) => (
          <p key={i} className="text-sm text-muted-foreground leading-relaxed">{d}</p>
        ))}
      </div>
    </div>
  );
}

export default function OrcamentoPublico() {
  const { token } = useParams<{ token: string }>();
  const { quote, isLoading } = usePublicQuote(token);

  // Fetch agent profile from the quote's user_id
  const { data: agentProfile } = useQuery({
    queryKey: ["agent-profile-public", quote?.user_id],
    queryFn: async () => {
      if (!quote?.user_id) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("name, phone, avatar_url, agency_name, agency_logo_url, city, state")
        .eq("user_id", quote.user_id)
        .maybeSingle();
      if (error || !data) return null;
      return data as AgentProfile;
    },
    enabled: !!quote?.user_id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Orçamento não encontrado</h1>
          <p className="text-muted-foreground">Este link pode ter expirado ou não é válido.</p>
        </div>
      </div>
    );
  }

  const startDate = new Date(quote.start_date);
  const endDate = new Date(quote.end_date);
  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  const whatsappNumber = agentProfile?.phone?.replace(/\D/g, "") || "";
  const whatsappMessage = encodeURIComponent(
    `Olá! Vi o orçamento para ${quote.destination} e gostaria de mais informações.`
  );
  const whatsappUrl = whatsappNumber
    ? `https://wa.me/${whatsappNumber.startsWith("55") ? whatsappNumber : `55${whatsappNumber}`}?text=${whatsappMessage}`
    : "";

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/30 via-background to-muted/20">
      {/* Agency Header */}
      <header className="border-b border-border/40 bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-center">
          {agentProfile?.agency_logo_url ? (
            <img
              src={agentProfile.agency_logo_url}
              alt={agentProfile.agency_name || "Agência"}
              className="h-10 max-w-[180px] object-contain"
            />
          ) : (
            <p className="text-lg font-semibold text-foreground">
              {agentProfile?.agency_name || "Agentes de Sonhos"}
            </p>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        {/* Hero Section */}
        <div className="text-center space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Proposta de Viagem
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground leading-tight">
            {quote.destination}
          </h1>
          <p className="text-muted-foreground">
            Preparado especialmente para <span className="font-semibold text-foreground">{quote.client_name}</span>
          </p>
        </div>

        {/* Trip Overview Card */}
        <div className="rounded-2xl border border-border/60 bg-card p-6 grid grid-cols-2 sm:grid-cols-4 gap-5">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">Destino</span>
            </div>
            <p className="text-sm font-semibold">{quote.destination}</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">Período</span>
            </div>
            <p className="text-sm font-semibold">
              {formatDate(quote.start_date)} — {formatDate(quote.end_date)}
            </p>
            <p className="text-xs text-muted-foreground">{days} dias</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">Adultos</span>
            </div>
            <p className="text-sm font-semibold">{quote.adults_count}</p>
          </div>
          {quote.children_count > 0 && (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Baby className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">Crianças</span>
              </div>
              <p className="text-sm font-semibold">{quote.children_count}</p>
            </div>
          )}
        </div>

        {/* Services */}
        {quote.services && quote.services.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-lg font-bold text-foreground">Serviços Incluídos</h2>
            <div className="space-y-3">
              {quote.services.map((service) => (
                <ServiceCard key={service.id} service={service} />
              ))}
            </div>
          </section>
        )}

        {/* Total */}
        <div className="rounded-2xl bg-primary text-primary-foreground p-6 sm:p-8 text-center space-y-2">
          <p className="text-sm font-medium opacity-80">Investimento Total</p>
          <p className="text-4xl sm:text-5xl font-extrabold tracking-tight">
            {formatCurrency(quote.total_amount)}
          </p>
          {quote.services && quote.services.length > 0 && (
            <p className="text-sm opacity-70">{quote.services.length} serviço(s) incluído(s)</p>
          )}
        </div>

        {/* Validity */}
        <p className="text-center text-xs text-muted-foreground">
          Este orçamento é válido por 7 dias. Valores sujeitos a alteração conforme disponibilidade.
        </p>

        {/* Agent Signature */}
        {agentProfile && (
          <div className="rounded-2xl border border-border/60 bg-card p-6 sm:p-8">
            <div className="flex flex-col items-center text-center space-y-4">
              {agentProfile.avatar_url ? (
                <img
                  src={agentProfile.avatar_url}
                  alt={agentProfile.name}
                  className="h-20 w-20 rounded-full object-cover border-4 border-primary/10 shadow-lg"
                />
              ) : (
                <div className="h-20 w-20 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground text-2xl font-bold shadow-lg">
                  {agentProfile.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <p className="text-lg font-bold text-foreground">{agentProfile.name}</p>
                {agentProfile.agency_name && (
                  <p className="text-sm text-muted-foreground">{agentProfile.agency_name}</p>
                )}
                {(agentProfile.city || agentProfile.state) && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {[agentProfile.city, agentProfile.state].filter(Boolean).join(", ")}
                  </p>
                )}
              </div>
              {whatsappUrl && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2.5 rounded-full bg-[#25D366] hover:bg-[#20BD5A] text-white px-6 py-3 font-semibold text-sm shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  Falar com seu agente
                </a>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Mobile floating WhatsApp button */}
      {whatsappUrl && (
        <div className="fixed bottom-6 right-6 sm:hidden z-20">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-2xl hover:scale-110 transition-transform"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
          </a>
        </div>
      )}
    </div>
  );
}