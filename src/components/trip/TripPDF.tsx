import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Trip, TripService, TripServiceType } from "@/types/trip";
import type { AgentProfile } from "@/hooks/useAgentProfile";
import { extractVoucherPath } from "@/lib/secureVoucher";
import { toast } from "sonner";

export interface VoucherAccessOptions {
  mode: "authenticated" | "public";
  slug?: string;
  shareToken?: string;
  password?: string;
}

const SERVICE_LABELS: Record<TripServiceType, string> = {
  flight: "Passagem Aérea",
  hotel: "Hospedagem",
  car_rental: "Locação de Veículo",
  transfer: "Transfer",
  attraction: "Ingressos/Atrações",
  insurance: "Seguro Viagem",
  cruise: "Cruzeiro",
  train: "Trem",
  other: "Outros Serviços",
};

// Emoji + gradiente por serviço (alinhado ao QuotePDF para consistência visual)
const SERVICE_EMOJI: Record<TripServiceType, string> = {
  flight: "✈️", hotel: "🏨", car_rental: "🚗", transfer: "🚐",
  attraction: "🎟️", insurance: "🛡️", cruise: "🚢", train: "🚆", other: "📦",
};
const SERVICE_GRADIENTS: Record<TripServiceType, { bg: string; fg: string; iconBg: string }> = {
  flight:     { bg: "linear-gradient(90deg,rgba(15,118,110,0.15),rgba(15,118,110,0.05))", fg: "#0f766e", iconBg: "rgba(255,255,255,0.85)" },
  hotel:      { bg: "linear-gradient(90deg,rgba(245,158,11,0.18),rgba(217,119,6,0.05))",  fg: "#b45309", iconBg: "rgba(255,255,255,0.85)" },
  car_rental: { bg: "linear-gradient(90deg,rgba(16,185,129,0.18),rgba(5,150,105,0.05))",  fg: "#047857", iconBg: "rgba(255,255,255,0.85)" },
  transfer:   { bg: "linear-gradient(90deg,rgba(139,92,246,0.18),rgba(124,58,237,0.05))", fg: "#6d28d9", iconBg: "rgba(255,255,255,0.85)" },
  attraction: { bg: "linear-gradient(90deg,rgba(236,72,153,0.18),rgba(219,39,119,0.05))", fg: "#be185d", iconBg: "rgba(255,255,255,0.85)" },
  insurance:  { bg: "linear-gradient(90deg,rgba(6,182,212,0.18),rgba(8,145,178,0.05))",   fg: "#0e7490", iconBg: "rgba(255,255,255,0.85)" },
  cruise:     { bg: "linear-gradient(90deg,rgba(15,118,110,0.12),rgba(15,118,110,0.05))", fg: "#0f766e", iconBg: "rgba(255,255,255,0.85)" },
  train:      { bg: "linear-gradient(90deg,rgba(100,116,139,0.18),rgba(71,85,105,0.05))", fg: "#475569", iconBg: "rgba(255,255,255,0.85)" },
  other:      { bg: "linear-gradient(90deg,rgba(148,163,184,0.18),rgba(100,116,139,0.05))", fg: "#475569", iconBg: "rgba(255,255,255,0.85)" },
};

function formatDate(dateStr: string) {
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    return format(new Date(y, m - 1, d), "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return dateStr;
  }
}

