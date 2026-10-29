import type { CircuitTour } from "./types";
import { convertWithRate, isValidRate } from "@/lib/fxConversion";

export function circuitNights(circuit: CircuitTour, city: string): number {
  return circuit.itinerary.filter(day => day.overnightCity === city).length;
}

export function convertCircuitPrice(value: number, rate?: number): number | undefined {
  return isValidRate(rate) ? convertWithRate(value, rate, "TO_BRL") : undefined;
}

/** Acréscimo sobre o câmbio comercial para aproximar do câmbio turismo. */
export const TOURISM_FX_MARKUP = 0.04;
export const tourismRate = (commercial?: number): number | undefined =>
  isValidRate(commercial) ? Math.round(commercial * (1 + TOURISM_FX_MARKUP) * 10000) / 10000 : undefined;

/** Mantém só meses com algum domingo de hoje em diante (e só esses dias). */
export function upcomingDepartures(departures: CircuitTour["departures"], today: Date = new Date()) {
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  return departures
    .map(m => ({ ...m, days: m.days.filter(d => {
      const iso = circuitDepartureDate(m.month, d);
      if (!iso) return true;
      const [y, mo, da] = iso.split("-").map(Number);
      return new Date(y, mo - 1, da).getTime() >= t;
    }) }))
    .filter(m => m.days.length > 0);
}

export const circuitMoney = (value: number, currency: CircuitTour["currency"]) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);

const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

export function circuitDepartureDate(month: string, day: number): string {
  const [name, year] = month.toLowerCase().split(" ");
  const index = MONTHS.indexOf(name);
  if (index < 0 || !/^\d{4}$/.test(year)) return "";
  return `${year}-${String(index + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export interface CircuitContact {
  name: string; phone: string; email: string; adults: number; children: number; notes: string; consent: boolean;
}

export function validCircuitContact(contact: CircuitContact): boolean {
  const phone = contact.phone.replace(/\D/g, "");
  const email = contact.email.trim();
  const phoneOk = /^[1-9]{2}\d{8,9}$/.test(phone);
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  // Pelo menos um contato; o que for preenchido precisa ser válido.
  return contact.name.trim().split(/\s+/).length >= 2 && contact.name.trim().length >= 3
    && (phoneOk || emailOk) && (!phone || phoneOk) && (!email || emailOk)
    && Number.isInteger(contact.adults) && contact.adults >= 1 && contact.adults <= 30
    && Number.isInteger(contact.children) && contact.children >= 0 && contact.children <= 12
    && contact.consent;
}

export function circuitRequestPayload(circuit: CircuitTour, date: string, contact: CircuitContact, honeypot: string) {
  return {
    service_key: "pacotes", service_label: `Circuito — ${circuit.title}`,
    lead_name: contact.name.trim(), lead_phone: contact.phone, lead_email: contact.email.trim(),
    preferred_channel: contact.phone.replace(/\D/g, "") ? "whatsapp" : "email", destination: circuit.cities.join(", "),
    summary: `${circuit.title} (${circuit.code ?? circuit.slug}) · Saída: ${date} · ${contact.adults} adulto(s), ${contact.children} criança(s) · Origem: Site / Roteiro / Saídas garantidas`,
    notes: contact.notes.trim(), consent: contact.consent, consent_version: "v1", honeypot,
    details: { circuito_slug: circuit.slug, circuito_codigo: circuit.code ?? "", circuito_nome: circuit.title,
      data_inicio: date, adultos: contact.adults, criancas: contact.children, origem: "Site / Roteiro / Saídas garantidas" },
  };
}