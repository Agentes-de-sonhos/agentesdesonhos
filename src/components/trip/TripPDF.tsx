import { descriptionToPlainText } from "@/lib/richDescription";
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
import { buildWhatsAppUrl, resolveSignatureContact } from "@/lib/commercialSignature";
import { renderFlightPdf, renderHotelPdf, renderCarPdf, documentCta, documentsTitle, icon as pdfIcon } from "@/components/trip/tripPdfServices";

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
      if (data.boarding_notes || data.notes) details.push(`${t("fldObs")}: ${descriptionToPlainText(data.boarding_notes || data.notes)}`);
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
      if (data.notes) details.push(`${t("fldObs")}: ${descriptionToPlainText(data.notes)}`);
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
      if (data.notes) details.push(`${t("fldObs")}: ${descriptionToPlainText(data.notes)}`);
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
      if (data.notes) details.push(`${t("fldObs")}: ${descriptionToPlainText(data.notes)}`);
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
      if (data.agency_notes) details.push(`${t("fldObs")}: ${descriptionToPlainText(data.agency_notes)}`);
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
      if (data.agency_notes || data.notes) details.push(`${t("fldObs")}: ${descriptionToPlainText(data.agency_notes || data.notes)}`);
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
      if (data.boarding_notes) details.push(`${t("fldOrientacoes")}: ${descriptionToPlainText(data.boarding_notes)}`);
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
      if (data.boarding_notes) details.push(`${t("fldOrientacoes")}: ${descriptionToPlainText(data.boarding_notes)}`);
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
      if (data.description) details.push(descriptionToPlainText(data.description));
      if (data.agency_tips) details.push(`${t("fldDicas")}: ${data.agency_tips}`);
      if (data.agency_notes) details.push(`${t("fldObs")}: ${descriptionToPlainText(data.agency_notes)}`);
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

export interface PdfModules { show_signature: boolean; show_whatsapp: boolean }
export interface PdfSignature { name?: string | null; photo_url?: string | null; agency_name?: string | null; title?: string | null; whatsapp?: string | null; phone?: string | null; email?: string | null }

/** Assinatura/WhatsApp a partir das flags resolvidas da carteira (independentes). */
export function pdfSignatureOptions(settings: { show_signature: boolean; show_whatsapp: boolean }, snapshot: any, agent: AgentProfile | null | undefined): { modules: PdfModules; signature: PdfSignature | null } {
  if (!snapshot && !agent) return { modules: { show_signature: settings.show_signature, show_whatsapp: settings.show_whatsapp }, signature: null };
  const sig = resolveSignatureContact(snapshot, agent as any);
  return {
    modules: { show_signature: settings.show_signature, show_whatsapp: settings.show_whatsapp },
    signature: { name: sig.name, photo_url: sig.photo_url, title: sig.title, email: sig.email, whatsapp: sig.whatsapp, phone: sig.phone, agency_name: agent?.agency_name ?? null },
  };
}

function generateAgencyHeader(profile: AgentProfile | null, locale: PublicLocale = "pt-BR"): string {
  const t = tWallet(locale);
  const logo = profile?.agency_logo_url
    ? `<img class="logo" src="${escapeHtml(profile.agency_logo_url)}" alt="${escapeHtml(profile.agency_name || "Logo")}" />`
    : `<p class="logo-text">${escapeHtml(profile?.agency_name || t("agencyFallbackName"))}</p>`;
  return `<header class="brand-row">${logo}<span class="badge">${escapeHtml(t("pdfWalletBadge"))}</span></header>`;
}

