import type { CruiseShipContent } from "./types";
import { dateLabel, groupMonths, variantCalls, variantMonths, type ItineraryGroup } from "./itineraryGroups";

export interface CruiseQuoteForm {
  name: string;
  phone: string;
  email: string;
  period: string; // YYYY-MM or ""
  adults: number;
  children: number;
  ages: string;
  cabin: string;
  consent: boolean;
}

/** Route context chosen on the page: a group, optionally an exact order and a departure date. */
export interface CruiseRouteSelection {
  group: ItineraryGroup | null;
  variantIndex: number | null; // null = any order of this combination
  date: string | null; // one of the variant dates, or null
}

export const HELP_LABEL = "Quero ajuda para escolher";

export function validCruiseQuote(f: CruiseQuoteForm): boolean {
  const phone = f.phone.replace(/\D/g, "");
  const email = f.email.trim();
  const phoneOk = /^[1-9]{2}\d{8,9}$/.test(phone);
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  return f.name.trim().length >= 3 && phoneOk && (!email || emailOk)
    && Number.isInteger(f.adults) && f.adults >= 1 && f.adults <= 20
    && Number.isInteger(f.children) && f.children >= 0 && f.children <= 10
    && (f.children === 0 || f.ages.trim().length > 0)
    && f.consent;
}

const monthName = (ym: string) =>
  new Date(`${ym}-01T12:00:00Z`).toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });

/** Human route description used in the CRM note (exact ship/line/route/order/months/date). */
export function describeRoute(sel: CruiseRouteSelection, homePort: string): { route: string; order: string; months: string; date: string } {
  const g = sel.group;
  if (!g) return { route: HELP_LABEL, order: "", months: "", date: "" };
  const v = sel.variantIndex != null ? g.variants[sel.variantIndex] : null;
  const order = v
    ? v.ports.join(" → ")
    : g.variants.length === 1 ? g.variants[0].ports.join(" → ") : `Qualquer ordem (${g.variants.map(variantCalls).join(" | ")})`;
  const months = (v ? variantMonths(v) : groupMonths(g)).join(", ");
  return {
    route: `${g.region} · ${g.n} noites · ${g.title} · embarque ${homePort}`,
    order,
    months,
    date: sel.date ? dateLabel(sel.date) : "",
  };
}

export function cruiseQuotePayload(ship: CruiseShipContent, sel: CruiseRouteSelection, f: CruiseQuoteForm, honeypot: string) {
  const homePort = sel.group?.variants[0]?.ports[0] ?? "";
  const r = describeRoute(sel, homePort);
  const pax = `${f.adults} adulto(s), ${f.children} criança(s)${f.children ? ` (idades: ${f.ages.trim()})` : ""}`;
  const period = f.period ? monthName(f.period) : "";
  const parts = [
    `Cruzeiro: ${ship.shipName} · ${ship.lineName}`,
    `Roteiro: ${r.route}`,
    r.order && `Ordem das escalas: ${r.order}`,
    r.date ? `Saída selecionada: ${r.date}` : r.months && `Meses com saídas: ${r.months}`,
    period && `Quando deseja viajar: ${period}`,
    sel.group && `Noites: ${sel.group.n}`,
    `Cabine: ${f.cabin || HELP_LABEL}`,
    `Passageiros: ${pax}`,
    `Origem: Site / Página do navio ${ship.shipName}`,
  ].filter(Boolean) as string[];
  return {
    service_key: "cruzeiros",
    service_label: `Cruzeiro — ${ship.shipName}`,
    lead_name: f.name.trim(),
    lead_phone: f.phone,
    lead_email: f.email.trim(),
    preferred_channel: "WhatsApp",
    destination: sel.group ? `${ship.shipName} · ${sel.group.region} · ${sel.group.title}` : ship.shipName,
    summary: parts.join(" | "),
    notes: `Solicitação pela página do navio ${ship.shipName} (${ship.lineName}).`,
    consent: f.consent,
    consent_version: "v1",
    honeypot,
    details: {
      companhia: ship.lineName,
      navio: ship.shipName,
      regiao: sel.group?.region ?? "",
      noites: sel.group?.n ?? "",
      roteiro: r.route,
      ordem_escalas: r.order,
      meses_saidas: r.months,
      data_saida: sel.date ?? "",
      periodo_desejado: f.period,
      cabine: f.cabin || HELP_LABEL,
      adultos: f.adults,
      criancas: f.children,
      idades_criancas: f.children ? f.ages.trim() : "",
      origem: `Site / Página do navio ${ship.shipName}`,
    },
  };
}
