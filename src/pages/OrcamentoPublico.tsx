import { useState, useEffect, useRef } from "react";
import { setOgMeta } from "@/lib/ogMeta";
import { useParams } from "react-router-dom";
import { usePublicQuote } from "@/hooks/useQuotes";
import { ORCAMENTO_DOMAIN } from "@/lib/orcamento-domain";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2, MapPin, Calendar, Users, Plane, PlaneTakeoff, PlaneLanding, Hotel, Car, ArrowRightLeft, Ticket, Shield, Ship, Package, Briefcase, CreditCard, Tag, ChevronDown, Map, FileText, Image as ImageIcon, FileSpreadsheet, FileType, Download, Paperclip, Eye, Sparkles, HeartHandshake, Headphones, ShieldCheck, Compass, Award, MessageCircle, Clock, BedDouble, UtensilsCrossed, CheckCircle2, AlertTriangle, ArrowRight, TramFront, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Quote, QuoteService, ServiceType } from "@/types/quote";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AgentProfile } from "@/hooks/useAgentProfile";
import { ServiceImageCarousel } from "@/components/quote/ServiceImageCarousel";
import { extractServicePaymentConfig, extractFlightFeeInfo, getServicePaymentDisplay, getRoomPaymentSimulation, calculateServicePayment } from "@/lib/servicePayment";
import { formatQuoteCurrency, getQuoteCurrencyInfo, getCurrencySymbol, type QuoteCurrency } from "@/lib/quoteCurrency";
import { formatPaymentMethodsInline } from "@/lib/paymentMethods";
import { DestinationIntroPublic } from "@/components/quote/DestinationIntroPublic";
import { BrandText } from "@/components/ui/brand-text";
import { FormattedText } from "@/components/ui/formatted-text";
import { splitFlightLegs } from "@/lib/flightSegments";
import { resolveWhatsIncluded, iconKeyForIncludedItem } from "@/lib/whatsIncluded";
import { getWalletBrandStyle } from "@/lib/agencyColor";
import { resolveSignatureContact, buildWhatsAppUrl } from "@/lib/commercialSignature";
import { PublicInvestmentSummary } from "@/components/quote/PublicInvestmentSummary";
import { buildPassengerLabel } from "@/lib/quotePassengers";
import {
  computeExtrasTotal,
  computeExtraAmount,
  ENTRY_EXTRA_TYPE_LABELS,
  type QuoteEntryExtra,
} from "@/lib/quoteEntryExtras";

const SERVICE_LABELS: Record<ServiceType, string> = {
  flight: "Passagem Aérea", hotel: "Hospedagem", car_rental: "Locação de Veículo",
  transfer: "Transfer", attraction: "Ingressos/Atrações", insurance: "Seguro Viagem",
  cruise: "Cruzeiro", rail_transport: "Transporte Ferroviário", circuit: "Circuitos", other: "Outros Serviços",
};

function getServiceLabel(service: QuoteService): string {
  if (service.service_type === "other") {
    const customTitle = (service.service_data as any)?.custom_title?.trim();
    if (customTitle) return customTitle;
  }
  return SERVICE_LABELS[service.service_type as ServiceType] || "Serviço";
}

const SERVICE_ICONS: Record<ServiceType, React.ReactNode> = {
  flight: <Plane className="h-5 w-5" />, hotel: <Hotel className="h-5 w-5" />,
  car_rental: <Car className="h-5 w-5" />, transfer: <ArrowRightLeft className="h-5 w-5" />,
  attraction: <Ticket className="h-5 w-5" />, insurance: <Shield className="h-5 w-5" />,
  cruise: <Ship className="h-5 w-5" />, rail_transport: <TramFront className="h-5 w-5" />, circuit: <Map className="h-5 w-5" />, other: <Package className="h-5 w-5" />,
};

const SERVICE_COLORS: Record<ServiceType, string> = {
  // Unified agency-theme: every service inherits the agency primary color.
  // Differentiation comes from icon + content, not color.
  flight: "from-primary/15 to-primary/5 text-primary",
  hotel: "from-primary/15 to-primary/5 text-primary",
  car_rental: "from-primary/15 to-primary/5 text-primary",
  transfer: "from-primary/15 to-primary/5 text-primary",
  attraction: "from-primary/15 to-primary/5 text-primary",
  insurance: "from-primary/15 to-primary/5 text-primary",
  cruise: "from-primary/15 to-primary/5 text-primary",
  rail_transport: "from-primary/15 to-primary/5 text-primary",
  circuit: "from-primary/15 to-primary/5 text-primary",
  other: "from-primary/15 to-primary/5 text-primary",
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
    case "transfer": return `${data.transfer_type === "round_trip" ? "Ida e Volta" : data.transfer_type === "arrival" ? "Chegada" : "Saída"} — ${data.location}`;
    case "attraction": return [data.product_name, data.ticket_type].filter(Boolean).join(" | ") || data.name;
    case "insurance": return data.provider;
    case "cruise": return `${data.ship_name} — ${data.route}`;
    case "rail_transport": return `${data.origin_city || ""} → ${data.destination_city || ""}`;
    case "circuit": return data.circuit_name || "Circuito";
    case "other": {
      // Para evitar duplicação, mostra empresa OU primeira linha da descrição (curta)
      if (data.company_name) return data.company_name;
      const firstLine = (data.description || "").split("\n")[0].trim();
      return firstLine.length > 80 ? firstLine.slice(0, 77) + "..." : (firstLine || "Outros Serviços");
    }
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
    case "rail_transport": return `${data.origin_city || ""} → ${data.destination_city || ""}`.trim();
    case "circuit": return data.circuit_name || "Circuito";
    case "other": return data.company_name || "Outros Serviços";
    default: return "Serviço";
  }
}

