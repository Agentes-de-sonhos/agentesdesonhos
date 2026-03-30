import { useState } from "react";
import { useParams } from "react-router-dom";
import { usePublicQuote } from "@/hooks/useQuotes";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2, MapPin, Calendar, Users, Plane, Hotel, Car, ArrowRightLeft, Ticket, Shield, Ship, Package, Briefcase, CreditCard, Tag, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { QuoteService, ServiceType } from "@/types/quote";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AgentProfile } from "@/hooks/useAgentProfile";
import { ServiceImageCarousel } from "@/components/quote/ServiceImageCarousel";
import { extractServicePaymentConfig, getServicePaymentDisplay } from "@/lib/servicePayment";
import { formatQuoteCurrency, getQuoteCurrencyInfo, getCurrencySymbol, type QuoteCurrency } from "@/lib/quoteCurrency";
import { DestinationIntroPublic } from "@/components/quote/DestinationIntroPublic";

const SERVICE_LABELS: Record<ServiceType, string> = {
  flight: "Passagem Aérea", hotel: "Hospedagem", car_rental: "Locação de Veículo",
  transfer: "Transfer", attraction: "Ingressos/Atrações", insurance: "Seguro Viagem",
  cruise: "Cruzeiro", other: "Outros Serviços",
};

const SERVICE_ICONS: Record<ServiceType, React.ReactNode> = {
  flight: <Plane className="h-5 w-5" />, hotel: <Hotel className="h-5 w-5" />,
  car_rental: <Car className="h-5 w-5" />, transfer: <ArrowRightLeft className="h-5 w-5" />,
  attraction: <Ticket className="h-5 w-5" />, insurance: <Shield className="h-5 w-5" />,
  cruise: <Ship className="h-5 w-5" />, other: <Package className="h-5 w-5" />,
};

const SERVICE_COLORS: Record<ServiceType, string> = {
  flight: "from-primary/15 to-primary/5 text-primary",
  hotel: "from-amber-500/15 to-amber-600/5 text-amber-600",
  car_rental: "from-emerald-500/15 to-emerald-600/5 text-emerald-600",
  transfer: "from-violet-500/15 to-violet-600/5 text-violet-600",
  attraction: "from-pink-500/15 to-pink-600/5 text-pink-600",
  insurance: "from-cyan-500/15 to-cyan-600/5 text-cyan-600",
  cruise: "from-primary/10 to-primary/5 text-primary",
  other: "from-muted to-muted/50 text-muted-foreground",
};

let quoteCurrency: QuoteCurrency = 'BRL';

function formatCurrency(value: number, currency?: QuoteCurrency) {
  return formatQuoteCurrency(value, currency ?? quoteCurrency);
}

function formatLabel(value: string) {
  if (!value) return value;
  return value.replace(/_/g, " ").replace(/^\w/, c => c.toUpperCase());
}

function parseLocalDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatDate(dateStr: string) {
  try { return format(parseLocalDate(dateStr), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }); } catch { return dateStr; }
}

function formatDateShort(dateStr: string) {
  try { return format(parseLocalDate(dateStr), "dd/MM/yyyy", { locale: ptBR }); } catch { return dateStr; }
}

function getServiceSummary(service: QuoteService): string {
  const data = service.service_data as any;
  switch (service.service_type) {
    case "flight": return `${data.airline} | ${data.origin_city} → ${data.destination_city}`;
    case "hotel": return `${data.hotel_name} — ${data.city}`;
    case "car_rental": return `${data.car_type} | ${data.days} diária(s)`;
    case "transfer": return `${data.transfer_type === "arrival" ? "Chegada" : "Saída"} — ${data.location}`;
    case "attraction": return [data.product_name, data.ticket_type].filter(Boolean).join(" | ") || data.name;
    case "insurance": return data.provider;
    case "cruise": return `${data.ship_name} — ${data.route}`;
    case "other": return data.description || "Outros Serviços";
    default: return "Serviço";
  }
}

