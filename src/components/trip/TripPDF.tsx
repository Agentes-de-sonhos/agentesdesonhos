import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Trip, TripService, TripServiceType } from "@/types/trip";
import type { AgentProfile } from "@/hooks/useAgentProfile";
import { extractVoucherPath } from "@/lib/secureVoucher";
import { toast } from "sonner";
import { isGoogleImageRef, resolveServiceImages, resolveServicePlaceId } from "@/lib/serviceImages";
import { formatPublicLongDate, pluralize, type PublicLocale } from "@/i18n/publicMaterials/locale";
import { tWallet } from "@/i18n/publicMaterials/wallet";
import { publicAirportText } from "@/lib/airportDisplay";

/** Resolvedor de referência persistida -> URL utilizável no HTML do PDF. */
export type PdfImageResolver = (ref: string) => string | null;

/** Reúne as referências persistidas de imagem do serviço, sem repetição e preservando a ordem. */
export function collectServiceImageRefs(service: TripService): string[] {
  const out: string[] = [];
  const push = (ref?: string | null) => {
    if (!ref || typeof ref !== "string") return;
    const v = ref.trim();
    if (!v || out.includes(v)) return;
    out.push(v);
  };
  (service.image_urls || []).forEach(push);
  push(service.image_url);
  return out;
}

/**
 * Constrói o mapa `ref -> URL fresca` para todos os serviços, resolvendo apenas
 * referências do Google (gplace:// e URLs legadas). Nada é copiado/persistido.
 */
export async function buildServiceImageResolver(services: TripService[]): Promise<PdfImageResolver> {
  const imageMap = new Map<string, string>();
  for (const service of services || []) {
    const refs = collectServiceImageRefs(service);
    if (!refs.some(isGoogleImageRef)) continue;
    try {
      const resolved = await resolveServiceImages(refs, resolveServicePlaceId(service));
      resolved.forEach((r) => {
        if (!r.src) return;
        // Sem place_id, resolveServiceImages devolve a própria URL legada como
        // fallback. Isso NÃO é resolução real: aceitar reintroduziria a URL
        // expirada no PDF. O critério é a igualdade com a referência crua —
        // URLs frescas do googleusercontent seguem sendo aceitas.
        if (isGoogleImageRef(r.ref) && r.src === r.ref) return;
        imageMap.set(r.ref, r.src);
      });
    } catch {
      /* referências não resolvidas são simplesmente omitidas */
    }
  }
  return (ref: string) => {
    if (imageMap.has(ref)) return imageMap.get(ref)!;
    return isGoogleImageRef(ref) ? null : ref || null;
  };
}

/**
 * Aguarda todas as imagens da janela de impressão terminarem (load ou error),
 * com timeout de segurança. Falhas individuais nunca travam a impressão.
 */
export function waitForWindowImages(win: Window, timeoutMs = 8000): Promise<void> {
  return new Promise<void>((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      resolve();
    };
    const timer = setTimeout(finish, timeoutMs);
    const finishAndClear = () => {
      clearTimeout(timer);
      finish();
    };
    try {
      const imgs = Array.from(win.document?.images || []) as HTMLImageElement[];
      const pending = imgs.filter((img) => !img.complete);
      if (pending.length === 0) {
        finishAndClear();
        return;
      }
      let remaining = pending.length;
      const settled = new WeakSet<object>();
      const settleOnce = (img: HTMLImageElement) => {
        if (settled.has(img)) return;
        settled.add(img);
        remaining -= 1;
        if (remaining <= 0) finishAndClear();
      };
      pending.forEach((img) => {
        const handler = () => settleOnce(img);
        img.addEventListener("load", handler, { once: true });
        img.addEventListener("error", handler, { once: true });
        // Corrida: a imagem pode ter concluído entre o filtro e o registro dos
        // listeners — nesse caso liquidamos aqui (uma única vez).
        if (img.complete) settleOnce(img);
      });
    } catch {
      finishAndClear();
    }
  });
}

export interface VoucherAccessOptions {
  mode: "authenticated" | "public";
  slug?: string;
  shareToken?: string;
  password?: string;
}

function getServiceLabels(locale: PublicLocale): Record<TripServiceType, string> {
  const t = tWallet(locale);
  return {
  flight: t("serviceFlight"), hotel: t("serviceHotel"), car_rental: t("serviceCarRental"), transfer: t("serviceTransfer"),
  attraction: t("serviceAttraction"), insurance: t("serviceInsurance"), cruise: t("serviceCruise"), train: t("serviceTrain"), other: t("serviceOther"),
  };
}
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

function formatDate(dateStr: string, locale: PublicLocale = "pt-BR") {
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const fmt = locale === "it-IT" ? "dd/MM/yyyy" : "dd/MM/yyyy";
    return format(new Date(y, m - 1, d), fmt, { locale: ptBR });
  } catch {
    return dateStr;
  }
}

