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
}

function generateItinerarySection(activities: ItineraryActivityForPDF[]): string {
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
  const grouped = sortedServices.reduce((acc, service) => {
    const type = service.service_type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(service);
    return acc;
  }, {} as Record<string, TripService[]>);
  const orderedTypes = Object.keys(grouped).sort((a, b) => {
    const aMin = grouped[a][0]?.order_index ?? 0;
    const bMin = grouped[b][0]?.order_index ?? 0;
    return aMin - bMin;
  });

  // Cards de serviço alinhados visualmente ao QuotePDF (gradiente por categoria + emoji)
  const servicesHtml = sortedServices.map((service) => {
    const type = service.service_type as TripServiceType;
    const label = SERVICE_LABELS[type] || "Serviço";
    const emoji = SERVICE_EMOJI[type] || "📋";
    const grad = SERVICE_GRADIENTS[type] || SERVICE_GRADIENTS.other;
    const details = getServiceDetails(service);
    const summary = details[0] || "";
    const restDetails = details.slice(1);

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

    const detailsHtml = restDetails.length > 0
      ? `<div class="pdf-block pdf-details" style="word-wrap:break-word;overflow-wrap:break-word;">
          ${restDetails.map((d) => `<p style="margin:2px 0;font-size:12px;color:#475569;line-height:1.45;white-space:pre-wrap;word-break:break-word;">${d}</p>`).join("")}
        </div>`
      : "";

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
              ${summary ? `<p style="font-size:12px;color:${grad.fg};opacity:0.75;margin:2px 0 0;font-weight:500;line-height:1.3;word-break:break-word;">${summary}</p>` : ""}
            </div>
          </div>
        </div>
        <div style="padding:12px 16px;">
          ${detailsHtml}
          ${attachmentsBlock}
        </div>
      </div>
    `;
  }).join("");

  const itineraryHtml = generateItinerarySection(itineraryActivities || []);

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Carteira Digital — ${trip.client_name}</title>
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
            <h1 style="font-size:32px;font-weight:800;color:#1e293b;margin:0 0 2px;letter-spacing:-1px;line-height:1.05;">${trip.destination}</h1>
            <p style="font-size:14px;color:#64748b;margin-top:4px;">
              Preparado especialmente para <strong style="color:#1e293b;">${trip.client_name}</strong>
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