function getServiceName(service: QuoteService): string {
  const data = service.service_data as any;
  switch (service.service_type) {
    case "flight": return `${data.airline} — ${data.origin_city} → ${data.destination_city}`;
    case "hotel": return data.hotel_name;
    case "car_rental": return data.car_type;
    case "transfer": return data.location;
    case "attraction": return data.product_name || data.name;
    case "insurance": return data.provider;
    case "cruise": return data.ship_name;
    case "other": return data.description || "Outros Serviços";
    default: return "Serviço";
  }
}

function getServiceDetails(service: QuoteService): string[] {
  const data = service.service_data as any;
  const details: string[] = [];
  switch (service.service_type) {
    case "flight":
      details.push(`Ida: ${formatDateShort(data.departure_date)} | Volta: ${formatDateShort(data.return_date)}`);
      // Multi-leg support (backward compat)
      const outLegs = data.outbound_legs?.length ? data.outbound_legs : data.outbound_detail ? [data.outbound_detail] : [];
      const retLegs = data.return_legs?.length ? data.return_legs : data.return_detail ? [data.return_detail] : [];
      outLegs.forEach((ob: any, i: number) => {
        const parts: string[] = [];
        if (ob.flight_number) parts.push(`Voo ${ob.flight_number}`);
        if (ob.airport_origin && ob.airport_destination) parts.push(`${ob.airport_origin} → ${ob.airport_destination}`);
        if (ob.departure_time) parts.push(`Saída ${ob.departure_time}`);
        if (ob.arrival_time) parts.push(`Chegada ${ob.arrival_time}`);
        const label = outLegs.length > 1 ? `✈ Ida (trecho ${i + 1})` : `✈ Ida`;
        if (parts.length) details.push(`${label}: ${parts.join(" | ")}`);
      });
      retLegs.forEach((rt: any, i: number) => {
        const parts: string[] = [];
        if (rt.flight_number) parts.push(`Voo ${rt.flight_number}`);
        if (rt.airport_origin && rt.airport_destination) parts.push(`${rt.airport_origin} → ${rt.airport_destination}`);
        if (rt.departure_time) parts.push(`Saída ${rt.departure_time}`);
        if (rt.arrival_time) parts.push(`Chegada ${rt.arrival_time}`);
        const label = retLegs.length > 1 ? `✈ Volta (trecho ${i + 1})` : `✈ Volta`;
        if (parts.length) details.push(`${label}: ${parts.join(" | ")}`);
      });
      if (data.includes_baggage) details.push("✓ Bagagem incluída");
      if (data.includes_boarding_fee) details.push("✓ Taxa de embarque incluída");
      if (data.notes) details.push(data.notes);
      break;
    case "hotel":
      details.push(`Check-in: ${formatDateShort(data.check_in)} | Check-out: ${formatDateShort(data.check_out)}`);
      details.push(`Quarto: ${formatLabel(data.room_type)} | Regime: ${formatLabel(data.meal_plan)}`);
      if (data.notes) details.push(data.notes);
      break;
    case "car_rental":
      details.push(`Retirada: ${data.pickup_location}`);
      details.push(`Devolução: ${data.dropoff_location}`);
      if (data.notes) details.push(data.notes);
      break;
    case "transfer":
      details.push(`Local: ${data.location}`);
      details.push(`Data: ${formatDateShort(data.date)}`);
      break;
    case "attraction":
      if (data.ticket_type) details.push(`Tipo: ${data.ticket_type}`);
      details.push(`Data: ${formatDateShort(data.date)} | Qtd: ${data.quantity || 1}`);
      if (data.adult_price > 0) details.push(`Adulto: ${getCurrencySymbol(quoteCurrency)} ${Number(data.adult_price).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`);
      if (data.child_price > 0) details.push(`Criança: ${getCurrencySymbol(quoteCurrency)} ${Number(data.child_price).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`);
      break;
    case "insurance":
      details.push(`Seguradora: ${data.provider}`);
      details.push(`${formatDateShort(data.start_date)} a ${formatDateShort(data.end_date)}`);
      details.push(`Cobertura: ${data.coverage}`);
      break;
    case "cruise":
      details.push(`Navio: ${data.ship_name}`);
      details.push(`Rota: ${data.route}`);
      details.push(`${formatDateShort(data.start_date)} a ${formatDateShort(data.end_date)}`);
      details.push(`Cabine: ${data.cabin_type}`);
      break;
    case "other":
      if (data.description) details.push(data.description);
      break;
  }
  return details;
}