function getServiceDetails(service: TripService, locale: PublicLocale = "pt-BR"): string[] {
  const t = tWallet(locale);
  const data = service.service_data as any;
  const details: string[] = [];
  
  switch (service.service_type) {
    case "flight":
      details.push(`${data.origin_city || ''} → ${data.destination_city || ''}`);
      details.push(`${t("fldCompanhia")}: ${data.main_airline || data.airline || ''}`);
      if (data.locator_code) details.push(`${t("fldLocalizador")}: ${data.locator_code}`);
      if (data.trip_type) {
        const types: Record<string, string> = { ida: t("tripSomenteIda"), ida_volta: t("tripIdaVolta"), multi_trechos: t("tripMultiTrechos") };
        details.push(`${t("fldTipo")}: ${types[data.trip_type] || data.trip_type}`);
      }
      if (data.segments?.length > 0) {
        details.push(t("detailsTrechosSeparator"));
        data.segments.forEach((seg: any, i: number) => {
          const segType = seg.segment_type === 'ida' ? t("fldIda") : seg.segment_type === 'conexao' ? t("segConexao") : t("segVolta");
          details.push(`${segType}: ${publicAirportText({ code: seg.origin_airport, customName: seg.origin_airport_name, city: seg.origin_city })} → ${publicAirportText({ code: seg.destination_airport, customName: seg.destination_airport_name, city: seg.destination_city })} • ${seg.flight_date ? formatDate(seg.flight_date, locale) : ''} ${seg.departure_time || ''} → ${seg.arrival_time || ''} • ${seg.airline || ''} ${seg.flight_number || ''}`);
        });
      } else {
        details.push(`${t("fldIda")}: ${formatDate(data.departure_date, locale)} | ${t("segVolta")}: ${formatDate(data.return_date, locale)}`);
      }
      if (data.passengers?.length > 0) details.push(`${t("fldPassageiros")}: ${data.passengers.map((p: any) => p.name).join(', ')}`);
      if (data.carry_on || data.checked_baggage) details.push(`${t("fldBagagem")}: ${data.carry_on ? `${t("fldMao")}: ${data.carry_on}` : ''} ${data.checked_baggage ? `${t("fldDespachada")}: ${data.checked_baggage}` : ''}`);
      if (data.recommended_arrival) details.push(`${t("fldAntecedencia")}: ${data.recommended_arrival}`);
      if (data.required_documents) details.push(`${t("fldDocumentos")}: ${data.required_documents}`);
      if (data.boarding_notes || data.notes) details.push(`${t("fldObs")}: ${data.boarding_notes || data.notes}`);
      break;
    case "hotel": {
      const catMap: Record<string, string> = { '3': '⭐⭐⭐', '4': '⭐⭐⭐⭐', '5': '⭐⭐⭐⭐⭐', boutique: t("catBoutique"), resort: t("catResort"), pousada: t("catPousada") };
      const roomMap: Record<string, string> = { standard: t("roomStandard"), superior: t("roomSuperior"), deluxe: t("roomDeluxe"), suite: t("roomSuite"), suite_junior: t("roomSuiteJunior"), presidencial: t("roomPresidencial"), apartamento: t("roomApartamento"), villa: t("roomVilla"), bangalo: t("roomBangalo") };
      const mealMap: Record<string, string> = { somente_hospedagem: t("mealSomenteHospedagem"), cafe_manha: t("mealCafeManha"), meia_pensao: t("mealMeiaPensao"), pensao_completa: t("mealPensaoCompleta"), all_inclusive: t("mealAllInclusive") };
      details.push(`${data.hotel_name}${data.hotel_category ? ` ${catMap[data.hotel_category] || data.hotel_category}` : ''}`);
      details.push(`${data.city}${data.country ? `, ${data.country}` : ''}`);
      details.push(`${t("fldCheckin")}: ${formatDate(data.check_in, locale)} | ${t("fldCheckout")}: ${formatDate(data.check_out, locale)}`);
      if (data.reservation_code) details.push(`${t("fldReserva")}: ${data.reservation_code}`);
      if (data.room_type) details.push(`${t("fldAcomodacao")}: ${roomMap[data.room_type] || data.room_type}`);
      if (data.bed_type) details.push(`${t("fldCama")}: ${data.bed_type}`);
      if (data.meal_plan) details.push(`${t("fldRegime")}: ${mealMap[data.meal_plan] || data.meal_plan}`);
      if (data.checkin_time) details.push(`${t("fldHorarioCheckin")}: ${data.checkin_time}`);
      if (data.checkout_time) details.push(`${t("fldHorarioCheckout")}: ${data.checkout_time}`);
      if (data.address) details.push(`${t("fldEndereco")}: ${data.address}`);
      if (data.hotel_phone) details.push(`${t("fldTelefone")}: ${data.hotel_phone}`);
      if (data.guests?.length > 0) details.push(`${t("fldHospedes")}: ${data.guests.map((g: any) => g.name).join(', ')}`);
      if (data.cancellation_policy) details.push(`${t("fldCancelamento")}: ${data.cancellation_policy}`);
      if (data.mandatory_fees) details.push(`${t("fldTaxasDestino")}: ${data.mandatory_fees}`);
      if (data.notes) details.push(`${t("fldObs")}: ${data.notes}`);
      break;
    }
    case "car_rental":
      if (data.rental_company) details.push(`${t("fldLocadora")}: ${data.rental_company}`);
      if (data.reservation_code) details.push(`${t("fldReserva")}: ${data.reservation_code}`);
      const catLabels: Record<string, string> = { economico: t("carEconomico"), compacto: t("carCompacto"), intermediario: t("carIntermediario"), suv: t("carSuv"), premium: t("carPremium"), luxo: t("carLuxo"), van: t("carVan") };
      details.push(`${t("fldCategoria")}: ${catLabels[data.car_type] || data.car_type || ''}`);
      if (data.car_model) details.push(`${t("fldModelo")}: ${data.car_model}`);
      if (data.transmission) details.push(`${t("fldTransmissao")}: ${data.transmission === 'automatico' ? t("transmAutomatico") : t("transmManual")}`);
      details.push(`${t("fldRetirada")}: ${data.pickup_location || ''}${data.pickup_date ? ` • ${formatDate(data.pickup_date, locale)}` : ''}${data.pickup_time ? ` ${t("wordAs")} ${data.pickup_time}` : ''}`);
      details.push(`${t("fldDevolucao")}: ${data.dropoff_location || ''}${data.dropoff_date ? ` • ${formatDate(data.dropoff_date, locale)}` : ''}${data.dropoff_time ? ` ${t("wordAs")} ${data.dropoff_time}` : ''}`);
      if (data.drivers?.length > 0) details.push(`${t("fldCondutores")}: ${data.drivers.map((d: any) => d.name).join(', ')}`);
      if (data.fuel_policy) {
        const fuelLabels: Record<string, string> = { cheio_cheio: t("fuelCheioCheio"), cheio_vazio: t("fuelCheioVazio"), outro: t("fuelOutro") };
        details.push(`${t("fldCombustivel")}: ${fuelLabels[data.fuel_policy] || data.fuel_policy}`);
      }
      if (data.deposit_amount) details.push(`${t("fldCaucao")}: ${data.deposit_amount}`);
      if (data.required_documents) details.push(`${t("fldDocumentos")}: ${data.required_documents}`);
      if (data.notes) details.push(`${t("fldObs")}: ${data.notes}`);
      break;
      break;
    case "transfer": {
      const typeMap: Record<string, string> = { arrival: t("transferArrival"), departure: t("transferDeparture"), inter_hotel: t("transferInterHotel") };
      const modeMap: Record<string, string> = { privativo: t("transferModePrivativo"), compartilhado: t("transferModeCompartilhado"), shuttle: t("transferModeShuttle") };
      const statusMap: Record<string, string> = { confirmado: t("transferStatusConfirmado"), agendado: t("transferStatusAgendado"), pendente: t("transferStatusPendente") };
      details.push(`${t("fldTipo")}: ${typeMap[data.transfer_type] || data.transfer_type}`);
      if (data.transfer_mode) details.push(`${t("fldModalidade")}: ${modeMap[data.transfer_mode] || data.transfer_mode}`);
      if (data.transfer_status) details.push(`${t("fldStatus")}: ${statusMap[data.transfer_status] || data.transfer_status}`);
      const route = data.origin_location && data.destination_location 
        ? `${data.origin_location} → ${data.destination_location}` 
        : data.location || '';
      if (route) details.push(`${t("fldRota")}: ${route}`);
      if (data.city) details.push(`${t("fldCidade")}: ${data.city}`);
      if (data.date) details.push(`${t("fldData")}: ${formatDate(data.date, locale)}${data.time ? ` ${t("wordAs")} ${data.time}` : ''}`);
      if (data.company_name) details.push(`${t("fldEmpresa")}: ${data.company_name}`);
      if (data.reservation_code) details.push(`${t("fldReserva")}: ${data.reservation_code}`);
      if (data.flight_number) details.push(`${t("fldVoo")}: ${data.flight_number}`);
      if (data.meeting_instructions) details.push(`${t("fldInstrucoes")}: ${data.meeting_instructions}`);
      if (data.driver_name) details.push(`${t("fldMotorista")}: ${data.driver_name}`);
      if (data.driver_phone) details.push(`${t("fldTelefone")}: ${data.driver_phone}`);
      if (data.vehicle_type) details.push(`${t("fldVeiculo")}: ${data.vehicle_type}`);
      if (data.passengers?.length > 0) details.push(`${t("fldPassageiros")}: ${data.passengers.map((p: any) => p.name).join(', ')}`);
      if (data.plan_b) details.push(`${t("fldPlanoB")}: ${data.plan_b}`);
      if (data.notes) details.push(`${t("fldObs")}: ${data.notes}`);
      break;
    }
    case "attraction": {
      const typeMap: Record<string, string> = { parque: t("attrTypeParque"), show: t("attrTypeShow"), passeio: t("attrTypePasseio"), museu: t("attrTypeMuseu"), tour: t("attrTypeTour"), evento: t("attrTypeEvento"), experiencia: t("attrTypeExperiencia") };
      const statusMap: Record<string, string> = { confirmado: t("attrStatusConfirmado"), reservado: t("attrStatusReservado"), flexivel: t("attrStatusFlexivel"), utilizado: t("attrStatusUtilizado") };
      details.push(`${data.name}`);
      if (data.attraction_type) details.push(`${t("fldTipo")}: ${typeMap[data.attraction_type] || data.attraction_type}`);
      if (data.city) details.push(`${t("fldLocal")}: ${data.city}${data.country ? `, ${data.country}` : ''}`);
      details.push(`${t("fldData")}: ${formatDate(data.date, locale)} | ${t("fldQuantidade")}: ${data.quantity}`);
      if (data.status) details.push(`${t("fldStatus")}: ${statusMap[data.status] || data.status}`);
      if (data.entry_time) details.push(`${t("fldEntrada")}: ${data.entry_time}`);
      if (data.duration) details.push(`${t("fldDuracao")}: ${data.duration}`);
      if (data.ticket_code) details.push(`${t("fldCodigo")}: ${data.ticket_code}`);
      if (data.confirmation_code) details.push(`${t("fldConfirmacao")}: ${data.confirmation_code}`);
      if (data.venue_name) details.push(`${t("fldLocal")}: ${data.venue_name}`);
      if (data.address) details.push(`${t("fldEndereco")}: ${data.address}`);
      if (data.passengers?.length > 0) details.push(`${t("fldPassageiros")}: ${data.passengers.map((p: any) => `${p.name} (${p.ticket_type === 'adulto' ? t("ticketAdulto") : p.ticket_type === 'crianca' ? t("ticketCrianca") : t("ticketSenior")})`).join(', ')}`);
      if (data.usage_instructions) details.push(`${t("fldInstrucoes")}: ${data.usage_instructions}`);
      if (data.cancellation_policy) details.push(`${t("fldCancelamento")}: ${data.cancellation_policy}`);
      if (data.agency_tips) details.push(`${t("fldDicas")}: ${data.agency_tips}`);
      if (data.agency_notes) details.push(`${t("fldObs")}: ${data.agency_notes}`);
      break;
    }
    case "insurance": {
      details.push(`${t("fldSeguradora")}: ${data.provider}`);
      if (data.plan_name) details.push(`${t("fldPlano")}: ${data.plan_name}`);
      if (data.policy_number) details.push(`${t("fldApolice")}: ${data.policy_number}`);
      details.push(`${t("fldPeriodo")}: ${formatDate(data.start_date, locale)} ${t("wordPeriodoTo")} ${formatDate(data.end_date, locale)}`);
      if (data.destination_covered) details.push(`${t("fldDestinoCoberto")}: ${data.destination_covered}`);
      if (data.coverage_type) details.push(`${t("fldTipo")}: ${data.coverage_type}`);
      if (data.status) details.push(`${t("fldStatus")}: ${data.status === 'ativo' ? t("insStatusAtivo") : data.status === 'expirado' ? t("insStatusExpirado") : t("insStatusFuturo")}`);
      if (data.coverage) details.push(`${t("fldCobertura")}: ${data.coverage}`);
      if (data.medical_assistance) details.push(`${t("fldAssistenciaMedica")}: ${data.medical_assistance}`);
      if (data.hospital_expenses) details.push(`${t("fldDespesasHospitalares")}: ${data.hospital_expenses}`);
      if (data.lost_baggage) details.push(`${t("fldBagagemExtraviada")}: ${data.lost_baggage}`);
      if (data.trip_cancellation) details.push(`${t("fldCancelamento")}: ${data.trip_cancellation}`);
      if (data.dental_assistance) details.push(`${t("fldOdontologica")}: ${data.dental_assistance}`);
      if (data.medical_repatriation) details.push(`${t("fldRepatriacao")}: ${data.medical_repatriation}`);
      if (data.emergency_phone) details.push(`📞 ${t("fldEmergencia")}: ${data.emergency_phone}`);
      if (data.emergency_whatsapp) details.push(`💬 WhatsApp: ${data.emergency_whatsapp}`);
      if (data.insured_persons?.length > 0) details.push(`${t("fldSegurados")}: ${data.insured_persons.map((p: any) => p.name).join(', ')}`);
      if (data.how_to_activate) details.push(`${t("fldComoAcionar")}: ${data.how_to_activate}`);
      if (data.agency_tips) details.push(`${t("fldDicas")}: ${data.agency_tips}`);
      if (data.agency_notes || data.notes) details.push(`${t("fldObs")}: ${data.agency_notes || data.notes}`);
      break;
    }
    case "cruise":
      if (data.cruise_company) details.push(`${t("fldCompanhia")}: ${data.cruise_company}`);
      details.push(`${t("fldNavio")}: ${data.ship_name}`);
      details.push(`${t("fldRota")}: ${data.route}`);
      if (data.embarkation_port) details.push(`${t("fldEmbarque")}: ${data.embarkation_port}`);
      if (data.disembarkation_port) details.push(`${t("fldDesembarque")}: ${data.disembarkation_port}`);
      details.push(`${t("fldPeriodo")}: ${formatDate(data.start_date, locale)} ${t("wordPeriodoTo")} ${formatDate(data.end_date, locale)}`);
      if (data.booking_number) details.push(`${t("fldReserva")}: ${data.booking_number}`);
      if (data.cabin_type) details.push(`${t("fldCabine")}: ${data.cabin_type}${data.cabin_number ? ` #${data.cabin_number}` : ''}`);
      if (data.deck) details.push(`${t("fldDeck")}: ${data.deck}`);
      if (data.occupancy) details.push(`${t("fldOcupacao")}: ${data.occupancy}`);
      if (data.passengers?.length > 0) details.push(`${t("fldPassageiros")}: ${data.passengers.map((p: any) => p.name).join(', ')}`);
      if (data.itinerary?.length > 0) {
        details.push(t("detailsRoteiroSeparator"));
        data.itinerary.forEach((stop: any) => {
          details.push(`${stop.date ? stop.date + ' – ' : ''}${stop.port} (${stop.stop_type})${stop.arrival_time ? ' ' + stop.arrival_time : ''}${stop.departure_time ? ' – ' + stop.departure_time : ''}`);
        });
      }
      if (data.boarding_terminal) details.push(`${t("fldTerminal")}: ${data.boarding_terminal}`);
      if (data.recommended_arrival) details.push(`${t("fldChegadaRecomendada")}: ${data.recommended_arrival}`);
      if (data.required_documents) details.push(`${t("fldDocumentos")}: ${data.required_documents}`);
      if (data.boarding_notes) details.push(`${t("fldOrientacoes")}: ${data.boarding_notes}`);
      break;
    case "train":
      details.push(`🚆 ${data.origin_city} → ${data.destination_city}`);
      if (data.travel_date) details.push(`${t("fldData")}: ${formatDate(data.travel_date, locale)}${data.departure_time ? ` • ${data.departure_time} → ${data.arrival_time || ''}` : ''}`);
      if (data.train_company) details.push(`${t("fldCompanhia")}: ${data.train_company}${data.train_number ? ` • ${t("fldTrem")} ${data.train_number}` : ''}`);
      if (data.travel_class) details.push(`${t("fldClasse")}: ${data.travel_class}`);
      if (data.coach || data.seat) details.push(`${data.coach ? `${t("fldVagao")} ${data.coach}` : ''}${data.seat ? ` • ${t("fldAssento")} ${data.seat}` : ''}`);
      if (data.origin_station) details.push(`${t("fldEmbarque")}: ${data.origin_station}`);
      if (data.destination_station) details.push(`${t("fldDesembarque")}: ${data.destination_station}`);
      if (data.passengers?.length > 0) details.push(`${t("fldPassageiros")}: ${data.passengers.map((p: any) => p.name).join(', ')}`);
      if (data.boarding_notes) details.push(`${t("fldOrientacoes")}: ${data.boarding_notes}`);
      break;
    case "other": {
      const otherTypeMap: Record<string, string> = { restaurante: t("otherRestaurante"), guia_turistico: t("otherGuiaTuristico"), chip_internet: t("otherChipInternet"), experiencia: t("otherExperiencia"), evento: t("otherEvento"), spa_wellness: t("otherSpaWellness"), servico_vip: t("otherServicoVip"), concierge: t("otherConcierge"), personalizado: t("otherPersonalizado") };
      const statusMap: Record<string, string> = { confirmado: t("otherStatusConfirmado"), agendado: t("otherStatusAgendado"), opcional: t("otherStatusOpcional") };
      if (data.service_name) details.push(`${t("fldServico")}: ${data.service_name}`);
      if (data.other_service_type) details.push(`${t("fldTipo")}: ${otherTypeMap[data.other_service_type] || data.custom_type_name || data.other_service_type}`);
      if (data.city) details.push(`${t("fldLocal")}: ${data.city}${data.country ? `, ${data.country}` : ''}`);
      if (data.date) details.push(`${t("fldData")}: ${formatDate(data.date, locale)}${data.time ? ` ${t("wordAs")} ${data.time}` : ''}`);
      if (data.status) details.push(`${t("fldStatus")}: ${statusMap[data.status] || data.status}`);
      if (data.duration) details.push(`${t("fldDuracao")}: ${data.duration}`);
      if (data.location_name) details.push(`${t("fldLocal")}: ${data.location_name}`);
      if (data.address) details.push(`${t("fldEndereco")}: ${data.address}`);
      if (data.reservation_code) details.push(`${t("fldReserva")}: ${data.reservation_code}`);
      if (data.contact_name) details.push(`${t("fldContato")}: ${data.contact_name}${data.contact_company ? ` — ${data.contact_company}` : ''}`);
      if (data.contact_phone) details.push(`${t("fldTelefone")}: ${data.contact_phone}`);
      if (data.chip_operator) details.push(`${t("fldOperadora")}: ${data.chip_operator} (${data.chip_type === 'esim' ? t("chipEsim") : t("chipFisico")})`);
      if (data.chip_activation_instructions) details.push(`${t("fldAtivacao")}: ${data.chip_activation_instructions}`);
      if (data.guide_name) details.push(`${t("fldGuia")}: ${data.guide_name}${data.guide_language ? ` (${data.guide_language})` : ''}`);
      if (data.guide_meeting_point) details.push(`${t("fldPontoEncontro")}: ${data.guide_meeting_point}`);
      if (data.description) details.push(data.description);
      if (data.agency_tips) details.push(`${t("fldDicas")}: ${data.agency_tips}`);
      if (data.agency_notes) details.push(`${t("fldObs")}: ${data.agency_notes}`);
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

function fmtDate(d: any, locale: PublicLocale = "pt-BR"): string { return d ? formatDate(String(d), locale) : ""; }

function renderFlightBody(service: TripService, locale: PublicLocale = "pt-BR"): string {
  const t = tWallet(locale);
  const data = service.service_data as any;
  const tripTypeMap: Record<string, string> = { ida: t("tripSomenteIda"), ida_volta: t("tripIdaVolta"), multi_trechos: t("tripMultiTrechos") };
  const statusMap: Record<string, string> = { confirmado: t("statusConfirmadoEmoji"), emitido: t("statusEmitidoEmoji"), pendente: t("statusPendenteEmoji") };
  const airline = data.main_airline || data.airline || '';
  const firstDate = data.segments?.[0]?.flight_date || data.departure_date || '';
  const lastDate = data.segments?.[data.segments?.length - 1]?.flight_date || data.return_date || '';
  const datesStr = firstDate ? `${fmtDate(firstDate)}${lastDate && lastDate !== firstDate ? ` - ${fmtDate(lastDate)}` : ''}` : "";

  const head = renderServiceHeadline({
    title: `${data.origin_city || ''} → ${data.destination_city || ''}`,
    dates: datesStr,
    lines: [
      airline ? `${t("fldCompanhia")}: ${airline}` : "",
      data.trip_type ? `${t("fldTipo")}: ${tripTypeMap[data.trip_type] || data.trip_type}` : "",
      data.locator_code ? `${t("fldLocalizador")}: ${data.locator_code}` : "",
      data.flight_status ? `${t("fldStatus")}: ${statusMap[data.flight_status] || data.flight_status}` : "",
    ],
  });

  // Segments timeline
  let segmentsHtml = "";
  if (data.segments?.length > 0) {
    const segCards = data.segments.map((seg: any, i: number) => {
      const segType = seg.segment_type === 'ida' ? t("fldIda") : seg.segment_type === 'conexao' ? t("segConexao") : t("segVolta");
      let conn = "";
      if (i > 0 && data.segments[i - 1]) {
        const prev = data.segments[i - 1];
        if (prev.flight_date === seg.flight_date && prev.arrival_time && seg.departure_time) {
          const [ph, pm] = prev.arrival_time.split(':').map(Number);
          const [sh, sm] = seg.departure_time.split(':').map(Number);
          const diff = (sh * 60 + sm) - (ph * 60 + pm);
          if (diff > 0) {
            const h = Math.floor(diff / 60); const m = diff % 60;
            conn = `<p style="font-size:10px;color:#b45309;background:#fffbeb;border:1px solid #fde68a;padding:3px 8px;border-radius:6px;margin:4px 0;font-weight:600;">${escapeHtml(t("sectionConexaoEm"))} ${escapeHtml(seg.origin_city || seg.origin_airport || '')} — ${h}h${m > 0 ? String(m).padStart(2, '0') : ''}</p>`;
          }
        }
      }
      return `${conn}<div style="border-left:2px solid rgba(15,118,110,0.4);padding:3px 0 3px 9px;margin:2px 0;">
        <p style="margin:0 0 2px;font-size:10px;">
          <span style="background:rgba(15,118,110,0.12);color:#0f766e;padding:1px 6px;border-radius:4px;font-weight:700;">${escapeHtml(segType)}</span>
          ${seg.airline ? `<span style="color:#64748b;margin-left:6px;">${escapeHtml(seg.airline)}</span>` : ''}
          ${seg.flight_number ? `<span style="color:#64748b;font-family:'Courier New',monospace;margin-left:6px;">${escapeHtml(seg.flight_number)}</span>` : ''}
        </p>
        <p style="margin:1px 0;font-size:12px;font-weight:600;color:#1e293b;">${escapeHtml(publicAirportText({ code: seg.origin_airport, customName: seg.origin_airport_name, city: seg.origin_city }))} → ${escapeHtml(publicAirportText({ code: seg.destination_airport, customName: seg.destination_airport_name, city: seg.destination_city }))}</p>
        <p style="margin:1px 0;font-size:10px;color:#64748b;">
          ${seg.flight_date ? escapeHtml(fmtDate(seg.flight_date)) : ''}${seg.departure_time ? ` • ${escapeHtml(seg.departure_time)}` : ''}${seg.arrival_time ? ` → ${escapeHtml(seg.arrival_time)}` : ''}${seg.terminal ? ` • ${t("fldTerminal")} ${escapeHtml(seg.terminal)}` : ''}${seg.gate ? ` • ${t("fldPortao")} ${escapeHtml(seg.gate)}` : ''}
        </p>
      </div>`;
    }).join("");
    segmentsHtml = `<div class="pdf-block" style="margin-top:6px;padding:8px 11px;background:#f1f5f9;border-radius:8px;">
      <p style="${SECTION_TITLE}">${escapeHtml(t("sectionTrechos"))}</p>${segCards}</div>`;
  }

  const passengersHtml = data.passengers?.length > 0
    ? miniCard(t("sectionPassageirosPerson"), data.passengers.map((p: any) => `<p style="${TXT}">${escapeHtml(p.name)} (${p.passenger_type === 'adulto' ? t("paxAdulto") : p.passenger_type === 'crianca' ? t("paxCrianca") : t("paxBebe")})${p.seat ? ` • ${t("fldAssento")} ${escapeHtml(p.seat)}` : ''}</p>`))
    : "";

  const baggageHtml = (data.carry_on || data.checked_baggage)
    ? miniCard(t("sectionBagagem"), [
        p(t("fldMao"), data.carry_on),
        p(t("fldDespachada"), data.checked_baggage),
        p(t("fldExtra"), data.extra_baggage),
        data.baggage_rules ? `<p style="${TXT_ITALIC}">${escapeHtml(data.baggage_rules)}</p>` : "",
      ])
    : "";

  const boardingHtml = (data.recommended_arrival || data.required_documents || data.boarding_notes)
    ? miniCard(t("sectionOrientacoesEmbarque"), [
        p(t("fldAntecedencia"), data.recommended_arrival),
        p(t("fldTerminal"), data.boarding_terminal),
        p(t("fldDocumentos"), data.required_documents),
        p(t("fldImigracao"), data.immigration_rules),
        data.boarding_notes ? `<p style="${TXT_ITALIC}">${escapeHtml(data.boarding_notes)}</p>` : "",
      ])
    : "";

  const checkinHtml = data.checkin_url
    ? `<div class="pdf-block" style="margin-top:6px;"><a href="${escapeHtml(data.checkin_url)}" style="display:inline-block;background:#0f766e;color:#fff;padding:7px 14px;border-radius:8px;font-size:11px;font-weight:700;text-decoration:none;">${escapeHtml(t("ctaCheckinOnline"))}</a>${data.checkin_open_date ? `<p style="${TXT}">${t("fldAbertura")}: ${escapeHtml(data.checkin_open_date)}</p>` : ''}</div>`
    : "";

  return head + segmentsHtml + passengersHtml + baggageHtml + boardingHtml + checkinHtml;
}

function renderHotelBody(service: TripService, locale: PublicLocale = "pt-BR"): string {
  const t = tWallet(locale);
  const data = service.service_data as any;
  const catMap: Record<string, string> = { '3': '⭐⭐⭐', '4': '⭐⭐⭐⭐', '5': '⭐⭐⭐⭐⭐', boutique: t("catBoutique"), resort: t("catResort"), pousada: t("catPousada") };
  const roomMap: Record<string, string> = { standard: t("roomStandard"), superior: t("roomSuperior"), deluxe: t("roomDeluxe"), suite: t("roomSuite"), suite_junior: t("roomSuiteJunior"), presidencial: t("roomPresidencial"), apartamento: t("roomApartamento"), villa: t("roomVilla"), bangalo: t("roomBangalo") };
  const mealMap: Record<string, string> = { somente_hospedagem: t("mealSomenteHospedagem"), cafe_manha: t("mealCafeManha"), meia_pensao: t("mealMeiaPensao"), pensao_completa: t("mealPensaoCompleta"), all_inclusive: t("mealAllInclusive") };
  const bedMap: Record<string, string> = { king: t("bedKing"), queen: t("bedQueen"), twin: t("bedTwin"), single: t("bedSingle"), double: t("bedDouble"), triple: t("bedTriple") };
  const statusMap: Record<string, string> = { confirmada: t("hotelStatusConfirmada"), emitida: t("hotelStatusEmitida"), pre_reserva: t("hotelStatusPreReserva") };

  let nights: number | null = null;
  try { const [sy,sm,sd] = data.check_in.split('-').map(Number); const [ey,em,ed] = data.check_out.split('-').map(Number); nights = Math.ceil((new Date(ey,em-1,ed).getTime() - new Date(sy,sm-1,sd).getTime()) / 86400000); } catch {}

  const head = renderServiceHeadline({
    title: `${data.hotel_name}${data.hotel_category ? ` ${catMap[data.hotel_category] || data.hotel_category}` : ''}`,
    dates: `${fmtDate(data.check_in)} - ${fmtDate(data.check_out)}${nights ? ` (${nights} ${t("nightsLabelOther")})` : ''}`,
    lines: [
      `${data.city || ''}${data.country ? `, ${data.country}` : ''}`,
      data.reservation_status ? `${t("fldStatus")}: ${statusMap[data.reservation_status] || data.reservation_status}` : "",
      data.reservation_code ? `${t("fldReserva")}: ${data.reservation_code}` : "",
      data.room_type ? `${t("fldAcomodacao")}: ${roomMap[data.room_type] || data.room_type}` : "",
      data.meal_plan ? `${t("fldRegime")}: ${mealMap[data.meal_plan] || data.meal_plan}` : "",
    ],
  });

  const checkin = miniCard(t("sectionCheckin"), [
    p(t("fldHorario"), data.checkin_time),
    data.early_checkin ? p(t("fldEarlyCheckin"), data.early_checkin === 'sim' ? t("availIncluso") : data.early_checkin === 'mediante_taxa' ? t("availMedianteTaxa") : data.early_checkin === 'sob_consulta' ? t("availSobConsulta") : t("availNaoDisponivel")) : "",
    p(t("fldTitular"), data.checkin_holder),
    data.checkin_instructions ? `<p style="${TXT_ITALIC}">${escapeHtml(data.checkin_instructions)}</p>` : "",
    p(t("fldChegadaTardia"), data.late_arrival_policy),
  ]);

  const checkout = miniCard(t("sectionCheckout"), [
    p(t("fldHorario"), data.checkout_time),
    data.late_checkout ? p(t("fldLateCheckout"), data.late_checkout === 'sim' ? t("availIncluso") : data.late_checkout === 'mediante_taxa' ? `${t("availMedianteTaxa")}${data.late_checkout_fee ? ` (${data.late_checkout_fee})` : ''}` : data.late_checkout === 'sob_consulta' ? t("availSobConsulta") : t("availNaoDisponivel")) : "",
    data.checkout_procedure ? p(t("fldProcedimento"), data.checkout_procedure === 'recepcao' ? t("checkoutProcRecepcao") : data.checkout_procedure === 'express' ? t("checkoutProcExpress") : t("checkoutProcOnline")) : "",
    data.checkout_instructions ? `<p style="${TXT_ITALIC}">${escapeHtml(data.checkout_instructions)}</p>` : "",
  ]);

  const room = miniCard(t("sectionAcomodacao"), [
    data.bed_type ? p(t("fldCama"), bedMap[data.bed_type] || data.bed_type) : "",
    p(t("fldHospedes"), data.guest_count),
    p(t("fldVista"), data.room_view),
    p(t("fldAmenities"), data.amenities),
  ]);

  const food = miniCard(t("sectionAlimentacao"), [
    p(t("fldCafeDaManha"), data.breakfast_hours),
    p(t("fldRestaurantes"), data.restaurants_included),
    data.food_notes ? `<p style="${TXT_ITALIC}">${escapeHtml(data.food_notes)}</p>` : "",
    p(t("fldAllInclusive"), data.all_inclusive_rules),
  ]);

  const includedBadges: string[] = [];
  if (data.breakfast_included === 'sim') includedBadges.push(t("badgeCafe"));
  if (data.wifi_included === 'sim') includedBadges.push(t("badgeWifi"));
  if (data.taxes_included === 'sim') includedBadges.push(t("badgeTaxas"));
  if (data.parking_included === 'sim') includedBadges.push(t("badgeEstacionamento"));
  if (data.transfer_included === 'sim') includedBadges.push(t("badgeTransfer"));
  const included = (includedBadges.length || data.resort_fee || data.other_inclusions)
    ? miniCard(t("sectionInclusosReserva"), [
        badgeRow(includedBadges),
        p(t("fldResortFee"), data.resort_fee),
        data.other_inclusions ? `<p style="${TXT}">${escapeHtml(data.other_inclusions)}</p>` : "",
      ])
    : "";

  const policies = miniCard(t("sectionPoliticas"), [
    p(t("fldCancelamento"), data.cancellation_policy),
    p(t("fldCriancas"), data.children_policy),
    p(t("fldPets"), data.pet_policy),
    data.mandatory_fees ? `<p style="${TXT_FG}font-weight:600;">⚠️ ${t("fldTaxasDestino")}: ${escapeHtml(data.mandatory_fees)}</p>` : "",
    data.hotel_deposit ? p(t("fldCaucao"), `${data.hotel_deposit}${data.hotel_deposit_method ? ` (${data.hotel_deposit_method})` : ''}`) : "",
  ]);

  const guests = data.guests?.length > 0
    ? miniCard(t("sectionHospedesFamily"), data.guests.map((g: any) => `<p style="${TXT}">${escapeHtml(g.name)}${g.age ? ` (${g.age})` : ''}${g.notes ? ` • ${escapeHtml(g.notes)}` : ''}</p>`))
    : "";

  const location = miniCard(t("sectionLocalizacaoContato"), [
    data.address ? `<p style="${TXT}">${escapeHtml(data.address)}</p>` : "",
    data.hotel_phone ? `<p style="${TXT}">📞 ${escapeHtml(data.hotel_phone)}</p>` : "",
    data.hotel_email ? `<p style="${TXT}">✉️ ${escapeHtml(data.hotel_email)}</p>` : "",
    data.maps_url ? `<p style="${TXT}"><a href="${escapeHtml(data.maps_url)}" style="color:#0f766e;text-decoration:underline;">${escapeHtml(t("ctaVerNoMapa"))}</a></p>` : "",
    data.hotel_website ? `<p style="${TXT}"><a href="${escapeHtml(data.hotel_website)}" style="color:#0f766e;text-decoration:underline;">${escapeHtml(t("ctaSiteOficial"))}</a></p>` : "",
  ]);

  const notes = (data.special_requests || data.agency_notes || data.notes)
    ? miniCard(t("sectionObservacoes"), [
        p(t("fldSolicitacoes"), data.special_requests),
        data.agency_notes ? `<p style="${TXT_ITALIC}">${escapeHtml(data.agency_notes)}</p>` : "",
        data.notes && !data.agency_notes ? `<p style="${TXT_ITALIC}">${escapeHtml(data.notes)}</p>` : "",
      ])
    : "";

  return head + checkin + checkout + room + food + included + policies + guests + location + notes;
}

function renderCarRentalBody(service: TripService, locale: PublicLocale = "pt-BR"): string {
  const data = service.service_data as any;
  const t = tWallet(locale);
  const head = renderServiceHeadline({
    title: `${data.car_type ? escapeHtml(data.car_type) : ''}${data.car_model ? ` • ${escapeHtml(data.car_model)}` : ''}`,
    dates: data.pickup_date && data.dropoff_date ? `${fmtDate(data.pickup_date, locale)} - ${fmtDate(data.dropoff_date, locale)}` : "",
    lines: [
      data.rental_company ? `${t("fldLocadora")}: ${data.rental_company}` : "",
      data.reservation_code ? `${t("fldReserva")}: ${data.reservation_code}` : "",
    ],
  });

  const pickup = miniCard(t("sectionRetirada"), [
    data.pickup_address ? `<p style="${TXT}">${escapeHtml(data.pickup_address)}</p>` : "",
    data.pickup_city ? `<p style="${TXT}">${escapeHtml(data.pickup_city)}${data.pickup_country ? `, ${escapeHtml(data.pickup_country)}` : ''}</p>` : "",
    data.pickup_date ? `<p style="${TXT}">📅 ${escapeHtml(fmtDate(data.pickup_date, locale))}${data.pickup_time ? ` ${t("wordAs")} ${escapeHtml(data.pickup_time)}` : ''}</p>` : "",
    p(t("fldTerminal"), data.pickup_terminal),
    data.pickup_phone ? `<p style="${TXT}">📞 ${escapeHtml(data.pickup_phone)}</p>` : "",
    data.pickup_instructions ? `<p style="${TXT_ITALIC}">${escapeHtml(data.pickup_instructions)}</p>` : "",
  ]);

  const dropoff = miniCard(t("sectionDevolucao"), [
    data.dropoff_address ? `<p style="${TXT}">${escapeHtml(data.dropoff_address)}</p>` : "",
    data.dropoff_city ? `<p style="${TXT}">${escapeHtml(data.dropoff_city)}${data.dropoff_country ? `, ${escapeHtml(data.dropoff_country)}` : ''}</p>` : "",
    data.dropoff_date ? `<p style="${TXT}">📅 ${escapeHtml(fmtDate(data.dropoff_date, locale))}${data.dropoff_time ? ` ${t("wordAs")} ${escapeHtml(data.dropoff_time)}` : ''}</p>` : "",
    data.dropoff_instructions ? `<p style="${TXT_ITALIC}">${escapeHtml(data.dropoff_instructions)}</p>` : "",
    data.dropoff_late_policy ? `<p style="${TXT}">⏰ ${escapeHtml(data.dropoff_late_policy)}</p>` : "",
  ]);

  const vehicle = miniCard(t("sectionVeiculo"), [
    p(t("fldModelo"), data.car_model),
    data.transmission ? p(t("fldTransmissao"), data.transmission === 'automatico' ? t("transmAutomatico") : t("transmManual")) : "",
    p(t("fldCombustivel"), data.fuel_type),
    badgeRow([
      data.doors ? `🚪 ${data.doors} ${t("wordPortas")}` : "",
      data.passenger_capacity ? `👤 ${data.passenger_capacity} ${t("wordPassageiros")}` : "",
      data.luggage_capacity ? `🧳 ${data.luggage_capacity}` : "",
    ].filter(Boolean) as string[]),
    p(t("fldPlaca"), data.plate),
  ]);

  const insurance = miniCard(t("sectionSeguros"), [
    p(t("fldBasico"), data.basic_insurance),
    p(t("fldTotalCdwLdw"), data.full_insurance),
    p(t("fldTerceiros"), data.third_party_protection),
    p(t("fldRoubo"), data.theft_protection),
    p(t("fldDanos"), data.damage_protection),
    data.deductible ? `<p style="${TXT_FG}font-weight:600;">${t("fldFranquia")}: ${escapeHtml(data.deductible)}</p>` : "",
    data.insurance_notes ? `<p style="${TXT_ITALIC}">${escapeHtml(data.insurance_notes)}</p>` : "",
  ]);

  const deposit = data.deposit_amount
    ? miniCard(t("sectionCaucaoPagamento"), [
        p(t("fldCaucao"), data.deposit_amount),
        p(t("fldForma"), data.deposit_method),
        data.card_in_driver_name ? `<p style="${TXT_FG}font-weight:600;">⚠️ ${t("fldCartaoCondutor")}: ${escapeHtml(data.card_in_driver_name)}</p>` : "",
        p(t("fldPagamento"), data.payment_status),
      ], "amber")
    : "";

  const drivers = data.drivers?.length > 0
    ? miniCard(t("sectionCondutores"), data.drivers.map((d: any, i: number) => `<p style="${TXT}">${i === 0 ? '🔑 ' : '👤 '}${escapeHtml(d.name)}${d.document ? ` • ${escapeHtml(d.document)}` : ''}</p>`))
    : "";

  const fuel = data.fuel_policy
    ? miniCard(t("sectionCombustivel"), [
        p(t("fldPolitica"), data.fuel_policy === 'cheio_cheio' ? t("fuelCheioCheio") : data.fuel_policy === 'cheio_vazio' ? t("fuelCheioVazio") : data.fuel_policy),
        p(t("fldPenalidade"), data.fuel_penalty),
        data.fuel_notes ? `<p style="${TXT_ITALIC}">${escapeHtml(data.fuel_notes)}</p>` : "",
      ])
    : "";

  const orient = miniCard(t("sectionOrientacoes"), [
    p(t("fldDocumentos"), data.required_documents),
    p(t("fldIdadeMinima"), data.minimum_age),
    p(t("fldPid"), data.international_permit),
    data.traffic_rules ? `<p style="${TXT_ITALIC}">${escapeHtml(data.traffic_rules)}</p>` : "",
    data.emergency_contact ? `<p style="${TXT}">📞 ${t("fldEmergencia")}: ${escapeHtml(data.emergency_contact)}</p>` : "",
  ]);

  return head + pickup + dropoff + vehicle + insurance + deposit + drivers + fuel + orient;
}


function renderTransferBody(service: TripService, locale: PublicLocale = "pt-BR"): string {
  const data = service.service_data as any;
  const t = tWallet(locale);
  const typeMap: Record<string, string> = { arrival: t("transferArrival"), departure: t("transferDeparture"), inter_hotel: t("transferInterHotel") };
  const route = data.origin_location && data.destination_location
    ? `${data.origin_location} → ${data.destination_location}`
    : data.location || '';
  const head = renderServiceHeadline({
    title: `${typeMap[data.transfer_type] || data.transfer_type || t("serviceTransfer")} — ${route}`,
    dates: data.date ? `${fmtDate(data.date, locale)}${data.time ? ` ${t("wordAs")} ${data.time}` : ''}` : "",
    lines: [
      data.company_name ? `${t("fldEmpresa")}: ${data.company_name}` : "",
      data.reservation_code ? `${t("fldReserva")}: ${data.reservation_code}` : "",
      data.city ? `${t("fldCidade")}: ${data.city}` : "",
    ],
  });

  const arrival = data.transfer_type === 'arrival' && (data.flight_number || data.arrival_airport || data.meeting_instructions)
    ? miniCard(t("sectionDetalhesChegada"), [
        p(t("fldVoo"), data.flight_number),
        p(t("fldChegadaPrevista"), data.arrival_time),
        data.arrival_airport ? p(t("fldAeroporto"), `${data.arrival_airport}${data.arrival_terminal ? ` • ${t("fldTerminal")} ${data.arrival_terminal}` : ''}`) : "",
        p(t("fldEsperaMotorista"), data.driver_wait_time),
        data.reception_type ? p(t("fldRecepcao"), data.reception_type === 'placa' ? t("receptionPlaca") : data.reception_type === 'balcao' ? t("receptionBalcao") : t("receptionPontoFixo")) : "",
        data.meeting_instructions ? `<div style="margin-top:4px;padding:6px 9px;background:rgba(15,118,110,0.06);border:1px solid rgba(15,118,110,0.2);border-radius:6px;"><p style="font-size:10px;color:#0f766e;font-weight:600;margin:0;">${t("ctaOndeEncontrarMotorista")}</p><p style="${TXT_FG}">${escapeHtml(data.meeting_instructions)}</p></div>` : "",
      ])
    : "";

  const departure = data.transfer_type === 'departure' && (data.hotel_departure_time || data.departure_airport || data.departure_alert)
    ? miniCard(t("sectionDetalhesSaida"), [
        p(t("fldSaidaHotel"), data.hotel_departure_time),
        p(t("fldHorarioVoo"), data.departure_flight_time),
        p(t("fldAeroporto"), data.departure_airport),
        p(t("fldSaidaRecomendada"), data.recommended_departure),
        data.boarding_point ? p(t("fldEmbarque"), data.boarding_point === 'lobby' ? t("boardingLobby") : data.boarding_point === 'entrada' ? t("boardingEntrada") : data.boarding_point === 'estacionamento' ? t("boardingEstacionamento") : data.boarding_point) : "",
        data.departure_alert ? `<p style="margin-top:4px;font-size:11px;color:#b45309;background:#fffbeb;border:1px solid #fde68a;padding:6px 9px;border-radius:6px;font-weight:600;">⚠️ ${escapeHtml(data.departure_alert)}</p>` : "",
      ])
    : "";

  const driver = (data.driver_name || data.driver_phone)
    ? miniCard(t("sectionMotorista"), [
        p(t("fldNome"), data.driver_name),
        p(t("fldIdioma"), data.driver_language),
        p(t("fldPlaca"), data.vehicle_plate),
        data.driver_phone ? `<p style="${TXT}">📞 ${escapeHtml(data.driver_phone)}</p>` : "",
      ])
    : "";

  const vehicle = (data.vehicle_type || data.vehicle_capacity)
    ? miniCard(t("sectionVeiculoTransfer"), [
        data.vehicle_type ? p(t("fldTipo"), data.vehicle_type === 'sedan' ? t("vehicleSedan") : data.vehicle_type === 'suv' ? t("vehicleSuv") : data.vehicle_type === 'van' ? t("vehicleVan") : data.vehicle_type === 'minibus' ? t("vehicleMinibus") : data.vehicle_type === 'onibus' ? t("vehicleOnibus") : data.vehicle_type) : "",
        badgeRow([
          data.vehicle_capacity ? `👤 ${data.vehicle_capacity} ${t("wordPassageiros")}` : "",
          data.luggage_capacity ? `🧳 ${data.luggage_capacity}` : "",
          data.air_conditioning === 'sim' ? t("badgeArCondicionado") : "",
        ].filter(Boolean) as string[]),
        data.vehicle_notes ? `<p style="${TXT_ITALIC}">${escapeHtml(data.vehicle_notes)}</p>` : "",
      ])
    : "";

  const passengers = data.passengers?.length > 0
    ? miniCard(t("sectionPassageirosFamily"), data.passengers.map((p: any) => `<p style="${TXT}">${escapeHtml(p.name)} (${p.passenger_type === 'adulto' ? t("paxAdulto") : p.passenger_type === 'crianca' ? t("paxCrianca") : t("paxBebe")})${p.needs_child_seat === 'sim' ? ` ${t("badgeCadeirinha")}` : ''}</p>`))
    : "";

  const locations = (data.pickup_address || data.destination_address)
    ? miniCard(t("sectionLocais"), [
        p(t("fldEmbarque"), data.pickup_address),
        p(t("fldDestino"), data.destination_address),
        data.location_notes ? `<p style="${TXT_ITALIC}">${escapeHtml(data.location_notes)}</p>` : "",
      ])
    : "";

  const orient = (data.required_documents || data.emergency_contact || data.plan_b || data.agency_notes)
    ? miniCard(t("sectionOrientacoes"), [
        p(t("fldDocumentos"), data.required_documents),
        data.emergency_contact ? `<p style="${TXT}">📞 ${t("fldEmergencia")}: ${escapeHtml(data.emergency_contact)}</p>` : "",
        data.agency_contact ? `<p style="${TXT}">📱 ${t("fldAgencia")}: ${escapeHtml(data.agency_contact)}</p>` : "",
        data.plan_b ? `<div style="margin-top:4px;padding:6px 9px;background:rgba(15,118,110,0.06);border:1px solid rgba(15,118,110,0.2);border-radius:6px;"><p style="font-size:10px;color:#0f766e;font-weight:600;margin:0;">${t("ctaPlanoB")}</p><p style="${TXT_FG}">${escapeHtml(data.plan_b)}</p></div>` : "",
        data.agency_notes ? `<p style="${TXT_ITALIC}">${escapeHtml(data.agency_notes)}</p>` : "",
      ])
    : "";

  return head + arrival + departure + driver + vehicle + passengers + locations + orient;
}


function renderAttractionBody(service: TripService, locale: PublicLocale = "pt-BR"): string {
  const data = service.service_data as any;
  const t = tWallet(locale);
  const head = renderServiceHeadline({
    title: data.name,
    dates: data.date ? fmtDate(data.date, locale) : "",
    lines: [
      data.attraction_type ? `${t("fldTipo")}: ${data.attraction_type}` : "",
      data.city ? `${data.city}${data.country ? `, ${data.country}` : ''}` : "",
      `${t("fldQuantidade")}: ${data.quantity || 1}x`,
    ],
  });

  const codeList = [
    ...((data.ticket_code || "").toString().split(/\r?\n/).map((s: string) => s.trim()).filter(Boolean)),
    ...(data.confirmation_code ? [String(data.confirmation_code).trim()] : []),
    ...(data.order_number ? [String(data.order_number).trim()] : []),
  ].filter(Boolean);
  const codes = codeList.length
    ? miniCard(t("sectionCodigosIngresso"), codeList.map((c) =>
        `<p style="font-family:'Courier New',monospace;font-weight:700;color:#1e293b;font-size:13px;margin:1px 0;">🎟️ ${escapeHtml(c)}</p>`
      ))
    : "";

  const usage = (data.entry_time || data.usage_window || data.duration || data.access_type)
    ? miniCard(t("sectionDetalhesUso"), [
        p(t("fldHorarioEntrada"), data.entry_time),
        p(t("fldJanelaUso"), data.usage_window),
        p(t("fldDuracao"), data.duration),
        data.access_type ? p(t("fldAcesso"), data.access_type === '1_dia' ? t("access1Dia") : data.access_type === 'multi_day' ? t("accessMultiDay") : data.access_type === 'open_date' ? t("accessOpenDate") : t("accessHorarioMarcado")) : "",
        data.requires_reservation ? p(t("fldReserva"), data.requires_reservation === 'sim' ? t("reservNecessaria") : data.requires_reservation === 'recomendado' ? t("reservRecomendada") : t("reservNaoNecessaria")) : "",
      ])
    : "";

  const instructions = data.usage_instructions
    ? miniCard(t("sectionInstrucoesImportantes"), [`<p style="${TXT_FG}">${escapeHtml(data.usage_instructions)}</p>`], "primary")
    : "";

  const passengers = data.passengers?.length > 0
    ? miniCard(t("sectionIngressosPorPessoa"), data.passengers.map((p: any) => `<p style="${TXT}">🎟️ ${escapeHtml(p.name)} (${p.ticket_type === 'adulto' ? t("ticketAdulto") : p.ticket_type === 'crianca' ? t("ticketCrianca") : t("ticketSenior")})${p.document ? ` • ${escapeHtml(p.document)}` : ''}</p>`))
    : "";

  const location = (data.address || data.venue_name)
    ? miniCard(t("sectionLocalizacao"), [
        data.venue_name ? `<p style="${TXT_FG}font-weight:600;">${escapeHtml(data.venue_name)}</p>` : "",
        data.address ? `<p style="${TXT}">${escapeHtml(data.address)}</p>` : "",
        p(t("fldEntrada"), data.entry_point),
        data.maps_url ? `<p style="${TXT}"><a href="${escapeHtml(data.maps_url)}" style="color:#0f766e;text-decoration:underline;">${t("ctaVerNoMapa")}</a></p>` : "",
      ])
    : "";

  const rules = (data.attraction_rules || data.cancellation_policy || data.prohibited_items || data.dress_code || data.required_documents)
    ? miniCard(t("sectionRegrasPoliticas"), [
        p(t("fldCancelamento"), data.cancellation_policy),
        p(t("fldAlteracao"), data.change_policy),
        data.attraction_rules ? `<p style="${TXT}">${escapeHtml(data.attraction_rules)}</p>` : "",
        data.prohibited_items ? `<p style="${TXT}">${t("ctaProibido")}: ${escapeHtml(data.prohibited_items)}</p>` : "",
        data.dress_code ? `<p style="${TXT}">👔 ${t("fldDressCode")}: ${escapeHtml(data.dress_code)}</p>` : "",
        data.required_documents ? `<p style="${TXT}">📄 ${t("fldDocumentos")}: ${escapeHtml(data.required_documents)}</p>` : "",
      ])
    : "";

  const tips = data.agency_tips
    ? miniCard(t("sectionDicasAgente"), [`<p style="${TXT_FG}white-space:pre-line;">${escapeHtml(data.agency_tips)}</p>`], "tips")
    : "";

  const contacts = (data.attraction_contact || data.operator_contact || data.agency_contact || data.emergency_contact)
    ? miniCard(t("sectionContatos"), [
        p(t("fldAtracao"), data.attraction_contact),
        p(t("fldOperadora"), data.operator_contact),
        p(t("fldAgencia"), data.agency_contact),
        data.emergency_contact ? `<p style="${TXT}">🆘 ${t("fldEmergencia")}: ${escapeHtml(data.emergency_contact)}</p>` : "",
      ])
    : "";

  const notes = data.agency_notes
    ? miniCard(t("sectionObservacoes"), [`<p style="${TXT_ITALIC}">${escapeHtml(data.agency_notes)}</p>`])
    : "";

  return head + codes + usage + instructions + passengers + location + rules + tips + contacts + notes;
}


function renderInsuranceBody(service: TripService, locale: PublicLocale = "pt-BR"): string {
  const data = service.service_data as any;
  const t = tWallet(locale);
  let days: number | null = null;
  try { const [sy,sm,sd] = data.start_date.split('-').map(Number); const [ey,em,ed] = data.end_date.split('-').map(Number); days = Math.ceil((new Date(ey,em-1,ed).getTime() - new Date(sy,sm-1,sd).getTime()) / 86400000); } catch {}

  const head = renderServiceHeadline({
    title: data.provider,
    dates: `${fmtDate(data.start_date, locale)} - ${fmtDate(data.end_date, locale)}${days ? ` (${days} ${pluralize(locale, days, { one: t("daysLabelOne"), other: t("daysLabelOther") })})` : ''}`,
    lines: [
      data.plan_name ? `${t("fldPlano")}: ${data.plan_name}` : "",
      data.policy_number ? `${t("fldApolice")}: ${data.policy_number}` : "",
      data.destination_covered ? `${t("fldDestino")}: ${data.destination_covered}` : "",
      data.coverage_type ? `${t("fldTipo")}: ${data.coverage_type}` : "",
    ],
  });

  const emergency = (data.emergency_phone || data.emergency_whatsapp || data.emergency_email)
    ? miniCard(t("sectionContatosEmergencia"), [
        data.emergency_phone ? `<p style="${TXT_FG}font-weight:600;">📞 ${escapeHtml(data.emergency_phone)}</p>` : "",
        data.emergency_whatsapp ? `<p style="${TXT}">💬 WhatsApp: ${escapeHtml(data.emergency_whatsapp)}</p>` : "",
        data.emergency_email ? `<p style="${TXT}">✉️ ${escapeHtml(data.emergency_email)}</p>` : "",
        data.emergency_24h === 'sim' ? `<p style="${TXT}color:#0f766e;font-weight:600;">${t("badge24h")}</p>` : "",
        p(t("fldIdiomas"), data.emergency_languages),
        data.insurer_website ? `<p style="${TXT}"><a href="${escapeHtml(data.insurer_website)}" style="color:#0f766e;text-decoration:underline;">${t("ctaSiteSeguradora")}</a></p>` : "",
      ], "destructive")
    : "";

  const coverages = (data.medical_assistance || data.hospital_expenses || data.lost_baggage || data.trip_cancellation)
    ? miniCard(t("sectionCoberturas"), [
        data.medical_assistance ? `<p style="${TXT}display:flex;justify-content:space-between;"><span>${t("fldAssistenciaMedica")}</span><span style="font-weight:600;color:#1e293b;">${escapeHtml(data.medical_assistance)}</span></p>` : "",
        data.hospital_expenses ? `<p style="${TXT}display:flex;justify-content:space-between;"><span>${t("fldDespesasHospitalares")}</span><span style="font-weight:600;color:#1e293b;">${escapeHtml(data.hospital_expenses)}</span></p>` : "",
        data.lost_baggage ? `<p style="${TXT}display:flex;justify-content:space-between;"><span>${t("fldBagagemExtraviada")}</span><span style="font-weight:600;color:#1e293b;">${escapeHtml(data.lost_baggage)}</span></p>` : "",
        data.trip_cancellation ? `<p style="${TXT}display:flex;justify-content:space-between;"><span>${t("fldCancelamento")}</span><span style="font-weight:600;color:#1e293b;">${escapeHtml(data.trip_cancellation)}</span></p>` : "",
        data.trip_interruption ? `<p style="${TXT}display:flex;justify-content:space-between;"><span>${t("fldInterrupcao")}</span><span style="font-weight:600;color:#1e293b;">${escapeHtml(data.trip_interruption)}</span></p>` : "",
        data.dental_assistance ? `<p style="${TXT}display:flex;justify-content:space-between;"><span>${t("fldOdontologica")}</span><span style="font-weight:600;color:#1e293b;">${escapeHtml(data.dental_assistance)}</span></p>` : "",
        data.medical_repatriation ? `<p style="${TXT}display:flex;justify-content:space-between;"><span>${t("fldRepatriacao")}</span><span style="font-weight:600;color:#1e293b;">${escapeHtml(data.medical_repatriation)}</span></p>` : "",
        data.covid_coverage ? `<p style="${TXT}display:flex;justify-content:space-between;"><span>${t("fldCovid")}</span><span style="font-weight:600;color:#1e293b;">${escapeHtml(data.covid_coverage)}</span></p>` : "",
      ])
    : "";

  const procedure = (data.how_to_activate || data.hospital_procedure || data.reimbursement_info)
    ? miniCard(t("sectionOQueFazerEmergencia"), [
        data.how_to_activate ? `<p style="${TXT_FG}white-space:pre-line;">${escapeHtml(data.how_to_activate)}</p>` : "",
        p(`📄 ${t("fldDocumentos")}`, data.required_documents_claim),
        data.hospital_procedure ? `<p style="${TXT}">🏥 ${escapeHtml(data.hospital_procedure)}</p>` : "",
        data.reimbursement_info ? `<p style="${TXT}">💰 ${t("fldReembolso")}: ${escapeHtml(data.reimbursement_info)}</p>` : "",
      ], "primary")
    : "";

  const insured = data.insured_persons?.length > 0
    ? miniCard(t("sectionSeguradosFamily"), data.insured_persons.map((p: any) => `<p style="${TXT}">${escapeHtml(p.name)}${p.coverage_type ? ` (${p.coverage_type === 'individual' ? t("coverageIndividual") : t("coverageFamiliar")})` : ''}${p.birth_date ? ` • ${escapeHtml(p.birth_date)}` : ''}</p>`))
    : "";

  const tips = data.agency_tips
    ? miniCard(t("sectionOrientacoesAgente"), [`<p style="${TXT_FG}white-space:pre-line;">${escapeHtml(data.agency_tips)}</p>`], "tips")
    : "";

  const notes = data.agency_notes
    ? miniCard(t("sectionObservacoes"), [`<p style="${TXT_ITALIC}">${escapeHtml(data.agency_notes)}</p>`])
    : "";

  return head + emergency + coverages + procedure + insured + tips + notes;
}


function renderCruiseBody(service: TripService, locale: PublicLocale = "pt-BR"): string {
  const data = service.service_data as any;
  const t = tWallet(locale);
  const head = renderServiceHeadline({
    title: data.ship_name,
    dates: `${fmtDate(data.start_date, locale)} - ${fmtDate(data.end_date, locale)}`,
    lines: [
      data.cruise_company ? `${t("fldCompanhia")}: ${data.cruise_company}` : "",
      `${t("fldRoteiro")}: ${data.route || ''}`,
      data.embarkation_port ? `${t("fldEmbarque")}: ${data.embarkation_port}` : "",
      data.disembarkation_port ? `${t("fldDesembarque")}: ${data.disembarkation_port}` : "",
      data.cabin_type ? `${t("fldCabine")}: ${data.cabin_type}${data.cabin_number ? ` #${data.cabin_number}` : ''}` : "",
      data.deck ? `${t("fldDeck")}: ${data.deck}` : "",
    ],
  });

  const itinerary = data.itinerary?.length > 0
    ? miniCard(t("sectionRoteiro"), data.itinerary.map((stop: any) => `<p style="${TXT}border-left:2px solid rgba(15,118,110,0.25);padding-left:6px;"><strong>${escapeHtml(stop.date ? `${stop.date} – ` : '')}${escapeHtml(stop.port || '')}</strong>${stop.stop_type === 'navegacao' ? ` (${t("stopNavegacao")})` : ''}${stop.arrival_time ? ` ${escapeHtml(stop.arrival_time)}` : ''}${stop.departure_time ? ` – ${escapeHtml(stop.departure_time)}` : ''}</p>`))
    : "";

  const boarding = (data.boarding_terminal || data.recommended_arrival || data.required_documents || data.boarding_notes)
    ? miniCard(t("sectionOrientacoesEmbarque"), [
        p(t("fldTerminal"), data.boarding_terminal),
        p(t("fldChegada"), data.recommended_arrival),
        p(t("fldDocumentos"), data.required_documents),
        p(t("fldBagagem"), data.baggage_policy),
        p(t("fldDressCodeTitle"), data.dress_code),
        data.boarding_notes ? `<p style="${TXT_ITALIC}">${escapeHtml(data.boarding_notes)}</p>` : "",
      ])
    : "";

  const passengers = data.passengers?.length > 0
    ? miniCard(t("sectionPassageirosPerson"), data.passengers.map((p: any) => `<p style="${TXT}">${escapeHtml(p.name)}</p>`))
    : "";

  return head + itinerary + boarding + passengers;
}

function renderTrainBody(service: TripService, locale: PublicLocale = "pt-BR"): string {
  const data = service.service_data as any;
  const t = tWallet(locale);
  const time = data.departure_time && data.arrival_time ? `${data.departure_time} → ${data.arrival_time}` : '';
  const head = renderServiceHeadline({
    title: `🚆 ${data.origin_city || ''} → ${data.destination_city || ''}`,
    dates: data.travel_date ? `${fmtDate(data.travel_date, locale)}${time ? ` • ${time}` : ''}` : "",
    lines: [
      data.train_company ? `${data.train_company}${data.train_number ? ` • ${t("fldTrem")} ${data.train_number}` : ''}` : "",
      data.travel_class ? `${t("fldClasse")}: ${data.travel_class}` : "",
      (data.coach || data.seat) ? `${data.coach ? `${t("fldVagao")} ${data.coach}` : ''}${data.seat ? ` • ${t("fldAssento")} ${data.seat}` : ''}` : "",
      data.origin_station ? `${t("fldEmbarque")}: ${data.origin_station}` : "",
      data.destination_station ? `${t("fldDesembarque")}: ${data.destination_station}` : "",
    ],
  });
  const passengers = data.passengers?.length > 0
    ? miniCard(t("sectionPassageirosPerson"), data.passengers.map((p: any) => `<p style="${TXT}">${escapeHtml(p.name)}</p>`))
    : "";
  const notes = data.boarding_notes
    ? miniCard(t("sectionOrientacoesClipboard"), [`<p style="${TXT_ITALIC}">${escapeHtml(data.boarding_notes)}</p>`])
    : "";
  return head + passengers + notes;
}


function renderOtherBody(service: TripService, locale: PublicLocale = "pt-BR"): string {
  const data = service.service_data as any;
  const t = tWallet(locale);
  const otherTypeMap: Record<string, string> = { restaurante: t("otherRestauranteEmoji"), guia_turistico: t("otherGuiaTuristicoEmoji"), chip_internet: t("otherChipInternetEmoji"), experiencia: t("otherExperienciaEmoji"), evento: t("otherEventoEmoji"), spa_wellness: t("otherSpaWellnessEmoji"), servico_vip: t("otherServicoVipEmoji"), concierge: t("otherConciergeEmoji"), personalizado: t("otherPersonalizadoEmoji") };
  const head = renderServiceHeadline({
    title: data.service_name || (data.other_service_type ? (otherTypeMap[data.other_service_type] || data.other_service_type) : t("fldServico")),
    dates: data.date ? `${fmtDate(data.date, locale)}${data.time ? ` ${t("wordAs")} ${data.time}` : ''}` : "",
    lines: [
      data.other_service_type ? `${t("fldTipo")}: ${otherTypeMap[data.other_service_type] || data.custom_type_name || data.other_service_type}` : "",
      data.city ? `${t("fldLocal")}: ${data.city}${data.country ? `, ${data.country}` : ''}` : "",
      data.duration ? `${t("fldDuracao")}: ${data.duration}` : "",
      data.reservation_code ? `${t("fldReserva")}: ${data.reservation_code}` : "",
    ],
  });

  const location = (data.location_name || data.address || data.maps_url)
    ? miniCard(t("sectionLocalizacao"), [
        data.location_name ? `<p style="${TXT_FG}font-weight:600;">${escapeHtml(data.location_name)}</p>` : "",
        data.address ? `<p style="${TXT}">${escapeHtml(data.address)}</p>` : "",
        p(t("fldPontoEncontro"), data.meeting_point),
        data.how_to_arrive ? `<p style="${TXT_ITALIC}">${escapeHtml(data.how_to_arrive)}</p>` : "",
        data.maps_url ? `<p style="${TXT}"><a href="${escapeHtml(data.maps_url)}" style="color:#0f766e;text-decoration:underline;">${t("ctaAbrirNoMapa")}</a></p>` : "",
      ])
    : "";

  const contact = (data.contact_name || data.contact_phone || data.contact_whatsapp)
    ? miniCard(t("sectionContato"), [
        data.contact_name ? `<p style="${TXT}">${escapeHtml(data.contact_name)}${data.contact_company ? ` — ${escapeHtml(data.contact_company)}` : ''}</p>` : "",
        p("🌐", data.contact_language),
        data.contact_phone ? `<p style="${TXT}">📞 ${escapeHtml(data.contact_phone)}</p>` : "",
        data.contact_whatsapp ? `<p style="${TXT}">💬 WhatsApp: ${escapeHtml(data.contact_whatsapp)}</p>` : "",
        data.contact_email ? `<p style="${TXT}">✉️ ${escapeHtml(data.contact_email)}</p>` : "",
      ])
    : "";

  const chip = data.other_service_type === 'chip_internet' && (data.chip_operator || data.chip_activation_instructions)
    ? miniCard(t("sectionChipInternet"), [
        p(t("fldOperadora"), data.chip_operator),
        data.chip_type ? p(t("fldTipo"), data.chip_type === 'esim' ? t("chipEsimDigital") : t("chipFisico")) : "",
        data.chip_activation_instructions ? `<p style="${TXT_FG}font-weight:600;margin-top:4px;">${t("ctaInstrucoesAtivacao")}</p><p style="${TXT}white-space:pre-line;">${escapeHtml(data.chip_activation_instructions)}</p>` : "",
        data.chip_activation_url ? `<p style="${TXT}"><a href="${escapeHtml(data.chip_activation_url)}" style="color:#0f766e;text-decoration:underline;">${t("ctaLinkAtivacao")}</a></p>` : "",
        p(t("fldSuporte"), data.chip_support),
      ], "primary")
    : "";

  const guide = data.other_service_type === 'guia_turistico' && (data.guide_name || data.guide_meeting_point)
    ? miniCard(t("sectionGuiaTuristico"), [
        p(t("fldGuia"), data.guide_name),
        p(t("fldIdioma"), data.guide_language),
        p(t("fldHorario"), data.guide_tour_time),
        p(t("fldDuracao"), data.guide_tour_duration),
        data.guide_meeting_point ? `<p style="${TXT}">📍 ${t("fldEncontro")}: ${escapeHtml(data.guide_meeting_point)}</p>` : "",
      ])
    : "";

  const tips = data.agency_tips
    ? miniCard(t("sectionOrientacoesAgente"), [`<p style="${TXT_FG}white-space:pre-line;">${escapeHtml(data.agency_tips)}</p>`], "tips")
    : "";

  const description = data.description
    ? miniCard(t("sectionDescricao"), [`<p style="${TXT}white-space:pre-line;">${escapeHtml(data.description)}</p>`])
    : "";

  const notes = data.agency_notes
    ? miniCard(t("sectionObservacoes"), [`<p style="${TXT_ITALIC}">${escapeHtml(data.agency_notes)}</p>`])
    : "";

  return head + location + contact + chip + guide + tips + description + notes;
}


function renderServiceBody(service: TripService, locale: PublicLocale = "pt-BR"): string {
  switch (service.service_type) {
    case "flight": return renderFlightBody(service, locale);
    case "hotel": return renderHotelBody(service, locale);
    case "car_rental": return renderCarRentalBody(service, locale);
    case "transfer": return renderTransferBody(service, locale);
    case "attraction": return renderAttractionBody(service, locale);
    case "insurance": return renderInsuranceBody(service, locale);
    case "cruise": return renderCruiseBody(service, locale);
    case "train": return renderTrainBody(service, locale);
    case "other": return renderOtherBody(service, locale);
    default:
      // Fallback to legacy flat list if any future type is unmapped
      return getServiceDetails(service, locale).map(d => `<p style="${TXT}">${escapeHtml(d)}</p>`).join("");
  }
}

function renderServiceGallery(service: TripService, resolveImg: PdfImageResolver): string {
  // Aligned with QuotePDF: hotels get a grid of up to 10 thumbnails;
  // other service types get a single left-side image rendered inside renderServiceLayout.
  const urls = collectServiceImages(service, resolveImg);
  if (!urls.length) return "";
  if (service.service_type !== 'hotel') return "";
  const hotelImages = urls.slice(0, 10);
  const rows: string[] = [];
  for (let i = 0; i < hotelImages.length; i += 5) {
    const row = hotelImages.slice(i, i + 5);
    const rowHtml = row
      .map(
        (src) => `
          <td style="width:20%;vertical-align:middle;padding:3px;">
            <div style="width:100%;height:78px;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;text-align:center;line-height:78px;font-size:0;">
              <img src="${src}" style="max-width:100%;max-height:100%;width:auto;height:auto;object-fit:contain;vertical-align:middle;display:inline-block;" />
            </div>
          </td>
        `
      )
      .join("");
    const padCount = 5 - row.length;
    const padHtml = padCount > 0 ? Array(padCount).fill('<td style="width:20%;padding:3px;"></td>').join("") : "";
    rows.push(`<tr>${rowHtml}${padHtml}</tr>`);
  }
  return `
    <div class="pdf-block pdf-hotel-gallery" style="margin-bottom:8px;">
      <table style="width:100%;border-collapse:separate;border-spacing:0;table-layout:fixed;">
        ${rows.join("")}
      </table>
    </div>
  `;
}

/**
 * Retorna apenas URLs realmente utilizáveis: referências `gplace://` e URLs
 * legadas do Google são substituídas pela URL fresca; quando não resolvem, a
 * imagem é omitida (nunca chega valor cru/expirado ao atributo src).
 */
export function collectServiceImages(service: TripService, resolveImg: PdfImageResolver): string[] {
  const out: string[] = [];
  for (const ref of collectServiceImageRefs(service)) {
    const src = resolveImg(ref);
    if (!src) continue;
    if (!/^https?:\/\//i.test(src)) continue;
    if (!out.includes(src)) out.push(src);
  }
  return out;
}

function renderServiceLayout(service: TripService, bodyHtml: string, resolveImg: PdfImageResolver): string {
  if (service.service_type === 'hotel') return bodyHtml;
  const urls = collectServiceImages(service, resolveImg);
  const firstImage = urls[0];
  if (!firstImage) return bodyHtml;
  return `
    <table style="width:100%;border-collapse:separate;border-spacing:0;table-layout:fixed;">
      <tr>
        <td style="width:30%;vertical-align:top;padding:0 14px 0 0;">
          <img src="${firstImage}" style="width:100%;height:130px;object-fit:cover;border-radius:12px;border:1px solid #e2e8f0;display:block;" />
        </td>
        <td style="vertical-align:top;">
          ${bodyHtml}
        </td>
      </tr>
    </table>
  `;
}

function generateAgencyHeader(profile: AgentProfile | null, locale: PublicLocale = "pt-BR"): string {
  if (!profile?.agency_logo_url) {
    return `
      <div style="text-align:center;padding:10px 0;background:#ffffff;border-bottom:1px solid #e2e8f0;border-radius:0;">
        <p style="font-size:22px;font-weight:800;color:#0f766e;margin:0;letter-spacing:-0.3px;">
          ${profile?.agency_name || tWallet(locale)("agencyFallbackName")}
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

function generateAgentSignature(profile: AgentProfile | null, locale: PublicLocale = "pt-BR"): string {
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
        <p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:3px;color:#64748b;margin:0;">${tWallet(locale)("pdfConsultant")}</p>
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
                  ${tWallet(locale)("pdfTalkOnWhatsApp")}
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
  resolveUrl: (path: string) => string | null,
  locale: PublicLocale = "pt-BR"
): string {
  const t = tWallet(locale);
  if (!activities || activities.length === 0) return "";

  const PERIOD_LABELS: Record<string, string> = { morning: t("pdfMorning"), afternoon: t("pdfAfternoon"), evening: t("pdfEvening") };
  
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
          ${act.maps_url ? `<p style="font-size: 11px; margin: 2px 0 0 0;"><a href="${act.maps_url.startsWith('http') ? act.maps_url : `https://www.google.com/maps/search/${encodeURIComponent(act.maps_url)}`}" style="color: #0f766e; text-decoration: underline;">${t("pdfMapsLink")}</a></p>` : ''}
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

    const formattedDate = locale === "it-IT"
      ? new Intl.DateTimeFormat("it-IT", { weekday: "long", day: "2-digit", month: "long" }).format(dayDate)
      : format(dayDate, "EEEE, dd 'de' MMMM", { locale: ptBR });

    return `
      <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 12px; background: white; page-break-inside: avoid;">
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
          <div style="width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, #0f766e20, #14b8a620); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px; color: #0f766e;">
            ${idx + 1}
          </div>
          <div>
            <p style="font-weight: 600; font-size: 14px; margin: 0;">${t("pdfDayLabel", { n: String(idx + 1) })}</p>
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
        ${t("pdfItineraryTitle")}
      </h3>
      ${daysHtml}
    </div>
  `;
}

export async function generateTripPDF(
  trip: Trip,
  profile?: AgentProfile | null,
  itineraryActivities?: ItineraryActivityForPDF[],
  voucherAccess?: VoucherAccessOptions,
  locale: PublicLocale = "pt-BR"
) {
  const t = tWallet(locale);
  const parseLocal = (d: string) => { const [y,m,day] = d.split('-').map(Number); return new Date(y, m-1, day); };
  // Abrir a janela ANTES dos awaits para evitar bloqueio de popup pelo navegador.
  const printWindow = window.open("", "_blank");
  if (printWindow) {
    try {
      printWindow.document.write(
        '<!doctype html><html><body style="font-family:sans-serif;padding:24px;color:#475569;">Preparando PDF…</body></html>',
      );
    } catch {}
  }
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

  // Resolve referências do Google (gplace:// e URLs legadas) para URLs válidas
  // no momento da geração — nada é copiado ou persistido.
  const resolveImg = await buildServiceImageResolver(sortedServices);

  // Cards de serviço alinhados visualmente ao QuotePDF (gradiente por categoria + emoji)
  const servicesHtml = sortedServices.map((service) => {
    const type = service.service_type as TripServiceType;
    const serviceLabels = getServiceLabels(locale);
    const label = serviceLabels[type] || t("serviceOther");
    const emoji = SERVICE_EMOJI[type] || "📋";
    const grad = SERVICE_GRADIENTS[type] || SERVICE_GRADIENTS.other;
    const bodyHtml = renderServiceBody(service, locale);
    const galleryHtml = renderServiceGallery(service, resolveImg);

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
          ${galleryHtml}
          ${renderServiceLayout(service, bodyHtml, resolveImg)}
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
  const itineraryHtml = generateItinerarySection(itineraryActivities || [], resolveItineraryUrl, locale);

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
        ${generateAgencyHeader(profile || null, locale)}

        <div style="padding:6px 32px 0;">
          <!-- Hero -->
          <div class="pdf-block pdf-hero" style="text-align:center;padding:2px 0 12px;">
            <div style="display:inline-block;background:rgba(15,118,110,0.1);color:#0f766e;padding:5px 14px;border-radius:9999px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:2.5px;margin-bottom:8px;">
              ${t("pdfWalletBadge")}
            </div>
            <h1 style="font-size:32px;font-weight:800;color:#1e293b;margin:0 0 2px;letter-spacing:-1px;line-height:1.05;">${(trip as any).trip_title || trip.destination}</h1>
            <p style="font-size:14px;color:#64748b;margin-top:4px;">
              ${(trip as any).trip_title ? `<span>${trip.destination} • </span>` : ''}${t("pdfPreparedFor")} <strong style="color:#1e293b;">${trip.client_name}</strong>
            </p>
          </div>

          <!-- Overview -->
          <div class="pdf-block overview-card" style="background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;padding:14px 18px;margin-bottom:18px;display:grid;grid-template-columns:repeat(3,1fr);gap:14px;box-shadow:0 1px 2px rgba(0,0,0,0.04);">
            <div>
              <p style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;font-weight:700;">📍 ${t("pdfDestination")}</p>
              <p style="font-size:14px;font-weight:700;color:#1e293b;">${trip.destination}</p>
            </div>
            <div style="border-left:1px solid #f1f5f9;padding-left:18px;">
              <p style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;font-weight:700;">📅 ${t("pdfPeriod")}</p>
              <p style="font-size:14px;font-weight:700;color:#1e293b;">${formatDate(trip.start_date, locale)} — ${formatDate(trip.end_date, locale)}</p>
              <p style="font-size:12px;color:#94a3b8;margin-top:2px;">${days} ${days === 1 ? t("daysLabelOne") : t("daysLabelOther")}</p>
            </div>
            <div style="border-left:1px solid #f1f5f9;padding-left:18px;">
              <p style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;font-weight:700;">👤 ${t("pdfClient")}</p>
              <p style="font-size:14px;font-weight:700;color:#1e293b;">${trip.client_name}</p>
            </div>
          </div>

          <!-- Services -->
          <div style="margin-bottom:18px;">
            <div class="pdf-title section-title" style="display:flex;align-items:center;gap:14px;margin-bottom:10px;">
              <div style="flex:1;height:1px;background:#e2e8f0;"></div>
              <h3 style="font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:3px;color:#64748b;margin:0;white-space:nowrap;">${t("pdfServicesTitle")}</h3>
              <div style="flex:1;height:1px;background:#e2e8f0;"></div>
            </div>
            ${servicesHtml || `<p style="text-align:center;color:#94a3b8;padding:32px;">${t('pdfNoServices')}</p>`}
          </div>

          <!-- Itinerary -->
          ${itineraryHtml}

          <!-- Agent Signature -->
          ${generateAgentSignature(profile || null, locale)}

          <p style="text-align:center;font-size:10px;color:#94a3b8;margin-top:14px;">
            ${t("pdfGeneratedAt", { date: locale === "it-IT" ? new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date()) : format(new Date(), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR }) })}
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  if (!printWindow) {
    toast.error(t("pdfPopupBlocked"));
    return;
  }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  await waitForWindowImages(printWindow);
  try {
    printWindow.print();
  } catch {
    /* impressão cancelada pelo usuário/ambiente */
  }
}