function getServiceDetails(service: QuoteService): string[] {
  const data = service.service_data as any;
  const details: string[] = [];
  switch (service.service_type) {
    case "flight":
      if (data.return_date && !data.is_one_way) {
        details.push(`Ida: ${formatDateShort(data.departure_date)} | Volta: ${formatDateShort(data.return_date)}`);
      } else {
        details.push(`Ida: ${formatDateShort(data.departure_date)} (somente ida)`);
      }
      // Multi-leg with internal-segment support
      const { outbound: outLegs, internal: intLegs, return_: retLegs } = splitFlightLegs(data);
      outLegs.forEach((ob: any, i: number) => {
        const parts: string[] = [];
        if (ob.leg_date) parts.push(formatDateShort(ob.leg_date));
        if (ob.flight_number) parts.push(`Voo ${ob.flight_number}`);
        if (ob.airport_origin && ob.airport_destination) parts.push(`${ob.airport_origin} → ${ob.airport_destination}`);
        if (ob.departure_time) parts.push(`Saída: ${ob.departure_time}`);
        if (ob.arrival_time) parts.push(`Chegada: ${ob.arrival_time}`);
        const label = outLegs.length > 1 ? `✈ Ida (trecho ${i + 1})` : `✈ Ida`;
        if (parts.length) details.push(`${label}: ${parts.join(" | ")}`);
      });
      intLegs.forEach((it: any, i: number) => {
        const parts: string[] = [];
        if (it.leg_date) parts.push(formatDateShort(it.leg_date));
        if (it.flight_number) parts.push(`Voo ${it.flight_number}`);
        if (it.airport_origin && it.airport_destination) parts.push(`${it.airport_origin} → ${it.airport_destination}`);
        if (it.departure_time) parts.push(`Saída: ${it.departure_time}`);
        if (it.arrival_time) parts.push(`Chegada: ${it.arrival_time}`);
        const label = intLegs.length > 1 ? `✈ Trecho interno (${i + 1})` : `✈ Trecho interno`;
        if (parts.length) details.push(`${label}: ${parts.join(" | ")}`);
      });
      retLegs.forEach((rt: any, i: number) => {
        const parts: string[] = [];
        if (rt.leg_date) parts.push(formatDateShort(rt.leg_date));
        if (rt.flight_number) parts.push(`Voo ${rt.flight_number}`);
        if (rt.airport_origin && rt.airport_destination) parts.push(`${rt.airport_origin} → ${rt.airport_destination}`);
        if (rt.departure_time) parts.push(`Saída: ${rt.departure_time}`);
        if (rt.arrival_time) parts.push(`Chegada: ${rt.arrival_time}`);
        const label = retLegs.length > 1 ? `✈ Volta (trecho ${i + 1})` : `✈ Volta`;
        if (parts.length) details.push(`${label}: ${parts.join(" | ")}`);
      });
      if (data.includes_baggage) details.push("✓ Bagagem incluída");
      if (data.includes_boarding_fee) details.push("✓ Taxa de embarque incluída");
      if (data.notes) details.push(data.notes);
      break;
    case "hotel":
      details.push(`Check-in: ${formatDateShort(data.check_in)} | Check-out: ${formatDateShort(data.check_out)}`);
      if (data.meal_plan) details.push(`Regime: ${formatLabel(data.meal_plan)}`);
      if (Array.isArray(data.rooms) && data.rooms.length > 0) {
        data.rooms.forEach((r: any) => {
          const paxParts: string[] = [];
          if (r.adults) paxParts.push(`${r.adults} adulto${r.adults > 1 ? "s" : ""}`);
          if (r.children) {
            const ages = Array.isArray(r.children_ages) && r.children_ages.length
              ? ` (${r.children_ages.join(", ")} ${r.children_ages.length > 1 ? "anos" : "ano"})`
              : "";
            paxParts.push(`${r.children} criança${r.children > 1 ? "s" : ""}${ages}`);
          }
          details.push(`${r.quantity || 1}x ${r.room_type}${paxParts.length ? ` — ${paxParts.join(" + ")}` : ""}`);
        });
      } else if (data.room_type) {
        details.push(`Quarto: ${formatLabel(data.room_type)}`);
      }
      if (data.notes) details.push(data.notes);
      break;
    case "car_rental":
      details.push(`Retirada: ${data.pickup_location}`);
      details.push(`Devolução: ${data.dropoff_location}`);
      if (data.notes) details.push(data.notes);
      break;
    case "transfer":
      details.push(`Local: ${data.location}`);
      if (data.transfer_type === "round_trip") {
        details.push(`Chegada: ${formatDateShort(data.arrival_date || data.date)}`);
        if (data.departure_date) details.push(`Saída: ${formatDateShort(data.departure_date)}`);
      } else {
        details.push(`Data: ${formatDateShort(data.date)}`);
      }
      if (data.service_category) details.push(`Tipo: ${data.service_category === "private" ? "Privativo" : "Regular"}`);
      if (data.notes) details.push(data.notes);
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
      if (data.notes) details.push(data.notes);
      break;
    case "cruise":
      details.push(`Navio: ${data.ship_name}`);
      details.push(`Rota: ${data.route}`);
      details.push(`${formatDateShort(data.start_date)} a ${formatDateShort(data.end_date)}`);
      details.push(`Cabine: ${data.cabin_type}`);
      break;
    case "rail_transport": {
      const railTypeLbl: Record<string, string> = { high_speed: "Trem de alta velocidade", regional: "Trem regional", night: "Trem noturno", panoramic: "Trem panorâmico", other: "Outro" };
      const railClassLbl: Record<string, string> = { economy: "Classe Econômica", second: "Segunda Classe", first: "Primeira Classe", executive: "Executiva", sleeper: "Cabine Leito" };
      details.push(`Trajeto: ${data.origin_city || ""} → ${data.destination_city || ""}`);
      if (data.origin_station || data.destination_station) details.push(`Estações: ${data.origin_station || "—"} → ${data.destination_station || "—"}`);
      if (data.travel_date) details.push(`Data: ${formatDateShort(data.travel_date)}`);
      if (data.departure_time || data.arrival_time) {
        details.push(`Horário: ${data.departure_time || "—"} → ${data.arrival_time || "—"}`);
      }
      if (data.operator) details.push(`Operadora: ${data.operator}`);
      if (data.rail_type) details.push(`Tipo: ${railTypeLbl[data.rail_type] || data.rail_type}`);
      if (data.travel_class) details.push(`Classe: ${railClassLbl[data.travel_class] || data.travel_class}`);
      const pax = (Number(data.adults_count) || 0) + (Number(data.children_count) || 0) + (Number(data.infants_count) || 0);
      if (pax > 0) details.push(`Passageiros: ${pax}`);
      if (data.whats_included) details.push(`Incluso: ${data.whats_included}`);
      if (data.notes) details.push(data.notes);
      break;
    }
    case "circuit":
      if (data.duration) details.push(`Duração: ${data.duration}`);
      if (data.itinerary) details.push(data.itinerary);
      if (data.notes) details.push(data.notes);
      break;
    case "other":
      if (data.description) details.push(data.description);
      break;
  }
  return details;
}

// ===================== Premium service body renderers =====================

