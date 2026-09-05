import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Quote, QuoteService, ServiceType } from "@/types/quote";
import type { AgentProfile } from "@/hooks/useAgentProfile";
import { formatQuoteCurrency, getQuoteCurrencyInfo, getCurrencySymbol, type QuoteCurrency } from "@/lib/quoteCurrency";
import { extractServicePaymentConfig, extractFlightFeeInfo, getServicePaymentDisplay, getRoomPaymentSimulation } from "@/lib/servicePayment";
import { splitFlightLegs } from "@/lib/flightSegments";
import { resolveBrandPalette } from "@/lib/brandTheme";
import { resolveWhatsIncluded, iconKeyForIncludedItem } from "@/lib/whatsIncluded";
import { formatPaymentMethodsInline } from "@/lib/paymentMethods";
import { supabase } from "@/integrations/supabase/client";
import { isGoogleImageRef, resolveServiceImages } from "@/lib/serviceImages";
import { formatCompositionLabel, readCompositionCounts } from "@/lib/attractionFareComposition";
import {
  getEffectiveQuoteTotal,
  hidesIndividualAmounts,
  getInvestmentPresentationLayout,
  PACKAGE_INCLUDED_LABEL,
  PACKAGE_TOTAL_LABEL,
} from "@/lib/quotePricing";

type QuoteDocument = {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string | null;
  file_size: number | null;
};

async function fetchQuoteDocumentsForPDF(quoteId: string): Promise<Array<QuoteDocument & { signedUrl: string }>> {
  try {
    const { data, error } = await supabase
      .from("quote_documents")
      .select("id, file_name, file_path, file_type, file_size")
      .eq("quote_id", quoteId)
      .eq("is_public", true)
      .order("created_at", { ascending: true });
    if (error || !data) return [];
    const withUrls = await Promise.all(
      data.map(async (doc: any) => {
        const { data: signed } = await supabase.storage
          .from("quote-documents")
          .createSignedUrl(doc.file_path, 60 * 60 * 24 * 7);
        return { ...doc, signedUrl: signed?.signedUrl || "" };
      }),
    );
    return withUrls;
  } catch {
    return [];
  }
}

function emojiForDoc(fileName: string, fileType: string | null): string {
  const name = (fileName || "").toLowerCase();
  const type = (fileType || "").toLowerCase();
  if (type.includes("pdf") || name.endsWith(".pdf")) return "📄";
  if (type.includes("image") || /\.(jpg|jpeg|png|webp|gif)$/.test(name)) return "🖼️";
  if (/\.(xlsx?|csv)$/.test(name) || type.includes("sheet")) return "📊";
  if (/\.(docx?)$/.test(name) || type.includes("word")) return "📝";
  return "📎";
}