function getServiceDetails(service: TripService): string[] {
  const data = service.service_data as any;
  const details: string[] = [];
  
  switch (service.service_type) {
    case "flight":
      details.push(`${data.origin_city || ''} → ${data.destination_city || ''}`);
      details.push(`Companhia: ${data.main_airline || data.airline || ''}`);
      if (data.locator_code) details.push(`Localizador: ${data.locator_code}`);
      if (data.trip_type) {
        const types: Record<string, string> = { ida: 'Somente Ida', ida_volta: 'Ida e Volta', multi_trechos: 'Multi-trechos' };
        details.push(`Tipo: ${types[data.trip_type] || data.trip_type}`);
      }
      if (data.segments?.length > 0) {
        details.push(`--- Trechos ---`);
        data.segments.forEach((seg: any, i: number) => {
          const segType = seg.segment_type === 'ida' ? 'Ida' : seg.segment_type === 'conexao' ? 'Conexão' : 'Volta';
          details.push(`${segType}: ${seg.origin_airport || seg.origin_city} → ${seg.destination_airport || seg.destination_city} • ${seg.flight_date ? formatDate(seg.flight_date) : ''} ${seg.departure_time || ''} → ${seg.arrival_time || ''} • ${seg.airline || ''} ${seg.flight_number || ''}`);
        });
      } else {
        details.push(`Ida: ${formatDate(data.departure_date)} | Volta: ${formatDate(data.return_date)}`);
      }
      if (data.passengers?.length > 0) details.push(`Passageiros: ${data.passengers.map((p: any) => p.name).join(', ')}`);
      if (data.carry_on || data.checked_baggage) details.push(`Bagagem: ${data.carry_on ? `Mão: ${data.carry_on}` : ''} ${data.checked_baggage ? `Despachada: ${data.checked_baggage}` : ''}`);
      if (data.recommended_arrival) details.push(`Antecedência: ${data.recommended_arrival}`);
      if (data.required_documents) details.push(`Documentos: ${data.required_documents}`);
      if (data.boarding_notes || data.notes) details.push(`Obs: ${data.boarding_notes || data.notes}`);
      break;
    case "hotel": {
      const catMap: Record<string, string> = { '3': '⭐⭐⭐', '4': '⭐⭐⭐⭐', '5': '⭐⭐⭐⭐⭐', boutique: 'Boutique', resort: 'Resort', pousada: 'Pousada' };
      const roomMap: Record<string, string> = { standard: 'Standard', superior: 'Superior', deluxe: 'Deluxe', suite: 'Suíte', suite_junior: 'Suíte Júnior', presidencial: 'Presidencial', apartamento: 'Apartamento', villa: 'Villa', bangalo: 'Bangalô' };
      const mealMap: Record<string, string> = { somente_hospedagem: 'Somente Hospedagem', cafe_manha: 'Café da Manhã', meia_pensao: 'Meia Pensão', pensao_completa: 'Pensão Completa', all_inclusive: 'All Inclusive' };
      details.push(`${data.hotel_name}${data.hotel_category ? ` ${catMap[data.hotel_category] || data.hotel_category}` : ''}`);
      details.push(`${data.city}${data.country ? `, ${data.country}` : ''}`);
      details.push(`Check-in: ${formatDate(data.check_in)} | Check-out: ${formatDate(data.check_out)}`);
      if (data.reservation_code) details.push(`Reserva: ${data.reservation_code}`);
      if (data.room_type) details.push(`Acomodação: ${roomMap[data.room_type] || data.room_type}`);
      if (data.bed_type) details.push(`Cama: ${data.bed_type}`);
      if (data.meal_plan) details.push(`Regime: ${mealMap[data.meal_plan] || data.meal_plan}`);
      if (data.checkin_time) details.push(`Horário check-in: ${data.checkin_time}`);
      if (data.checkout_time) details.push(`Horário check-out: ${data.checkout_time}`);
      if (data.address) details.push(`Endereço: ${data.address}`);
      if (data.hotel_phone) details.push(`Telefone: ${data.hotel_phone}`);
      if (data.guests?.length > 0) details.push(`Hóspedes: ${data.guests.map((g: any) => g.name).join(', ')}`);
      if (data.cancellation_policy) details.push(`Cancelamento: ${data.cancellation_policy}`);
      if (data.mandatory_fees) details.push(`Taxas no destino: ${data.mandatory_fees}`);
      if (data.notes) details.push(`Obs: ${data.notes}`);
      break;
    }
    case "car_rental":
      if (data.rental_company) details.push(`Locadora: ${data.rental_company}`);
      if (data.reservation_code) details.push(`Reserva: ${data.reservation_code}`);
      const catLabels: Record<string, string> = { economico: 'Econômico', compacto: 'Compacto', intermediario: 'Intermediário', suv: 'SUV', premium: 'Premium', luxo: 'Luxo', van: 'Van' };
      details.push(`Categoria: ${catLabels[data.car_type] || data.car_type || ''}`);
      if (data.car_model) details.push(`Modelo: ${data.car_model}`);
      if (data.transmission) details.push(`Transmissão: ${data.transmission === 'automatico' ? 'Automático' : 'Manual'}`);
      details.push(`Retirada: ${data.pickup_location || ''}${data.pickup_date ? ` • ${formatDate(data.pickup_date)}` : ''}${data.pickup_time ? ` às ${data.pickup_time}` : ''}`);
      details.push(`Devolução: ${data.dropoff_location || ''}${data.dropoff_date ? ` • ${formatDate(data.dropoff_date)}` : ''}${data.dropoff_time ? ` às ${data.dropoff_time}` : ''}`);
      if (data.drivers?.length > 0) details.push(`Condutores: ${data.drivers.map((d: any) => d.name).join(', ')}`);
      if (data.fuel_policy) {
        const fuelLabels: Record<string, string> = { cheio_cheio: 'Cheio-Cheio', cheio_vazio: 'Cheio-Vazio', outro: 'Outro' };
        details.push(`Combustível: ${fuelLabels[data.fuel_policy] || data.fuel_policy}`);
      }
      if (data.deposit_amount) details.push(`Caução: ${data.deposit_amount}`);
      if (data.required_documents) details.push(`Documentos: ${data.required_documents}`);
      if (data.notes) details.push(`Obs: ${data.notes}`);
      break;
      break;
    case "transfer": {
      const typeMap: Record<string, string> = { arrival: 'Transfer IN', departure: 'Transfer OUT', inter_hotel: 'Inter-hotel' };
      const modeMap: Record<string, string> = { privativo: 'Privativo', compartilhado: 'Compartilhado', shuttle: 'Shuttle' };
      const statusMap: Record<string, string> = { confirmado: 'Confirmado', agendado: 'Agendado', pendente: 'Pendente' };
      details.push(`Tipo: ${typeMap[data.transfer_type] || data.transfer_type}`);
      if (data.transfer_mode) details.push(`Modalidade: ${modeMap[data.transfer_mode] || data.transfer_mode}`);
      if (data.transfer_status) details.push(`Status: ${statusMap[data.transfer_status] || data.transfer_status}`);
      const route = data.origin_location && data.destination_location 
        ? `${data.origin_location} → ${data.destination_location}` 
        : data.location || '';
      if (route) details.push(`Rota: ${route}`);
      if (data.city) details.push(`Cidade: ${data.city}`);
      if (data.date) details.push(`Data: ${formatDate(data.date)}${data.time ? ` às ${data.time}` : ''}`);
      if (data.company_name) details.push(`Empresa: ${data.company_name}`);
      if (data.reservation_code) details.push(`Reserva: ${data.reservation_code}`);
      if (data.flight_number) details.push(`Voo: ${data.flight_number}`);
      if (data.meeting_instructions) details.push(`Instruções: ${data.meeting_instructions}`);
      if (data.driver_name) details.push(`Motorista: ${data.driver_name}`);
      if (data.driver_phone) details.push(`Telefone: ${data.driver_phone}`);
      if (data.vehicle_type) details.push(`Veículo: ${data.vehicle_type}`);
      if (data.passengers?.length > 0) details.push(`Passageiros: ${data.passengers.map((p: any) => p.name).join(', ')}`);
      if (data.plan_b) details.push(`Plano B: ${data.plan_b}`);
      if (data.notes) details.push(`Obs: ${data.notes}`);
      break;
    }
    case "attraction": {
      const typeMap: Record<string, string> = { parque: 'Parque', show: 'Show', passeio: 'Passeio', museu: 'Museu', tour: 'Tour', evento: 'Evento', experiencia: 'Experiência' };
      const statusMap: Record<string, string> = { confirmado: 'Confirmado', reservado: 'Reservado', flexivel: 'Flexível', utilizado: 'Utilizado' };
      details.push(`${data.name}`);
      if (data.attraction_type) details.push(`Tipo: ${typeMap[data.attraction_type] || data.attraction_type}`);
      if (data.city) details.push(`Local: ${data.city}${data.country ? `, ${data.country}` : ''}`);
      details.push(`Data: ${formatDate(data.date)} | Quantidade: ${data.quantity}`);
      if (data.status) details.push(`Status: ${statusMap[data.status] || data.status}`);
      if (data.entry_time) details.push(`Entrada: ${data.entry_time}`);
      if (data.duration) details.push(`Duração: ${data.duration}`);
      if (data.ticket_code) details.push(`Código: ${data.ticket_code}`);
      if (data.confirmation_code) details.push(`Confirmação: ${data.confirmation_code}`);
      if (data.venue_name) details.push(`Local: ${data.venue_name}`);
      if (data.address) details.push(`Endereço: ${data.address}`);
      if (data.passengers?.length > 0) details.push(`Passageiros: ${data.passengers.map((p: any) => `${p.name} (${p.ticket_type === 'adulto' ? 'Adulto' : p.ticket_type === 'crianca' ? 'Criança' : 'Senior'})`).join(', ')}`);
      if (data.usage_instructions) details.push(`Instruções: ${data.usage_instructions}`);
      if (data.cancellation_policy) details.push(`Cancelamento: ${data.cancellation_policy}`);
      if (data.agency_tips) details.push(`Dicas: ${data.agency_tips}`);
      if (data.agency_notes) details.push(`Obs: ${data.agency_notes}`);
      break;
    }
    case "insurance": {
      details.push(`Seguradora: ${data.provider}`);
      if (data.plan_name) details.push(`Plano: ${data.plan_name}`);
      if (data.policy_number) details.push(`Apólice: ${data.policy_number}`);
      details.push(`Período: ${formatDate(data.start_date)} a ${formatDate(data.end_date)}`);
      if (data.destination_covered) details.push(`Destino coberto: ${data.destination_covered}`);
      if (data.coverage_type) details.push(`Tipo: ${data.coverage_type}`);
      if (data.status) details.push(`Status: ${data.status === 'ativo' ? 'Ativo' : data.status === 'expirado' ? 'Expirado' : 'Futuro'}`);
      if (data.coverage) details.push(`Cobertura: ${data.coverage}`);
      if (data.medical_assistance) details.push(`Assistência Médica: ${data.medical_assistance}`);
      if (data.hospital_expenses) details.push(`Despesas Hospitalares: ${data.hospital_expenses}`);
      if (data.lost_baggage) details.push(`Bagagem Extraviada: ${data.lost_baggage}`);
      if (data.trip_cancellation) details.push(`Cancelamento: ${data.trip_cancellation}`);
      if (data.dental_assistance) details.push(`Odontológica: ${data.dental_assistance}`);
      if (data.medical_repatriation) details.push(`Repatriação: ${data.medical_repatriation}`);
      if (data.emergency_phone) details.push(`📞 Emergência: ${data.emergency_phone}`);
      if (data.emergency_whatsapp) details.push(`💬 WhatsApp: ${data.emergency_whatsapp}`);
      if (data.insured_persons?.length > 0) details.push(`Segurados: ${data.insured_persons.map((p: any) => p.name).join(', ')}`);
      if (data.how_to_activate) details.push(`Como acionar: ${data.how_to_activate}`);
      if (data.agency_tips) details.push(`Dicas: ${data.agency_tips}`);
      if (data.agency_notes || data.notes) details.push(`Obs: ${data.agency_notes || data.notes}`);
      break;
    }
    case "cruise":
      if (data.cruise_company) details.push(`Companhia: ${data.cruise_company}`);
      details.push(`Navio: ${data.ship_name}`);
      details.push(`Rota: ${data.route}`);
      if (data.embarkation_port) details.push(`Embarque: ${data.embarkation_port}`);
      if (data.disembarkation_port) details.push(`Desembarque: ${data.disembarkation_port}`);
      details.push(`Período: ${formatDate(data.start_date)} a ${formatDate(data.end_date)}`);
      if (data.booking_number) details.push(`Reserva: ${data.booking_number}`);
      if (data.cabin_type) details.push(`Cabine: ${data.cabin_type}${data.cabin_number ? ` #${data.cabin_number}` : ''}`);
      if (data.deck) details.push(`Deck: ${data.deck}`);
      if (data.occupancy) details.push(`Ocupação: ${data.occupancy}`);
      if (data.passengers?.length > 0) details.push(`Passageiros: ${data.passengers.map((p: any) => p.name).join(', ')}`);
      if (data.itinerary?.length > 0) {
        details.push(`--- Roteiro ---`);
        data.itinerary.forEach((stop: any) => {
          details.push(`${stop.date ? stop.date + ' – ' : ''}${stop.port} (${stop.stop_type})${stop.arrival_time ? ' ' + stop.arrival_time : ''}${stop.departure_time ? ' – ' + stop.departure_time : ''}`);
        });
      }
      if (data.boarding_terminal) details.push(`Terminal: ${data.boarding_terminal}`);
      if (data.recommended_arrival) details.push(`Chegada recomendada: ${data.recommended_arrival}`);
      if (data.required_documents) details.push(`Documentos: ${data.required_documents}`);
      if (data.boarding_notes) details.push(`Orientações: ${data.boarding_notes}`);
      break;
    case "train":
      details.push(`🚆 ${data.origin_city} → ${data.destination_city}`);
      if (data.travel_date) details.push(`Data: ${formatDate(data.travel_date)}${data.departure_time ? ` • ${data.departure_time} → ${data.arrival_time || ''}` : ''}`);
      if (data.train_company) details.push(`Companhia: ${data.train_company}${data.train_number ? ` • Trem ${data.train_number}` : ''}`);
      if (data.travel_class) details.push(`Classe: ${data.travel_class}`);
      if (data.coach || data.seat) details.push(`${data.coach ? `Vagão ${data.coach}` : ''}${data.seat ? ` • Assento ${data.seat}` : ''}`);
      if (data.origin_station) details.push(`Embarque: ${data.origin_station}`);
      if (data.destination_station) details.push(`Desembarque: ${data.destination_station}`);
      if (data.passengers?.length > 0) details.push(`Passageiros: ${data.passengers.map((p: any) => p.name).join(', ')}`);
      if (data.boarding_notes) details.push(`Orientações: ${data.boarding_notes}`);
      break;
    case "other": {
      const otherTypeMap: Record<string, string> = { restaurante: 'Restaurante', guia_turistico: 'Guia Turístico', chip_internet: 'Chip/Internet', experiencia: 'Experiência', evento: 'Evento', spa_wellness: 'Spa/Bem-estar', servico_vip: 'Serviço VIP', concierge: 'Concierge', personalizado: 'Personalizado' };
      const statusMap: Record<string, string> = { confirmado: 'Confirmado', agendado: 'Agendado', opcional: 'Opcional' };
      if (data.service_name) details.push(`Serviço: ${data.service_name}`);
      if (data.other_service_type) details.push(`Tipo: ${otherTypeMap[data.other_service_type] || data.custom_type_name || data.other_service_type}`);
      if (data.city) details.push(`Local: ${data.city}${data.country ? `, ${data.country}` : ''}`);
      if (data.date) details.push(`Data: ${formatDate(data.date)}${data.time ? ` às ${data.time}` : ''}`);
      if (data.status) details.push(`Status: ${statusMap[data.status] || data.status}`);
      if (data.duration) details.push(`Duração: ${data.duration}`);
      if (data.location_name) details.push(`Local: ${data.location_name}`);
      if (data.address) details.push(`Endereço: ${data.address}`);
      if (data.reservation_code) details.push(`Reserva: ${data.reservation_code}`);
      if (data.contact_name) details.push(`Contato: ${data.contact_name}${data.contact_company ? ` — ${data.contact_company}` : ''}`);
      if (data.contact_phone) details.push(`Telefone: ${data.contact_phone}`);
      if (data.chip_operator) details.push(`Operadora: ${data.chip_operator} (${data.chip_type === 'esim' ? 'eSIM' : 'Chip Físico'})`);
      if (data.chip_activation_instructions) details.push(`Ativação: ${data.chip_activation_instructions}`);
      if (data.guide_name) details.push(`Guia: ${data.guide_name}${data.guide_language ? ` (${data.guide_language})` : ''}`);
      if (data.guide_meeting_point) details.push(`Ponto de encontro: ${data.guide_meeting_point}`);
      if (data.description) details.push(data.description);
      if (data.agency_tips) details.push(`Dicas: ${data.agency_tips}`);
      if (data.agency_notes) details.push(`Obs: ${data.agency_notes}`);
      break;
    }
  }
  
  return details;
}

// ========================================================================
// Structured body renderer — mirrors the section layout from ViagemPublica
// (the public wallet link), so the PDF and the public page look the same.
// ========================================================================

const TXT = "color:#475569;font-size:11px;line-height:1.4;margin:1px 0;";
const TXT_FG = "color:#1e293b;font-size:11px;line-height:1.4;margin:1px 0;";
const TXT_ITALIC = "color:#475569;font-size:11px;line-height:1.4;margin:1px 0;font-style:italic;";
const SECTION_TITLE = "font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.6px;color:#0f766e;margin:0 0 5px;";

function escapeHtml(s: any): string {
  if (s == null) return "";
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

type Row = string | null | false | undefined;
function rowsToHtml(rows: Row[]): string {
  return rows.filter(Boolean).join("");
}
function p(label: string | null, value: any, opts: { mono?: boolean; italic?: boolean; fg?: boolean } = {}): string {
  if (value == null || value === "") return "";
  const style = opts.italic ? TXT_ITALIC : opts.fg ? TXT_FG : TXT;
  const mono = opts.mono ? "font-family:'Courier New',monospace;font-weight:600;color:#1e293b;" : "";
  const inner = label
    ? `${escapeHtml(label)}: <span style="${mono}">${escapeHtml(value)}</span>`
    : `<span style="${mono}">${escapeHtml(value)}</span>`;
  return `<p style="${style}">${inner}</p>`;
}

function miniCard(title: string, rows: Row[], variant: "muted" | "primary" | "amber" | "destructive" | "tips" = "muted"): string {
  const body = rowsToHtml(rows);
  if (!body) return "";
  let bg = "background:#f1f5f9;";
  let titleColor = "color:#0f766e;";
  let border = "";
  if (variant === "primary") { bg = "background:rgba(15,118,110,0.06);"; border = "border:1px solid rgba(15,118,110,0.18);"; }
  if (variant === "amber") { bg = "background:#fffbeb;"; border = "border:1px solid #fde68a;"; titleColor = "color:#b45309;"; }
  if (variant === "destructive") { bg = "background:rgba(220,38,38,0.05);"; border = "border:1px solid rgba(220,38,38,0.2);"; titleColor = "color:#b91c1c;"; }
  if (variant === "tips") { bg = "background:linear-gradient(90deg,rgba(15,118,110,0.10),rgba(15,118,110,0.04));"; border = "border:1px solid rgba(15,118,110,0.18);"; }
  return `<div class="pdf-block" style="margin-top:6px;padding:8px 11px;border-radius:8px;${bg}${border}">
    <p style="${SECTION_TITLE}${titleColor}">${escapeHtml(title)}</p>
    ${body}
  </div>`;
}

function badgeRow(items: string[]): string {
  if (!items.length) return "";
  return `<p style="margin:2px 0 0;font-size:10px;">${items.map(t => `<span style="display:inline-block;background:rgba(15,118,110,0.10);color:#0f766e;padding:2px 7px;border-radius:9999px;margin-right:4px;font-weight:600;">${escapeHtml(t)}</span>`).join("")}</p>`;
}

function pillTitle(parts: { label?: string; value: string; muted?: boolean }[]): string {
  return parts.map(p => `<span style="${p.muted ? "color:#64748b;" : "color:#1e293b;"}">${p.label ? `<strong>${escapeHtml(p.label)}:</strong> ` : ""}${escapeHtml(p.value)}</span>`).join(' &nbsp;·&nbsp; ');
}

/** Header summary block: title + dates row, mirroring the public card top */
function renderServiceHeadline(opts: { title?: string; dates?: string; lines?: string[] }): string {
  const { title, dates, lines = [] } = opts;
  const titleHtml = title ? `<p style="font-size:13px;font-weight:700;color:#1e293b;margin:0 0 2px;line-height:1.3;">${escapeHtml(title)}</p>` : "";
  const datesHtml = dates ? `<p style="font-size:11px;color:#64748b;margin:0 0 4px;">📅 ${escapeHtml(dates)}</p>` : "";
  const linesHtml = lines.filter(Boolean).map(l => `<p style="${TXT}">${escapeHtml(l)}</p>`).join("");
  if (!titleHtml && !datesHtml && !linesHtml) return "";
  return `<div class="pdf-block" style="margin-bottom:4px;">${titleHtml}${datesHtml}${linesHtml}</div>`;
}

function fmtDate(d: any): string { return d ? formatDate(String(d)) : ""; }

function renderFlightBody(service: TripService): string {
  const data = service.service_data as any;
  const tripTypeMap: Record<string, string> = { ida: 'Somente Ida', ida_volta: 'Ida e Volta', multi_trechos: 'Multi-trechos' };
  const statusMap: Record<string, string> = { confirmado: '✅ Confirmado', emitido: '📄 Emitido', pendente: '⏳ Pendente' };
  const airline = data.main_airline || data.airline || '';
  const firstDate = data.segments?.[0]?.flight_date || data.departure_date || '';
  const lastDate = data.segments?.[data.segments?.length - 1]?.flight_date || data.return_date || '';
  const datesStr = firstDate ? `${fmtDate(firstDate)}${lastDate && lastDate !== firstDate ? ` - ${fmtDate(lastDate)}` : ''}` : "";

  const head = renderServiceHeadline({
    title: `${data.origin_city || ''} → ${data.destination_city || ''}`,
    dates: datesStr,
    lines: [
      airline ? `Companhia: ${airline}` : "",
      data.trip_type ? `Tipo: ${tripTypeMap[data.trip_type] || data.trip_type}` : "",
      data.locator_code ? `Localizador: ${data.locator_code}` : "",
      data.flight_status ? `Status: ${statusMap[data.flight_status] || data.flight_status}` : "",
    ],
  });

  // Segments timeline
  let segmentsHtml = "";
  if (data.segments?.length > 0) {
    const segCards = data.segments.map((seg: any, i: number) => {
      const segType = seg.segment_type === 'ida' ? 'Ida' : seg.segment_type === 'conexao' ? 'Conexão' : 'Volta';
      let conn = "";
      if (i > 0 && data.segments[i - 1]) {
        const prev = data.segments[i - 1];
        if (prev.flight_date === seg.flight_date && prev.arrival_time && seg.departure_time) {
          const [ph, pm] = prev.arrival_time.split(':').map(Number);
          const [sh, sm] = seg.departure_time.split(':').map(Number);
          const diff = (sh * 60 + sm) - (ph * 60 + pm);
          if (diff > 0) {
            const h = Math.floor(diff / 60); const m = diff % 60;
            conn = `<p style="font-size:10px;color:#b45309;background:#fffbeb;border:1px solid #fde68a;padding:3px 8px;border-radius:6px;margin:4px 0;font-weight:600;">✈️ Conexão em ${escapeHtml(seg.origin_city || seg.origin_airport || '')} — ${h}h${m > 0 ? String(m).padStart(2, '0') : ''}</p>`;
          }
        }
      }
      return `${conn}<div style="border-left:2px solid rgba(15,118,110,0.4);padding:3px 0 3px 9px;margin:2px 0;">
        <p style="margin:0 0 2px;font-size:10px;">
          <span style="background:rgba(15,118,110,0.12);color:#0f766e;padding:1px 6px;border-radius:4px;font-weight:700;">${escapeHtml(segType)}</span>
          ${seg.airline ? `<span style="color:#64748b;margin-left:6px;">${escapeHtml(seg.airline)}</span>` : ''}
          ${seg.flight_number ? `<span style="color:#64748b;font-family:'Courier New',monospace;margin-left:6px;">${escapeHtml(seg.flight_number)}</span>` : ''}
        </p>
        <p style="margin:1px 0;font-size:12px;font-weight:600;color:#1e293b;">${escapeHtml(seg.origin_airport || seg.origin_city || '')} → ${escapeHtml(seg.destination_airport || seg.destination_city || '')}</p>
        <p style="margin:1px 0;font-size:10px;color:#64748b;">
          ${seg.flight_date ? escapeHtml(fmtDate(seg.flight_date)) : ''}${seg.departure_time ? ` • ${escapeHtml(seg.departure_time)}` : ''}${seg.arrival_time ? ` → ${escapeHtml(seg.arrival_time)}` : ''}${seg.terminal ? ` • Terminal ${escapeHtml(seg.terminal)}` : ''}${seg.gate ? ` • Portão ${escapeHtml(seg.gate)}` : ''}
        </p>
      </div>`;
    }).join("");
    segmentsHtml = `<div class="pdf-block" style="margin-top:6px;padding:8px 11px;background:#f1f5f9;border-radius:8px;">
      <p style="${SECTION_TITLE}">🛫 Trechos</p>${segCards}</div>`;
  }

  const passengersHtml = data.passengers?.length > 0
    ? miniCard("👤 Passageiros", data.passengers.map((p: any) => `<p style="${TXT}">${escapeHtml(p.name)} (${p.passenger_type === 'adulto' ? 'Adulto' : p.passenger_type === 'crianca' ? 'Criança' : 'Bebê'})${p.seat ? ` • Assento ${escapeHtml(p.seat)}` : ''}</p>`))
    : "";

  const baggageHtml = (data.carry_on || data.checked_baggage)
    ? miniCard("🧳 Bagagem", [
        p("Mão", data.carry_on),
        p("Despachada", data.checked_baggage),
        p("Extra", data.extra_baggage),
        data.baggage_rules ? `<p style="${TXT_ITALIC}">${escapeHtml(data.baggage_rules)}</p>` : "",
      ])
    : "";

  const boardingHtml = (data.recommended_arrival || data.required_documents || data.boarding_notes)
    ? miniCard("⚠️ Orientações de Embarque", [
        p("Antecedência", data.recommended_arrival),
        p("Terminal", data.boarding_terminal),
        p("Documentos", data.required_documents),
        p("Imigração", data.immigration_rules),
        data.boarding_notes ? `<p style="${TXT_ITALIC}">${escapeHtml(data.boarding_notes)}</p>` : "",
      ])
    : "";

  const checkinHtml = data.checkin_url
    ? `<div class="pdf-block" style="margin-top:6px;"><a href="${escapeHtml(data.checkin_url)}" style="display:inline-block;background:#0f766e;color:#fff;padding:7px 14px;border-radius:8px;font-size:11px;font-weight:700;text-decoration:none;">✅ Fazer Check-in Online</a>${data.checkin_open_date ? `<p style="${TXT}">Abertura: ${escapeHtml(data.checkin_open_date)}</p>` : ''}</div>`
    : "";

  return head + segmentsHtml + passengersHtml + baggageHtml + boardingHtml + checkinHtml;
}

function renderHotelBody(service: TripService): string {
  const data = service.service_data as any;
  const catMap: Record<string, string> = { '3': '⭐⭐⭐', '4': '⭐⭐⭐⭐', '5': '⭐⭐⭐⭐⭐', boutique: 'Boutique', resort: 'Resort', pousada: 'Pousada' };
  const roomMap: Record<string, string> = { standard: 'Standard', superior: 'Superior', deluxe: 'Deluxe', suite: 'Suíte', suite_junior: 'Suíte Júnior', presidencial: 'Presidencial', apartamento: 'Apartamento', villa: 'Villa', bangalo: 'Bangalô' };
  const mealMap: Record<string, string> = { somente_hospedagem: 'Somente Hospedagem', cafe_manha: 'Café da Manhã', meia_pensao: 'Meia Pensão', pensao_completa: 'Pensão Completa', all_inclusive: 'All Inclusive' };
  const bedMap: Record<string, string> = { king: 'King', queen: 'Queen', twin: 'Twin (2 Solteiro)', single: 'Solteiro', double: 'Casal', triple: 'Triplo' };
  const statusMap: Record<string, string> = { confirmada: '✅ Confirmada', emitida: '📄 Emitida', pre_reserva: '⏳ Pré-reserva' };

  let nights: number | null = null;
  try { const [sy,sm,sd] = data.check_in.split('-').map(Number); const [ey,em,ed] = data.check_out.split('-').map(Number); nights = Math.ceil((new Date(ey,em-1,ed).getTime() - new Date(sy,sm-1,sd).getTime()) / 86400000); } catch {}

  const head = renderServiceHeadline({
    title: `${data.hotel_name}${data.hotel_category ? ` ${catMap[data.hotel_category] || data.hotel_category}` : ''}`,
    dates: `${fmtDate(data.check_in)} - ${fmtDate(data.check_out)}${nights ? ` (${nights} noites)` : ''}`,
    lines: [
      `${data.city || ''}${data.country ? `, ${data.country}` : ''}`,
      data.reservation_status ? `Status: ${statusMap[data.reservation_status] || data.reservation_status}` : "",
      data.reservation_code ? `Reserva: ${data.reservation_code}` : "",
      data.room_type ? `Acomodação: ${roomMap[data.room_type] || data.room_type}` : "",
      data.meal_plan ? `Regime: ${mealMap[data.meal_plan] || data.meal_plan}` : "",
    ],
  });

  const checkin = miniCard("📅 Check-in", [
    p("Horário", data.checkin_time),
    data.early_checkin ? p("Early check-in", data.early_checkin === 'sim' ? '✅ Incluso' : data.early_checkin === 'mediante_taxa' ? '💰 Mediante taxa' : data.early_checkin === 'sob_consulta' ? '📞 Sob consulta' : '❌ Não disponível') : "",
    p("Titular", data.checkin_holder),
    data.checkin_instructions ? `<p style="${TXT_ITALIC}">${escapeHtml(data.checkin_instructions)}</p>` : "",
    p("Chegada tardia", data.late_arrival_policy),
  ]);

  const checkout = miniCard("🧳 Check-out", [
    p("Horário", data.checkout_time),
    data.late_checkout ? p("Late check-out", data.late_checkout === 'sim' ? '✅ Incluso' : data.late_checkout === 'mediante_taxa' ? `💰 Mediante taxa${data.late_checkout_fee ? ` (${data.late_checkout_fee})` : ''}` : data.late_checkout === 'sob_consulta' ? '📞 Sob consulta' : '❌ Não disponível') : "",
    data.checkout_procedure ? p("Procedimento", data.checkout_procedure === 'recepcao' ? 'Recepção' : data.checkout_procedure === 'express' ? 'Express' : 'Online') : "",
    data.checkout_instructions ? `<p style="${TXT_ITALIC}">${escapeHtml(data.checkout_instructions)}</p>` : "",
  ]);

  const room = miniCard("🛏️ Acomodação", [
    data.bed_type ? p("Cama", bedMap[data.bed_type] || data.bed_type) : "",
    p("Hóspedes", data.guest_count),
    p("Vista", data.room_view),
    p("Amenities", data.amenities),
  ]);

  const food = miniCard("🍽️ Alimentação", [
    p("Café da manhã", data.breakfast_hours),
    p("Restaurantes", data.restaurants_included),
    data.food_notes ? `<p style="${TXT_ITALIC}">${escapeHtml(data.food_notes)}</p>` : "",
    p("All Inclusive", data.all_inclusive_rules),
  ]);

  const includedBadges: string[] = [];
  if (data.breakfast_included === 'sim') includedBadges.push('☕ Café');
  if (data.wifi_included === 'sim') includedBadges.push('📶 Wi-Fi');
  if (data.taxes_included === 'sim') includedBadges.push('✅ Taxas');
  if (data.parking_included === 'sim') includedBadges.push('🅿️ Estacionamento');
  if (data.transfer_included === 'sim') includedBadges.push('🚐 Transfer');
  const included = (includedBadges.length || data.resort_fee || data.other_inclusions)
    ? miniCard("💰 Inclusos na Reserva", [
        badgeRow(includedBadges),
        p("Resort Fee", data.resort_fee),
        data.other_inclusions ? `<p style="${TXT}">${escapeHtml(data.other_inclusions)}</p>` : "",
      ])
    : "";

  const policies = miniCard("🧾 Políticas", [
    p("Cancelamento", data.cancellation_policy),
    p("Crianças", data.children_policy),
    p("Pets", data.pet_policy),
    data.mandatory_fees ? `<p style="${TXT_FG}font-weight:600;">⚠️ Taxas no destino: ${escapeHtml(data.mandatory_fees)}</p>` : "",
    data.hotel_deposit ? p("Caução", `${data.hotel_deposit}${data.hotel_deposit_method ? ` (${data.hotel_deposit_method})` : ''}`) : "",
  ]);

  const guests = data.guests?.length > 0
    ? miniCard("👨‍👩‍👧 Hóspedes", data.guests.map((g: any) => `<p style="${TXT}">${escapeHtml(g.name)}${g.age ? ` (${g.age})` : ''}${g.notes ? ` • ${escapeHtml(g.notes)}` : ''}</p>`))
    : "";

  const location = miniCard("📍 Localização e Contato", [
    data.address ? `<p style="${TXT}">${escapeHtml(data.address)}</p>` : "",
    data.hotel_phone ? `<p style="${TXT}">📞 ${escapeHtml(data.hotel_phone)}</p>` : "",
    data.hotel_email ? `<p style="${TXT}">✉️ ${escapeHtml(data.hotel_email)}</p>` : "",
    data.maps_url ? `<p style="${TXT}"><a href="${escapeHtml(data.maps_url)}" style="color:#0f766e;text-decoration:underline;">🗺️ Ver no mapa</a></p>` : "",
    data.hotel_website ? `<p style="${TXT}"><a href="${escapeHtml(data.hotel_website)}" style="color:#0f766e;text-decoration:underline;">🌐 Site oficial</a></p>` : "",
  ]);

  const notes = (data.special_requests || data.agency_notes || data.notes)
    ? miniCard("📝 Observações", [
        p("Solicitações", data.special_requests),
        data.agency_notes ? `<p style="${TXT_ITALIC}">${escapeHtml(data.agency_notes)}</p>` : "",
        data.notes && !data.agency_notes ? `<p style="${TXT_ITALIC}">${escapeHtml(data.notes)}</p>` : "",
      ])
    : "";

  return head + checkin + checkout + room + food + included + policies + guests + location + notes;
}

function renderCarRentalBody(service: TripService): string {
  const data = service.service_data as any;
  const head = renderServiceHeadline({
    title: `${data.car_type ? escapeHtml(data.car_type) : ''}${data.car_model ? ` • ${escapeHtml(data.car_model)}` : ''}`,
    dates: data.pickup_date && data.dropoff_date ? `${fmtDate(data.pickup_date)} - ${fmtDate(data.dropoff_date)}` : "",
    lines: [
      data.rental_company ? `Locadora: ${data.rental_company}` : "",
      data.reservation_code ? `Reserva: ${data.reservation_code}` : "",
    ],
  });

  const pickup = miniCard("📍 Retirada", [
    data.pickup_address ? `<p style="${TXT}">${escapeHtml(data.pickup_address)}</p>` : "",
    data.pickup_city ? `<p style="${TXT}">${escapeHtml(data.pickup_city)}${data.pickup_country ? `, ${escapeHtml(data.pickup_country)}` : ''}</p>` : "",
    data.pickup_date ? `<p style="${TXT}">📅 ${escapeHtml(fmtDate(data.pickup_date))}${data.pickup_time ? ` às ${escapeHtml(data.pickup_time)}` : ''}</p>` : "",
    p("Terminal", data.pickup_terminal),
    data.pickup_phone ? `<p style="${TXT}">📞 ${escapeHtml(data.pickup_phone)}</p>` : "",
    data.pickup_instructions ? `<p style="${TXT_ITALIC}">${escapeHtml(data.pickup_instructions)}</p>` : "",
  ]);

  const dropoff = miniCard("🔁 Devolução", [
    data.dropoff_address ? `<p style="${TXT}">${escapeHtml(data.dropoff_address)}</p>` : "",
    data.dropoff_city ? `<p style="${TXT}">${escapeHtml(data.dropoff_city)}${data.dropoff_country ? `, ${escapeHtml(data.dropoff_country)}` : ''}</p>` : "",
    data.dropoff_date ? `<p style="${TXT}">📅 ${escapeHtml(fmtDate(data.dropoff_date))}${data.dropoff_time ? ` às ${escapeHtml(data.dropoff_time)}` : ''}</p>` : "",
    data.dropoff_instructions ? `<p style="${TXT_ITALIC}">${escapeHtml(data.dropoff_instructions)}</p>` : "",
    data.dropoff_late_policy ? `<p style="${TXT}">⏰ ${escapeHtml(data.dropoff_late_policy)}</p>` : "",
  ]);

  const vehicle = miniCard("🚘 Veículo", [
    p("Modelo", data.car_model),
    data.transmission ? p("Transmissão", data.transmission === 'automatico' ? 'Automático' : 'Manual') : "",
    p("Combustível", data.fuel_type),
    badgeRow([
      data.doors ? `🚪 ${data.doors} portas` : "",
      data.passenger_capacity ? `👤 ${data.passenger_capacity} passageiros` : "",
      data.luggage_capacity ? `🧳 ${data.luggage_capacity}` : "",
    ].filter(Boolean) as string[]),
    p("Placa", data.plate),
  ]);

  const insurance = miniCard("🛡️ Seguros", [
    p("Básico", data.basic_insurance),
    p("Total (CDW/LDW)", data.full_insurance),
    p("Terceiros", data.third_party_protection),
    p("Roubo", data.theft_protection),
    p("Danos", data.damage_protection),
    data.deductible ? `<p style="${TXT_FG}font-weight:600;">Franquia: ${escapeHtml(data.deductible)}</p>` : "",
    data.insurance_notes ? `<p style="${TXT_ITALIC}">${escapeHtml(data.insurance_notes)}</p>` : "",
  ]);

  const deposit = data.deposit_amount
    ? miniCard("💳 Caução e Pagamento", [
        p("Caução", data.deposit_amount),
        p("Forma", data.deposit_method),
        data.card_in_driver_name ? `<p style="${TXT_FG}font-weight:600;">⚠️ Cartão no nome do condutor: ${escapeHtml(data.card_in_driver_name)}</p>` : "",
        p("Pagamento", data.payment_status),
      ], "amber")
    : "";

  const drivers = data.drivers?.length > 0
    ? miniCard("👤 Condutores", data.drivers.map((d: any, i: number) => `<p style="${TXT}">${i === 0 ? '🔑 ' : '👤 '}${escapeHtml(d.name)}${d.document ? ` • ${escapeHtml(d.document)}` : ''}</p>`))
    : "";

  const fuel = data.fuel_policy
    ? miniCard("⛽ Combustível", [
        p("Política", data.fuel_policy === 'cheio_cheio' ? 'Cheio-Cheio' : data.fuel_policy === 'cheio_vazio' ? 'Cheio-Vazio' : data.fuel_policy),
        p("Penalidade", data.fuel_penalty),
        data.fuel_notes ? `<p style="${TXT_ITALIC}">${escapeHtml(data.fuel_notes)}</p>` : "",
      ])
    : "";

  const orient = miniCard("⚠️ Orientações", [
    p("Documentos", data.required_documents),
    p("Idade mínima", data.minimum_age),
    p("PID", data.international_permit),
    data.traffic_rules ? `<p style="${TXT_ITALIC}">${escapeHtml(data.traffic_rules)}</p>` : "",
    data.emergency_contact ? `<p style="${TXT}">📞 Emergência: ${escapeHtml(data.emergency_contact)}</p>` : "",
  ]);

  return head + pickup + dropoff + vehicle + insurance + deposit + drivers + fuel + orient;
}

function renderTransferBody(service: TripService): string {
  const data = service.service_data as any;
  const typeMap: Record<string, string> = { arrival: 'Transfer IN', departure: 'Transfer OUT', inter_hotel: 'Inter-hotel' };
  const route = data.origin_location && data.destination_location
    ? `${data.origin_location} → ${data.destination_location}`
    : data.location || '';
  const head = renderServiceHeadline({
    title: `${typeMap[data.transfer_type] || data.transfer_type || 'Transfer'} — ${route}`,
    dates: data.date ? `${fmtDate(data.date)}${data.time ? ` às ${data.time}` : ''}` : "",
    lines: [
      data.company_name ? `Empresa: ${data.company_name}` : "",
      data.reservation_code ? `Reserva: ${data.reservation_code}` : "",
      data.city ? `Cidade: ${data.city}` : "",
    ],
  });

  const arrival = data.transfer_type === 'arrival' && (data.flight_number || data.arrival_airport || data.meeting_instructions)
    ? miniCard("✈️ Detalhes da Chegada", [
        p("Voo", data.flight_number),
        p("Chegada prevista", data.arrival_time),
        data.arrival_airport ? p("Aeroporto", `${data.arrival_airport}${data.arrival_terminal ? ` • Terminal ${data.arrival_terminal}` : ''}`) : "",
        p("Espera do motorista", data.driver_wait_time),
        data.reception_type ? p("Recepção", data.reception_type === 'placa' ? 'Com placa / nome' : data.reception_type === 'balcao' ? 'Balcão da empresa' : 'Ponto fixo') : "",
        data.meeting_instructions ? `<div style="margin-top:4px;padding:6px 9px;background:rgba(15,118,110,0.06);border:1px solid rgba(15,118,110,0.2);border-radius:6px;"><p style="font-size:10px;color:#0f766e;font-weight:600;margin:0;">📍 Onde encontrar o motorista:</p><p style="${TXT_FG}">${escapeHtml(data.meeting_instructions)}</p></div>` : "",
      ])
    : "";

  const departure = data.transfer_type === 'departure' && (data.hotel_departure_time || data.departure_airport || data.departure_alert)
    ? miniCard("🧳 Detalhes da Saída", [
        p("Saída do hotel", data.hotel_departure_time),
        p("Horário do voo", data.departure_flight_time),
        p("Aeroporto", data.departure_airport),
        p("Saída recomendada", data.recommended_departure),
        data.boarding_point ? p("Embarque", data.boarding_point === 'lobby' ? 'Lobby / Recepção' : data.boarding_point === 'entrada' ? 'Entrada Principal' : data.boarding_point === 'estacionamento' ? 'Estacionamento' : data.boarding_point) : "",
        data.departure_alert ? `<p style="margin-top:4px;font-size:11px;color:#b45309;background:#fffbeb;border:1px solid #fde68a;padding:6px 9px;border-radius:6px;font-weight:600;">⚠️ ${escapeHtml(data.departure_alert)}</p>` : "",
      ])
    : "";

  const driver = (data.driver_name || data.driver_phone)
    ? miniCard("👤 Motorista", [
        p("Nome", data.driver_name),
        p("Idioma", data.driver_language),
        p("Placa", data.vehicle_plate),
        data.driver_phone ? `<p style="${TXT}">📞 ${escapeHtml(data.driver_phone)}</p>` : "",
      ])
    : "";

  const vehicle = (data.vehicle_type || data.vehicle_capacity)
    ? miniCard("🚗 Veículo", [
        data.vehicle_type ? p("Tipo", data.vehicle_type === 'sedan' ? 'Sedan' : data.vehicle_type === 'suv' ? 'SUV' : data.vehicle_type === 'van' ? 'Van' : data.vehicle_type === 'minibus' ? 'Micro-ônibus' : data.vehicle_type === 'onibus' ? 'Ônibus' : data.vehicle_type) : "",
        badgeRow([
          data.vehicle_capacity ? `👤 ${data.vehicle_capacity} passageiros` : "",
          data.luggage_capacity ? `🧳 ${data.luggage_capacity}` : "",
          data.air_conditioning === 'sim' ? '❄️ Ar-condicionado' : "",
        ].filter(Boolean) as string[]),
        data.vehicle_notes ? `<p style="${TXT_ITALIC}">${escapeHtml(data.vehicle_notes)}</p>` : "",
      ])
    : "";

  const passengers = data.passengers?.length > 0
    ? miniCard("👨‍👩‍👧 Passageiros", data.passengers.map((p: any) => `<p style="${TXT}">${escapeHtml(p.name)} (${p.passenger_type === 'adulto' ? 'Adulto' : p.passenger_type === 'crianca' ? 'Criança' : 'Bebê'})${p.needs_child_seat === 'sim' ? ' 🪑 Cadeirinha' : ''}</p>`))
    : "";

  const locations = (data.pickup_address || data.destination_address)
    ? miniCard("📍 Locais", [
        p("Embarque", data.pickup_address),
        p("Destino", data.destination_address),
        data.location_notes ? `<p style="${TXT_ITALIC}">${escapeHtml(data.location_notes)}</p>` : "",
      ])
    : "";

  const orient = (data.required_documents || data.emergency_contact || data.plan_b || data.agency_notes)
    ? miniCard("⚠️ Orientações", [
        p("Documentos", data.required_documents),
        data.emergency_contact ? `<p style="${TXT}">📞 Emergência: ${escapeHtml(data.emergency_contact)}</p>` : "",
        data.agency_contact ? `<p style="${TXT}">📱 Agência: ${escapeHtml(data.agency_contact)}</p>` : "",
        data.plan_b ? `<div style="margin-top:4px;padding:6px 9px;background:rgba(15,118,110,0.06);border:1px solid rgba(15,118,110,0.2);border-radius:6px;"><p style="font-size:10px;color:#0f766e;font-weight:600;margin:0;">🔄 Plano B:</p><p style="${TXT_FG}">${escapeHtml(data.plan_b)}</p></div>` : "",
        data.agency_notes ? `<p style="${TXT_ITALIC}">${escapeHtml(data.agency_notes)}</p>` : "",
      ])
    : "";

  return head + arrival + departure + driver + vehicle + passengers + locations + orient;
}

function renderAttractionBody(service: TripService): string {
  const data = service.service_data as any;
  const head = renderServiceHeadline({
    title: data.name,
    dates: data.date ? fmtDate(data.date) : "",
    lines: [
      data.attraction_type ? `Tipo: ${data.attraction_type}` : "",
      data.city ? `${data.city}${data.country ? `, ${data.country}` : ''}` : "",
      `Quantidade: ${data.quantity || 1}x`,
    ],
  });

  const codes = (data.ticket_code || data.confirmation_code || data.order_number)
    ? miniCard("📱 Códigos do Ingresso", [
        data.ticket_code ? `<p style="font-family:'Courier New',monospace;font-weight:700;color:#1e293b;font-size:13px;margin:1px 0;">🎟️ ${escapeHtml(data.ticket_code)}</p>` : "",
        p("Confirmação", data.confirmation_code),
        p("Pedido", data.order_number),
      ])
    : "";

  const usage = (data.entry_time || data.usage_window || data.duration || data.access_type)
    ? miniCard("📅 Detalhes de Uso", [
        p("Horário de entrada", data.entry_time),
        p("Janela de uso", data.usage_window),
        p("Duração", data.duration),
        data.access_type ? p("Acesso", data.access_type === '1_dia' ? '1 Dia' : data.access_type === 'multi_day' ? 'Multi-Day' : data.access_type === 'open_date' ? 'Data Aberta' : 'Horário Marcado') : "",
        data.requires_reservation ? p("Reserva", data.requires_reservation === 'sim' ? '✅ Necessária' : data.requires_reservation === 'recomendado' ? '📌 Recomendada' : '❌ Não necessária') : "",
      ])
    : "";

  const instructions = data.usage_instructions
    ? miniCard("📋 Instruções Importantes", [`<p style="${TXT_FG}">${escapeHtml(data.usage_instructions)}</p>`], "primary")
    : "";

  const passengers = data.passengers?.length > 0
    ? miniCard("👨‍👩‍👧 Ingressos por Pessoa", data.passengers.map((p: any) => `<p style="${TXT}">🎟️ ${escapeHtml(p.name)} (${p.ticket_type === 'adulto' ? 'Adulto' : p.ticket_type === 'crianca' ? 'Criança' : 'Senior'})${p.document ? ` • ${escapeHtml(p.document)}` : ''}</p>`))
    : "";

  const location = (data.address || data.venue_name)
    ? miniCard("📍 Localização", [
        data.venue_name ? `<p style="${TXT_FG}font-weight:600;">${escapeHtml(data.venue_name)}</p>` : "",
        data.address ? `<p style="${TXT}">${escapeHtml(data.address)}</p>` : "",
        p("Entrada", data.entry_point),
        data.maps_url ? `<p style="${TXT}"><a href="${escapeHtml(data.maps_url)}" style="color:#0f766e;text-decoration:underline;">🗺️ Ver no mapa</a></p>` : "",
      ])
    : "";

  const rules = (data.attraction_rules || data.cancellation_policy || data.prohibited_items || data.dress_code || data.required_documents)
    ? miniCard("📌 Regras e Políticas", [
        p("Cancelamento", data.cancellation_policy),
        p("Alteração", data.change_policy),
        data.attraction_rules ? `<p style="${TXT}">${escapeHtml(data.attraction_rules)}</p>` : "",
        data.prohibited_items ? `<p style="${TXT}">🚫 Proibido: ${escapeHtml(data.prohibited_items)}</p>` : "",
        data.dress_code ? `<p style="${TXT}">👔 Dress code: ${escapeHtml(data.dress_code)}</p>` : "",
        data.required_documents ? `<p style="${TXT}">📄 Documentos: ${escapeHtml(data.required_documents)}</p>` : "",
      ])
    : "";

  const tips = data.agency_tips
    ? miniCard("🧠 Dicas do seu Agente de Viagem", [`<p style="${TXT_FG}white-space:pre-line;">${escapeHtml(data.agency_tips)}</p>`], "tips")
    : "";

  const contacts = (data.attraction_contact || data.operator_contact || data.agency_contact || data.emergency_contact)
    ? miniCard("📞 Contatos", [
        p("Atração", data.attraction_contact),
        p("Operadora", data.operator_contact),
        p("Agência", data.agency_contact),
        data.emergency_contact ? `<p style="${TXT}">🆘 Emergência: ${escapeHtml(data.emergency_contact)}</p>` : "",
      ])
    : "";

  const notes = data.agency_notes
    ? miniCard("📝 Observações", [`<p style="${TXT_ITALIC}">${escapeHtml(data.agency_notes)}</p>`])
    : "";

  return head + codes + usage + instructions + passengers + location + rules + tips + contacts + notes;
}

function renderInsuranceBody(service: TripService): string {
  const data = service.service_data as any;
  let days: number | null = null;
  try { const [sy,sm,sd] = data.start_date.split('-').map(Number); const [ey,em,ed] = data.end_date.split('-').map(Number); days = Math.ceil((new Date(ey,em-1,ed).getTime() - new Date(sy,sm-1,sd).getTime()) / 86400000); } catch {}

  const head = renderServiceHeadline({
    title: data.provider,
    dates: `${fmtDate(data.start_date)} - ${fmtDate(data.end_date)}${days ? ` (${days} dias)` : ''}`,
    lines: [
      data.plan_name ? `Plano: ${data.plan_name}` : "",
      data.policy_number ? `Apólice: ${data.policy_number}` : "",
      data.destination_covered ? `Destino: ${data.destination_covered}` : "",
      data.coverage_type ? `Tipo: ${data.coverage_type}` : "",
    ],
  });

  const emergency = (data.emergency_phone || data.emergency_whatsapp || data.emergency_email)
    ? miniCard("🆘 Contatos de Emergência", [
        data.emergency_phone ? `<p style="${TXT_FG}font-weight:600;">📞 ${escapeHtml(data.emergency_phone)}</p>` : "",
        data.emergency_whatsapp ? `<p style="${TXT}">💬 WhatsApp: ${escapeHtml(data.emergency_whatsapp)}</p>` : "",
        data.emergency_email ? `<p style="${TXT}">✉️ ${escapeHtml(data.emergency_email)}</p>` : "",
        data.emergency_24h === 'sim' ? `<p style="${TXT}color:#0f766e;font-weight:600;">✅ Atendimento 24 horas</p>` : "",
        p("Idiomas", data.emergency_languages),
        data.insurer_website ? `<p style="${TXT}"><a href="${escapeHtml(data.insurer_website)}" style="color:#0f766e;text-decoration:underline;">🌐 Site da Seguradora</a></p>` : "",
      ], "destructive")
    : "";

  const coverages = (data.medical_assistance || data.hospital_expenses || data.lost_baggage || data.trip_cancellation)
    ? miniCard("🏥 Coberturas", [
        data.medical_assistance ? `<p style="${TXT}display:flex;justify-content:space-between;"><span>Assistência Médica</span><span style="font-weight:600;color:#1e293b;">${escapeHtml(data.medical_assistance)}</span></p>` : "",
        data.hospital_expenses ? `<p style="${TXT}display:flex;justify-content:space-between;"><span>Despesas Hospitalares</span><span style="font-weight:600;color:#1e293b;">${escapeHtml(data.hospital_expenses)}</span></p>` : "",
        data.lost_baggage ? `<p style="${TXT}display:flex;justify-content:space-between;"><span>Bagagem Extraviada</span><span style="font-weight:600;color:#1e293b;">${escapeHtml(data.lost_baggage)}</span></p>` : "",
        data.trip_cancellation ? `<p style="${TXT}display:flex;justify-content:space-between;"><span>Cancelamento</span><span style="font-weight:600;color:#1e293b;">${escapeHtml(data.trip_cancellation)}</span></p>` : "",
        data.trip_interruption ? `<p style="${TXT}display:flex;justify-content:space-between;"><span>Interrupção</span><span style="font-weight:600;color:#1e293b;">${escapeHtml(data.trip_interruption)}</span></p>` : "",
        data.dental_assistance ? `<p style="${TXT}display:flex;justify-content:space-between;"><span>Odontológica</span><span style="font-weight:600;color:#1e293b;">${escapeHtml(data.dental_assistance)}</span></p>` : "",
        data.medical_repatriation ? `<p style="${TXT}display:flex;justify-content:space-between;"><span>Repatriação</span><span style="font-weight:600;color:#1e293b;">${escapeHtml(data.medical_repatriation)}</span></p>` : "",
        data.covid_coverage ? `<p style="${TXT}display:flex;justify-content:space-between;"><span>COVID</span><span style="font-weight:600;color:#1e293b;">${escapeHtml(data.covid_coverage)}</span></p>` : "",
      ])
    : "";

  const procedure = (data.how_to_activate || data.hospital_procedure || data.reimbursement_info)
    ? miniCard("🆘 O que Fazer em Emergência", [
        data.how_to_activate ? `<p style="${TXT_FG}white-space:pre-line;">${escapeHtml(data.how_to_activate)}</p>` : "",
        p("📄 Documentos", data.required_documents_claim),
        data.hospital_procedure ? `<p style="${TXT}">🏥 ${escapeHtml(data.hospital_procedure)}</p>` : "",
        data.reimbursement_info ? `<p style="${TXT}">💰 Reembolso: ${escapeHtml(data.reimbursement_info)}</p>` : "",
      ], "primary")
    : "";

  const insured = data.insured_persons?.length > 0
    ? miniCard("👨‍👩‍👧 Segurados", data.insured_persons.map((p: any) => `<p style="${TXT}">${escapeHtml(p.name)}${p.coverage_type ? ` (${p.coverage_type === 'individual' ? 'Individual' : 'Familiar'})` : ''}${p.birth_date ? ` • ${escapeHtml(p.birth_date)}` : ''}</p>`))
    : "";

  const tips = data.agency_tips
    ? miniCard("🧠 Orientações do seu Agente", [`<p style="${TXT_FG}white-space:pre-line;">${escapeHtml(data.agency_tips)}</p>`], "tips")
    : "";

  const notes = data.agency_notes
    ? miniCard("📝 Observações", [`<p style="${TXT_ITALIC}">${escapeHtml(data.agency_notes)}</p>`])
    : "";

  return head + emergency + coverages + procedure + insured + tips + notes;
}

function renderCruiseBody(service: TripService): string {
  const data = service.service_data as any;
  const head = renderServiceHeadline({
    title: data.ship_name,
    dates: `${fmtDate(data.start_date)} - ${fmtDate(data.end_date)}`,
    lines: [
      data.cruise_company ? `Companhia: ${data.cruise_company}` : "",
      `Roteiro: ${data.route || ''}`,
      data.embarkation_port ? `Embarque: ${data.embarkation_port}` : "",
      data.disembarkation_port ? `Desembarque: ${data.disembarkation_port}` : "",
      data.cabin_type ? `Cabine: ${data.cabin_type}${data.cabin_number ? ` #${data.cabin_number}` : ''}` : "",
      data.deck ? `Deck: ${data.deck}` : "",
    ],
  });

  const itinerary = data.itinerary?.length > 0
    ? miniCard("🗺 Roteiro", data.itinerary.map((stop: any) => `<p style="${TXT}border-left:2px solid rgba(15,118,110,0.25);padding-left:6px;"><strong>${escapeHtml(stop.date ? `${stop.date} – ` : '')}${escapeHtml(stop.port || '')}</strong>${stop.stop_type === 'navegacao' ? ' (Navegação)' : ''}${stop.arrival_time ? ` ${escapeHtml(stop.arrival_time)}` : ''}${stop.departure_time ? ` – ${escapeHtml(stop.departure_time)}` : ''}</p>`))
    : "";

  const boarding = (data.boarding_terminal || data.recommended_arrival || data.required_documents || data.boarding_notes)
    ? miniCard("⚠️ Orientações de Embarque", [
        p("Terminal", data.boarding_terminal),
        p("Chegada", data.recommended_arrival),
        p("Documentos", data.required_documents),
        p("Bagagem", data.baggage_policy),
        p("Dress Code", data.dress_code),
        data.boarding_notes ? `<p style="${TXT_ITALIC}">${escapeHtml(data.boarding_notes)}</p>` : "",
      ])
    : "";

  const passengers = data.passengers?.length > 0
    ? miniCard("👤 Passageiros", data.passengers.map((p: any) => `<p style="${TXT}">${escapeHtml(p.name)}</p>`))
    : "";

  return head + itinerary + boarding + passengers;
}

function renderTrainBody(service: TripService): string {
  const data = service.service_data as any;
  const time = data.departure_time && data.arrival_time ? `${data.departure_time} → ${data.arrival_time}` : '';
  const head = renderServiceHeadline({
    title: `🚆 ${data.origin_city || ''} → ${data.destination_city || ''}`,
    dates: data.travel_date ? `${fmtDate(data.travel_date)}${time ? ` • ${time}` : ''}` : "",
    lines: [
      data.train_company ? `${data.train_company}${data.train_number ? ` • Trem ${data.train_number}` : ''}` : "",
      data.travel_class ? `Classe: ${data.travel_class}` : "",
      (data.coach || data.seat) ? `${data.coach ? `Vagão ${data.coach}` : ''}${data.seat ? ` • Assento ${data.seat}` : ''}` : "",
      data.origin_station ? `Embarque: ${data.origin_station}` : "",
      data.destination_station ? `Desembarque: ${data.destination_station}` : "",
    ],
  });
  const passengers = data.passengers?.length > 0
    ? miniCard("👤 Passageiros", data.passengers.map((p: any) => `<p style="${TXT}">${escapeHtml(p.name)}</p>`))
    : "";
  const notes = data.boarding_notes
    ? miniCard("📋 Orientações", [`<p style="${TXT_ITALIC}">${escapeHtml(data.boarding_notes)}</p>`])
    : "";
  return head + passengers + notes;
}

function renderOtherBody(service: TripService): string {
  const data = service.service_data as any;
  const otherTypeMap: Record<string, string> = { restaurante: '🍽️ Restaurante', guia_turistico: '🧭 Guia Turístico', chip_internet: '📶 Chip/Internet', experiencia: '✨ Experiência', evento: '📅 Evento', spa_wellness: '🧘 Spa/Bem-estar', servico_vip: '👑 Serviço VIP', concierge: '🛎️ Concierge', personalizado: '⭐ Personalizado' };
  const head = renderServiceHeadline({
    title: data.service_name || (data.other_service_type ? (otherTypeMap[data.other_service_type] || data.other_service_type) : 'Serviço'),
    dates: data.date ? `${fmtDate(data.date)}${data.time ? ` às ${data.time}` : ''}` : "",
    lines: [
      data.other_service_type ? `Tipo: ${otherTypeMap[data.other_service_type] || data.custom_type_name || data.other_service_type}` : "",
      data.city ? `Local: ${data.city}${data.country ? `, ${data.country}` : ''}` : "",
      data.duration ? `Duração: ${data.duration}` : "",
      data.reservation_code ? `Reserva: ${data.reservation_code}` : "",
    ],
  });

  const location = (data.location_name || data.address || data.maps_url)
    ? miniCard("📍 Localização", [
        data.location_name ? `<p style="${TXT_FG}font-weight:600;">${escapeHtml(data.location_name)}</p>` : "",
        data.address ? `<p style="${TXT}">${escapeHtml(data.address)}</p>` : "",
        p("Ponto de encontro", data.meeting_point),
        data.how_to_arrive ? `<p style="${TXT_ITALIC}">${escapeHtml(data.how_to_arrive)}</p>` : "",
        data.maps_url ? `<p style="${TXT}"><a href="${escapeHtml(data.maps_url)}" style="color:#0f766e;text-decoration:underline;">🗺️ Abrir no mapa</a></p>` : "",
      ])
    : "";

  const contact = (data.contact_name || data.contact_phone || data.contact_whatsapp)
    ? miniCard("👤 Contato", [
        data.contact_name ? `<p style="${TXT}">${escapeHtml(data.contact_name)}${data.contact_company ? ` — ${escapeHtml(data.contact_company)}` : ''}</p>` : "",
        p("🌐", data.contact_language),
        data.contact_phone ? `<p style="${TXT}">📞 ${escapeHtml(data.contact_phone)}</p>` : "",
        data.contact_whatsapp ? `<p style="${TXT}">💬 WhatsApp: ${escapeHtml(data.contact_whatsapp)}</p>` : "",
        data.contact_email ? `<p style="${TXT}">✉️ ${escapeHtml(data.contact_email)}</p>` : "",
      ])
    : "";

  const chip = data.other_service_type === 'chip_internet' && (data.chip_operator || data.chip_activation_instructions)
    ? miniCard("📶 Chip / Internet", [
        p("Operadora", data.chip_operator),
        data.chip_type ? p("Tipo", data.chip_type === 'esim' ? 'eSIM (digital)' : 'Chip Físico') : "",
        data.chip_activation_instructions ? `<p style="${TXT_FG}font-weight:600;margin-top:4px;">📲 Instruções de Ativação:</p><p style="${TXT}white-space:pre-line;">${escapeHtml(data.chip_activation_instructions)}</p>` : "",
        data.chip_activation_url ? `<p style="${TXT}"><a href="${escapeHtml(data.chip_activation_url)}" style="color:#0f766e;text-decoration:underline;">📲 Link de Ativação</a></p>` : "",
        p("Suporte", data.chip_support),
      ], "primary")
    : "";

  const guide = data.other_service_type === 'guia_turistico' && (data.guide_name || data.guide_meeting_point)
    ? miniCard("🧭 Guia Turístico", [
        p("Guia", data.guide_name),
        p("Idioma", data.guide_language),
        p("Horário", data.guide_tour_time),
        p("Duração", data.guide_tour_duration),
        data.guide_meeting_point ? `<p style="${TXT}">📍 Encontro: ${escapeHtml(data.guide_meeting_point)}</p>` : "",
      ])
    : "";

  const tips = data.agency_tips
    ? miniCard("🧠 Orientações do seu Agente", [`<p style="${TXT_FG}white-space:pre-line;">${escapeHtml(data.agency_tips)}</p>`], "tips")
    : "";

  const description = data.description
    ? miniCard("📝 Descrição", [`<p style="${TXT}white-space:pre-line;">${escapeHtml(data.description)}</p>`])
    : "";

  const notes = data.agency_notes
    ? miniCard("📝 Observações", [`<p style="${TXT_ITALIC}">${escapeHtml(data.agency_notes)}</p>`])
    : "";

  return head + location + contact + chip + guide + tips + description + notes;
}

function renderServiceBody(service: TripService): string {
  switch (service.service_type) {
    case "flight": return renderFlightBody(service);
    case "hotel": return renderHotelBody(service);
    case "car_rental": return renderCarRentalBody(service);
    case "transfer": return renderTransferBody(service);
    case "attraction": return renderAttractionBody(service);
    case "insurance": return renderInsuranceBody(service);
    case "cruise": return renderCruiseBody(service);
    case "train": return renderTrainBody(service);
    case "other": return renderOtherBody(service);
    default:
      // Fallback to legacy flat list if any future type is unmapped
      return getServiceDetails(service).map(d => `<p style="${TXT}">${escapeHtml(d)}</p>`).join("");
  }
}

function generateAgencyHeader(profile: AgentProfile | null): string {
  if (!profile?.agency_logo_url) {
    return `
      <div style="text-align:center;padding:10px 0;background:#ffffff;border-bottom:1px solid #e2e8f0;border-radius:0;">
        <p style="font-size:22px;font-weight:800;color:#0f766e;margin:0;letter-spacing:-0.3px;">
          ${profile?.agency_name || "Carteira Digital"}
        </p>
      </div>
    `;
  }
  return `
    <div style="text-align:center;padding:4px 0 2px;background:#ffffff;">
      <img src="${profile.agency_logo_url}" alt="${profile.agency_name || "Logo"}"
        style="max-height:180px;max-width:520px;object-fit:contain;display:block;margin:0 auto;" />
    </div>
  `;
}

function generateAgentSignature(profile: AgentProfile | null): string {
  if (!profile) return "";
  const avatarHtml = profile.avatar_url
    ? `<img src="${profile.avatar_url}" alt="${profile.name}" style="width:68px;height:68px;border-radius:50%;object-fit:cover;border:4px solid rgba(15,118,110,0.12);box-shadow:0 8px 20px rgba(0,0,0,0.08);display:inline-block;" />`
    : `<div style="width:68px;height:68px;border-radius:50%;background:linear-gradient(135deg,#0f766e,#14b8a6);display:inline-flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:26px;box-shadow:0 8px 20px rgba(0,0,0,0.08);">${profile.name.charAt(0).toUpperCase()}</div>`;
  const whatsappNumber = profile.phone?.replace(/\D/g, "") || "";
  const whatsappLink = whatsappNumber
    ? `https://wa.me/${whatsappNumber.startsWith("55") ? whatsappNumber : `55${whatsappNumber}`}`
    : "";
  return `
    <div class="pdf-block agent-signature" style="margin-top:14px;border:1px solid #e2e8f0;border-radius:16px;background:#ffffff;overflow:hidden;box-shadow:0 1px 2px rgba(0,0,0,0.04);">
      <div style="background:linear-gradient(90deg,rgba(241,245,249,0.7),rgba(241,245,249,0.2));padding:8px 18px;text-align:center;">
        <p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:3px;color:#64748b;margin:0;">Seu consultor de viagens</p>
      </div>
      <div style="padding:14px 18px;text-align:center;">
        ${avatarHtml}
        <p style="font-size:17px;font-weight:800;color:#1e293b;margin:8px 0 1px;">${profile.name}</p>
        ${profile.agency_name ? `<p style="font-size:12px;color:#64748b;margin:0;font-weight:500;">${profile.agency_name}</p>` : ""}
        ${profile.city || profile.state ? `<p style="font-size:11px;color:#94a3b8;margin:2px 0 0;">${[profile.city, profile.state].filter(Boolean).join(", ")}</p>` : ""}
        ${
          whatsappLink
            ? `<div style="margin-top:10px;">
                <a href="${whatsappLink}" target="_blank" style="display:inline-block;background:#25D366;color:#ffffff;padding:9px 24px;border-radius:9999px;font-size:13px;font-weight:700;text-decoration:none;box-shadow:0 6px 16px rgba(37,211,102,0.35);">
                  💬 Falar no WhatsApp
                </a>
              </div>`
            : ""
        }
      </div>
    </div>
  `;
}

export interface ItineraryActivityForPDF {
  id: string;
  day_date: string;
  period: string;
  title: string;
  description: string | null;
  start_time: string | null;
  location: string | null;
  notes: string | null;
  order_index: number;
  maps_url?: string | null;
  photo_urls?: string[];
  document_urls?: string[];
}

function generateItinerarySection(
  activities: ItineraryActivityForPDF[],
  resolveUrl: (path: string) => string | null
): string {
  if (!activities || activities.length === 0) return "";

  const PERIOD_LABELS: Record<string, string> = { morning: "☀️ Manhã", afternoon: "🌅 Tarde", evening: "🌙 Noite" };
  
  const grouped = activities.reduce((acc, act) => {
    if (!acc[act.day_date]) acc[act.day_date] = [];
    acc[act.day_date].push(act);
    return acc;
  }, {} as Record<string, ItineraryActivityForPDF[]>);

  const sortedDates = Object.keys(grouped).sort();

  const daysHtml = sortedDates.map((dateStr, idx) => {
    const [y, m, d] = dateStr.split("-").map(Number);
    const dayDate = new Date(y, m - 1, d);
    const dayActivities = grouped[dateStr];
    const periods = ["morning", "afternoon", "evening"];

    const periodsHtml = periods.map(period => {
      const periodActs = dayActivities.filter(a => a.period === period);
      if (periodActs.length === 0) return "";
      
      const actsHtml = periodActs.map(act => `
        <div style="border-left: 2px solid #0f766e33; padding-left: 10px; margin-bottom: 6px;">
          <p style="font-weight: 600; font-size: 13px; margin: 0;">${act.title}</p>
          ${act.description ? `<p style="font-size: 12px; color: #475569; margin: 2px 0 0 0;">${act.description}</p>` : ''}
          ${act.start_time ? `<p style="font-size: 11px; color: #64748b; margin: 2px 0 0 0;">⏰ ${act.start_time}</p>` : ''}
          ${act.location ? `<p style="font-size: 11px; color: #64748b; margin: 2px 0 0 0;">📍 ${act.location}</p>` : ''}
          ${act.notes ? `<p style="font-size: 11px; color: #64748b; font-style: italic; margin: 2px 0 0 0;">${act.notes}</p>` : ''}
          ${act.maps_url ? `<p style="font-size: 11px; margin: 2px 0 0 0;"><a href="${act.maps_url.startsWith('http') ? act.maps_url : `https://www.google.com/maps/search/${encodeURIComponent(act.maps_url)}`}" style="color: #0f766e; text-decoration: underline;">🗺️ Ver no Google Maps</a></p>` : ''}
          ${(() => {
            const photos = (act.photo_urls || [])
              .map(p => resolveUrl(p))
              .filter((u): u is string => !!u);
            if (!photos.length) return '';
            return `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px;">${photos.map(u => `<img src="${u}" style="width:90px;height:90px;object-fit:cover;border-radius:6px;border:1px solid #e2e8f0;" />`).join('')}</div>`;
          })()}
          ${(() => {
            const docs = (act.document_urls || [])
              .map(p => ({ url: resolveUrl(p), name: decodeURIComponent((p.split('/').pop() || 'documento').replace(/^\d+_/, '')) }))
              .filter(d => !!d.url);
            if (!docs.length) return '';
            return `<div style="margin-top:6px;">${docs.map(d => `<a href="${d.url}" style="display:inline-block;font-size:11px;color:#0f766e;text-decoration:underline;margin-right:8px;">📎 ${d.name}</a>`).join('')}</div>`;
          })()}
        </div>
      `).join("");

      return `
        <div style="margin-bottom: 10px;">
          <p style="font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 6px 0;">
            ${PERIOD_LABELS[period] || period}
          </p>
          ${actsHtml}
        </div>
      `;
    }).join("");

    const formattedDate = format(dayDate, "EEEE, dd 'de' MMMM", { locale: ptBR });

    return `
      <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 12px; background: white; page-break-inside: avoid;">
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
          <div style="width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, #0f766e20, #14b8a620); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px; color: #0f766e;">
            ${idx + 1}
          </div>
          <div>
            <p style="font-weight: 600; font-size: 14px; margin: 0;">Dia ${idx + 1}</p>
            <p style="font-size: 12px; color: #64748b; margin: 0; text-transform: capitalize;">${formattedDate}</p>
          </div>
        </div>
        ${periodsHtml}
      </div>
    `;
  }).join("");

  return `
    <div style="margin-top: 32px; page-break-before: auto;">
      <h3 style="font-size: 20px; margin-bottom: 20px; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0;">
        📅 Roteiro Dia a Dia
      </h3>
      ${daysHtml}
    </div>
  `;
}

export async function generateTripPDF(
  trip: Trip,
  profile?: AgentProfile | null,
  itineraryActivities?: ItineraryActivityForPDF[],
  voucherAccess?: VoucherAccessOptions
) {
  const parseLocal = (d: string) => { const [y,m,day] = d.split('-').map(Number); return new Date(y, m-1, day); };
  const startDate = parseLocal(trip.start_date);
  const endDate = parseLocal(trip.end_date);
  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  // Build permanent voucher URLs using the serve-voucher proxy
  toast.info("Preparando PDF com documentos...");
  const permanentUrlCache: Record<string, string> = {};
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const shareToken = (trip as any).share_token;

  if (supabaseUrl && shareToken) {
    for (const service of (trip.services || [])) {
      const files: { path: string }[] = [];
      if (service.attachments?.length > 0) {
        for (const att of service.attachments) {
          if (att.url) files.push({ path: att.url });
        }
      } else if (service.voucher_url) {
        files.push({ path: service.voucher_url });
      }
      for (const file of files) {
        const cleanPath = extractVoucherPath(file.path);
        if (cleanPath) {
          const url = `${supabaseUrl}/functions/v1/serve-voucher?token=${encodeURIComponent(shareToken)}&file=${encodeURIComponent(cleanPath)}`;
          permanentUrlCache[file.path] = url;
        }
      }
    }
  }

  // Group services by type, but preserve user-defined order:
  // - services within each group keep their order_index
  // - groups themselves are sorted by the lowest order_index of their first service
  const sortedServices = [...(trip.services || [])].sort(
    (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)
  );

  // Cards de serviço alinhados visualmente ao QuotePDF (gradiente por categoria + emoji)
  const servicesHtml = sortedServices.map((service) => {
    const type = service.service_type as TripServiceType;
    const label = SERVICE_LABELS[type] || "Serviço";
    const emoji = SERVICE_EMOJI[type] || "📋";
    const grad = SERVICE_GRADIENTS[type] || SERVICE_GRADIENTS.other;
    const bodyHtml = renderServiceBody(service);

    let attachmentsHtml = '';
    if (service.attachments?.length > 0) {
      attachmentsHtml = service.attachments.map((att: any) => {
        const signedUrl = permanentUrlCache[att.url];
        if (signedUrl) {
          return `<a href="${signedUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;gap:4px;color:#0f766e;font-size:12px;text-decoration:underline;margin-right:12px;">📎 ${att.name} ↗</a>`;
        }
        return `<span style="color:#64748b;font-size:12px;">📎 ${att.name}</span>`;
      }).join(' ');
    } else if (service.voucher_url) {
      const signedUrl = permanentUrlCache[service.voucher_url];
      const name = service.voucher_name || 'Documento anexo';
      if (signedUrl) {
        attachmentsHtml = `<a href="${signedUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;gap:4px;color:#0f766e;font-size:12px;text-decoration:underline;">📎 ${name} ↗</a>`;
      } else {
        attachmentsHtml = `<span style="color:#64748b;font-size:12px;">📎 ${name}</span>`;
      }
    }

    const attachmentsBlock = attachmentsHtml
      ? `<div class="pdf-block" style="margin-top:8px;padding-top:6px;border-top:1px solid #f1f5f9;">${attachmentsHtml}</div>`
      : "";

    return `
      <div class="pdf-card service-card" style="border:1px solid #e2e8f0;border-radius:14px;margin-bottom:10px;background:#ffffff;overflow:hidden;box-shadow:0 1px 2px rgba(0,0,0,0.04);">
        <div class="pdf-block pdf-header service-title" style="display:flex;justify-content:space-between;align-items:center;gap:12px;background:${grad.bg};padding:8px 14px;color:${grad.fg};">
          <div style="display:flex;align-items:center;gap:12px;min-width:0;flex:1;">
            <div style="width:34px;height:34px;border-radius:9px;background:${grad.iconBg};display:inline-flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 1px 2px rgba(0,0,0,0.06);">${emoji}</div>
            <div style="min-width:0;">
              <p style="font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:1.2px;color:${grad.fg};margin:0;line-height:1.2;">${label}</p>
            </div>
          </div>
        </div>
        <div style="padding:12px 16px;">
          ${bodyHtml}
          ${attachmentsBlock}
        </div>
      </div>
    `;
  }).join("");

  const resolveItineraryUrl = (p: string): string | null => {
    if (!p) return null;
    if (/^https?:\/\//i.test(p)) return p;
    if (!supabaseUrl || !shareToken) return null;
    const cleanPath = extractVoucherPath(p);
    if (!cleanPath) return null;
    return `${supabaseUrl}/functions/v1/serve-voucher?token=${encodeURIComponent(shareToken)}&file=${encodeURIComponent(cleanPath)}`;
  };
  const itineraryHtml = generateItinerarySection(itineraryActivities || [], resolveItineraryUrl);

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Carteira Digital — ${(trip as any).trip_title || trip.client_name}</title>
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family:'Segoe UI',system-ui,-apple-system,sans-serif; color:#1e293b; line-height:1.5; background:#f8fafc; }
        img { max-width:100%; height:auto; }
        a { color:#0f766e; }
        @media print {
          @page { size: A4; margin: 14mm 10mm 10mm 10mm; }
          @page :first { margin-top: 8mm; }
          html, body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            background: #fff !important;
            line-height: 1.42 !important;
          }
          a { color:#0f766e !important; text-decoration:underline !important; }

          .pdf-hero { padding-top: 0 !important; padding-bottom: 6px !important; }
          .pdf-hero h1 { font-size: 26px !important; line-height: 1.05 !important; margin-bottom: 2px !important; }
          .pdf-hero p { margin-top: 2px !important; }

          .overview-card { padding: 10px 14px !important; margin-bottom: 12px !important; }

          .service-card { margin-bottom: 7px !important; }
          .service-card > div:last-child { padding: 9px 14px !important; }
          .service-title { padding: 6px 12px !important; }
          .pdf-details p { margin: 1px 0 !important; line-height: 1.38 !important; }

          .agent-signature { margin-top: 10px !important; }
          .agent-signature > div:last-child { padding: 10px 16px !important; }

          .pdf-block,
          .pdf-header,
          .agent-signature,
          .overview-card,
          img { break-inside: avoid; page-break-inside: avoid; }

          .agent-signature { break-before: avoid; page-break-before: avoid; }

          .pdf-title, .section-title, .service-title {
            break-after: avoid; page-break-after: avoid;
          }
          .pdf-card, .pdf-details, .service-card {
            break-inside: auto; page-break-inside: auto;
          }
          h1, h2, h3 { break-after: avoid; page-break-after: avoid; }
          p { orphans: 3; widows: 3; }
        }
      </style>
    </head>
    <body>
      <div style="max-width:820px;margin:0 auto;padding:0 0 20px;">
        ${generateAgencyHeader(profile || null)}

        <div style="padding:6px 32px 0;">
          <!-- Hero -->
          <div class="pdf-block pdf-hero" style="text-align:center;padding:2px 0 12px;">
            <div style="display:inline-block;background:rgba(15,118,110,0.1);color:#0f766e;padding:5px 14px;border-radius:9999px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:2.5px;margin-bottom:8px;">
              🧳 Carteira Digital
            </div>
            <h1 style="font-size:32px;font-weight:800;color:#1e293b;margin:0 0 2px;letter-spacing:-1px;line-height:1.05;">${(trip as any).trip_title || trip.destination}</h1>
            <p style="font-size:14px;color:#64748b;margin-top:4px;">
              ${(trip as any).trip_title ? `<span>${trip.destination} • </span>` : ''}Preparado especialmente para <strong style="color:#1e293b;">${trip.client_name}</strong>
            </p>
          </div>

          <!-- Overview -->
          <div class="pdf-block overview-card" style="background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;padding:14px 18px;margin-bottom:18px;display:grid;grid-template-columns:repeat(3,1fr);gap:14px;box-shadow:0 1px 2px rgba(0,0,0,0.04);">
            <div>
              <p style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;font-weight:700;">📍 Destino</p>
              <p style="font-size:14px;font-weight:700;color:#1e293b;">${trip.destination}</p>
            </div>
            <div style="border-left:1px solid #f1f5f9;padding-left:18px;">
              <p style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;font-weight:700;">📅 Período</p>
              <p style="font-size:14px;font-weight:700;color:#1e293b;">${formatDate(trip.start_date)} — ${formatDate(trip.end_date)}</p>
              <p style="font-size:12px;color:#94a3b8;margin-top:2px;">${days} dias</p>
            </div>
            <div style="border-left:1px solid #f1f5f9;padding-left:18px;">
              <p style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;font-weight:700;">👤 Cliente</p>
              <p style="font-size:14px;font-weight:700;color:#1e293b;">${trip.client_name}</p>
            </div>
          </div>

          <!-- Services -->
          <div style="margin-bottom:18px;">
            <div class="pdf-title section-title" style="display:flex;align-items:center;gap:14px;margin-bottom:10px;">
              <div style="flex:1;height:1px;background:#e2e8f0;"></div>
              <h3 style="font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:3px;color:#64748b;margin:0;white-space:nowrap;">Serviços da Viagem</h3>
              <div style="flex:1;height:1px;background:#e2e8f0;"></div>
            </div>
            ${servicesHtml || '<p style="text-align:center;color:#94a3b8;padding:32px;">Nenhum serviço adicionado</p>'}
          </div>

          <!-- Itinerary -->
          ${itineraryHtml}

          <!-- Agent Signature -->
          ${generateAgentSignature(profile || null)}

          <p style="text-align:center;font-size:10px;color:#94a3b8;margin-top:14px;">
            Gerado em ${format(new Date(), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  }
}