function parseTimeMin(t?: string): number | null {
  if (!t) return null;
  const m = t.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

function formatLayover(prevArr?: string, nextDep?: string): string | null {
  const a = parseTimeMin(prevArr);
  const b = parseTimeMin(nextDep);
  if (a == null || b == null) return null;
  let diff = b - a;
  if (diff < 0) diff += 24 * 60; // overnight layover
  if (diff <= 0 || diff > 18 * 60) return null;
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  return h > 0 ? `${h}h${m > 0 ? ` ${m}min` : ""}` : `${m}min`;
}

function formatLegDate(s?: string): string {
  if (!s) return "";
  try {
    return format(parseLocalDate(s), "dd MMM yyyy", { locale: ptBR }).toUpperCase();
  } catch {
    return s;
  }
}

function FlightLegRow({ leg }: { leg: any }) {
  const dep = leg.departure_time || "—";
  const arr = leg.arrival_time || "—";
  return (
    <div className="flex items-center gap-3 py-1.5">
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 text-foreground">
          <span className="text-base font-semibold tabular-nums tracking-tight">{dep}</span>
          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="text-base font-semibold tabular-nums tracking-tight">{arr}</span>
        </div>
        <div className="mt-0.5 text-xs text-muted-foreground tracking-wide">
          <span className="font-medium text-foreground/80">{leg.airport_origin || "—"}</span>
          <span className="mx-1.5 opacity-50">→</span>
          <span className="font-medium text-foreground/80">{leg.airport_destination || "—"}</span>
          {leg.flight_number && <span className="ml-2 opacity-70">• Voo {leg.flight_number}</span>}
        </div>
      </div>
    </div>
  );
}

function FlightDirectionGroup({ title, icon, legs, fallbackDate }: { title: string; icon: React.ReactNode; legs: any[]; fallbackDate?: string }) {
  if (!legs.length) return null;
  // Group legs by date for clean separation when overnight or multi-day
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-foreground/60">
        <span className="text-primary">{icon}</span>
        <span>{title}</span>
      </div>
      <div className="rounded-xl border border-border/40 bg-muted/20 px-4 py-3 divide-y divide-border/30">
        {legs.map((leg, i) => {
          const date = leg.leg_date || (i === 0 ? fallbackDate : undefined);
          const layover = i > 0 ? formatLayover(legs[i - 1].arrival_time, leg.departure_time) : null;
          return (
            <div key={i} className="py-1">
              {layover && (
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground my-1.5">
                  <Clock className="h-3 w-3" />
                  <span>Conexão • {layover}</span>
                </div>
              )}
              {date && i === 0 && (
                <div className="text-[11px] font-semibold tracking-wider text-foreground/50 mb-1">{formatLegDate(date)}</div>
              )}
              {date && i > 0 && legs[i - 1].leg_date && legs[i - 1].leg_date !== leg.leg_date && (
                <div className="text-[11px] font-semibold tracking-wider text-foreground/50 mb-1 mt-1">{formatLegDate(date)}</div>
              )}
              <FlightLegRow leg={leg} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function InclusionBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${ok ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-amber-500/10 text-amber-700 dark:text-amber-400"}`}>
      {ok ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
      {label}
    </div>
  );
}

function FlightBody({ data }: { data: any }) {
  const { outbound: outLegs, internal: intLegs, return_: retLegs } = splitFlightLegs(data) as { outbound: any[]; internal: any[]; return_: any[] };
  return (
    <div className="space-y-4">
      {/* Header: airline + route */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-base font-semibold text-foreground tracking-tight truncate">{data.airline || "Companhia aérea"}</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            <span className="font-medium text-foreground/80">{data.origin_city}</span>
            <span className="mx-1.5 opacity-50">→</span>
            <span className="font-medium text-foreground/80">{data.destination_city}</span>
          </div>
        </div>
      </div>

      <FlightDirectionGroup title="Ida" icon={<PlaneTakeoff className="h-3.5 w-3.5" />} legs={outLegs} fallbackDate={data.departure_date} />
      {intLegs.length > 0 && (
        <FlightDirectionGroup title="Trecho interno" icon={<Plane className="h-3.5 w-3.5" />} legs={intLegs} />
      )}
      {!data.is_one_way && retLegs.length > 0 && (
        <FlightDirectionGroup title="Volta" icon={<PlaneLanding className="h-3.5 w-3.5" />} legs={retLegs} fallbackDate={data.return_date} />
      )}

      {/* Inclusions */}
      <div className="flex flex-wrap gap-1.5 pt-1">
        <InclusionBadge ok={!!data.includes_baggage} label={data.includes_baggage ? "Bagagem incluída" : "Sem bagagem despachada"} />
        <InclusionBadge ok={!!data.includes_boarding_fee} label={data.includes_boarding_fee ? "Taxa de embarque incluída" : "Taxa de embarque não incluída"} />
      </div>

      {data.notes && (
        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
          <FormattedText>{data.notes}</FormattedText>
        </p>
      )}
    </div>
  );
}

function StayRow({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-foreground/60">
        {icon}{label}
      </div>
      <div className="mt-1 text-base font-semibold text-foreground tabular-nums">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}

function nightsBetween(a?: string, b?: string): number | null {
  if (!a || !b) return null;
  try {
    const ms = parseLocalDate(b).getTime() - parseLocalDate(a).getTime();
    const n = Math.round(ms / (1000 * 60 * 60 * 24));
    return n > 0 ? n : null;
  } catch { return null; }
}

function HotelBody({ data, service, quote }: { data: any; service?: QuoteService; quote?: Quote }) {
  const nights = nightsBetween(data.check_in, data.check_out);
  const rooms: any[] = Array.isArray(data.rooms) ? data.rooms : [];
  const hasMultipleRooms = rooms.length > 1;
  const showPrices = quote ? (quote as any).show_detailed_prices !== false : true;
  const fmt = (v: number) => formatQuoteCurrency(v, quoteCurrency);
  return (
    <div className="space-y-4">
      <div className="min-w-0">
        <div className="text-base font-semibold text-foreground tracking-tight">{data.hotel_name}</div>
        {data.city && (
          <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
            <MapPin className="h-3 w-3" />{data.city}
          </div>
        )}
      </div>
      <div className="rounded-xl border border-border/40 bg-muted/20 px-4 py-3 flex items-center gap-4">
        <StayRow icon={<BedDouble className="h-3 w-3 mr-1" />} label="Check-in" value={formatDateShort(data.check_in)} />
        <div className="flex flex-col items-center text-muted-foreground">
          <ArrowRight className="h-4 w-4" />
          {nights && <span className="text-[10px] font-semibold mt-0.5">{nights} {nights === 1 ? "noite" : "noites"}</span>}
        </div>
        <StayRow icon={<BedDouble className="h-3 w-3 mr-1" />} label="Check-out" value={formatDateShort(data.check_out)} />
      </div>
      <div className="flex flex-wrap gap-3 text-sm">
        {rooms.length === 0 && data.room_type && (
          <div className="flex items-center gap-1.5 text-foreground/80">
            <BedDouble className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-medium">{formatLabel(data.room_type)}</span>
          </div>
        )}
        {data.meal_plan && (
          <div className="flex items-center gap-1.5 text-foreground/80">
            <UtensilsCrossed className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-medium">{formatLabel(data.meal_plan)}</span>
          </div>
        )}
      </div>
      {rooms.length > 0 && !hasMultipleRooms && (
        <div className="rounded-xl border border-border/40 bg-muted/10 p-3 space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Acomodações</div>
          <ul className="space-y-1.5">
            {rooms.map((r: any, i: number) => {
              const paxParts: string[] = [];
              if (r.adults) paxParts.push(`${r.adults} adulto${r.adults > 1 ? "s" : ""}`);
              if (r.children) {
                const ages = Array.isArray(r.children_ages) && r.children_ages.length
                  ? ` (${r.children_ages.join(", ")} ${r.children_ages.length > 1 ? "anos" : "ano"})`
                  : "";
                paxParts.push(`${r.children} criança${r.children > 1 ? "s" : ""}${ages}`);
              }
              return (
                <li key={i} className="flex items-start gap-2 text-sm text-foreground/85">
                  <BedDouble className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
                  <span>
                    <span className="font-medium">{r.quantity || 1}x {r.room_type}</span>
                    {paxParts.length ? <span className="text-muted-foreground"> — {paxParts.join(" + ")}</span> : null}
                    {r.notes ? <span className="block text-xs text-muted-foreground mt-0.5">{r.notes}</span> : null}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {hasMultipleRooms && (
        <div className="space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Acomodações</div>
          {rooms.map((r: any, i: number) => {
            const paxParts: string[] = [];
            if (r.adults) paxParts.push(`${r.adults} adulto${r.adults > 1 ? "s" : ""}`);
            if (r.children) {
              const ages = Array.isArray(r.children_ages) && r.children_ages.length
                ? ` (${r.children_ages.join(", ")} ${r.children_ages.length > 1 ? "anos" : "ano"})`
                : "";
              paxParts.push(`${r.children} criança${r.children > 1 ? "s" : ""}${ages}`);
            }
            const qty = Number(r.quantity) || 1;
            const unit = Number(r.unit_price) || 0;
            const total = Number(r.total_price) || unit * qty;
            const sim = showPrices && service ? getRoomPaymentSimulation(total, service, quote) : null;
            return (
              <div key={i} className="rounded-xl border border-border/40 bg-muted/10 p-3 space-y-1.5">
                <div className="flex items-start gap-2">
                  <BedDouble className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-foreground">{qty}x {r.room_type}</div>
                    {paxParts.length > 0 && (
                      <div className="text-xs text-muted-foreground">{paxParts.join(" + ")}</div>
                    )}
                    {r.notes && <div className="text-xs text-muted-foreground italic mt-0.5">{r.notes}</div>}
                  </div>
                </div>
                {sim && (
                  <div className="pl-6 pt-1.5 border-t border-border/30 mt-1.5 space-y-0.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Valor</span>
                      <span className="font-semibold text-foreground tabular-nums">{fmt(sim.total)}</span>
                    </div>
                    {sim.installmentValue != null && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">ou {sim.installmentsCount}x de</span>
                        <span className="font-medium text-primary tabular-nums">{fmt(sim.installmentValue)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {data.notes && (
        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
          <FormattedText>{data.notes}</FormattedText>
        </p>
      )}
    </div>
  );
}

function CarBody({ data }: { data: any }) {
  return (
    <div className="space-y-4">
      <div className="min-w-0">
        <div className="text-base font-semibold text-foreground tracking-tight">{data.car_type}</div>
        {data.rental_company && <div className="text-xs text-muted-foreground mt-0.5">{data.rental_company}</div>}
      </div>
      <div className="rounded-xl border border-border/40 bg-muted/20 px-4 py-3 space-y-3">
        <div className="flex items-start gap-3">
          <div className="text-[11px] font-bold uppercase tracking-wider text-foreground/60 w-20 shrink-0 pt-0.5">Retirada</div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-foreground break-words">{data.pickup_location}</div>
            {(data.pickup_date || data.pickup_time) && (
              <div className="text-xs text-muted-foreground mt-0.5 tabular-nums">
                {data.pickup_date && formatDateShort(data.pickup_date)}{data.pickup_time ? ` • ${data.pickup_time}` : ""}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-start gap-3">
          <div className="text-[11px] font-bold uppercase tracking-wider text-foreground/60 w-20 shrink-0 pt-0.5">Devolução</div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-foreground break-words">{data.dropoff_location}</div>
            {(data.dropoff_date || data.dropoff_time) && (
              <div className="text-xs text-muted-foreground mt-0.5 tabular-nums">
                {data.dropoff_date && formatDateShort(data.dropoff_date)}{data.dropoff_time ? ` • ${data.dropoff_time}` : ""}
              </div>
            )}
          </div>
        </div>
      </div>
      {data.days && (
        <div className="text-xs text-muted-foreground">{data.days} {data.days === 1 ? "diária" : "diárias"}</div>
      )}
      {data.notes && (
        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
          <FormattedText>{data.notes}</FormattedText>
        </p>
      )}
    </div>
  );
}

function TransferBody({ data }: { data: any }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider">
          {data.transfer_type === "round_trip" ? "Ida e Volta" : data.transfer_type === "arrival" ? "Chegada" : "Saída"}
        </span>
        {data.service_category && (
          <span className="text-[11px] text-muted-foreground uppercase tracking-wider">
            {data.service_category === "private" ? "Privativo" : "Regular"}
          </span>
        )}
      </div>
      <div className="text-base font-semibold text-foreground tracking-tight">{data.location}</div>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground tabular-nums">
        <Calendar className="h-3.5 w-3.5" />
        {data.transfer_type === "round_trip"
          ? `${formatDateShort(data.arrival_date || data.date)}${data.departure_date ? ` → ${formatDateShort(data.departure_date)}` : ""}`
          : formatDateShort(data.date)}
      </div>
      {data.notes && (
        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
          <FormattedText>{data.notes}</FormattedText>
        </p>
      )}
    </div>
  );
}

function AttractionBody({ data }: { data: any }) {
  return (
    <div className="space-y-3">
      <div>
        <div className="text-base font-semibold text-foreground tracking-tight">{data.product_name || data.name}</div>
        {data.ticket_type && <div className="text-xs text-muted-foreground mt-0.5">{data.ticket_type}</div>}
      </div>
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1 tabular-nums"><Calendar className="h-3.5 w-3.5" />{formatDateShort(data.date)}</span>
        <span className="inline-flex items-center gap-1"><Ticket className="h-3.5 w-3.5" />Qtd: {data.quantity || 1}</span>
      </div>
      {(data.adult_price > 0 || data.child_price > 0) && (
        <div className="flex flex-wrap gap-2">
          {data.adult_price > 0 && (
            <span className="text-[11px] rounded-full bg-muted px-2.5 py-0.5 text-foreground/80">Adulto {getCurrencySymbol(quoteCurrency)} {Number(data.adult_price).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
          )}
          {data.child_price > 0 && (
            <span className="text-[11px] rounded-full bg-muted px-2.5 py-0.5 text-foreground/80">Criança {getCurrencySymbol(quoteCurrency)} {Number(data.child_price).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
          )}
        </div>
      )}
    </div>
  );
}

function PeriodBody({ title, sub, data }: { title: string; sub?: string; data: any }) {
  return (
    <div className="space-y-3">
      <div>
        <div className="text-base font-semibold text-foreground tracking-tight">{title}</div>
        {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
      </div>
      <div className="rounded-xl border border-border/40 bg-muted/20 px-4 py-3 flex items-center gap-4 tabular-nums">
        <div className="flex-1">
          <div className="text-[11px] font-bold uppercase tracking-wider text-foreground/60">Início</div>
          <div className="text-sm font-semibold text-foreground mt-0.5">{formatDateShort(data.start_date)}</div>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
        <div className="flex-1">
          <div className="text-[11px] font-bold uppercase tracking-wider text-foreground/60">Fim</div>
          <div className="text-sm font-semibold text-foreground mt-0.5">{formatDateShort(data.end_date)}</div>
        </div>
      </div>
    </div>
  );
}

function InsuranceBody({ data }: { data: any }) {
  return (
    <div className="space-y-3">
      <PeriodBody title={data.provider} sub={data.coverage ? `Cobertura: ${data.coverage}` : undefined} data={data} />
      {data.notes && (
        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
          <FormattedText>{data.notes}</FormattedText>
        </p>
      )}
    </div>
  );
}

function CruiseBody({ data }: { data: any }) {
  return (
    <div className="space-y-3">
      <PeriodBody title={data.ship_name} sub={data.route} data={data} />
      {data.cabin_type && (
        <div className="text-sm text-foreground/80"><span className="text-muted-foreground">Cabine:</span> <span className="font-medium">{data.cabin_type}</span></div>
      )}
      {data.notes && (
        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
          <FormattedText>{data.notes}</FormattedText>
        </p>
      )}
    </div>
  );
}

function ServiceBody({ service, quote }: { service: QuoteService; quote?: Quote }) {
  const data = service.service_data as any;
  switch (service.service_type) {
    case "flight": return <FlightBody data={data} />;
    case "hotel": return <HotelBody data={data} service={service} quote={quote} />;
    case "car_rental": return <CarBody data={data} />;
    case "transfer": return <TransferBody data={data} />;
    case "attraction": return <AttractionBody data={data} />;
    case "insurance": return <InsuranceBody data={data} />;
    case "cruise": return <CruiseBody data={data} />;
    default: return null;
  }
}

/**
 * Bloco de "Condições de pagamento" apresentado dentro do card de serviço.
 * Reutiliza a mesma lógica global/custom por serviço já usada em
 * PublicInvestmentSummary, aplicada sobre o valor exato do serviço.
 */
function ServiceInvestmentInline({ service, quote }: { service: QuoteService; quote?: Quote }) {
  const amount = Number(service.amount) || 0;
  if (amount <= 0) return null;

  const fmt = (v: number) => formatCurrency(v);
  const cfg = extractServicePaymentConfig(service as any);
  const useServicePayment =
    !!quote && (((quote as any).use_service_payment) || cfg.is_custom_payment);

  type Row = { label: string; value: string; emphasis?: boolean };
  const rows: Row[] = [];
  let methodLabel: string | null = null;

  if (useServicePayment && cfg.is_custom_payment && cfg.payment_type) {
    const feeInfo = extractFlightFeeInfo(service as any);
    const r = calculateServicePayment(amount, cfg, feeInfo);
    methodLabel = cfg.payment_method ?? null;
    if (r.type === "installments") {
      if ("firstInstallmentValue" in r && r.firstInstallmentValue) {
        rows.push({ label: "1ª parcela", value: fmt(r.firstInstallmentValue), emphasis: true });
        rows.push({ label: `+ ${r.installmentCount - 1}x de`, value: fmt(r.installmentValue), emphasis: true });
      } else {
        rows.push({ label: `${r.installmentCount}x de`, value: fmt(r.installmentValue), emphasis: true });
      }
    } else if (r.type === "installments_with_entry") {
      rows.push({ label: "Entrada", value: fmt(r.entryValue) });
      rows.push({ label: `${r.installmentCount}x de`, value: fmt(r.installmentValue), emphasis: true });
    } else {
      rows.push({
        label: r.hasDiscount ? "À vista (com desconto)" : "À vista",
        value: fmt(r.hasDiscount ? r.discountedTotal : r.total),
        emphasis: true,
      });
    }
  } else if (quote) {
    const mode = ((quote as any).payment_display_mode as string) || "full_payment";
    const installments = Number((quote as any).installments_count) || 10;
    const entryPct = Number((quote as any).entry_percentage) || 0;
    const discountPct = Number((quote as any).full_payment_discount_percent) || 0;
    methodLabel = formatPaymentMethodsInline((quote as any).payment_method_label) || null;

    if (mode === "installments") {
      rows.push({ label: `${installments}x de`, value: fmt(amount / (installments || 1)), emphasis: true });
    } else if (mode === "installments_with_entry") {
      const entry = amount * (entryPct / 100);
      const rem = Math.max(0, amount - entry);
      rows.push({ label: "Entrada", value: fmt(entry) });
      rows.push({ label: `${installments}x de`, value: fmt(rem / (installments || 1)), emphasis: true });
    } else if (mode === "full_payment") {
      const v = amount * (1 - discountPct / 100);
      rows.push({
        label: discountPct > 0 ? `À vista (-${discountPct}%)` : "À vista",
        value: fmt(v),
        emphasis: true,
      });
    } else {
      // total_only — nada além do total do serviço
    }
  }

  return (
    <div className="pt-4 mt-2 border-t border-border/50 space-y-2">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary/80">
        Condições de pagamento
      </p>
      {rows.length > 0 && (
        <div className="space-y-1">
          {rows.map((r, i) => (
            <p key={i} className="leading-snug flex flex-wrap items-baseline gap-x-1.5">
              <span className="text-xs sm:text-sm text-muted-foreground">{r.label}:</span>
              <span
                className={
                  r.emphasis
                    ? "text-lg sm:text-xl font-bold tracking-tight text-primary tabular-nums"
                    : "text-sm font-semibold text-foreground tabular-nums"
                }
              >
                {r.value}
              </span>
            </p>
          ))}
        </div>
      )}
      <div className="flex flex-wrap items-baseline gap-x-1.5 text-xs sm:text-sm text-foreground/80">
        <span className="text-muted-foreground">Valor do serviço:</span>
        <span className="font-semibold text-foreground tabular-nums">{fmt(amount)}</span>
      </div>
      {methodLabel && (
        <div className="flex flex-wrap items-baseline gap-x-1.5 text-xs sm:text-sm text-foreground/80">
          <span className="text-muted-foreground">Forma de pagamento:</span>
          <span className="font-medium text-foreground">{methodLabel}</span>
        </div>
      )}
    </div>
  );
}

function CollapsibleServiceCard({
  service, showPrice, isOpen, onToggle, showPaymentPerService = false, quote, showInvestmentInline = false,
}: {
  service: QuoteService; showPrice: boolean; isOpen: boolean; onToggle: () => void; showPaymentPerService?: boolean; quote?: Quote; showInvestmentInline?: boolean;
}) {
  const type = service.service_type as ServiceType;
  const details = getServiceDetails(service);
  const colorClass = SERVICE_COLORS[type] || SERVICE_COLORS.other;
  const summary = getServiceSummary(service);

  // Parse a detail string into structured key/value chips.
  // - "Ida: X | Volta: Y" -> [{label:"Ida",value:"X"},{label:"Volta",value:"Y"}]
  // - "Check-in: 12/01/2025" -> [{label:"Check-in",value:"12/01/2025"}]
  // - "Notas longas..." -> [{value:"Notas longas..."}]
  const parseDetail = (line: string): Array<{ label?: string; value: string }> => {
    if (!line) return [];
    // Multi-line text → render as a single free-form block (notes, itineraries)
    if (line.includes("\n")) return [{ value: line }];
    const parts = line.split(" | ").map(p => p.trim()).filter(Boolean);
    const out: Array<{ label?: string; value: string }> = [];
    for (const p of parts) {
      const m = p.match(/^([^:]{1,40}):\s*(.+)$/);
      if (m) out.push({ label: m[1].trim(), value: m[2].trim() });
      else out.push({ value: p });
    }
    return out;
  };

  const detailItems = details.flatMap(parseDetail);
  const chipItems = detailItems.filter(d => d.label);
  const freeItems = detailItems.filter(d => !d.label);

  const hasCustomLayout = ["flight", "hotel", "car_rental", "transfer", "attraction", "insurance", "cruise"].includes(type);
  // Quando o hotel tem múltiplos apartamentos, os valores são exibidos por
  // apartamento dentro do corpo do serviço. Suprimimos o preço no cabeçalho
  // para evitar destacar o total somado do hotel como informação principal.
  const hotelRooms = type === "hotel" ? ((service.service_data as any)?.rooms || []) : [];
  const hotelHasMultipleRooms = type === "hotel" && Array.isArray(hotelRooms) && hotelRooms.length > 1;
  const effectiveShowPrice = showPrice && !hotelHasMultipleRooms;

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
              <span className="text-sm font-bold uppercase tracking-wide">{getServiceLabel(service)}</span>
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
          {effectiveShowPrice && (
            <span className="text-lg font-extrabold whitespace-nowrap">{formatCurrency(service.amount)}</span>
          )}
          <ChevronDown className={`h-5 w-5 opacity-60 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
        </div>
      </button>
      {/* Collapsible body */}
      <div
        className="grid transition-all duration-300 ease-in-out"
        style={{ gridTemplateRows: isOpen ? "1fr" : "0fr", opacity: isOpen ? 1 : 0 }}
      >
        <div className="overflow-hidden">
        <div className="px-5 py-4 space-y-4">
          {isOpen && (() => {
            const imgs = (service as any).image_urls?.length ? (service as any).image_urls : (service.image_url ? [service.image_url] : []);
            return imgs.length > 0 ? (
              <ServiceImageCarousel images={imgs} alt={getServiceLabel(service)} disableExpand />
            ) : null;
          })()}
          {isOpen && (() => {
            const name = getServiceName(service);
            // Para "other" sem company_name, evita exibir título genérico duplicado
            if (service.service_type === "other" && !((service.service_data as any)?.company_name)) return null;
            // Para tipos com layout próprio, o nome já vem destacado dentro do corpo
            if (hasCustomLayout) return null;
            return <p className="text-base font-semibold text-foreground tracking-tight">{name}</p>;
          })()}
          {isOpen && hasCustomLayout && (
            <ServiceBody service={service} quote={quote} />
          )}
          {isOpen && !hasCustomLayout && chipItems.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {chipItems.map((d, i) => (
                <div
                  key={i}
                  className="rounded-lg bg-muted/40 border border-border/40 px-3 py-2"
                >
                  <div className="text-[11px] font-bold uppercase tracking-wide text-foreground/70">
                    {d.label}
                  </div>
                  <div className="text-sm font-medium text-foreground mt-0.5 break-words [&_*]:whitespace-normal">
                    <span className={/^\d{1,2}:\d{2}$/.test(d.value) ? "whitespace-nowrap" : ""}>
                      <FormattedText>{d.value}</FormattedText>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {isOpen && !hasCustomLayout && freeItems.length > 0 && (
            <div className="space-y-2">
              {freeItems.map((d, i) => (
                <p key={i} className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  <FormattedText>{d.value}</FormattedText>
                </p>
              ))}
            </div>
          )}
          {isOpen && service.description && (
            <div className="rounded-lg border-l-2 border-primary/40 bg-muted/30 px-4 py-3">
              <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
                <FormattedText>{service.description}</FormattedText>
              </p>
            </div>
          )}
          {isOpen && service.service_type === "attraction" && (service.service_data as any)?.notes && (
            <div className="rounded-lg border-l-2 border-primary/40 bg-muted/30 px-4 py-3">
              <p className="text-sm text-foreground/80 leading-relaxed italic whitespace-pre-wrap">
                <FormattedText>{(service.service_data as any).notes}</FormattedText>
              </p>
            </div>
          )}
          {isOpen && showInvestmentInline && !hotelHasMultipleRooms && (
            <ServiceInvestmentInline service={service} quote={quote} />
          )}
        </div>
        </div>
      </div>
      {/* Per-service payment footer — always visible (open or collapsed) */}
      {showPaymentPerService && !showInvestmentInline && !hotelHasMultipleRooms && (() => {
        const payConfig = extractServicePaymentConfig(service);
        if (!payConfig.is_custom_payment) return null;
        const feeInfo = extractFlightFeeInfo(service);
        const display = getServicePaymentDisplay(service.amount, payConfig, feeInfo);
        if (!display) return null;
        return (
          <div className="border-t border-primary/15 bg-gradient-to-r from-primary/[0.06] via-primary/[0.04] to-transparent px-5 py-3 flex items-start gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 shrink-0 mt-0.5">
              <CreditCard className="h-4 w-4 text-primary" />
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary/70">Parcelamento</span>
              <span className="text-sm font-bold text-primary break-words leading-snug">{display}</span>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

/**
 * Floating CTA — mobile only. Aparece quando o usuário rola para baixo
 * (> 200px) e desaparece suavemente ao voltar ao topo. Ocupa ~metade da
 * largura, alinhado à direita, respeitando safe-area do iOS.
 */
function MobileFloatingCta({ href }: { href: string }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 200);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <div
      className={`fixed right-3 z-40 sm:hidden transition-all duration-300 ease-out ${
        visible ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 translate-y-3 pointer-events-none"
      }`}
      style={{ bottom: "calc(env(safe-area-inset-bottom) + 16px)" }}
      aria-hidden={!visible}
    >
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Quero reservar esta viagem"
        className="inline-flex items-center justify-center gap-2 rounded-full bg-[#25D366] text-white px-5 py-3.5 font-semibold text-sm shadow-[0_12px_30px_-8px_rgba(37,211,102,0.6)] active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#25D366] min-h-12 w-[50vw] max-w-[260px]"
      >
        <WhatsAppIcon className="h-4 w-4" />
        <span>Quero reservar</span>
      </a>
    </div>
  );
}

interface PublicDocument {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string | null;
  file_size: number | null;
}

function getDocIcon(fileType: string | null, fileName: string) {
  const t = (fileType || "").toLowerCase();
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  if (t.startsWith("image/") || ["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) return ImageIcon;
  if (t.includes("pdf") || ext === "pdf") return FileType;
  if (t.includes("sheet") || t.includes("excel") || ["xls", "xlsx", "csv"].includes(ext)) return FileSpreadsheet;
  return FileText;
}

function formatDocSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function PublicQuoteDocuments({ quoteId }: { quoteId: string }) {
  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["public-quote-documents", quoteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quote_documents")
        .select("id, file_name, file_path, file_type, file_size")
        .eq("quote_id", quoteId)
        .eq("is_public", true)
        .order("created_at", { ascending: true });
      if (error) return [] as PublicDocument[];
      return (data || []) as PublicDocument[];
    },
  });

  const openDoc = async (doc: PublicDocument, download: boolean) => {
    const { data, error } = await supabase.storage
      .from("quote-documents")
      .createSignedUrl(doc.file_path, 60 * 10, {
        download: download ? doc.file_name : undefined,
      });
    if (error || !data?.signedUrl) return;
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  if (isLoading || documents.length === 0) return null;

  return (
    <section className="space-y-3 animate-fade-up">
      <div className="rounded-2xl border border-border/40 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-5 sm:px-6 py-4 bg-gradient-to-r from-primary/10 to-primary/5 border-b border-border/40">
          <div className="h-9 w-9 rounded-xl bg-white/80 backdrop-blur flex items-center justify-center shadow-sm">
            <Paperclip className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary/80">Anexos</p>
            <h3 className="text-base sm:text-lg font-bold tracking-tight text-foreground">
              Documentos do seu orçamento
            </h3>
          </div>
          <span className="text-xs text-muted-foreground hidden sm:inline">
            {documents.length} {documents.length === 1 ? "arquivo" : "arquivos"}
          </span>
        </div>
        <ul className="divide-y divide-border/40">
          {documents.map((doc) => {
            const Icon = getDocIcon(doc.file_type, doc.file_name);
            return (
              <li
                key={doc.id}
                className="flex items-center gap-3 px-5 sm:px-6 py-4 bg-white hover:bg-muted/30 transition-colors"
              >
                <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate" title={doc.file_name}>
                    {doc.file_name}
                  </p>
                  {doc.file_size ? (
                    <p className="text-xs text-muted-foreground">{formatDocSize(doc.file_size)}</p>
                  ) : null}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 px-2.5 text-xs"
                    onClick={() => openDoc(doc, false)}
                    title="Visualizar"
                  >
                    <Eye className="h-4 w-4 sm:mr-1.5" />
                    <span className="hidden sm:inline">Ver</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 px-2.5 text-xs"
                    onClick={() => openDoc(doc, true)}
                    title="Baixar"
                  >
                    <Download className="h-4 w-4 sm:mr-1.5" />
                    <span className="hidden sm:inline">Baixar</span>
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

export default function OrcamentoPublico({ tokenOverride, quoteOverride, agentProfileOverride }: { tokenOverride?: string; quoteOverride?: Quote; agentProfileOverride?: AgentProfile | null } = {}) {
  const params = useParams<{ token: string }>();
  const token = tokenOverride ?? params.token;
  const { quote: fetchedQuote, isLoading: isFetching } = usePublicQuote(quoteOverride ? undefined : token);
  const quote = quoteOverride ?? fetchedQuote;
  const isLoading = quoteOverride ? false : isFetching;
  const [openServiceIndices, setOpenServiceIndices] = useState<Set<number>>(new Set());
  const servicesInitialized = useRef(false);

  // UX: auto-open single service; keep all closed when multiple services
  useEffect(() => {
    if (!servicesInitialized.current && quote?.services?.length) {
      const count = quote.services.length;
      const initial = new Set<number>();
      if (count === 1) {
        initial.add(0);
      }
      setOpenServiceIndices(initial);
      servicesInitialized.current = true;
    }
  }, [quote?.services]);

  // Auto-redirect legacy vitrine.tur.br/orcamento/* links to the new domain
  // so any cached or previously shared link lands on the correct host.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const host = window.location.hostname;
    if (host === "vitrine.tur.br" || host === "www.vitrine.tur.br") {
      const target = `${ORCAMENTO_DOMAIN}${window.location.pathname}${window.location.search}${window.location.hash}`;
      window.location.replace(target);
    }
  }, []);

  useEffect(() => {
    setOgMeta({
      title: "Seu orçamento de viagem chegou 💰",
      description: "Confira todos os detalhes da sua viagem e aprove sua próxima experiência.",
    });
  }, []);

  const { data: fetchedAgentProfile } = useQuery({
    queryKey: ["agent-profile-public", quote?.user_id],
    queryFn: async () => {
      if (!quote?.user_id) return null;
      const { data, error } = await supabase
        .rpc("get_public_profile", { _user_id: quote.user_id });
      if (error || !data || (Array.isArray(data) && data.length === 0)) return null;
      return (Array.isArray(data) ? data[0] : data) as AgentProfile;
    },
    enabled: !!quote?.user_id && !agentProfileOverride,
  });
  const agentProfile = agentProfileOverride ?? fetchedAgentProfile;

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
  const useServicePayment = (quote as any).use_service_payment || quote.services?.some((s: any) => s.is_custom_payment === true) || false;
  const investmentLayout =
    ((quote as any).investment_summary_layout as
      | "legacy"
      | "consolidated"
      | "grouped"
      | "ungrouped"
      | null) || "legacy";
  // Os 3 novos layouts compartilham a regra: cards de serviços nunca
  // exibem preços/parcelamentos, e o resumo financeiro fica centralizado
  // no bloco de Investimento. O modo "legacy" preserva o comportamento
  // antigo de orçamentos já publicados.
  const isNewLayout =
    investmentLayout === "consolidated" ||
    investmentLayout === "grouped" ||
    investmentLayout === "ungrouped";
  const useNewInvestmentLayout =
    (investmentLayout === "grouped" || investmentLayout === "ungrouped") &&
    (quote.services?.length ?? 0) > 0;
  const startDate = parseLocalDate(quote.start_date);
  const endDate = parseLocalDate(quote.end_date);
  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  const signatureContact = resolveSignatureContact((quote as any).signature_snapshot, agentProfile as any);
  const whatsappUrl = buildWhatsAppUrl(
    signatureContact.whatsapp || signatureContact.phone,
    `Olá! Vi o orçamento para ${quote.destination} e gostaria de mais informações.`,
  );

  const handleToggleService = (index: number) => {
    setOpenServiceIndices(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  // ── Smart trip summary derived from services
  const introImages: string[] = (quote as any).destination_intro_images || [];
  const introText: string | null = (quote as any).destination_intro_text || null;
  const heroImage = introImages[0] || quote.services?.find(s => s.image_url)?.image_url || quote.services?.find(s => (s as any).image_urls?.length)?.image_urls?.[0] || null;
  const tripTitle = (quote as any).trip_title as string | undefined;

  const totalForBar = quote.services && quote.services.length > 0
    ? quote.services.reduce((sum, s) => sum + (Number(s.amount) || 0), 0)
    : quote.total_amount;

  // Highlights: custom edited list (if any) or auto-generated from services.
  const svcTypes = new Set((quote.services || []).map(s => s.service_type));
  const hotelSvc = (quote.services || []).find(s => s.service_type === "hotel") as any;
  const flightSvc = (quote.services || []).find(s => s.service_type === "flight") as any;
  const includedTexts = resolveWhatsIncluded(quote);
  const iconFor: Record<string, React.ReactNode> = {
    hotel: <Hotel className="h-4 w-4" />,
    flight: <Plane className="h-4 w-4" />,
    car: <Car className="h-4 w-4" />,
    transfer: <ArrowRightLeft className="h-4 w-4" />,
    attraction: <Ticket className="h-4 w-4" />,
    insurance: <Shield className="h-4 w-4" />,
    cruise: <Ship className="h-4 w-4" />,
    sparkles: <Sparkles className="h-4 w-4" />,
  };
  const highlights = includedTexts.map((text) => ({
    icon: iconFor[iconKeyForIncludedItem(text)] || iconFor.sparkles,
    text,
  }));

  // Timeline nodes
  const timelineNodes: { icon: React.ReactNode; label: string }[] = [];
  if (flightSvc?.service_data?.origin_city) timelineNodes.push({ icon: <MapPin className="h-4 w-4" />, label: flightSvc.service_data.origin_city });
  if (flightSvc?.service_data?.destination_city || quote.destination) timelineNodes.push({ icon: <Plane className="h-4 w-4" />, label: flightSvc?.service_data?.destination_city || quote.destination });
  if (hotelSvc) timelineNodes.push({ icon: <Hotel className="h-4 w-4" />, label: `${days - 1 > 0 ? days - 1 : days} noites` });
  if (svcTypes.has("car_rental")) timelineNodes.push({ icon: <Car className="h-4 w-4" />, label: "Locação" });
  if (svcTypes.has("attraction")) timelineNodes.push({ icon: <Ticket className="h-4 w-4" />, label: "Experiências" });
  if (flightSvc?.service_data?.origin_city) timelineNodes.push({ icon: <Plane className="h-4 w-4 rotate-180" />, label: "Retorno" });

  return (
    <div
      className="min-h-screen bg-[hsl(var(--background))]"
      style={getWalletBrandStyle(agentProfile?.agency_primary_color)}
    >
      {/* ─── Slim Premium Header ─── */}
      <header className="border-b border-border/20 bg-white/85 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-5 py-3 flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" /> Proposta de Viagem
          </span>
          <BrandText as="span" className="text-sm sm:text-base font-semibold tracking-tight text-foreground/85 truncate max-w-[55%] text-right">
            {agentProfile?.agency_name || "Proposta exclusiva"}
          </BrandText>
        </div>
      </header>

      {/* ─── HERO PREMIUM ─── */}
      <section className="relative w-full overflow-hidden">
        <div className="relative min-h-[520px] sm:min-h-[600px] w-full">
          {heroImage ? (
            <>
              <img
                src={heroImage}
                alt={quote.destination}
                className="absolute inset-0 h-full w-full object-cover scale-[1.02]"
                loading="eager"
              />
              {/* cinematic gradient overlay (only with image) */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/30 to-black/85" />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(0,0,0,0.55),transparent_65%)]" />
            </>
          ) : (
            <>
              {/* Solid primary-blue base (no image) */}
              <div className="absolute inset-0 bg-primary" />
              {/* Subtle top sheen for depth */}
              <div className="absolute inset-0 bg-gradient-to-b from-white/5 via-transparent to-transparent" />
              {/* Soft dark wash only near the bottom for text contrast */}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/55" />
            </>
          )}

          {/* floating agency logo badge — premium circular signature */}
          {agentProfile?.agency_logo_url && (
            <div className="absolute top-6 sm:top-8 left-1/2 -translate-x-1/2 z-10 h-28 w-28 sm:h-36 sm:w-36 overflow-hidden rounded-full bg-white p-2.5 sm:p-3 shadow-[0_20px_60px_-12px_rgba(0,0,0,0.55)] ring-1 ring-black/[0.06] flex items-center justify-center">
              <img
                src={agentProfile.agency_logo_url}
                alt={agentProfile.agency_name || "Agência"}
                className="h-full w-full object-contain"
              />
            </div>
          )}

          <div className="relative max-w-4xl mx-auto px-5 sm:px-8 pt-40 sm:pt-52 pb-20 sm:pb-24 flex flex-col text-white animate-fade-up">
            <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-white/15 backdrop-blur-md border border-white/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em]">
              <MapPin className="h-3 w-3" /> {quote.destination}
            </span>
            <h1 className="mt-4 text-[2.15rem] sm:text-7xl font-extrabold leading-[1.02] tracking-[-0.025em] max-w-3xl drop-shadow-[0_2px_24px_rgba(0,0,0,0.45)] whitespace-nowrap">
              {tripTitle || quote.destination}
            </h1>
            <p className="mt-4 text-base sm:text-xl font-light text-white/90 max-w-2xl leading-relaxed">
              {tripTitle
                ? `Uma experiência preparada com cuidado para ${quote.client_name}.`
                : `${days} ${days === 1 ? "dia" : "dias"} para viver ${quote.destination} de um jeito único — feito para ${quote.client_name}.`}
            </p>

            {/* meta chips */}
            <div className="mt-7 flex flex-wrap gap-2 sm:gap-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/12 backdrop-blur-md border border-white/20 px-3.5 py-1.5 text-xs sm:text-sm font-medium">
                <Calendar className="h-4 w-4 opacity-80" />
                {formatDateShort(quote.start_date)} – {formatDateShort(quote.end_date)}
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/12 backdrop-blur-md border border-white/20 px-3.5 py-1.5 text-xs sm:text-sm font-medium">
                <Sparkles className="h-4 w-4 opacity-80" />
                {days} {days === 1 ? "dia" : "dias"}
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/12 backdrop-blur-md border border-white/20 px-3.5 py-1.5 text-xs sm:text-sm font-medium">
                <Users className="h-4 w-4 opacity-80" />
                {quote.adults_count} adulto{quote.adults_count > 1 ? "s" : ""}
                {quote.children_count > 0 && ` + ${quote.children_count} criança${quote.children_count > 1 ? "s" : ""}`}
              </div>
              {flightSvc?.service_data?.origin_city && (
                <div className="inline-flex items-center gap-2 rounded-full bg-white/12 backdrop-blur-md border border-white/20 px-3.5 py-1.5 text-xs sm:text-sm font-medium">
                  <Plane className="h-4 w-4 opacity-80" />
                  Saindo de {flightSvc.service_data.origin_city}
                </div>
              )}
            </div>
          </div>

        </div>
      </section>

      <main className="max-w-4xl mx-auto px-5 sm:px-8 pt-16 sm:pt-20 pb-24 sm:pb-14 space-y-8 sm:space-y-10">
        {/* ─── Smart Trip Highlights ─── */}
        <section className="-mt-32 sm:-mt-40 relative z-10 animate-fade-up">
          <div className="rounded-3xl bg-white shadow-[0_30px_80px_-30px_rgba(0,0,0,0.25)] border border-border/40 p-7 sm:p-9 transition-shadow duration-500 hover:shadow-[0_40px_100px_-30px_rgba(0,0,0,0.3)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/80 mb-4">O que está incluso</p>
            <ul className="grid sm:grid-cols-2 gap-x-8 gap-y-3">
              {highlights.map((h, i) => (
                <li key={i} className="flex items-start gap-3 text-[15px] text-foreground/90 leading-snug">
                  <span className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
                    {h.icon}
                  </span>
                  <span className="font-medium">{h.text}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ─── Timeline visual ─── */}
        {timelineNodes.length >= 2 && (
          <section>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground text-center mb-5">Sua jornada</p>
            {/* Mobile: single-line horizontal scroll with edge fade indicating more items.
                Tablet/desktop: classic centered flex when space allows. */}
            <div className="relative">
              {/* Edge fade (mobile only) — sinaliza continuidade horizontal */}
              <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-background to-transparent z-10 sm:hidden" />
              <div
                className="flex items-center gap-1 overflow-x-auto sm:overflow-visible snap-x snap-mandatory sm:snap-none sm:justify-center sm:flex-wrap gap-y-3 px-1 -mx-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                role="list"
                aria-label="Etapas da sua jornada"
              >
                {timelineNodes.map((n, i) => (
                  <div key={i} className="flex items-center snap-start" role="listitem">
                    {/* Largura calculada para mostrar 3 itens inteiros + ~50% do 4º no mobile */}
                    <div className="flex flex-col items-center gap-1.5 w-[28vw] max-w-[110px] shrink-0 sm:w-auto sm:min-w-[110px]">
                      <div className="h-11 w-11 rounded-full bg-white border border-border shadow-sm flex items-center justify-center text-primary">
                        {n.icon}
                      </div>
                      <span className="text-[11px] sm:text-xs font-medium text-foreground/80 text-center leading-tight">{n.label}</span>
                    </div>
                    {i < timelineNodes.length - 1 && (
                      <div className="h-px w-4 sm:w-10 bg-gradient-to-r from-border via-foreground/20 to-border mx-1 shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ─── Destination Intro (auto-shown when content exists) ─── */}
        {(introText || introImages.length > 1) && (
          <DestinationIntroPublic
            text={introText}
            images={introImages.slice(1)}
            destination={quote.destination}
          />
        )}

        {/* ─── Services Section (collapsed by default) ─── */}
        {quote.services && quote.services.length > 0 && (
          <section className="space-y-5 animate-fade-up">
            <div className="text-center space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/80">Sua experiência</p>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Serviços incluídos</h2>
              <p className="text-sm text-muted-foreground">Toque em cada item para ver os detalhes completos.</p>
            </div>
            <div className="space-y-3">
              {quote.services.map((service, index) => (
                <CollapsibleServiceCard
                  key={service.id}
                  service={service}
                  showPrice={isNewLayout ? false : showDetailedPrices}
                  isOpen={openServiceIndices.has(index)}
                  onToggle={() => handleToggleService(index)}
                  showPaymentPerService={isNewLayout ? false : useServicePayment}
                  quote={quote}
                  showInvestmentInline={useNewInvestmentLayout && showDetailedPrices}
                />
              ))}
            </div>
          </section>
        )}

        {/* ─── Documentos anexados (integrados ao roteiro, logo após os serviços) ─── */}
        <PublicQuoteDocuments quoteId={quote.id} />

        {/* ─── Investment Highlight — premium, inverted hierarchy ─── */}
        {useNewInvestmentLayout && (
          <PublicInvestmentSummary
            quote={quote}
            services={quote.services || []}
            displayMode={
              (quote as any).hide_investment_total ? "detailed" : "both"
            }
            groupingMode={investmentLayout === "ungrouped" ? "ungrouped" : "grouped"}
            globalPayment={{
              mode: ((quote as any).payment_display_mode || "full_payment") as any,
              installments: (quote as any).installments_count || 10,
              entryPercentage: (quote as any).entry_percentage || 0,
              fullPaymentDiscountPercent: (quote as any).full_payment_discount_percent || 0,
              methodLabel: ((quote as any).payment_method_label as string | null) || null,
            }}
            useServicePayment={useServicePayment}
            paymentTerms={paymentTerms}
            hideServiceList={showDetailedPrices}
          />
        )}

        {!useNewInvestmentLayout && (quote as any).show_investment_section !== false && (() => {
          const mode = (quote as any).payment_display_mode || "full_payment";
          const installments = (quote as any).installments_count || 10;
          const entryPct = (quote as any).entry_percentage || 0;
          const discountPct = (quote as any).full_payment_discount_percent || 0;
          const methodLabel = formatPaymentMethodsInline((quote as any).payment_method_label) || null;
          const total = totalForBar;
          // Adicionais na entrada (somente no modo consolidado + parcelado com entrada)
          const entryExtras: QuoteEntryExtra[] =
            investmentLayout === "consolidated" && mode === "installments_with_entry"
              ? ((quote as any).entry_extras as QuoteEntryExtra[] | undefined) || []
              : [];
          const extrasTotal = computeExtrasTotal(entryExtras, total);
          const visibleExtras = entryExtras.filter((e) => e.visible_to_client);
          const investimentoTotal = total + extrasTotal;

          const headlineTotal = mode === "full_payment" && discountPct > 0
            ? total * (1 - discountPct / 100)
            : investimentoTotal;
          const isTotalOnly = mode === "total_only";

          let primaryDisplay: React.ReactNode = null;
          let secondaryDisplay: React.ReactNode = null;

          if (mode === "installments") {
            const installmentValue = total / (installments || 1);
            primaryDisplay = (
              <div className="flex flex-col items-center gap-1">
                <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                  A partir de
                </span>
                <span className="text-[1.75rem] sm:text-[2.5rem] font-bold tracking-tight text-primary leading-tight">
                  {installments}x de {formatCurrency(installmentValue)}
                </span>
                <span className="text-xs text-muted-foreground mt-1">
                  sem juros{methodLabel ? ` • ${methodLabel}` : ""}
                </span>
              </div>
            );
            secondaryDisplay = (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mt-4">
                <span>Valor à vista:</span>
                <span className="font-medium text-foreground/80">{formatCurrency(headlineTotal)}</span>
                {discountPct > 0 && (
                  <span className="line-through text-muted-foreground/60">{formatCurrency(total)}</span>
                )}
              </div>
            );
          } else if (mode === "installments_with_entry") {
            const baseEntry = total * (entryPct / 100);
            const entryValue = baseEntry + extrasTotal;
            const remainder = Math.max(0, investimentoTotal - entryValue);
            const installmentValue = remainder / (installments || 1);
            primaryDisplay = (
              <div className="flex flex-col items-center gap-1">
                <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                  Condição especial
                </span>
                <span className="text-[1.5rem] sm:text-[2.25rem] font-bold tracking-tight text-primary leading-tight text-center">
                  Entrada de {formatCurrency(entryValue)} + {installments}x de {formatCurrency(installmentValue)}
                </span>
                {methodLabel && (
                  <span className="text-xs text-muted-foreground mt-1">{methodLabel}</span>
                )}
              </div>
            );
            secondaryDisplay = (
              <div className="flex flex-col items-center justify-center gap-1 text-sm text-muted-foreground">
                <div className="flex items-center justify-center gap-2">
                  <span>Valor total:</span>
                  <span className="font-medium text-foreground/80">{formatCurrency(investimentoTotal)}</span>
                </div>
                {visibleExtras.length > 0 && (
                  <ul className="text-xs text-muted-foreground/90 space-y-0.5">
                    {visibleExtras.map((e) => (
                      <li key={e.id}>
                        + {e.description?.trim() || ENTRY_EXTRA_TYPE_LABELS[e.type]}:{" "}
                        <span className="font-medium text-foreground/80">
                          {formatCurrency(computeExtraAmount(e, total))}
                        </span>
                        {" "}na entrada
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          } else if (!isTotalOnly && discountPct > 0) {
            primaryDisplay = (
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.28em] text-primary/80">
                  Condição especial à vista
                </span>
                <span className="text-[1.75rem] sm:text-[2.25rem] font-bold tracking-tight text-foreground leading-tight">
                  {formatCurrency(headlineTotal)}
                </span>
                <span className="text-sm text-muted-foreground line-through mt-1">{formatCurrency(total)}</span>
              </div>
            );
            secondaryDisplay = (
              <p className="text-sm font-medium text-primary">
                {discountPct}% de desconto aplicado{methodLabel ? ` • ${methodLabel}` : ""}
              </p>
            );
          } else {
            primaryDisplay = (
              <div className="flex flex-col items-center gap-1">
                <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                  {isTotalOnly ? "Valor total da viagem" : "Investimento"}
                </span>
                <span className="text-[1.75rem] sm:text-[2.5rem] font-bold tracking-tight text-primary leading-tight">
                  {formatCurrency(total)}
                </span>
                {!isTotalOnly && methodLabel && (
                  <span className="text-xs text-muted-foreground mt-1">{methodLabel}</span>
                )}
              </div>
            );
            secondaryDisplay = isTotalOnly
              ? null
              : <p className="text-sm text-muted-foreground mt-4">Parcelamento disponível</p>;
          }

          return (
            <section
              className="rounded-2xl border border-primary/25 bg-primary/[0.05] p-6 sm:p-7 animate-fade-up"
              aria-labelledby="investimento-total-title"
            >
              <div className="flex flex-col items-center text-center">
                <span
                  className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm"
                  aria-hidden="true"
                >
                  <Wallet className="h-5 w-5" />
                </span>
                <p
                  id="investimento-total-title"
                  className="mt-3 text-[11px] sm:text-xs font-semibold uppercase tracking-[0.2em] text-primary/80"
                >
                  Investimento Total da Viagem
                </p>
                <div className="mt-4 flex flex-col items-center gap-1">
                  <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                    Número de passageiros
                  </p>
                  <p className="text-base sm:text-lg font-semibold text-primary">
                    {buildPassengerLabel(quote)}
                  </p>
                </div>
                <div className="mt-5 w-full flex justify-center">
                  <div className="inline-block rounded-2xl bg-white border border-primary/20 shadow-sm px-8 sm:px-14 py-5 sm:py-6 text-center">
                    {primaryDisplay}
                  </div>
                </div>
                {secondaryDisplay}
              </div>
            </section>
          );
        })()}

        {/* ─── Commercial CTA block (Scenario B: no total) ─── */}
        {!useNewInvestmentLayout && (quote as any).show_investment_section === false && !useServicePayment && (
          <section className="relative overflow-hidden rounded-3xl border border-border/40 bg-gradient-to-b from-white to-muted/30 p-8 sm:p-12 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.18)] animate-fade-up">
            <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
            <div className="relative text-center space-y-5 max-w-xl mx-auto">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary/80">Condições flexíveis</p>
              <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                Monte a melhor condição de pagamento para sua viagem
              </h3>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                Cada serviço pode ser parcelado de forma independente, com condições especiais de acordo com o fornecedor. Fale com seu consultor para encontrar o formato ideal para você.
              </p>
              {whatsappUrl && (
                <div className="pt-3 flex justify-center">
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative inline-flex items-center justify-center gap-2 rounded-full bg-[#25D366] hover:bg-[#20BD5A] text-white px-9 py-4 font-semibold text-sm shadow-[0_10px_30px_-8px_rgba(37,211,102,0.55)] transition-all hover:scale-[1.02] w-full sm:w-auto"
                  >
                    <WhatsAppIcon className="h-4 w-4" />
                    <span>Falar com meu consultor</span>
                  </a>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ─── Payment terms ─── */}
        {!useNewInvestmentLayout && paymentTerms && (
          <div className="rounded-2xl border border-border/40 bg-card p-6 sm:p-8 animate-fade-up">
            <div className="flex items-center gap-2 mb-3">
              <CreditCard className="h-4 w-4 text-primary" />
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Condições de pagamento</h3>
            </div>
            <p className="text-sm text-foreground/85 leading-relaxed"><FormattedText>{paymentTerms}</FormattedText></p>
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
            <p className="text-xs text-muted-foreground"><FormattedText>{validityDisclaimer}</FormattedText></p>
          )}
          {!validUntil && !validityDisclaimer && (
            <p className="text-xs text-muted-foreground">
              Proposta válida por 7 dias a partir da data de emissão. Valores sujeitos a alteração conforme disponibilidade.
            </p>
          )}
        </div>

        {/* ─── Agent Signature ─── */}
        {(agentProfile || (quote as any).signature_snapshot) && (
          <section className="relative overflow-hidden rounded-3xl border border-border/30 bg-white shadow-[0_12px_40px_-16px_rgba(0,0,0,0.12)] animate-fade-up">
            <div className="relative px-5 sm:px-7 py-6 sm:py-7">
              {/* Title: centered relative to the entire white card */}
              <p className="text-[10px] lg:text-[11px] font-semibold uppercase tracking-[0.28em] text-primary/80 whitespace-nowrap text-center mb-4 sm:mb-5">
                {signatureContact.title || "Sua consultora de viagens"}
              </p>

              {/* MOBILE: horizontal layout matching reference image */}
              <div className="sm:hidden flex items-center gap-4">
                {/* Avatar */}
                <div className="shrink-0">
                  {signatureContact.photo_url ? (
                    <img
                      src={signatureContact.photo_url}
                      alt={signatureContact.name}
                      className="h-16 w-16 rounded-full object-cover shadow-[0_4px_14px_-4px_rgba(0,0,0,0.18)] ring-[3px] ring-white"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground text-xl font-bold shadow-[0_4px_14px_-4px_rgba(0,0,0,0.18)] ring-[3px] ring-white">
                      {signatureContact.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 space-y-0.5 pt-0.5">
                  <p className="text-lg font-bold tracking-tight text-foreground leading-tight">
                    {signatureContact.name}
                  </p>
                  {agentProfile?.agency_name && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Briefcase className="h-3 w-3 text-primary/70 shrink-0" />
                      <BrandText as="span" className="font-medium">{agentProfile.agency_name}</BrandText>
                    </div>
                  )}
                  {agentProfile && (agentProfile.city || agentProfile.state) && (
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/80">
                      <MapPin className="h-3 w-3 text-primary/60 shrink-0" />
                      <span>{[agentProfile.city, agentProfile.state].filter(Boolean).join(", ")}</span>
                    </div>
                  )}
                  <p className="pt-1 text-xs text-foreground/60 leading-snug italic">
                    "{signatureContact.custom_message || "Estou aqui para tirar suas dúvidas e cuidar de cada detalhe da sua viagem."}"
                  </p>
                  {signatureContact.email && (
                    <p className="text-[11px] text-muted-foreground">{signatureContact.email}</p>
                  )}
                </div>
              </div>

              {/* DESKTOP/TABLET: 3-col horizontal layout */}
              <div className="hidden sm:flex items-center gap-5 lg:gap-7">
                {/* ── Col 1: Logo / Avatar ── */}
                <div className="shrink-0 flex items-center justify-center">
                  {signatureContact.photo_url ? (
                    <img
                      src={signatureContact.photo_url}
                      alt={signatureContact.name}
                      className="h-[72px] w-[72px] lg:h-20 lg:w-20 rounded-full object-cover shadow-[0_4px_14px_-4px_rgba(0,0,0,0.18)] ring-[3px] ring-white"
                    />
                  ) : (
                    <div className="h-[72px] w-[72px] lg:h-20 lg:w-20 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground text-2xl font-bold shadow-[0_4px_14px_-4px_rgba(0,0,0,0.18)] ring-[3px] ring-white">
                      {signatureContact.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Divider */}
                <div className="w-px h-14 lg:h-16 bg-border/40 shrink-0" />

                {/* ── Col 2: Info ── */}
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="text-xl lg:text-[1.65rem] font-bold tracking-tight text-foreground leading-tight">
                    {signatureContact.name}
                  </p>
                  {agentProfile?.agency_name && (
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Briefcase className="h-3.5 w-3.5 text-primary/70 shrink-0" />
                      <BrandText as="span" className="font-medium">{agentProfile.agency_name}</BrandText>
                    </div>
                  )}
                  {agentProfile && (agentProfile.city || agentProfile.state) && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground/80">
                      <MapPin className="h-3.5 w-3.5 text-primary/60 shrink-0" />
                      <span>{[agentProfile.city, agentProfile.state].filter(Boolean).join(", ")}</span>
                    </div>
                  )}
                  <p className="pt-1 text-sm text-foreground/60 leading-snug italic">
                    "{signatureContact.custom_message || "Estou aqui para tirar suas dúvidas e cuidar de cada detalhe da sua viagem."}"
                  </p>
                  {signatureContact.email && (
                    <p className="text-[11px] text-muted-foreground">{signatureContact.email}</p>
                  )}
                </div>

                {/* Divider */}
                <div className="w-px h-14 lg:h-16 bg-border/40 shrink-0" />

                {/* ── Col 3: CTA ── */}
                <div className="shrink-0 flex items-center">
                  {whatsappUrl && (
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2.5 rounded-full bg-[#25D366] hover:bg-[#20BD5A] text-white px-6 lg:px-7 py-3 font-semibold text-sm shadow-[0_6px_20px_-6px_rgba(37,211,102,0.45)] transition-all hover:scale-[1.03] whitespace-nowrap"
                    >
                      <WhatsAppIcon className="h-5 w-5 shrink-0" />
                      <span>Conversar no WhatsApp</span>
                    </a>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* ─── Floating mobile CTA — aparece ao rolar para baixo, recolhido no topo ─── */}
      {whatsappUrl && <MobileFloatingCta href={whatsappUrl} />}
    </div>
  );
}