function formatDocSizePDF(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const INCLUDED_EMOJI: Record<string, string> = {
  hotel: "🏨",
  flight: "✈️",
  car: "🚗",
  transfer: "🚐",
  attraction: "🎟️",
  insurance: "🛡️",
  cruise: "🚢",
  sparkles: "✨",
};

const SERVICE_LABELS: Record<ServiceType, string> = {
  flight: "Passagem Aérea",
  hotel: "Hospedagem",
  car_rental: "Locação de Veículo",
  transfer: "Transfer",
  attraction: "Ingressos/Atrações",
  insurance: "Seguro Viagem",
  cruise: "Cruzeiro",
  rail_transport: "Transporte Ferroviário",
  circuit: "Circuitos",
  other: "Outros Serviços",
};

function getServiceLabel(service: QuoteService): string {
  if (service.service_type === "other") {
    const customTitle = (service.service_data as any)?.custom_title?.trim();
    if (customTitle) return customTitle;
  }
  return SERVICE_LABELS[service.service_type as ServiceType] || "Serviço";
}

const SERVICE_EMOJI: Record<ServiceType, string> = {
  flight: "✈️",
  hotel: "🏨",
  car_rental: "🚗",
  transfer: "🚐",
  attraction: "🎟️",
  insurance: "🛡️",
  cruise: "🚢",
  rail_transport: "🚆",
  circuit: "🗺️",
  other: "📦",
};


/**
 * Tokens de cor EXCLUSIVOS do PDF do orçamento.
 * Fonte única: a paleta da agência (`resolveBrandPalette`), com o fallback
 * azul padrão quando a agência não configurou cores. Não altera o tema global.
 */
type PdfTokens = {
  /** Primária legível sobre BRANCO (>= 4.5:1). */
  primary: string;
  /** Primária legível sobre a TERCIÁRIA (>= 4.5:1). */
  primaryOnTertiary: string;
  tertiary: string;
  /** Bordas/divisórias: tom suavizado derivado da SECUNDÁRIA. */
  border: string;
  /** Compat.: título das faixas terciárias. */
  headerText: string;
  /** Textos sobre BRANCO. */
  text: string;
  muted: string;
  faint: string;
  /** Textos sobre a TERCIÁRIA (fundo da página, chips, faixas). */
  textT: string;
  mutedT: string;
  faintT: string;
};

function luminanceOf(hex: string): number {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return 1;
  const n = parseInt(m[1], 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const x = c / 255;
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

function contrastRatio(a: string, b: string): number {
  const la = luminanceOf(a);
  const lb = luminanceOf(b);
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

function toRgb(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec((hex || "").trim());
  if (!m) return [255, 255, 255];
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mixHex(a: string, b: string, t: number): string {
  const [r1, g1, b1] = toRgb(a);
  const [r2, g2, b2] = toRgb(b);
  const f = (x: number, y: number) => Math.round(x + (y - x) * t);
  return (
    "#" +
    [f(r1, r2), f(g1, g2), f(b1, b2)]
      .map((v) => v.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase()
  );
}

/**
 * Garante contraste mínimo do texto sobre o fundo informado, sem alterar o
 * fundo configurado pela agência: escurece a cor sobre fundos claros e a
 * clareia sobre fundos escuros, apenas o necessário.
 */
function ensureReadable(fg: string, bg: string, min = 4.5): string {
  if (contrastRatio(fg, bg) >= min) return fg;
  const target = luminanceOf(bg) > 0.4 ? "#0B1220" : "#F8FAFC";
  let out = fg;
  for (let t = 0.1; t <= 1.0001; t += 0.1) {
    out = mixHex(fg, target, t);
    if (contrastRatio(out, bg) >= min) return out;
  }
  return target;
}

export function getQuotePdfTokens(profile: AgentProfile | null | undefined): PdfTokens {
  const palette = resolveBrandPalette({
    primary: profile?.agency_primary_color ?? null,
    secondary: profile?.agency_secondary_color ?? null,
    secondaryAuto: profile?.agency_secondary_auto ?? null,
    tertiary: profile?.agency_tertiary_color ?? null,
    tertiaryAuto: profile?.agency_tertiary_auto ?? null,
  });
  const tertiary = palette.tertiary;
  // Bordas/divisórias/detalhes: SECUNDÁRIA suavizada (misturada com o fundo).
  const tertLight = luminanceOf(tertiary) > 0.4;
  const border = mixHex(palette.secondary, tertLight ? "#FFFFFF" : "#0B1220", 0.55);
  const primary = ensureReadable(palette.primary, "#FFFFFF");
  const primaryOnTertiary = ensureReadable(palette.primary, tertiary);
  return {
    primary,
    primaryOnTertiary,
    tertiary,
    border,
    headerText: primaryOnTertiary,
    text: ensureReadable("#0F172A", "#FFFFFF"),
    muted: ensureReadable("#475569", "#FFFFFF"),
    faint: ensureReadable("#64748B", "#FFFFFF"),
    textT: ensureReadable("#0F172A", tertiary),
    mutedT: ensureReadable("#475569", tertiary),
    faintT: ensureReadable("#64748B", tertiary),
  };
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
  try {
    return format(parseLocalDate(dateStr), "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return dateStr;
  }
}

function getServiceDetails(service: QuoteService): string[] {
  const data = service.service_data as any;
  const details: string[] = [];
  switch (service.service_type) {
    case "flight":
      if (data.return_date && !data.is_one_way) {
        details.push(`Ida: ${formatDate(data.departure_date)} | Volta: ${formatDate(data.return_date)}`);
      } else {
        details.push(`Ida: ${formatDate(data.departure_date)} (somente ida)`);
      }
      // Multi-leg support — re-bucket by segment_type so internal flights aren't shown under "Ida".
      const { outbound: outLegs, internal: intLegs, return_: retLegs } = splitFlightLegs(data);
      outLegs.forEach((ob: any, i: number) => {
        const parts: string[] = [];
        if (ob.leg_date) parts.push(formatDate(ob.leg_date));
        if (ob.flight_number) parts.push(`Voo ${ob.flight_number}`);
        if (ob.airport_origin && ob.airport_destination) parts.push(`${ob.airport_origin} → ${ob.airport_destination}`);
        if (ob.departure_time) parts.push(`Saída: ${ob.departure_time}`);
        if (ob.arrival_time) parts.push(`Chegada: ${ob.arrival_time}`);
        const label = outLegs.length > 1 ? `✈ Ida (trecho ${i + 1})` : `✈ Ida`;
        if (parts.length) details.push(`${label}: ${parts.join(" | ")}`);
      });
      intLegs.forEach((it: any, i: number) => {
        const parts: string[] = [];
        if (it.leg_date) parts.push(formatDate(it.leg_date));
        if (it.flight_number) parts.push(`Voo ${it.flight_number}`);
        if (it.airport_origin && it.airport_destination) parts.push(`${it.airport_origin} → ${it.airport_destination}`);
        if (it.departure_time) parts.push(`Saída: ${it.departure_time}`);
        if (it.arrival_time) parts.push(`Chegada: ${it.arrival_time}`);
        const label = intLegs.length > 1 ? `✈ Trecho interno (${i + 1})` : `✈ Trecho interno`;
        if (parts.length) details.push(`${label}: ${parts.join(" | ")}`);
      });
      retLegs.forEach((rt: any, i: number) => {
        const parts: string[] = [];
        if (rt.leg_date) parts.push(formatDate(rt.leg_date));
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
      details.push(`${data.hotel_name} — ${data.city}`);
      details.push(`Check-in: ${formatDate(data.check_in)} | Check-out: ${formatDate(data.check_out)}`);
      if (data.meal_plan) details.push(`Regime: ${formatLabel(data.meal_plan)}`);
      if (Array.isArray(data.rooms) && data.rooms.length === 1) {
        details.push("Acomodações:");
        data.rooms.forEach((r: any) => {
          const paxParts: string[] = [];
          if (r.adults) paxParts.push(`${r.adults} adulto${r.adults > 1 ? "s" : ""}`);
          if (r.children) {
            const ages = Array.isArray(r.children_ages) && r.children_ages.length
              ? ` (${r.children_ages.join(", ")} ${r.children_ages.length > 1 ? "anos" : "ano"})`
              : "";
            paxParts.push(`${r.children} criança${r.children > 1 ? "s" : ""}${ages}`);
          }
          details.push(`  • ${r.quantity || 1}x ${r.room_type}${paxParts.length ? ` — ${paxParts.join(" + ")}` : ""}`);
        });
      } else if (data.room_type) {
        details.push(`Quarto: ${formatLabel(data.room_type)}`);
      }
      if (data.notes) details.push(`Obs: ${data.notes}`);
      break;
    case "car_rental":
      details.push(`Tipo: ${data.car_type} | ${data.days} diária(s)`);
      details.push(`Retirada: ${data.pickup_location}`);
      details.push(`Devolução: ${data.dropoff_location}`);
      if (data.notes) details.push(`Obs: ${data.notes}`);
      break;
    case "transfer":
      details.push(`Tipo: ${data.transfer_type === "round_trip" ? "Ida e Volta" : data.transfer_type === "arrival" ? "Chegada" : "Saída"}`);
      details.push(`Local: ${data.location}`);
      if (data.transfer_type === "round_trip") {
        details.push(`Chegada: ${formatDate(data.arrival_date || data.date)}`);
        if (data.departure_date) details.push(`Saída: ${formatDate(data.departure_date)}`);
      } else {
        details.push(`Data: ${formatDate(data.date)}`);
      }
      break;
    case "attraction":
      details.push([data.product_name, data.ticket_type].filter(Boolean).join(" | ") || data.name);
      {
        const fareCounts = readCompositionCounts(data);
        details.push(
          fareCounts
            ? `Data: ${formatDate(data.date)} | Cobrança: ${formatCompositionLabel(fareCounts)}`
            : `Data: ${formatDate(data.date)} | Quantidade: ${data.quantity || 1}`,
        );
      }
      if (data.adult_price > 0) details.push(`Adulto: ${Number(data.adult_price).toFixed(2)}`);
      if (data.child_price > 0) details.push(`Criança: ${Number(data.child_price).toFixed(2)}`);
      break;
    case "insurance":
      details.push(`Seguradora: ${data.provider}`);
      details.push(`Período: ${formatDate(data.start_date)} a ${formatDate(data.end_date)}`);
      details.push(`Cobertura: ${data.coverage}`);
      break;
    case "cruise":
      details.push(`Navio: ${data.ship_name}`);
      details.push(`Rota: ${data.route}`);
      details.push(`Período: ${formatDate(data.start_date)} a ${formatDate(data.end_date)}`);
      details.push(`Cabine: ${data.cabin_type}`);
      break;
    case "rail_transport": {
      const railTypeLbl: Record<string, string> = { high_speed: "Trem de alta velocidade", regional: "Trem regional", night: "Trem noturno", panoramic: "Trem panorâmico", other: "Outro" };
      const railClassLbl: Record<string, string> = { economy: "Classe Econômica", second: "Segunda Classe", first: "Primeira Classe", executive: "Executiva", sleeper: "Cabine Leito" };
      if (data.origin_city || data.destination_city) details.push(`${data.origin_city || ""} → ${data.destination_city || ""}`);
      if (data.origin_station || data.destination_station) details.push(`Estações: ${data.origin_station || "—"} → ${data.destination_station || "—"}`);
      if (data.travel_date) details.push(`Data: ${formatDate(data.travel_date)}`);
      if (data.departure_time || data.arrival_time) {
        details.push(`Horário: ${data.departure_time || "—"} → ${data.arrival_time || "—"}`);
      }
      if (data.operator) details.push(`Operadora: ${data.operator}`);
      if (data.rail_type) details.push(`Tipo: ${railTypeLbl[data.rail_type] || data.rail_type}`);
      if (data.travel_class) details.push(`Classe: ${railClassLbl[data.travel_class] || data.travel_class}`);
      const pax = (Number(data.adults_count) || 0) + (Number(data.children_count) || 0) + (Number(data.infants_count) || 0);
      if (pax > 0) details.push(`Passageiros: ${pax}`);
      if (data.whats_included) details.push(`Incluso: ${data.whats_included}`);
      if (data.notes) details.push(`Obs: ${data.notes}`);
      break;
    }
    case "circuit":
      if (data.circuit_name) details.push(`Circuito: ${data.circuit_name}`);
      if (data.duration) details.push(`Duração: ${data.duration}`);
      if (data.itinerary) details.push(data.itinerary);
      if (data.notes) details.push(`Obs: ${data.notes}`);
      break;
    case "other":
      details.push(data.description);
      break;
  }
  return details;
}

function generateAgencyHeader(profile: AgentProfile | null): string {
  const C = getQuotePdfTokens(profile);
  if (!profile?.agency_logo_url) {
    return `
      <div style="text-align:center;padding:10px 0;background:#ffffff;border-bottom:1px solid ${C.border};border-radius:0;">
        <p style="font-size:22px;font-weight:800;color:${C.primary};margin:0;letter-spacing:-0.3px;">
          ${profile?.agency_name || "Proposta de Viagem"}
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
  const C = getQuotePdfTokens(profile);
  if (!profile) {
    return "";
  }

  const avatarHtml = profile.avatar_url
    ? `<img src="${profile.avatar_url}" alt="${profile.name}" style="width:96px;height:96px;border-radius:50%;object-fit:cover;border:4px solid ${C.border};box-shadow:0 8px 20px rgba(0,0,0,0.08);display:inline-block;" />`
    : `<div style="width:96px;height:96px;border-radius:50%;background:linear-gradient(135deg,${C.primary},${C.primary});display:inline-flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:36px;box-shadow:0 8px 20px rgba(0,0,0,0.08);">${profile.name.charAt(0).toUpperCase()}</div>`;

  const whatsappNumber = profile.phone?.replace(/\D/g, "") || "";
  const whatsappLink = whatsappNumber
    ? `https://wa.me/${whatsappNumber.startsWith("55") ? whatsappNumber : `55${whatsappNumber}`}`
    : "";

  return `
    <div class="pdf-block agent-signature" style="margin-top:14px;border:1px solid ${C.border};border-radius:16px;background:#ffffff;overflow:hidden;box-shadow:0 1px 2px rgba(0,0,0,0.04);">
      <div style="background:linear-gradient(90deg,${C.tertiary},${C.tertiary});padding:8px 18px;text-align:center;">
        <p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:3px;color:${C.primaryOnTertiary};margin:0;">Seu consultor de viagens</p>
      </div>
      <div style="padding:14px 18px;text-align:center;">
        ${avatarHtml.replace(/width:96px;height:96px/g, "width:68px;height:68px").replace(/font-size:36px/g, "font-size:26px")}
        <p style="font-size:17px;font-weight:800;color:${C.primary};margin:8px 0 1px;">${profile.name}</p>
        ${profile.agency_name ? `<p style="font-size:12px;color:${C.muted};margin:0;font-weight:500;">${profile.agency_name}</p>` : ""}
        ${profile.city || profile.state ? `<p style="font-size:11px;color:${C.faint};margin:2px 0 0;">${[profile.city, profile.state].filter(Boolean).join(", ")}</p>` : ""}
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

export async function generateQuotePDF(quote: Quote & Record<string, any>, profile?: AgentProfile | null) {
  const { currency } = getQuoteCurrencyInfo(quote);
  const formatCurrency = (v: number) => formatQuoteCurrency(v, currency);
  const C = getQuotePdfTokens(profile || null);

  // Abrir a janela ANTES do await para evitar bloqueio de popup pelo navegador.
  const printWindow = window.open("", "_blank");
  if (printWindow) {
    try {
      // Aviso de carregamento: existe apenas na TELA e é totalmente descartado
      // com document.open() antes de escrever o HTML final (nunca é impresso).
      printWindow.document.write(
        '<!doctype html><html><head><meta charset="utf-8"><title>Gerando PDF…</title>' +
          '<style>@media print{.screen-only{display:none !important}}</style></head>' +
          '<body style="font-family:sans-serif;padding:24px;color:#475569;">' +
          '<p class="screen-only">Gerando PDF do orçamento…</p></body></html>',
      );
      printWindow.document.close();
    } catch {}
  }


  const quoteDocuments = quote?.id ? await fetchQuoteDocumentsForPDF(quote.id) : [];

  const startDate = parseLocalDate(quote.start_date);
  const endDate = parseLocalDate(quote.end_date);
  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  const useServicePayment = (quote as any).use_service_payment || 
    quote.services?.some((s: any) => s.is_custom_payment === true) || false;

  // Valores individuais só desaparecem quando o cliente vê apenas o total consolidado.
  const packagePricing = hidesIndividualAmounts(quote);
  // No modo pacote nenhum valor individual aparece no PDF.
  const showDetailedPrices = (quote as any).show_detailed_prices !== false && !packagePricing;

  // Resolve imagens do Google (referências gplace:// e URLs legadas) para URLs
  // válidas no momento da geração — nada é copiado ou persistido.
  const imageMap = new Map<string, string>();
  const googleAttributions = new Set<string>();
  for (const svc of quote.services || []) {
    const refs = [
      ...((svc as any).image_urls || []),
      ...((svc as any).image_url ? [(svc as any).image_url] : []),
    ].filter(Boolean) as string[];
    if (!refs.some(isGoogleImageRef)) continue;
    try {
      const resolved = await resolveServiceImages(refs, (svc.service_data as any)?.place_id ?? null);
      resolved.forEach((r) => {
        if (r.src) imageMap.set(r.ref, r.src);
        (r.attributions || []).forEach((a) => googleAttributions.add(a));
      });
    } catch {
      /* mantém o comportamento anterior; imagens sem resolução são omitidas */
    }
  }
  const resolveImg = (ref: string): string | null => {
    if (imageMap.has(ref)) return imageMap.get(ref)!;
    return isGoogleImageRef(ref) ? null : ref;
  };

  const servicesHtml =
    quote.services
      ?.map((service) => {
        const label = getServiceLabel(service);
        const emoji = SERVICE_EMOJI[service.service_type as ServiceType] || "📋";
        const details = getServiceDetails(service);
        const data = service.service_data as any;
        const notesText = service.service_type === "attraction" ? data?.notes : null;
        const descText = service.description || null;
        // Summary alinhado ao link público
        let summary = "";
        switch (service.service_type) {
          case "flight": summary = `${data.airline || ""}${data.origin_city ? ` | ${data.origin_city} → ${data.destination_city}` : ""}`.trim(); break;
          case "hotel": summary = `${data.hotel_name || ""}${data.city ? ` — ${data.city}` : ""}`; break;
          case "car_rental": summary = `${data.car_type || ""}${data.days ? ` | ${data.days} diária(s)` : ""}`; break;
          case "transfer": summary = `${data.transfer_type === "round_trip" ? "Ida e Volta" : data.transfer_type === "arrival" ? "Chegada" : "Saída"}${data.location ? ` — ${data.location}` : ""}`; break;
          case "attraction": summary = [data.product_name, data.ticket_type].filter(Boolean).join(" | ") || data.name || ""; break;
          case "insurance": summary = data.provider || ""; break;
          case "cruise": summary = `${data.ship_name || ""}${data.route ? ` — ${data.route}` : ""}`; break;
          case "rail_transport": {
            const railTypeLbl: Record<string, string> = { high_speed: "Trem de alta velocidade", regional: "Trem regional", night: "Trem noturno", panoramic: "Trem panorâmico", other: "Outro" };
            summary = `${data.origin_city || ""} → ${data.destination_city || ""}${data.rail_type ? ` | ${railTypeLbl[data.rail_type] || data.rail_type}` : ""}`;
            break;
          }
          case "circuit": summary = data.circuit_name || "Circuito"; break;
          case "other": summary = data.company_name || (data.description || "").split("\n")[0].slice(0, 80) || "Outros Serviços"; break;
        }
        // PDF: usar APENAS a primeira imagem cadastrada para economizar espaço vertical
        const allImages = ([
          ...(service.image_urls || []),
          ...(service.image_url && !(service.image_urls || []).includes(service.image_url) ? [service.image_url] : []),
        ] as string[])
          .map(resolveImg)
          .filter((u): u is string => !!u);
        const firstImage = allImages[0] || null;
        // Hotel: use a gallery grid (max 10) above the description
        const isHotel = service.service_type === "hotel";
        const hotelImages = isHotel ? allImages.slice(0, 10) : [];
        const hotelRooms: any[] = isHotel && Array.isArray((service.service_data as any)?.rooms)
          ? (service.service_data as any).rooms
          : [];
        const hotelHasMultipleRooms = hotelRooms.length > 1;

        // Per-room pricing breakdown (only when hotel has multiple rooms)
        let hotelRoomsHtml = "";
        if (isHotel && hotelHasMultipleRooms && showDetailedPrices) {
          const rowsHtml = hotelRooms.map((r: any) => {
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
            const sim = getRoomPaymentSimulation(total, service, quote);
            const installmentLine = sim.installmentValue != null
              ? `<div style="display:flex;justify-content:space-between;font-size:12px;margin-top:2px;"><span style="color:${C.mutedT};">ou ${sim.installmentsCount}x de</span><span style="color:${C.primaryOnTertiary};font-weight:700;">${formatCurrency(sim.installmentValue)}</span></div>`
              : "";
            return `
              <div style="border:1px solid ${C.border};border-radius:10px;padding:10px 12px;margin-bottom:6px;background:${C.tertiary};">
                <div style="font-size:13px;font-weight:700;color:${C.textT};">${qty}x ${r.room_type || ""}</div>
                ${paxParts.length ? `<div style="font-size:11px;color:${C.mutedT};margin-top:2px;">${paxParts.join(" + ")}</div>` : ""}
                ${r.notes ? `<div style="font-size:11px;color:${C.mutedT};font-style:italic;margin-top:2px;">${r.notes}</div>` : ""}
                <div style="border-top:1px solid ${C.border};margin-top:8px;padding-top:6px;">
                  <div style="display:flex;justify-content:space-between;font-size:12px;"><span style="color:${C.mutedT};">Valor</span><span style="color:${C.textT};font-weight:700;">${formatCurrency(sim.total)}</span></div>
                  ${installmentLine}
                </div>
              </div>
            `;
          }).join("");
          hotelRoomsHtml = `
            <div class="pdf-block pdf-hotel-rooms" style="margin-top:10px;">
              <p style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:1.2px;color:${C.text};margin:0 0 6px;">Acomodações</p>
              ${rowsHtml}
            </div>
          `;
        }

        // Per-service payment display
        let paymentHtml = "";
        if (useServicePayment && showDetailedPrices && !(isHotel && (service.service_data as any)?.rooms?.length > 1)) {
          const payConfig = extractServicePaymentConfig(service);
          if (payConfig.is_custom_payment) {
            const feeInfo = extractFlightFeeInfo(service);
            const display = getServicePaymentDisplay(service.amount, payConfig, feeInfo);
            if (display) {
              paymentHtml = `
                <div class="pdf-block pdf-payment" style="margin-top:10px;background:${C.tertiary};border:1px solid ${C.border};border-radius:10px;padding:10px 12px;">
                  <p style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;color:${C.primaryOnTertiary};margin:0 0 2px;">💳 Parcelamento</p>
                  <p style="font-size:13px;font-weight:600;color:${C.primaryOnTertiary};margin:0;">${display}</p>
                </div>
              `;
            }
          }
        }

        // Parse "Label: value | Label: value" into mini-boxes (chips); leave
        // multi-line / free-form text as plain blocks. Mirrors the public link.
        type Chip = { key: string; value: string };
        const chipItems: Chip[] = [];
        const freeItems: string[] = [];
        const labelRe = /^([^:\n]{1,40}):\s*([\s\S]+)$/;
        details.forEach((d) => {
          if (!d) return;
          const isMultiline = /\n/.test(d);
          if (isMultiline) { freeItems.push(d); return; }
          // Split top-level by " | " separator
          const parts = d.split(/\s\|\s/).map((p) => p.trim()).filter(Boolean);
          let allChips = true;
          const localChips: Chip[] = [];
          for (const p of parts) {
            const m = p.match(labelRe);
            if (m) {
              localChips.push({ key: m[1].trim(), value: m[2].trim() });
            } else {
              allChips = false;
              break;
            }
          }
          if (allChips && localChips.length > 0) {
            chipItems.push(...localChips);
          } else {
            freeItems.push(d);
          }
        });

        const renderChipValue = (v: string) =>
          v.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

        const chipsHtml = chipItems.length > 0 ? `
          <table class="pdf-block pdf-details" style="width:100%;border-collapse:separate;border-spacing:6px 6px;table-layout:fixed;margin:0 -6px;">
            ${(() => {
              const rows: string[] = [];
              for (let i = 0; i < chipItems.length; i += 2) {
                const cells = chipItems.slice(i, i + 2).map((c) => `
                  <td style="width:50%;vertical-align:top;background:${C.tertiary};border:1px solid ${C.border};border-radius:8px;padding:6px 10px;">
                    <p style="margin:0 0 2px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.8px;color:${C.primaryOnTertiary};line-height:1.2;">${c.key}</p>
                    <p style="margin:0;font-size:12px;color:${C.textT};line-height:1.4;word-break:break-word;${/^\d{1,2}:\d{2}$/.test(c.value) ? 'white-space:nowrap;' : ''}">${renderChipValue(c.value)}</p>
                  </td>
                `).join("");
                const padCount = 2 - chipItems.slice(i, i + 2).length;
                const pad = padCount > 0 ? '<td style="width:50%;"></td>'.repeat(padCount) : "";
                rows.push(`<tr>${cells}${pad}</tr>`);
              }
              return rows.join("");
            })()}
          </table>
        ` : "";

        const freeHtml = freeItems.length > 0 ? `
          <div class="pdf-block pdf-details" style="margin-top:${chipItems.length > 0 ? 6 : 0}px;word-wrap:break-word;overflow-wrap:break-word;">
            ${freeItems.map((d) => `<p style="margin:2px 0;font-size:12px;color:${C.muted};line-height:1.45;white-space:pre-wrap;word-break:break-word;">${d}</p>`).join("")}
          </div>
        ` : "";

        const detailsHtml = `${chipsHtml}${freeHtml}`;

        const descHtml = descText ? `
          <div class="pdf-block pdf-desc" style="margin-top:8px;background:${C.tertiary};border-left:3px solid ${C.border};border-radius:6px;padding:8px 12px;word-wrap:break-word;overflow-wrap:break-word;">
            <p style="margin:0;font-size:12px;color:${C.mutedT};line-height:1.5;white-space:pre-wrap;word-break:break-word;">${descText}</p>
          </div>
        ` : "";

        const notesHtml = notesText ? `
          <div class="pdf-block pdf-notes" style="margin-top:4px;">
            <p style="margin:2px 0;font-size:12px;color:${C.muted};line-height:1.45;font-style:italic;border-left:2px solid ${C.border};padding-left:10px;white-space:pre-wrap;word-break:break-word;">${notesText}</p>
          </div>
        ` : "";

        // Layout 2 colunas: imagem (≈30%) + conteúdo (≈70%) usando <table>
        // pois é mais confiável que flex/grid em renderização de impressão.
        const bodyInner = `
          ${detailsHtml}
          ${descHtml}
          ${notesHtml}
          ${hotelRoomsHtml}
          ${paymentHtml}
        `;
        const hotelGalleryHtml = isHotel && hotelImages.length > 0
          ? (() => {
              const allCells: string[] = [];
              for (let i = 0; i < hotelImages.length; i += 5) {
                const row = hotelImages.slice(i, i + 5);
                const rowHtml = row
                  .map(
                    (src) => `
                      <td style="width:20%;vertical-align:middle;padding:3px;">
                        <div style="width:100%;height:78px;background:#f1f5f9;border:1px solid ${C.border};border-radius:8px;overflow:hidden;text-align:center;line-height:78px;font-size:0;">
                          <img src="${src}" style="max-width:100%;max-height:100%;width:auto;height:auto;object-fit:contain;vertical-align:middle;display:inline-block;" />
                        </div>
                      </td>
                    `
                  )
                  .join("");
                const padCount = 5 - row.length;
                const padHtml = padCount > 0 ? Array(padCount).fill('<td style="width:20%;padding:3px;"></td>').join("") : "";
                allCells.push(`<tr>${rowHtml}${padHtml}</tr>`);
              }
              return `
                <div class="pdf-block pdf-hotel-gallery" style="margin-bottom:8px;">
                  <table style="width:100%;border-collapse:separate;border-spacing:0;table-layout:fixed;">
                    ${allCells.join("")}
                  </table>
                </div>
              `;
            })()
          : "";

        const bodyHtml = isHotel
          ? `${hotelGalleryHtml}${bodyInner}`
          : firstImage
          ? `
            <table style="width:100%;border-collapse:separate;border-spacing:0;table-layout:fixed;">
              <tr>
                <td style="width:30%;vertical-align:top;padding:0 14px 0 0;">
                  <img src="${firstImage}" style="width:100%;height:130px;object-fit:cover;border-radius:12px;border:1px solid ${C.border};display:block;" />
                </td>
                <td style="vertical-align:top;">
                  ${bodyInner}
                </td>
              </tr>
            </table>
          `
          : bodyInner;

        return `
        <div class="pdf-card service-card" style="border:1px solid ${C.border};border-radius:14px;margin-bottom:10px;background:#ffffff;overflow:hidden;box-shadow:0 1px 2px rgba(0,0,0,0.04);">
          <div class="pdf-block pdf-header service-title" style="display:flex;justify-content:space-between;align-items:center;gap:12px;background:${C.tertiary};padding:8px 14px;color:${C.headerText};">
            <div style="display:flex;align-items:center;gap:12px;min-width:0;flex:1;">
              <div style="width:34px;height:34px;border-radius:9px;background:#ffffff;display:inline-flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 1px 2px rgba(0,0,0,0.06);">${emoji}</div>
              <div style="min-width:0;">
                <p style="font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:1.2px;color:${C.headerText};margin:0;line-height:1.2;">${label}</p>
                ${summary ? `<p style="font-size:12px;color:${C.headerText};opacity:0.75;margin:2px 0 0;font-weight:500;line-height:1.3;word-break:break-word;">${summary}</p>` : ""}
              </div>
            </div>
            ${packagePricing
              ? `<span style="font-size:11px;font-weight:600;color:${C.headerText};opacity:0.8;white-space:nowrap;">${PACKAGE_INCLUDED_LABEL}</span>`
              : showDetailedPrices && !hotelHasMultipleRooms
                ? `<span style="font-size:17px;font-weight:800;color:${C.headerText};white-space:nowrap;">${formatCurrency(service.amount)}</span>`
                : ""}
          </div>
          <div style="padding:12px 16px;">
            ${bodyHtml}
          </div>
        </div>
      `;
      })
      .join("") || "";

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Orçamento — ${quote.client_name}</title>
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family:'Segoe UI',system-ui,-apple-system,sans-serif; color:${C.textT}; line-height:1.5; background:${C.tertiary}; }
        img { max-width:100%; height:auto; }

        /* ----- SMART PAGINATION (briefing) -----
           Idea: do NOT wrap large cards in break-inside:avoid (that causes the
           giant whitespace bug). Instead, mark only SAFE atomic sub-blocks as
           unbreakable, keep titles glued to what comes next, and apply a
           subtle vertical compression so we don't waste space at the bottom
           of pages and avoid almost-empty trailing pages.                   */
        @media print {
          /* Numeração própria "1 de N" via margin box do CSS Paged Media.
             Comprovado no Chromium: a numeração própria é impressa. O CSS não
             remove o cabeçalho/rodapé NATIVO do navegador (about:blank e data)
             quando ele está ativado — por isso a dica aparece na tela. */
          @page {
            size: A4;
            margin: 14mm 10mm 12mm 10mm;
            @bottom-right {
              content: "Página " counter(page) " de " counter(pages);
              font-family: 'Segoe UI', system-ui, sans-serif;
              font-size: 9px;
              color: #94a3b8;
            }
          }
          @page :first { margin-top: 8mm; }
          .screen-only { display: none !important; }

          html, body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            line-height: 1.42 !important;
          }
          .page-break { page-break-before: always; break-before: page; }

          /* --- Adaptive Vertical Compression ---
             Slight, proportional reductions to vertical rhythm. Keeps
             premium look while reclaiming whitespace at the end of pages. */
          .pdf-hero { padding-top: 0 !important; padding-bottom: 6px !important; }
          .pdf-hero h1 { font-size: 26px !important; line-height: 1.05 !important; margin-bottom: 2px !important; }
          .pdf-hero p { margin-top: 2px !important; }

          .overview-card {
            padding: 10px 14px !important;
            margin-bottom: 12px !important;
          }

          .destination-intro { margin-bottom: 14px !important; }
          .destination-intro p { line-height: 1.5 !important; }

          .service-card {
            margin-bottom: 7px !important;
          }
          .service-card > div:last-child { padding: 9px 14px !important; }
          .service-title { padding: 6px 12px !important; }
          .pdf-details p, .pdf-desc p, .pdf-notes p {
            margin: 1px 0 !important;
            line-height: 1.38 !important;
          }

          .investment-card {
            padding: 14px 18px !important;
            margin-bottom: 12px !important;
          }
          .payment-terms {
            padding: 14px 18px !important;
            margin-bottom: 12px !important;
          }
          .payment-terms p { line-height: 1.5 !important; }

          .agent-signature { margin-top: 10px !important; }
          .agent-signature > div:last-child { padding: 10px 16px !important; }

          /* Trim trailing footer + remove bottom paddings/margins so the
             very last element doesn't overflow into a blank trailing page. */
          body > div > div > div:last-child { padding-top: 6px !important; padding-bottom: 0 !important; }
          body > div { padding-bottom: 0 !important; margin-bottom: 0 !important; }
          body, html { margin: 0 !important; padding: 0 !important; }

          /* Atomic sub-blocks — never split these in the middle */
          .pdf-block,
          .pdf-header,
          .pdf-gallery,
          .pdf-payment,
          .pdf-notes,
          .investment-card,
          .agent-signature,
          .overview-card,
          .payment-terms,
          .destination-intro,
          img {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          /* Prevent the consultant block + footer from being orphaned alone
             on a final page — pull them up with the previous content. */
          .investment-card { break-after: avoid; page-break-after: avoid; }
          .payment-terms   { break-before: avoid; page-break-before: avoid; }
          .agent-signature { break-before: avoid; page-break-before: avoid; }

          /* Titles stay with the content that follows them */
          .pdf-title,
          .section-title,
          .service-title {
            break-after: avoid;
            page-break-after: avoid;
          }

          /* Service card wrapper is intentionally breakable so long cards
             flow naturally across pages instead of being pushed whole. */
          .pdf-card,
          .pdf-details,
          .pdf-desc,
          .long-text {
            break-inside: auto;
            page-break-inside: auto;
          }

          /* Service cards flow continuously across pages to avoid large
             trailing whitespace at the bottom of pages. The header stays
             glued to the following content via .service-title rules above. */
          .service-card {
            break-inside: auto;
            page-break-inside: auto;
          }

          /* Avoid orphan headings */
          h1, h2, h3 {
            break-after: avoid;
            page-break-after: avoid;
          }

          /* Avoid widow/orphan lines inside paragraphs */
          p { orphans: 3; widows: 3; }
        }
      </style>
    </head>
    <body>
      <div class="screen-only" style="max-width:820px;margin:0 auto 12px;padding:10px 14px;border-radius:12px;background:#ffffff;border:1px solid ${C.border};font-size:12px;color:#475569;">
        Dica: na janela de impressão, desative <strong>“Cabeçalhos e rodapés”</strong> para remover o
        endereço (about:blank) e a data das bordas do PDF. Este aviso não é impresso.
      </div>
      <div style="max-width:820px;margin:0 auto;padding:0 0 20px;">

        ${generateAgencyHeader(profile || null)}

        <div style="padding:6px 32px 0;">
        <!-- Hero -->
        <div class="pdf-block pdf-hero" style="text-align:center;padding:2px 0 12px;">
          <div style="display:inline-block;background:${C.tertiary};color:${C.primaryOnTertiary};padding:5px 14px;border-radius:9999px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:2.5px;margin-bottom:8px;">
            📍 Proposta de Viagem
          </div>
          ${(quote as any).trip_title ? `
            <h1 style="font-size:32px;font-weight:800;color:${C.textT};margin:0 0 2px;letter-spacing:-1px;line-height:1.05;">${(quote as any).trip_title}</h1>
            <p style="font-size:17px;font-weight:600;color:${C.mutedT};margin:0 0 4px;">${quote.destination}</p>
          ` : `
            <h1 style="font-size:32px;font-weight:800;color:${C.textT};margin:0 0 2px;letter-spacing:-1px;line-height:1.05;">${quote.destination}</h1>
          `}
          <p style="font-size:14px;color:${C.mutedT};margin-top:4px;">
            Preparado especialmente para <strong style="color:${C.textT};">${quote.client_name}</strong>
          </p>
        </div>

        <!-- Overview -->
        <div class="pdf-block overview-card" style="background:#ffffff;border:1px solid ${C.border};border-radius:16px;padding:14px 18px;margin-bottom:18px;display:grid;grid-template-columns:repeat(3,1fr);gap:14px;box-shadow:0 1px 2px rgba(0,0,0,0.04);">
          <div>
            <p style="font-size:11px;color:${C.faint};text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;font-weight:700;">📍 Destino</p>
            <p style="font-size:14px;font-weight:700;color:${C.text};">${quote.destination}</p>
          </div>
          <div style="border-left:1px solid ${C.border};padding-left:18px;">
            <p style="font-size:11px;color:${C.faint};text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;font-weight:700;">📅 Período</p>
            <p style="font-size:14px;font-weight:700;color:${C.text};">${formatDate(quote.start_date)} — ${formatDate(quote.end_date)}</p>
            <p style="font-size:12px;color:${C.faint};margin-top:2px;">${days} dias</p>
          </div>
          <div style="border-left:1px solid ${C.border};padding-left:18px;">
            <p style="font-size:11px;color:${C.faint};text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;font-weight:700;">👥 Viajantes</p>
            <p style="font-size:14px;font-weight:700;color:${C.text};">${quote.adults_count} adulto${quote.adults_count > 1 ? "s" : ""}${quote.children_count > 0 ? ` + ${quote.children_count} criança${quote.children_count > 1 ? "s" : ""}` : ""}</p>
          </div>
        </div>

        <!-- Destination Intro (igual ao link público) -->
        ${(() => {
          const introText: string = (quote as any).destination_intro_text || "";
          const introImages: string[] = Array.isArray((quote as any).destination_intro_images)
            ? (quote as any).destination_intro_images
            : [];
          const hasText = !!introText.trim();
          const hasImages = introImages.length > 0;
          if (!hasText && !hasImages) return "";

          // PDF: APENAS a primeira imagem; layout 2 colunas (img 25% / texto 75%)
          const firstImg = hasImages ? introImages[0] : null;
          const safeText = hasText
            ? introText.replace(/</g, "&lt;").replace(/\n/g, "<br/>")
            : "";

          if (firstImg && hasText) {
            return `
              <div class="pdf-block destination-intro" style="margin-bottom:20px;">
                <table style="width:100%;border-collapse:separate;border-spacing:0;table-layout:fixed;">
                  <tr>
                    <td style="width:25%;vertical-align:top;padding:0 16px 0 0;">
                      <img src="${firstImg}" alt="${quote.destination}" style="width:100%;height:170px;object-fit:cover;border-radius:14px;border:1px solid ${C.border};display:block;" />
                    </td>
                    <td style="vertical-align:top;">
                      <p style="font-size:13px;color:${C.mutedT};line-height:1.6;margin:0;white-space:pre-wrap;word-break:break-word;text-align:left;">${safeText}</p>
                    </td>
                  </tr>
                </table>
              </div>
            `;
          }
          if (firstImg) {
            return `
              <div class="pdf-block destination-intro" style="margin-bottom:20px;border-radius:14px;overflow:hidden;border:1px solid ${C.border};">
                <img src="${firstImg}" alt="${quote.destination}" style="width:100%;max-height:240px;object-fit:cover;display:block;" />
              </div>
            `;
          }
          return `
            <div class="pdf-block destination-intro" style="margin-bottom:20px;">
              <p style="font-size:13px;color:${C.mutedT};line-height:1.6;margin:0;white-space:pre-wrap;word-break:break-word;">${safeText}</p>
            </div>
          `;
        })()}

        <!-- O que está incluso -->
        ${(() => {
          const items = resolveWhatsIncluded(quote);
          if (!items.length) return "";
          const cells = items
            .map((text) => {
              const emoji = INCLUDED_EMOJI[iconKeyForIncludedItem(text)] || "✨";
              const safe = String(text).replace(/</g, "&lt;");
              return `
                <td style="width:50%;vertical-align:top;padding:6px 8px;">
                  <div style="display:flex;align-items:flex-start;gap:8px;">
                    <span style="display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:999px;background:${C.tertiary};color:${C.primaryOnTertiary};font-size:13px;flex:0 0 auto;">${emoji}</span>
                    <span style="font-size:13px;color:${C.text};line-height:1.5;font-weight:500;">${safe}</span>
                  </div>
                </td>`;
            });
          // group in pairs of 2 columns
          const rows: string[] = [];
          for (let i = 0; i < cells.length; i += 2) {
            rows.push(`<tr>${cells[i] || ""}${cells[i + 1] || '<td style="width:50%"></td>'}</tr>`);
          }
          return `
            <div class="pdf-block whats-included" style="border:1px solid ${C.border};border-radius:16px;padding:18px 20px;margin-bottom:18px;background:#ffffff;box-shadow:0 1px 2px rgba(0,0,0,0.04);">
              <p style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:3px;color:${C.primary};margin:0 0 10px;">O que está incluso</p>
              <table style="width:100%;border-collapse:separate;border-spacing:0;table-layout:fixed;">${rows.join("")}</table>
            </div>
          `;
        })()}

        <!-- Services -->
        <div style="margin-bottom:18px;">
          <div class="pdf-title section-title" style="display:flex;align-items:center;gap:14px;margin-bottom:10px;">
            <div style="flex:1;height:1px;background:${C.border};"></div>
            <h3 style="font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:3px;color:${C.primary};margin:0;white-space:nowrap;">Serviços Incluídos</h3>
            <div style="flex:1;height:1px;background:${C.border};"></div>
          </div>
          ${servicesHtml || '<p style="text-align:center;color:${C.faintT};padding:32px;">Nenhum serviço adicionado</p>'}
        </div>

        <!-- Documentos anexados (logo após os serviços, como item integrado do roteiro) -->
        ${quoteDocuments.length > 0 ? `
          <div class="pdf-block quote-documents" style="border:1px solid ${C.border};border-radius:16px;margin-bottom:18px;background:#ffffff;overflow:hidden;box-shadow:0 1px 2px rgba(0,0,0,0.04);">
            <div style="display:flex;align-items:center;gap:10px;padding:14px 18px;background:linear-gradient(90deg,${C.tertiary},${C.tertiary});border-bottom:1px solid ${C.border};">
              <span style="display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:8px;background:#ffffff;font-size:14px;box-shadow:0 1px 2px rgba(0,0,0,0.05);">📎</span>
              <div style="flex:1;">
                <p style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:2.5px;color:${C.primaryOnTertiary};margin:0;">Anexos</p>
                <p style="font-size:14px;font-weight:700;color:${C.text};margin:1px 0 0;">Documentos do seu orçamento</p>
              </div>
              <span style="font-size:11px;color:${C.faint};">${quoteDocuments.length} ${quoteDocuments.length === 1 ? "arquivo" : "arquivos"}</span>
            </div>
            <table style="width:100%;border-collapse:collapse;">
              ${quoteDocuments.map((doc, idx) => `
                <tr style="${idx > 0 ? "border-top:1px solid ${C.border};" : ""}">
                  <td style="padding:12px 18px;vertical-align:middle;width:44px;">
                    <div style="width:36px;height:36px;border-radius:10px;background:${C.tertiary};display:inline-flex;align-items:center;justify-content:center;font-size:16px;">${emojiForDoc(doc.file_name, doc.file_type)}</div>
                  </td>
                  <td style="padding:12px 8px 12px 0;vertical-align:middle;">
                    <p style="font-size:13px;font-weight:600;color:${C.text};margin:0;word-break:break-word;">${(doc.file_name || "").replace(/</g, "&lt;")}</p>
                    ${doc.file_size ? `<p style="font-size:11px;color:${C.faint};margin:2px 0 0;">${formatDocSizePDF(doc.file_size)}</p>` : ""}
                  </td>
                  <td style="padding:12px 18px;vertical-align:middle;text-align:right;white-space:nowrap;">
                    ${doc.signedUrl ? `<a href="${doc.signedUrl}" target="_blank" rel="noopener" style="font-size:12px;font-weight:600;color:${C.primary};text-decoration:none;border:1px solid ${C.primary};border-radius:999px;padding:6px 12px;">Abrir</a>` : ""}
                  </td>
                </tr>
              `).join("")}
            </table>
          </div>
        ` : ""}

        <!-- Total -->
        ${(() => {
          const total = getEffectiveQuoteTotal(quote, quote.services as any);
          const mode = quote.payment_display_mode || "full_payment";
          const installments = quote.installments_count || 10;
          const entryPct = quote.entry_percentage || 0;
          const discountPct = quote.full_payment_discount_percent || 0;
          const methodLabel = formatPaymentMethodsInline(quote.payment_method_label) || "";

          let paymentHtml = "";
          if (mode === "installments") {
            const iv = total / (installments || 1);
            paymentHtml = `
              <p style="font-size:10px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;margin:0;line-height:1.3;color:${C.faint};">A partir de</p>
              <p style="font-size:24px;font-weight:700;letter-spacing:-0.5px;margin:6px 0 0;line-height:1.2;color:${C.primary};">${installments}x de ${formatCurrency(iv)}</p>
              <p style="font-size:12px;margin:6px 0 0;line-height:1.4;color:${C.faint};">Total: ${formatCurrency(total)}${methodLabel ? ` • ${methodLabel}` : ""} • sem juros</p>
            `;
          } else if (mode === "installments_with_entry") {
            const entryValue = total * (entryPct / 100);
            const remainder = total - entryValue;
            const iv = remainder / (installments || 1);
            paymentHtml = `
              <p style="font-size:10px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;margin:0;line-height:1.3;color:${C.faint};">Condição especial</p>
              <p style="font-size:20px;font-weight:700;letter-spacing:-0.5px;margin:6px 0 0;line-height:1.25;color:${C.primary};">Entrada de ${formatCurrency(entryValue)} + ${installments}x de ${formatCurrency(iv)}</p>
              <p style="font-size:12px;margin:6px 0 0;line-height:1.4;color:${C.faint};">Total: ${formatCurrency(total)}${methodLabel ? ` • ${methodLabel}` : ""}</p>
            `;
          } else if (mode === "total_only") {
            paymentHtml = `
              <p style="font-size:10px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;margin:0;line-height:1.3;color:${C.faint};">${packagePricing ? PACKAGE_TOTAL_LABEL : "Valor total da viagem"}</p>
              <p style="font-size:26px;font-weight:700;letter-spacing:-0.5px;margin:6px 0 0;line-height:1.2;color:${C.primary};">${formatCurrency(total)}</p>
            `;
          } else {
            const discountedTotal = total * (1 - discountPct / 100);
            paymentHtml = `
              <p style="font-size:10px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;margin:0;line-height:1.3;color:${C.faint};">${packagePricing ? PACKAGE_TOTAL_LABEL : "Investimento"}</p>
              <p style="font-size:26px;font-weight:700;letter-spacing:-0.5px;margin:6px 0 0;line-height:1.2;color:${C.primary};">${formatCurrency(discountedTotal)}</p>
              ${discountPct > 0 ? `<p style="font-size:12px;text-decoration:line-through;margin:4px 0 0;line-height:1.3;color:${C.faint};">${formatCurrency(total)}</p><p style="font-size:12px;margin:4px 0 0;line-height:1.3;color:${C.primary};font-weight:600;">${discountPct}% de desconto${methodLabel ? ` via ${methodLabel}` : ""}</p>` : ""}
              ${discountPct === 0 && methodLabel ? `<p style="font-size:12px;margin:6px 0 0;line-height:1.4;color:${C.faint};">${methodLabel}</p>` : ""}
            `;
          }

          if (quote.show_investment_section === false) return '';
          // Respeita a mesma regra do link público: quando o total do
          // investimento está oculto, não renderiza o bloco de total no PDF.
          // No modo consolidado o total é sempre apresentado ao cliente.
          if ((quote as any).hide_investment_total === true
            && getInvestmentPresentationLayout(quote) !== 'consolidated') return '';

          return `
            <div class="pdf-block investment-card" style="background:#ffffff;border:1px solid ${C.border};border-radius:16px;padding:20px 24px;margin-bottom:16px;text-align:center;box-shadow:0 1px 2px rgba(0,0,0,0.04);">
              ${paymentHtml}
              ${quote.services && quote.services.length > 0 ? `<p style="font-size:10px;margin:10px 0 0;line-height:1.3;color:${C.faint};">${quote.services.length} serviço${quote.services.length > 1 ? "s" : ""} incluído${quote.services.length > 1 ? "s" : ""}</p>` : ""}
            </div>
          `;
        })()}

        <!-- Payment Terms -->
        ${quote.show_investment_section !== false && quote.payment_terms ? `
          <div class="pdf-block payment-terms" style="border:1px solid ${C.border};border-radius:20px;padding:22px 24px;margin-bottom:20px;background:#ffffff;box-shadow:0 1px 2px rgba(0,0,0,0.04);">
            <p style="font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:3px;color:${C.primary};margin-bottom:10px;">💳 Condições de Pagamento</p>
            <p style="font-size:13px;color:${C.mutedT};line-height:1.6;white-space:pre-wrap;">${quote.payment_terms}</p>
          </div>
        ` : ""}

        <!-- Validity -->
        <p style="text-align:center;font-size:12px;color:${C.faintT};margin:8px 0 16px;">
          ${quote.valid_until ? `Proposta válida até ${formatDate(quote.valid_until)}` : ""}
          ${quote.validity_disclaimer ? `<br/>${quote.validity_disclaimer}` : (quote.valid_until ? " Valores sujeitos a alteração conforme disponibilidade." : "")}
        </p>

        <!-- Agent Signature -->
        ${generateAgentSignature(profile || null)}

        <!-- Footer -->
        <div style="text-align:center;padding-top:20px;">
          <p style="font-size:10px;color:${C.faintT};">
            Gerado em ${format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })} • Agentes de Sonhos
          </p>
        </div>
        </div>
      </div>
    </body>
    </html>
  `;

  if (!printWindow) {
    // Popup bloqueado pelo navegador: nunca dispara impressão vazia.
    return { printed: false as const, reason: "popup-blocked" as const };
  }
  if (printWindow.closed) {
    return { printed: false as const, reason: "window-closed" as const };
  }

  const doc = printWindow.document;
  // Substituição INTEGRAL do documento: o aviso de carregamento é descartado
  // aqui, então nunca aparece no PDF.
  doc.open();
  doc.write(html);
  doc.close();

  // Esperas com prazo e vigiando a janela: os timers são do opener, de modo
  // que fechar o popup nunca deixa a promise pendurada.
  const waitWithDeadline = (attach: (done: () => void) => void, timeoutMs = 10000) =>
    new Promise<void>((resolve) => {
      let settled = false;
      const done = () => {
        if (settled) return;
        settled = true;
        window.clearInterval(watch);
        window.clearTimeout(timer);
        resolve();
      };
      const watch = window.setInterval(() => {
        if (printWindow.closed) done();
      }, 200);
      const timer = window.setTimeout(done, timeoutMs);
      try {
        attach(done);
      } catch {
        done();
      }
    });

  if (doc.readyState !== "complete") {
    await waitWithDeadline((done) => printWindow.addEventListener("load", done, { once: true }));
  }
  if (printWindow.closed) {
    return { printed: false as const, reason: "window-closed" as const };
  }
  try {
    await Promise.race([
      (doc as any).fonts?.ready ?? Promise.resolve(),
      waitWithDeadline(() => {}, 5000),
    ]);
  } catch {}
  if (printWindow.closed) {
    return { printed: false as const, reason: "window-closed" as const };
  }
  try {
    await Promise.all(
      Array.from(doc.images || []).map((img) =>
        img.complete
          ? Promise.resolve()
          : waitWithDeadline((done) => {
              img.addEventListener("load", done, { once: true });
              img.addEventListener("error", done, { once: true });
            }),
      ),
    );
  } catch {}

  if (printWindow.closed) {
    return { printed: false as const, reason: "window-closed" as const };
  }
  try {
    printWindow.focus();
  } catch {}
  printWindow.print();
  return { printed: true as const };


}