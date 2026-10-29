import type { CircuitTour } from "./types";

export function circuitNights(circuit: CircuitTour, city: string): number {
  return circuit.itinerary.filter(day => day.overnightCity === city).length;
}

export function convertCircuitPrice(value: number, rate?: number): number | undefined {
  return typeof rate === "number" && Number.isFinite(rate) && rate > 0 ? value * rate : undefined;
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
  return contact.name.trim().split(/\s+/).length >= 2 && contact.name.trim().length >= 3
    && /^[1-9]{2}\d{8,9}$/.test(phone) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)
    && Number.isInteger(contact.adults) && contact.adults >= 1 && contact.adults <= 30
    && Number.isInteger(contact.children) && contact.children >= 0 && contact.children <= 12
    && contact.consent;
}

export function circuitRequestPayload(circuit: CircuitTour, date: string, contact: CircuitContact, honeypot: string) {
  return {
    service_key: "pacotes", service_label: `Circuito — ${circuit.title}`,
    lead_name: contact.name.trim(), lead_phone: contact.phone, lead_email: contact.email.trim(),
    preferred_channel: "whatsapp", destination: circuit.cities.join(", "),
    summary: `${circuit.title} (${circuit.code ?? circuit.slug}) · Saída: ${date} · ${contact.adults} adulto(s), ${contact.children} criança(s) · Origem: Site / Roteiro / Saídas garantidas`,
    notes: contact.notes.trim(), consent: contact.consent, consent_version: "v1", honeypot,
    details: { circuito_slug: circuit.slug, circuito_codigo: circuit.code ?? "", circuito_nome: circuit.title,
      data_inicio: date, adultos: contact.adults, criancas: contact.children, origem: "Site / Roteiro / Saídas garantidas" },
  };
}