function CollapsibleServiceCard({
  service, showPrice, isOpen, onToggle, showPaymentPerService = false,
}: {
  service: QuoteService; showPrice: boolean; isOpen: boolean; onToggle: () => void; showPaymentPerService?: boolean;
}) {
  const type = service.service_type as ServiceType;
  const details = getServiceDetails(service);
  const colorClass = SERVICE_COLORS[type] || SERVICE_COLORS.other;
  const summary = getServiceSummary(service);

  return (
    <div className="rounded-2xl border border-border/40 bg-card overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-border/80">
      {/* Clickable header */}
      <button
        type="button"
        onClick={onToggle}
        className={`w-full bg-gradient-to-r ${colorClass} px-5 py-3 flex items-center justify-between cursor-pointer transition-colors`}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/80 shadow-sm">
            {SERVICE_ICONS[type]}
          </div>
          <div className="flex flex-col items-start gap-0.5">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold uppercase tracking-wide">{SERVICE_LABELS[type]}</span>
              {service.option_label && (
                <Badge variant="secondary" className="text-xs gap-1 bg-white/60">
                  <Tag className="h-3 w-3" />
                  {service.option_label}
                </Badge>
              )}
            </div>
            <span className="text-xs opacity-70 font-medium break-words whitespace-pre-wrap text-left">
              {summary}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {showPrice && (
            <span className="text-lg font-extrabold whitespace-nowrap">{formatCurrency(service.amount)}</span>
          )}
          <ChevronDown className={`h-5 w-5 opacity-60 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
        </div>
      </button>
      {/* Collapsible body */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out`}
        style={{ maxHeight: isOpen ? "2000px" : "0px", opacity: isOpen ? 1 : 0 }}
      >
        <div className="px-5 py-4 space-y-3">
          {isOpen && (() => {
            const imgs = (service as any).image_urls?.length ? (service as any).image_urls : (service.image_url ? [service.image_url] : []);
            return imgs.length > 0 ? (
              <ServiceImageCarousel images={imgs} alt={SERVICE_LABELS[type]} />
            ) : null;
          })()}
          {isOpen && (
            <p className="text-base font-semibold text-foreground">{getServiceName(service)}</p>
          )}
          {isOpen && details.map((d, i) => (
            <p key={i} className="text-sm text-muted-foreground leading-relaxed">{d}</p>
          ))}
          {isOpen && service.description && (
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap break-words overflow-wrap-anywhere">
              {service.description}
            </p>
          )}
          {isOpen && service.service_type === "attraction" && (service.service_data as any)?.notes && (
            <p className="text-sm text-muted-foreground border-l-2 border-primary/20 pl-3 mt-2 italic whitespace-pre-wrap break-words overflow-wrap-anywhere">
              {(service.service_data as any).notes}
            </p>
          )}
          {/* Per-service payment display */}
          {isOpen && showPaymentPerService && (() => {
            const payConfig = extractServicePaymentConfig(service);
            if (!payConfig.is_custom_payment) return null;
            const display = getServicePaymentDisplay(service.amount, payConfig);
            if (!display) return null;
            return (
              <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/30">
                <CreditCard className="h-4 w-4 text-primary/70" />
                <span className="text-sm font-medium text-primary">{display}</span>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

export default function OrcamentoPublico({ tokenOverride }: { tokenOverride?: string } = {}) {
  const params = useParams<{ token: string }>();
  const token = tokenOverride ?? params.token;
  const { quote, isLoading } = usePublicQuote(token);
  const [openServiceIndex, setOpenServiceIndex] = useState<number | null>(0);

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

  // Set module-level currency for helper functions
  const { currency: qCurrency } = getQuoteCurrencyInfo(quote);
  quoteCurrency = qCurrency;

  const showDetailedPrices = (quote as any).show_detailed_prices !== false;
  const paymentTerms = (quote as any).payment_terms as string | null;
  const validUntil = (quote as any).valid_until as string | null;
  const validityDisclaimer = (quote as any).validity_disclaimer as string | null;
  const useServicePayment = (quote as any).use_service_payment ?? false;
  const startDate = parseLocalDate(quote.start_date);
  const endDate = parseLocalDate(quote.end_date);
  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  const whatsappNumber = agentProfile?.phone?.replace(/\D/g, "") || "";
  const whatsappMessage = encodeURIComponent(`Olá! Vi o orçamento para ${quote.destination} e gostaria de mais informações.`);
  const whatsappUrl = whatsappNumber
    ? `https://wa.me/${whatsappNumber.startsWith("55") ? whatsappNumber : `55${whatsappNumber}`}?text=${whatsappMessage}`
    : "";

  const handleToggleService = (index: number) => {
    setOpenServiceIndex(prev => prev === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* ─── Premium Agency Header with large logo ─── */}
      <header className="border-b border-border/30 bg-white/90 backdrop-blur-md sticky top-0 z-10 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-6 flex items-center justify-center">
          {agentProfile?.agency_logo_url ? (
            <img
              src={agentProfile.agency_logo_url}
              alt={agentProfile.agency_name || "Agência"}
              className="h-16 sm:h-20 max-w-[280px] object-contain"
            />
          ) : (
            <div className="flex items-center gap-3">
              <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Briefcase className="h-7 w-7 text-primary" />
              </div>
              <span className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                {agentProfile?.agency_name || "Proposta de Viagem"}
              </span>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10 space-y-10">
        {/* ─── Hero Section ─── */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-primary">
            <MapPin className="h-3.5 w-3.5" />
            Proposta de Viagem
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-foreground leading-tight tracking-tight">
            {quote.destination}
          </h1>
          <p className="text-lg text-muted-foreground">
            Preparado especialmente para{" "}
            <span className="font-semibold text-foreground">{quote.client_name}</span>
          </p>
        </div>

        {/* ─── Trip Overview ─── */}
        <div className="rounded-2xl border border-border/40 bg-white shadow-sm p-6 sm:p-8">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">Destino</span>
              </div>
              <p className="text-sm font-bold text-foreground">{quote.destination}</p>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">Período</span>
              </div>
              <p className="text-sm font-bold text-foreground">
                {formatDateShort(quote.start_date)} — {formatDateShort(quote.end_date)}
              </p>
              <p className="text-xs text-muted-foreground">{days} dias</p>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Users className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">Viajantes</span>
              </div>
              <p className="text-sm font-bold text-foreground">
                {quote.adults_count} adulto{quote.adults_count > 1 ? "s" : ""}
                {quote.children_count > 0 && ` + ${quote.children_count} criança${quote.children_count > 1 ? "s" : ""}`}
              </p>
            </div>
          </div>
        </div>

        {/* ─── Destination Intro ─── */}
        {(quote as any).show_destination_intro !== false && (
          <DestinationIntroPublic
            text={(quote as any).destination_intro_text || null}
            images={(quote as any).destination_intro_images || []}
            destination={quote.destination}
          />
        )}

        {/* ─── Collapsible Services (accordion — one open at a time) ─── */}
        {quote.services && quote.services.length > 0 && (
          <section className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border/60" />
              <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Serviços Incluídos</h2>
              <div className="h-px flex-1 bg-border/60" />
            </div>
            <div className="space-y-3">
              {quote.services.map((service, index) => (
                <CollapsibleServiceCard
                  key={service.id}
                  service={service}
                  showPrice={showDetailedPrices}
                  isOpen={openServiceIndex === index}
                  onToggle={() => handleToggleService(index)}
                  showPaymentPerService={useServicePayment}
                />
              ))}
            </div>
          </section>
        )}

        {/* ─── Investment Highlight ─── */}
        {(() => {
          const mode = (quote as any).payment_display_mode || "full_payment";
          const installments = (quote as any).installments_count || 10;
          const entryPct = (quote as any).entry_percentage || 0;
          const discountPct = (quote as any).full_payment_discount_percent || 0;
          const methodLabel = (quote as any).payment_method_label as string | null;
          const total = quote.services && quote.services.length > 0
            ? quote.services.reduce((sum, s) => sum + (Number(s.amount) || 0), 0)
            : quote.total_amount;

          let mainDisplay: React.ReactNode;
          let subtitleDisplay: React.ReactNode = null;

          if (mode === "installments") {
            const installmentValue = total / (installments || 1);
            mainDisplay = (
              <>
                <span className="text-2xl sm:text-3xl font-bold opacity-90">{installments}x de</span>
                <span className="text-5xl sm:text-6xl font-black tracking-tight">{formatCurrency(installmentValue)}</span>
              </>
            );
            subtitleDisplay = (
              <p className="text-sm opacity-70">
                Total: {formatCurrency(total)}{methodLabel ? ` • ${methodLabel}` : ""} • sem juros
              </p>
            );
          } else if (mode === "installments_with_entry") {
            const entryValue = total * (entryPct / 100);
            const remainder = total - entryValue;
            const installmentValue = remainder / (installments || 1);
            mainDisplay = (
              <div className="space-y-1">
                <p className="text-xl sm:text-2xl font-bold opacity-90">
                  Entrada de <span className="text-primary-foreground">{formatCurrency(entryValue)}</span>
                </p>
                <p className="text-3xl sm:text-4xl font-black tracking-tight">
                  + {installments}x de {formatCurrency(installmentValue)}
                </p>
              </div>
            );
            subtitleDisplay = (
              <p className="text-sm opacity-70">
                Total: {formatCurrency(total)}{methodLabel ? ` • ${methodLabel}` : ""}
              </p>
            );
          } else {
            // full_payment
            const discountedTotal = total * (1 - discountPct / 100);
            mainDisplay = (
              <>
                <span className="text-5xl sm:text-6xl font-black tracking-tight">{formatCurrency(discountedTotal)}</span>
              </>
            );
            if (discountPct > 0) {
              subtitleDisplay = (
                <div className="space-y-1">
                  <p className="text-sm opacity-70 line-through">{formatCurrency(total)}</p>
                  <p className="text-sm font-semibold opacity-90">
                    🎉 {discountPct}% de desconto{methodLabel ? ` via ${methodLabel}` : ""}
                  </p>
                </div>
              );
            } else {
              subtitleDisplay = methodLabel ? <p className="text-sm opacity-70">{methodLabel}</p> : null;
            }
          }

          if ((quote as any).show_investment_section === false) return null;

          return (
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary to-primary/80 text-primary-foreground p-8 sm:p-10 text-center shadow-xl">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.1),transparent_50%)]" />
              <div className="relative space-y-3">
                <p className="text-sm font-medium opacity-80 uppercase tracking-widest">
                  {showDetailedPrices ? "Investimento Total" : "Valor do Pacote Completo"}
                </p>
                <div className="flex flex-col items-center gap-1">
                  {mainDisplay}
                </div>
                {subtitleDisplay}
                {quote.services && quote.services.length > 0 && (
                  <p className="text-xs opacity-60 pt-1">
                    {quote.services.length} serviço{quote.services.length > 1 ? "s" : ""} incluído{quote.services.length > 1 ? "s" : ""}
                  </p>
                )}
              </div>
            </div>
          );
        })()}

        {/* ─── Payment Notes ─── */}
        {(quote as any).show_investment_section !== false && paymentTerms && (
          <div className="rounded-2xl border border-border/40 bg-white shadow-sm p-6 sm:p-8">
            <div className="flex items-center gap-2 mb-3">
              <CreditCard className="h-5 w-5 text-primary" />
              <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Condições de Pagamento</h3>
            </div>
            <p className="text-sm text-foreground whitespace-pre-line leading-relaxed">{paymentTerms}</p>
          </div>
        )}

        {/* ─── Validity ─── */}
        <div className="text-center space-y-1">
          {validUntil && (
            <p className="text-sm font-medium text-foreground">
              Proposta válida até {formatDate(validUntil)}
            </p>
          )}
          {validityDisclaimer && (
            <p className="text-xs text-muted-foreground">{validityDisclaimer}</p>
          )}
          {!validUntil && !validityDisclaimer && (
            <p className="text-xs text-muted-foreground">
              Proposta válida por 7 dias a partir da data de emissão. Valores sujeitos a alteração conforme disponibilidade.
            </p>
          )}
        </div>

        {/* ─── Agent Signature: photo, name, agency, WhatsApp ─── */}
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
                  {agentProfile.agency_name && <p className="text-sm text-muted-foreground font-medium">{agentProfile.agency_name}</p>}
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
