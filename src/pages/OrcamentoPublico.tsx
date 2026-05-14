import { useState, useEffect, useRef } from "react";
import { setOgMeta } from "@/lib/ogMeta";
import { useParams } from "react-router-dom";
import { usePublicQuote } from "@/hooks/useQuotes";
import { ORCAMENTO_DOMAIN } from "@/lib/orcamento-domain";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2, MapPin, Calendar, Users, Plane, PlaneTakeoff, PlaneLanding, Hotel, Car, ArrowRightLeft, Ticket, Shield, Ship, Package, Briefcase, CreditCard, Tag, ChevronDown, Map, FileText, Image as ImageIcon, FileSpreadsheet, FileType, Download, Paperclip, Eye, Sparkles, HeartHandshake, Headphones, ShieldCheck, Compass, Award, MessageCircle, Clock, BedDouble, UtensilsCrossed, CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Quote, QuoteService, ServiceType } from "@/types/quote";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AgentProfile } from "@/hooks/useAgentProfile";
import { ServiceImageCarousel } from "@/components/quote/ServiceImageCarousel";
import { extractServicePaymentConfig, getServicePaymentDisplay } from "@/lib/servicePayment";
import { formatQuoteCurrency, getQuoteCurrencyInfo, getCurrencySymbol, type QuoteCurrency } from "@/lib/quoteCurrency";
import { DestinationIntroPublic } from "@/components/quote/DestinationIntroPublic";
import { BrandText } from "@/components/ui/brand-text";
import { FormattedText } from "@/components/ui/formatted-text";

const SERVICE_LABELS: Record<ServiceType, string> = {
  flight: "Passagem Aérea", hotel: "Hospedagem", car_rental: "Locação de Veículo",
  transfer: "Transfer", attraction: "Ingressos/Atrações", insurance: "Seguro Viagem",
  cruise: "Cruzeiro", circuit: "Circuitos", other: "Outros Serviços",
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
  cruise: <Ship className="h-5 w-5" />, circuit: <Map className="h-5 w-5" />, other: <Package className="h-5 w-5" />,
};