function generateAgentSignature(sig: PdfSignature | null, modules: PdfModules, generatedAt: string, locale: PublicLocale = "pt-BR"): string {
  const t = tWallet(locale);
  const showSig = modules.show_signature && !!sig?.name;
  const wa = modules.show_whatsapp ? buildWhatsAppUrl(sig?.whatsapp || sig?.phone) : "";
  const footer = `<p class="generated">${escapeHtml(generatedAt)}</p>`;
  if (!showSig && !wa) return `<div class="end-block">${footer}</div>`;
  const avatar = sig?.photo_url
    ? `<img class="avatar" src="${escapeHtml(sig.photo_url)}" alt="" />`
    : `<div class="avatar avatar-fallback">${escapeHtml((sig?.name || "?").charAt(0).toUpperCase())}</div>`;
  const waBtn = wa ? `<a class="wa" href="${escapeHtml(wa)}">${escapeHtml(t("pdfTalkOnWhatsApp"))}</a>` : "";
  const inner = showSig
    ? `<table class="sig-grid"><tr><td class="sig-av">${avatar}</td><td><p class="code-label">${escapeHtml(t("pdfConsultant"))}</p><p class="sig-name">${escapeHtml(sig!.name)}</p>${[sig?.title, sig?.agency_name].filter(Boolean).length ? `<p class="muted">${escapeHtml([sig?.title, sig?.agency_name].filter(Boolean).join(" · "))}</p>` : ""}${sig?.email ? `<p class="muted">${escapeHtml(sig.email)}</p>` : ""}</td><td class="sig-cta">${waBtn}</td></tr></table>`
    : `<table class="sig-grid"><tr><td><p class="strong">${escapeHtml(t("whatsapp"))}</p></td><td class="sig-cta">${waBtn}</td></tr></table>`;
  return `<div class="end-block"><section class="pdf-panel signature">${inner}</section>${footer}</div>`;
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

const SERVICE_ICON: Record<TripServiceType, string> = {
  flight: "plane", hotel: "bed", car_rental: "car", transfer: "route",
  attraction: "ticket", insurance: "shield", cruise: "ship", train: "train", other: "box",
};

export interface TripPdfBuildInput {
  trip: Trip;
  profile?: AgentProfile | null;
  itineraryActivities?: ItineraryActivityForPDF[];
  locale?: PublicLocale;
  resolveImg: PdfImageResolver;
  /** Caminho do anexo → URL permanente segura (serve-voucher). */
  documentUrl: (path: string) => string | null;
  modules?: PdfModules;
  signature?: PdfSignature | null;
  generatedAt?: Date;
}

/** HTML completo do PDF (renderizador único usado por salvar/baixar e imprimir). */
export function buildTripPdfHtml(input: TripPdfBuildInput): string {
  const { trip, profile = null, locale = "pt-BR", resolveImg, documentUrl } = input;
  const modules = input.modules || { show_signature: true, show_whatsapp: true };
  const t = tWallet(locale);
  const parseLocal = (d: string) => { const [y, m, day] = d.split("-").map(Number); return new Date(y, m - 1, day); };
  const startDate = parseLocal(trip.start_date);
  const endDate = parseLocal(trip.end_date);
  const days = Math.round((endDate.getTime() - startDate.getTime()) / 86400000) + 1;
  const labels = getServiceLabels(locale);
  const sorted = [...(trip.services || [])].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));

  const servicesHtml = sorted.map((service) => {
    const type = service.service_type as TripServiceType;
    const label = labels[type] || t("serviceOther");
    const images = collectServiceImages(service, resolveImg);
    let head = "", body = "";
    const ctx = { images, locale };
    if (type === "flight") ({ head, body } = renderFlightPdf(service, ctx));
    else if (type === "hotel") ({ head, body } = renderHotelPdf(service, ctx));
    else if (type === "car_rental") ({ head, body } = renderCarPdf(service, ctx));
    else body = renderServiceLayout(service, renderServiceBody(service, locale), resolveImg);

    const files: { url: string; name: string }[] = service.attachments?.length
      ? service.attachments.filter((a: any) => a?.url).map((a: any) => ({ url: a.url, name: a.name || "" }))
      : service.voucher_url ? [{ url: service.voucher_url, name: service.voucher_name || "" }] : [];
    const cta = documentCta(type, locale);
    const docs = files.map((f, i) => {
      const href = documentUrl(f.url);
      const friendly = cta ? (files.length > 1 ? `${cta} (${i + 1})` : cta) : (f.name || t("fldDocumentos"));
      const meta = f.name && f.name !== friendly ? `<span class="doc-name">${escapeHtml(f.name)}</span>` : "";
      return href
        ? `<a class="doc" href="${escapeHtml(href)}">${pdfIcon("file", 14)}<span><span class="doc-cta">${escapeHtml(friendly)}</span>${meta}</span></a>`
        : `<span class="doc doc-off">${pdfIcon("file", 14)}<span><span class="doc-cta">${escapeHtml(friendly)}</span>${meta}</span></span>`;
    }).join("");
    const docsHtml = docs ? `<section class="docs"><p class="code-label">${escapeHtml(documentsTitle(type, locale))}</p><div class="doc-list">${docs}</div></section>` : "";

    // Cabeçalho do serviço + primeiro bloco ficam juntos; o resto quebra naturalmente.
    return `<article class="svc">
      <div class="svc-start">
        <div class="svc-strip"><span class="svc-ico">${pdfIcon(SERVICE_ICON[type] || "box", 14)}</span>${escapeHtml(label)}</div>
        ${head}
      </div>
      <div class="svc-body">${body}</div>
      ${docsHtml}
    </article>`;
  }).join("");

  const supabaseItin = (p: string) => (/^https?:\/\//i.test(p) ? p : documentUrl(p));
  const itineraryHtml = generateItinerarySection(input.itineraryActivities || [], supabaseItin, locale);
  const now = input.generatedAt || new Date();
  const generatedAt = t("pdfGeneratedAt", { date: locale === "it-IT"
    ? new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(now)
    : format(now, "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR }) });
  const title = (trip as any).trip_title || trip.destination;

  return `<!DOCTYPE html>
<html lang="${locale}"><head><meta charset="UTF-8"><title>Carteira Digital — ${escapeHtml(title || trip.client_name)}</title>
<style>${PDF_CSS}</style></head>
<body><main class="doc">
  ${generateAgencyHeader(profile, locale)}
  <section class="hero">
    <h1>${escapeHtml(title)}</h1>
    <p class="muted">${(trip as any).trip_title ? `${escapeHtml(trip.destination)} · ` : ""}${escapeHtml(t("pdfPreparedFor"))} <strong>${escapeHtml(trip.client_name)}</strong></p>
    <table class="overview"><tr>
      <td><p class="code-label">${pdfIcon("pin", 11)} ${escapeHtml(t("pdfDestination"))}</p><p class="strong">${escapeHtml(trip.destination)}</p></td>
      <td><p class="code-label">${pdfIcon("calendar", 11)} ${escapeHtml(t("pdfPeriod"))}</p><p class="strong">${escapeHtml(formatDate(trip.start_date, locale))} — ${escapeHtml(formatDate(trip.end_date, locale))}</p><p class="muted">${days} ${escapeHtml(days === 1 ? t("daysLabelOne") : t("daysLabelOther"))}</p></td>
      <td><p class="code-label">${pdfIcon("user", 11)} ${escapeHtml(t("pdfClient"))}</p><p class="strong">${escapeHtml(trip.client_name)}</p></td>
    </tr></table>
  </section>
  <h2 class="section-title">${escapeHtml(t("pdfServicesTitle"))}</h2>
  ${servicesHtml || `<p class="muted center">${escapeHtml(t("pdfNoServices"))}</p>`}
  ${itineraryHtml}
  ${generateAgentSignature(input.signature ?? (profile ? { name: profile.name, photo_url: profile.avatar_url, agency_name: profile.agency_name, phone: profile.phone } : null), modules, generatedAt, locale)}
</main></body></html>`;
}

const PDF_CSS = `
*{margin:0;padding:0;box-sizing:border-box}
@page{size:A4;margin:13mm 13mm 14mm;@bottom-center{content:counter(page) " / " counter(pages);font:8pt system-ui,sans-serif;color:#94a3b8}}
html,body{-webkit-print-color-adjust:exact;print-color-adjust:exact;background:#fff}
body{font-family:'Segoe UI',system-ui,-apple-system,'Helvetica Neue',Arial,sans-serif;color:#0f1d3a;font-size:10.5pt;line-height:1.45;overflow-wrap:anywhere;word-break:normal}
img{max-width:100%;display:block}
a{color:#0e7490;text-decoration:underline}
.doc{max-width:184mm;margin:0 auto}
.pre{white-space:pre-wrap}
.muted{color:#5b6b85}.small{font-size:9pt}.strong{font-weight:700}.center{text-align:center}
.accent{color:#0891b2}
.brand-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding-bottom:4mm;border-bottom:1px solid #dbe3ee;margin-bottom:5mm}
.logo{max-height:16mm;max-width:62mm;width:auto;height:auto;object-fit:contain}
.logo-text{font-size:15pt;font-weight:800;color:#0f1d3a}
.badge{font-size:8pt;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#0e7490;background:#e6f6fa;border-radius:999px;padding:3px 10px;white-space:nowrap}
.hero{break-inside:avoid;margin-bottom:6mm}
.hero h1{font-size:21pt;line-height:1.15;font-weight:800;margin-bottom:1mm}
.overview{width:100%;border-collapse:separate;border-spacing:0;margin-top:4mm;border:1px solid #dbe3ee;border-radius:12px;background:#f7f9fc}
.overview td{width:33.3%;padding:3mm 4mm;vertical-align:top}
.overview td+td{border-left:1px solid #dbe3ee}
.section-title{font-size:9pt;letter-spacing:.2em;text-transform:uppercase;color:#5b6b85;margin:0 0 3mm;break-after:avoid}
.code-label{font-size:8pt;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#5b6b85;margin-bottom:1mm}
.svc{border:1px solid #dbe3ee;border-radius:14px;padding:4mm;margin-bottom:5mm;background:#fff;break-inside:auto}
.svc-start{break-inside:avoid;break-after:avoid}
.svc-strip{display:flex;align-items:center;gap:6px;font-size:8.5pt;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#0e7490;margin-bottom:3mm}
.svc-ico{display:inline-flex;width:22px;height:22px;align-items:center;justify-content:center;border-radius:7px;background:#e6f6fa}
.banner{border-radius:12px;overflow:hidden;margin-bottom:3mm;background:#eef2f7}
.banner img{width:100%;object-fit:cover}
.banner-low img{height:34mm}.banner-hotel img{height:52mm}
.rel{position:relative}.illus{position:absolute;left:6px;bottom:6px;font-size:7.5pt;background:rgba(15,29,58,.7);color:#fff;border-radius:4px;padding:1px 6px}
.thumbs{display:flex;gap:2mm;margin:-1mm 0 3mm}.thumbs img{width:32mm;height:20mm;object-fit:cover;border-radius:8px}
.svc-title-row{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}
.svc-title{font-size:15pt;line-height:1.25;font-weight:800;min-width:0;flex:1}
.svc-sub{color:#5b6b85;margin-top:1mm;display:flex;gap:5px;align-items:flex-start}
.stars{color:#d99a06;letter-spacing:2px;margin-top:.5mm}
.company{font-size:9pt;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#5b6b85;margin-top:.5mm}
.facts{display:flex;flex-wrap:wrap;gap:4mm;margin-top:2mm}.facts span{display:inline-flex;gap:5px;align-items:center}
.chip{display:inline-flex;align-items:center;gap:4px;flex-shrink:0;border-radius:999px;padding:3px 10px;font-size:9pt;font-weight:700;background:#eef2f7;color:#5b6b85;white-space:nowrap}
.chip-ok{background:#e7f7ee;color:#15803d}
.code-box{margin-top:3mm;border:1px solid #cdeaf2;background:#eef9fc;border-radius:12px;padding:3mm 4mm;break-inside:avoid}
.code-val{font-size:17pt;font-weight:800;letter-spacing:.04em}.code-val-sm{font-size:12.5pt;font-weight:800}
.code-sep{border-top:1px solid #cdeaf2;margin-top:2mm;padding-top:2mm}
.pdf-panel{border:1px solid #dbe3ee;border-radius:12px;padding:3mm 4mm;margin-top:3mm;break-inside:avoid;background:#fff}
.pdf-panel.amber{border-color:#f3dfae;background:#fffbf0;break-inside:auto}
.panel-title{display:flex;align-items:center;gap:6px;font-size:10.5pt;font-weight:800;margin-bottom:2mm;break-after:avoid}
.panel-label{flex:1}.ctx{font-size:8pt;font-weight:500;color:#94a3b8;max-width:55%;text-align:right;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ico{display:inline-flex;width:22px;height:22px;align-items:center;justify-content:center;border-radius:7px;background:#e6f6fa;color:#0e7490}
.ico-amber{background:#fdf0cf;color:#b45309}
.row{margin:.6mm 0;orphans:2;widows:2}.row strong{color:#0f1d3a}
.list{list-style:none}.list li{display:flex;gap:8px;padding:1.6mm 0;border-top:1px solid #edf1f6}.list li:first-child{border-top:0;padding-top:0}
.seg-top{display:flex;justify-content:space-between;gap:8px;align-items:center;margin-bottom:2mm}
.tag{font-size:8.5pt;font-weight:800;text-transform:uppercase;color:#0e7490;background:#e6f6fa;border-radius:6px;padding:2px 8px;white-space:nowrap}
.seg-airline{font-weight:700;font-size:9.5pt;text-align:right}
.seg-grid{width:100%;border-collapse:collapse;table-layout:fixed}
.seg-col{width:27%;vertical-align:top}.seg-mid{vertical-align:middle;padding:0 3mm}
.seg-time{font-size:20pt;font-weight:800;line-height:1.1}.seg-code{font-weight:700;font-size:10pt;margin-top:.5mm}.seg-city{font-size:9pt}
.track{display:flex;align-items:center;gap:4px;margin-top:-6mm}
.dot{width:9px;height:9px;border:2px solid #94a3b8;border-radius:50%;background:#fff;flex-shrink:0}
.dash{flex:1;border-top:2px dashed #b9c4d4}
.plane svg{fill:#0891b2;stroke:#0891b2;transform:rotate(45deg)}
.cols{width:100%;border-collapse:collapse;table-layout:fixed}.cols td{vertical-align:top;padding-right:4mm}.cols td+td{border-left:1px solid #edf1f6;padding-left:4mm}
.dates-grid{width:100%;border-collapse:collapse;table-layout:fixed}.dates-grid td{text-align:center;vertical-align:middle}.dates-mid{width:28%}
.date-big{font-size:15pt;font-weight:800;text-transform:uppercase;line-height:1.15}
.time{font-size:12pt;color:#5b6b85;font-weight:600}
.pill{display:inline-flex;align-items:center;gap:4px;border-radius:999px;background:#e6f6fa;color:#0e7490;font-weight:700;font-size:9pt;padding:3px 10px}
.places{width:100%;border-collapse:separate;border-spacing:3mm 0;margin:0 -3mm;table-layout:fixed}.place{vertical-align:top;width:50%}
.links{display:flex;flex-wrap:wrap;gap:4mm;margin-top:1.5mm}.links a{display:inline-flex;gap:4px;align-items:center;font-weight:600}
.docs{margin-top:3mm;padding-top:3mm;border-top:1px solid #edf1f6;break-before:avoid;break-inside:avoid}
.doc-list{display:flex;flex-wrap:wrap;gap:2mm}
.doc{display:inline-flex;gap:6px;align-items:center;border:1px solid #9fd8e6;background:#eef9fc;border-radius:10px;padding:2mm 3mm;text-decoration:none;color:#0e7490;max-width:100%}
.doc-off{border-color:#dbe3ee;background:#f7f9fc;color:#5b6b85}
.doc-cta{display:block;font-weight:700}.doc-name{display:block;font-size:8.5pt;color:#5b6b85}
.end-block{break-inside:avoid;margin-top:4mm}
.signature{margin-top:0}
.sig-grid{width:100%;border-collapse:collapse}.sig-grid td{vertical-align:middle}
.sig-av{width:18mm}.avatar{width:15mm;height:15mm;border-radius:50%;object-fit:cover}
.avatar-fallback{display:flex;align-items:center;justify-content:center;background:#e6f6fa;color:#0e7490;font-weight:800;font-size:14pt}
.sig-name{font-size:13pt;font-weight:800}
.sig-cta{text-align:right;width:52mm}
.wa{display:inline-block;background:#1fa855;color:#fff;text-decoration:none;font-weight:700;border-radius:999px;padding:2.2mm 5mm}
.generated{text-align:center;font-size:8pt;color:#94a3b8;margin-top:3mm}
.pdf-block{break-inside:avoid}
p{orphans:2;widows:2}
h1,h2,h3,h4{break-after:avoid}
`;

export async function generateTripPDF(
  trip: Trip,
  profile?: AgentProfile | null,
  itineraryActivities?: ItineraryActivityForPDF[],
  voucherAccess?: VoucherAccessOptions,
  locale: PublicLocale = "pt-BR",
  /** Pode ser uma Promise: a janela abre antes de qualquer espera (evita bloqueio de pop-up). */
  optionsInput: { modules?: PdfModules; signature?: PdfSignature | null } | Promise<{ modules?: PdfModules; signature?: PdfSignature | null }> = {},
) {
  const t = tWallet(locale);
  // Abrir a janela ANTES dos awaits para evitar bloqueio de popup pelo navegador.
  const printWindow = window.open("", "_blank");
  if (printWindow) {
    try {
      printWindow.document.write('<!doctype html><html><body style="font-family:sans-serif;padding:24px;color:#475569;">Preparando PDF…</body></html>');
    } catch {}
  }
  toast.info("Preparando PDF com documentos...");
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const shareToken = (trip as any).share_token;
  const documentUrl = (path: string): string | null => {
    if (!supabaseUrl || !shareToken || !path) return null;
    const clean = extractVoucherPath(path);
    return clean ? `${supabaseUrl}/functions/v1/serve-voucher?token=${encodeURIComponent(shareToken)}&file=${encodeURIComponent(clean)}` : null;
  };
  const sorted = [...(trip.services || [])].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
  const resolveImg = await buildServiceImageResolver(sorted);
  const options = await Promise.resolve(optionsInput).catch(() => ({}) as { modules?: PdfModules; signature?: PdfSignature | null });
  void voucherAccess;
  const html = buildTripPdfHtml({ trip, profile, itineraryActivities, locale, resolveImg, documentUrl, modules: options.modules, signature: options.signature });

  if (!printWindow) {
    toast.error(t("pdfPopupBlocked"));
    return;
  }
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  await waitForWindowImages(printWindow);
  try { printWindow.print(); } catch { /* impressão cancelada */ }
}