const SERVICE_COLORS: Record<ServiceType, string> = {
  flight: "from-primary/15 to-primary/5 text-primary",
  hotel: "from-amber-500/15 to-amber-600/5 text-amber-600",
  car_rental: "from-emerald-500/15 to-emerald-600/5 text-emerald-600",
  transfer: "from-violet-500/15 to-violet-600/5 text-violet-600",
  attraction: "from-pink-500/15 to-pink-600/5 text-pink-600",
  insurance: "from-cyan-500/15 to-cyan-600/5 text-cyan-600",
  cruise: "from-primary/10 to-primary/5 text-primary",
  circuit: "from-indigo-500/15 to-indigo-600/5 text-indigo-600",
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
      // Multi-leg support (backward compat)
      const outLegs = data.outbound_legs?.length ? data.outbound_legs : data.outbound_detail ? [data.outbound_detail] : [];
      const retLegs = data.return_legs?.length ? data.return_legs : data.return_detail ? [data.return_detail] : [];
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
  const outLegs: any[] = data.outbound_legs?.length ? data.outbound_legs : data.outbound_detail ? [data.outbound_detail] : [];
  const retLegs: any[] = data.return_legs?.length ? data.return_legs : data.return_detail ? [data.return_detail] : [];
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

function HotelBody({ data }: { data: any }) {
  const nights = nightsBetween(data.check_in, data.check_out);
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
        <StayRow icon={<PlaneLanding className="h-3 w-3 mr-1" />} label="Check-in" value={formatDateShort(data.check_in)} />
        <div className="flex flex-col items-center text-muted-foreground">
          <ArrowRight className="h-4 w-4" />
          {nights && <span className="text-[10px] font-semibold mt-0.5">{nights} {nights === 1 ? "noite" : "noites"}</span>}
        </div>
        <StayRow icon={<PlaneTakeoff className="h-3 w-3 mr-1" />} label="Check-out" value={formatDateShort(data.check_out)} />
      </div>
      <div className="flex flex-wrap gap-3 text-sm">
        {data.room_type && (
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
          {data.transfer_type === "arrival" ? "Chegada" : "Saída"}
        </span>
        {data.service_category && (
          <span className="text-[11px] text-muted-foreground uppercase tracking-wider">
            {data.service_category === "private" ? "Privativo" : "Regular"}
          </span>
        )}
      </div>
      <div className="text-base font-semibold text-foreground tracking-tight">{data.location}</div>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground tabular-nums">
        <Calendar className="h-3.5 w-3.5" />{formatDateShort(data.date)}
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

function ServiceBody({ service }: { service: QuoteService }) {
  const data = service.service_data as any;
  switch (service.service_type) {
    case "flight": return <FlightBody data={data} />;
    case "hotel": return <HotelBody data={data} />;
    case "car_rental": return <CarBody data={data} />;
    case "transfer": return <TransferBody data={data} />;
    case "attraction": return <AttractionBody data={data} />;
    case "insurance": return <InsuranceBody data={data} />;
    case "cruise": return <CruiseBody data={data} />;
    default: return null;
  }
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
        <div className="px-5 py-4 space-y-4">
          {isOpen && (() => {
            const imgs = (service as any).image_urls?.length ? (service as any).image_urls : (service.image_url ? [service.image_url] : []);
            return imgs.length > 0 ? (
              <ServiceImageCarousel images={imgs} alt={getServiceLabel(service)} />
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
            <ServiceBody service={service} />
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
          {/* Per-service payment display */}
          {isOpen && showPaymentPerService && (() => {
            const payConfig = extractServicePaymentConfig(service);
            if (!payConfig.is_custom_payment) return null;
            const display = getServicePaymentDisplay(service.amount, payConfig);
            if (!display) return null;
            return (
              <div className="mt-2 rounded-lg bg-primary/5 border border-primary/20 px-4 py-3 flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" />
                <div className="flex flex-col">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-primary/80">Parcelamento</span>
                  <span className="text-sm font-semibold text-primary">{display}</span>
                </div>
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
    <div className="rounded-2xl border border-border/40 bg-white shadow-sm p-6 sm:p-8">
      <div className="flex items-center gap-2 mb-4">
        <Paperclip className="h-5 w-5 text-primary" />
        <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
          Documentos do seu orçamento
        </h3>
      </div>
      <ul className="divide-y divide-border/40 rounded-md border border-border/40 overflow-hidden">
        {documents.map((doc) => {
          const Icon = getDocIcon(doc.file_type, doc.file_name);
          return (
            <li
              key={doc.id}
              className="flex items-center gap-3 px-3 py-3 bg-white hover:bg-muted/30 transition-colors"
            >
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate" title={doc.file_name}>
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
                  className="h-8 px-2 text-xs"
                  onClick={() => openDoc(doc, false)}
                  title="Visualizar"
                >
                  <Eye className="h-4 w-4 sm:mr-1" />
                  <span className="hidden sm:inline">Ver</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-xs"
                  onClick={() => openDoc(doc, true)}
                  title="Baixar"
                >
                  <Download className="h-4 w-4 sm:mr-1" />
                  <span className="hidden sm:inline">Baixar</span>
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
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

  // Premium UX: services start collapsed (resumo first, detalhes on demand)
  useEffect(() => {
    if (!servicesInitialized.current && quote?.services?.length) {
      setOpenServiceIndices(new Set());
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
  const startDate = parseLocalDate(quote.start_date);
  const endDate = parseLocalDate(quote.end_date);
  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  const whatsappNumber = agentProfile?.phone?.replace(/\D/g, "") || "";
  const whatsappMessage = encodeURIComponent(`Olá! Vi o orçamento para ${quote.destination} e gostaria de mais informações.`);
  const whatsappUrl = whatsappNumber
    ? `https://wa.me/${whatsappNumber.startsWith("55") ? whatsappNumber : `55${whatsappNumber}`}?text=${whatsappMessage}`
    : "";

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

  // Smart highlights inferred from services
  const svcTypes = new Set((quote.services || []).map(s => s.service_type));
  const hotelSvc = (quote.services || []).find(s => s.service_type === "hotel") as any;
  const flightSvc = (quote.services || []).find(s => s.service_type === "flight") as any;
  const highlights: { icon: React.ReactNode; text: string }[] = [];
  if (hotelSvc?.service_data) {
    const meal = (hotelSvc.service_data.meal_plan || "").toLowerCase();
    const isAI = meal.includes("all") || meal.includes("inclu");
    highlights.push({ icon: <Hotel className="h-4 w-4" />, text: `${hotelSvc.service_data.hotel_name || "Hospedagem selecionada"}${isAI ? " • All Inclusive" : ""}` });
  }
  if (flightSvc?.service_data) {
    highlights.push({ icon: <Plane className="h-4 w-4" />, text: `Voos${flightSvc.service_data.origin_city ? ` saindo de ${flightSvc.service_data.origin_city}` : ""}` });
  }
  if (svcTypes.has("car_rental")) highlights.push({ icon: <Car className="h-4 w-4" />, text: "Carro à disposição" });
  if (svcTypes.has("transfer")) highlights.push({ icon: <ArrowRightLeft className="h-4 w-4" />, text: "Transfers privativos inclusos" });
  if (svcTypes.has("attraction")) highlights.push({ icon: <Ticket className="h-4 w-4" />, text: "Experiências e passeios selecionados" });
  if (svcTypes.has("insurance")) highlights.push({ icon: <Shield className="h-4 w-4" />, text: "Seguro viagem incluso" });
  if (svcTypes.has("cruise")) highlights.push({ icon: <Ship className="h-4 w-4" />, text: "Cruzeiro reservado" });
  if (highlights.length === 0) highlights.push({ icon: <Sparkles className="h-4 w-4" />, text: "Roteiro personalizado pela sua agência" });

  // Timeline nodes
  const timelineNodes: { icon: React.ReactNode; label: string }[] = [];
  if (flightSvc?.service_data?.origin_city) timelineNodes.push({ icon: <MapPin className="h-4 w-4" />, label: flightSvc.service_data.origin_city });
  if (flightSvc?.service_data?.destination_city || quote.destination) timelineNodes.push({ icon: <Plane className="h-4 w-4" />, label: flightSvc?.service_data?.destination_city || quote.destination });
  if (hotelSvc) timelineNodes.push({ icon: <Hotel className="h-4 w-4" />, label: `${days - 1 > 0 ? days - 1 : days} noites` });
  if (svcTypes.has("car_rental")) timelineNodes.push({ icon: <Car className="h-4 w-4" />, label: "Locação" });
  if (svcTypes.has("attraction")) timelineNodes.push({ icon: <Ticket className="h-4 w-4" />, label: "Experiências" });
  if (flightSvc?.service_data?.origin_city) timelineNodes.push({ icon: <Plane className="h-4 w-4 rotate-180" />, label: "Retorno" });

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] pb-28 sm:pb-0">
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
        <div className="relative h-[55vh] min-h-[420px] sm:h-[60vh] sm:min-h-[520px] w-full">
          {heroImage ? (
            <img
              src={heroImage}
              alt={quote.destination}
              className="absolute inset-0 h-full w-full object-cover scale-[1.02]"
              loading="eager"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-primary/40 via-primary/20 to-slate-900" />
          )}
          {/* cinematic gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/30 to-black/85" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(0,0,0,0.55),transparent_65%)]" />

          {/* floating agency logo badge — premium circular signature */}
          {agentProfile?.agency_logo_url && (
            <div className="absolute top-6 sm:top-8 left-1/2 -translate-x-1/2 z-10 h-32 w-32 sm:h-40 sm:w-40 rounded-full bg-white p-3 sm:p-4 shadow-[0_20px_60px_-12px_rgba(0,0,0,0.55)] ring-1 ring-black/[0.06] flex items-center justify-center">
              <img
                src={agentProfile.agency_logo_url}
                alt={agentProfile.agency_name || "Agência"}
                className="h-full w-full object-contain"
              />
            </div>
          )}

          <div className="relative h-full max-w-4xl mx-auto px-5 sm:px-8 flex flex-col justify-end pb-20 sm:pb-24 text-white animate-fade-up">
            <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-white/15 backdrop-blur-md border border-white/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em]">
              <MapPin className="h-3 w-3" /> {quote.destination}
            </span>
            <h1 className="mt-4 text-[2.6rem] sm:text-7xl font-extrabold leading-[1.02] tracking-[-0.025em] max-w-3xl drop-shadow-[0_2px_24px_rgba(0,0,0,0.45)]">
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

      <main className="max-w-4xl mx-auto px-5 sm:px-8 pt-16 sm:pt-20 pb-10 sm:pb-14 space-y-14 sm:space-y-20">
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
            <div className="flex items-center justify-center flex-wrap gap-y-3">
              {timelineNodes.map((n, i) => (
                <div key={i} className="flex items-center">
                  <div className="flex flex-col items-center gap-1.5 min-w-[78px] sm:min-w-[110px]">
                    <div className="h-11 w-11 rounded-full bg-white border border-border shadow-sm flex items-center justify-center text-primary">
                      {n.icon}
                    </div>
                    <span className="text-[11px] sm:text-xs font-medium text-foreground/80 text-center leading-tight">{n.label}</span>
                  </div>
                  {i < timelineNodes.length - 1 && (
                    <div className="h-px w-6 sm:w-10 bg-gradient-to-r from-border via-foreground/20 to-border mx-1" />
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ─── Destination Intro (text + extra images carousel) ─── */}
        {(quote as any).show_destination_intro !== false && (introText || introImages.length > 1) && (
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
                  showPrice={showDetailedPrices}
                  isOpen={openServiceIndices.has(index)}
                  onToggle={() => handleToggleService(index)}
                  showPaymentPerService={useServicePayment}
                />
              ))}
            </div>
          </section>
        )}

        {/* ─── Investment Highlight (after experience for premium narrative) ─── */}
        {(quote as any).show_investment_section !== false && (() => {
          const mode = (quote as any).payment_display_mode || "full_payment";
          const installments = (quote as any).installments_count || 10;
          const entryPct = (quote as any).entry_percentage || 0;
          const discountPct = (quote as any).full_payment_discount_percent || 0;
          const methodLabel = (quote as any).payment_method_label as string | null;
          const total = totalForBar;

          // Total is always the protagonist; parcel/condition is a refined secondary line.
          const headlineTotal = mode === "full_payment" && discountPct > 0
            ? total * (1 - discountPct / 100)
            : total;

          const mainDisplay = (
            <div className="flex flex-col items-center gap-1">
              <span className="text-5xl sm:text-6xl font-extrabold tracking-tight text-foreground">
                {formatCurrency(headlineTotal)}
              </span>
              {mode === "full_payment" && discountPct > 0 && (
                <span className="text-sm text-muted-foreground line-through">{formatCurrency(total)}</span>
              )}
            </div>
          );

          let subtitleDisplay: React.ReactNode = null;
          if (mode === "installments") {
            const installmentValue = total / (installments || 1);
            subtitleDisplay = (
              <p className="text-sm sm:text-base font-medium text-foreground/70">
                A partir de <span className="font-semibold text-foreground">{formatCurrency(installmentValue)}</span>/mês
                <span className="block text-xs text-muted-foreground mt-1">
                  Em até {installments}x sem juros{methodLabel ? ` • ${methodLabel}` : ""}
                </span>
              </p>
            );
          } else if (mode === "installments_with_entry") {
            const entryValue = total * (entryPct / 100);
            const remainder = total - entryValue;
            const installmentValue = remainder / (installments || 1);
            subtitleDisplay = (
              <p className="text-sm sm:text-base font-medium text-foreground/70">
                Entrada de <span className="font-semibold text-foreground">{formatCurrency(entryValue)}</span> + {installments}x de <span className="font-semibold text-foreground">{formatCurrency(installmentValue)}</span>
                {methodLabel && (
                  <span className="block text-xs text-muted-foreground mt-1">{methodLabel}</span>
                )}
              </p>
            );
          } else if (discountPct > 0) {
            subtitleDisplay = (
              <p className="text-sm font-medium text-primary">
                Condição especial: {discountPct}% de desconto{methodLabel ? ` • ${methodLabel}` : ""}
              </p>
            );
          } else {
            subtitleDisplay = (
              <p className="text-sm text-muted-foreground">
                Parcelamento disponível{methodLabel ? ` • ${methodLabel}` : ""}
              </p>
            );
          }

          return (
            <section className="relative overflow-hidden rounded-3xl border border-border/40 bg-gradient-to-b from-white to-muted/30 p-8 sm:p-12 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.28)] animate-fade-up">
              <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
              <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
              <div className="relative text-center space-y-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary/80">
                  {showDetailedPrices ? "Investimento total" : "Valor do pacote"}
                </p>
                {mainDisplay}
                {subtitleDisplay}
                {quote.services && quote.services.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {quote.services.length} serviço{quote.services.length > 1 ? "s" : ""} incluído{quote.services.length > 1 ? "s" : ""}
                  </p>
                )}
                {whatsappUrl && (
                  <div className="pt-5 flex justify-center">
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full bg-[#25D366] hover:bg-[#20BD5A] text-white px-9 py-4 font-semibold text-sm shadow-[0_10px_30px_-8px_rgba(37,211,102,0.55)] transition-all hover:scale-[1.02] w-full sm:w-auto"
                    >
                      <span className="pointer-events-none absolute inset-0 -z-0 overflow-hidden rounded-full">
                        <span className="absolute inset-y-0 -left-1/2 w-1/3 bg-gradient-to-r from-transparent via-white/35 to-transparent blur-sm animate-shimmer-slide" />
                      </span>
                      <WhatsAppIcon className="relative h-4 w-4" />
                      <span className="relative">Quero reservar essa viagem</span>
                    </a>
                  </div>
                )}
              </div>
            </section>
          );
        })()}

        {/* ─── Commercial CTA block (Scenario B: no total) ─── */}
        {(quote as any).show_investment_section === false && (
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
                    className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full bg-[#25D366] hover:bg-[#20BD5A] text-white px-9 py-4 font-semibold text-sm shadow-[0_10px_30px_-8px_rgba(37,211,102,0.55)] transition-all hover:scale-[1.02] w-full sm:w-auto"
                  >
                    <span className="pointer-events-none absolute inset-0 -z-0 overflow-hidden rounded-full">
                      <span className="absolute inset-y-0 -left-1/2 w-1/3 bg-gradient-to-r from-transparent via-white/35 to-transparent blur-sm animate-shimmer-slide" />
                    </span>
                    <WhatsAppIcon className="relative h-4 w-4" />
                    <span className="relative">Falar com meu consultor</span>
                  </a>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ─── Payment terms ─── */}
        {paymentTerms && (
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

        {/* ─── Documentos ─── */}
        <PublicQuoteDocuments quoteId={quote.id} />

        {/* ─── Agent Signature ─── */}
        {agentProfile && (
          <section className="relative overflow-hidden rounded-[2rem] border border-border/40 bg-gradient-to-br from-white via-white to-muted/30 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.18)] animate-fade-up">
            <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
            <div className="relative p-8 sm:p-12">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary/80 text-center mb-7">
                Sua consultora de viagens
              </p>
              <div className="flex flex-col items-center text-center gap-5">
                <div className="relative">
                  <span className="absolute inset-0 -m-1.5 rounded-full bg-gradient-to-br from-primary/30 to-primary/0 blur-md" aria-hidden />
                  {agentProfile.avatar_url ? (
                    <img
                      src={agentProfile.avatar_url}
                      alt={agentProfile.name}
                      className="relative h-32 w-32 rounded-full object-cover ring-4 ring-white shadow-[0_18px_40px_-12px_rgba(0,0,0,0.25)]"
                    />
                  ) : (
                    <div className="relative h-32 w-32 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground text-4xl font-bold ring-4 ring-white shadow-[0_18px_40px_-12px_rgba(0,0,0,0.25)]">
                      {agentProfile.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="space-y-1.5 max-w-md">
                  <p className="text-2xl font-bold tracking-tight text-foreground">{agentProfile.name}</p>
                  {agentProfile.agency_name && (
                    <BrandText as="p" className="text-sm text-muted-foreground font-medium">{agentProfile.agency_name}</BrandText>
                  )}
                  {(agentProfile.city || agentProfile.state) && (
                    <p className="text-xs text-muted-foreground">{[agentProfile.city, agentProfile.state].filter(Boolean).join(", ")}</p>
                  )}
                  <p className="pt-3 text-[15px] text-foreground/75 leading-relaxed italic">
                    “Estou aqui para tirar suas dúvidas e cuidar de cada detalhe da sua viagem.”
                  </p>
                </div>
                {whatsappUrl && (
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative mt-1 inline-flex items-center justify-center gap-2.5 overflow-hidden rounded-full bg-[#25D366] hover:bg-[#20BD5A] text-white px-9 py-3.5 font-semibold text-sm shadow-[0_10px_30px_-8px_rgba(37,211,102,0.55)] transition-all hover:scale-[1.03]"
                  >
                    <span className="pointer-events-none absolute inset-0 -z-0 overflow-hidden rounded-full">
                      <span className="absolute inset-y-0 -left-1/2 w-1/3 bg-gradient-to-r from-transparent via-white/35 to-transparent blur-sm animate-shimmer-slide" />
                    </span>
                    <WhatsAppIcon className="relative h-5 w-5" />
                    <span className="relative">Conversar no WhatsApp</span>
                  </a>
                )}
              </div>
            </div>
          </section>
        )}
      </main>

      {/* ─── Sticky mobile conversion bar ─── */}
      {whatsappUrl && (
        <div className="fixed bottom-0 inset-x-0 z-30 sm:hidden border-t border-border/30 bg-white/95 backdrop-blur-xl shadow-[0_-10px_32px_-14px_rgba(0,0,0,0.18)]">
          <div className="flex items-center gap-3 px-4 py-3 max-w-4xl mx-auto">
            {(quote as any).show_investment_section !== false ? (() => {
              const mode = (quote as any).payment_display_mode || "full_payment";
              const installments = (quote as any).installments_count || 10;
              const entryPct = (quote as any).entry_percentage || 0;
              const discountPct = (quote as any).full_payment_discount_percent || 0;
              const total = totalForBar;

              // When discount applies, show discounted total as "from" baseline
              const baseTotal = mode === "full_payment" && discountPct > 0
                ? total * (1 - discountPct / 100)
                : total;

              const installmentValue = baseTotal / (installments || 1);

              return (
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    {mode === "installments_with_entry" ? "Condição de pagamento" : "A partir de"}
                  </p>
                  <p className="text-[19px] font-extrabold text-foreground tracking-tight leading-none mt-0.5">
                    {formatCurrency(installmentValue)}<span className="text-[13px] font-semibold text-muted-foreground">/mês</span>
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                    {mode === "installments_with_entry"
                      ? `Entrada de ${formatCurrency(total * (entryPct / 100))} + ${installments}x sem juros`
                      : mode === "installments"
                        ? `Em até ${installments}x sem juros`
                        : discountPct > 0
                          ? `Condição especial à vista`
                          : `Parcelamento disponível`}
                  </p>
                </div>
              );
            })() : (
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary/80">Condições flexíveis</p>
                <p className="text-[15px] font-bold text-foreground leading-tight truncate">
                  Parcele cada serviço do seu jeito
                </p>
              </div>
            )}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-[#25D366] text-white px-5 py-3 font-semibold text-sm shadow-[0_8px_24px_-6px_rgba(37,211,102,0.55)] active:scale-95 transition-transform shrink-0"
            >
              <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-full">
                <span className="absolute inset-y-0 -left-1/2 w-1/3 bg-gradient-to-r from-transparent via-white/40 to-transparent blur-sm animate-shimmer-slide" />
              </span>
              <WhatsAppIcon className="relative h-4 w-4" /> <span className="relative">Quero reservar</span>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
