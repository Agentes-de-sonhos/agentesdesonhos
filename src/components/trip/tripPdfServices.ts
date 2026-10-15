/**
 * Corpo imprimível (PDF da Carteira Digital) de Passagem, Hospedagem e Locação,
 * com a mesma identidade dos cards públicos. Reaproveita as funções puras de
 * apresentação/dados dos cards; nenhum controle interativo vai para o PDF.
 */
import type { TripService, TripFlightData, TripHotelData, TripCarRentalData } from "@/types/trip";
import { publicFlightRoute, publicFlightSegments } from "@/lib/publicWalletFlight";
import { publicAirportText } from "@/lib/airportDisplay";
import { hotelDate, hotelNights } from "@/components/wallet/PublicHotelCard";
import { carTransmissionLabel } from "@/components/wallet/PublicCarRentalCard";
import { googleDirectionsUrl } from "@/lib/mapLinks";
import { formatPublicShortDate, type PublicLocale } from "@/i18n/publicMaterials/locale";
import { tWallet } from "@/i18n/publicMaterials/wallet";
import { tPublicFlight } from "@/i18n/publicMaterials/flights";
import { tPublicHotel } from "@/i18n/publicMaterials/hotels";
import { tPublicCar } from "@/i18n/publicMaterials/cars";

export function esc(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
export const webUrl = (v?: string | null) => (v && /^https?:\/\//i.test(v.trim()) ? v.trim() : undefined);

/* ── Ícones vetoriais imprimíveis (traço, sem emoji) ── */
const ICONS: Record<string, string> = {
  plane: '<path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>',
  bed: '<path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/>',
  car: '<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  luggage: '<rect x="6" y="7" width="12" height="13" rx="2"/><path d="M9 7V4h6v3M10 20v1M14 20v1"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
  pin: '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M9 13h6M9 17h6"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z"/>',
  ticket: '<path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z"/>',
  ship: '<path d="M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M19.4 14.6 21 12l-9-4-9 4 1.6 2.6M12 2v6"/>',
  route: '<circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/>',
  train: '<rect x="4" y="3" width="16" height="16" rx="2"/><path d="M4 11h16M12 3v8M8 19l-2 3M16 19l2 3"/>',
  box: '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>',
  phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
};
export function icon(name: string, size = 14, color = "currentColor"): string {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;vertical-align:-2px;">${ICONS[name] || ICONS.box}</svg>`;
}

const fmtShort = (v: string | undefined, locale: PublicLocale) => (v ? formatPublicShortDate(v, locale) || v : "");
const text = (v: unknown) => `<span class="pre">${esc(v)}</span>`;

/** Bloco pequeno e indivisível (card com título). `ctx` = contexto do serviço em continuação. */
export function panel(title: string, iconName: string, inner: string, opts: { ctx?: string; tone?: "amber" | "default" } = {}): string {
  if (!inner.trim()) return "";
  const amber = opts.tone === "amber";
  return `<section class="pdf-panel${amber ? " amber" : ""}">
    <h4 class="panel-title"><span class="ico${amber ? " ico-amber" : ""}">${icon(iconName, 13)}</span><span class="panel-label">${esc(title)}</span>${opts.ctx ? `<span class="ctx">${esc(opts.ctx)}</span>` : ""}</h4>
    ${inner}
  </section>`;
}
export function rows(list: Array<[string | undefined | null, unknown]>): string {
  return list.filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== "")
    .map(([l, v]) => `<p class="row">${l ? `<strong>${esc(l)}:</strong> ` : ""}${text(v)}</p>`).join("");
}
function statusChip(label: string | undefined | null, positive: boolean): string {
  if (!label) return "";
  return `<span class="chip ${positive ? "chip-ok" : ""}">${positive ? icon("check", 11) : ""}${esc(label)}</span>`;
}
function titleRow(title: string, chip: string, sub = ""): string {
  return `<div class="svc-title-row"><h3 class="svc-title">${title}</h3>${chip}</div>${sub}`;
}
function codeBox(items: Array<[string, string | undefined | null]>): string {
  const list = items.filter(([, v]) => v);
  if (!list.length) return "";
  return `<div class="code-box">${list.map(([l, v], i) => `<div class="code-item${i ? " code-sep" : ""}"><p class="code-label">${esc(l)}</p><p class="${i ? "code-val-sm" : "code-val"}">${esc(v)}</p></div>`).join("")}</div>`;
}
function banner(src: string | undefined, cls = "banner"): string {
  return src ? `<div class="${cls}"><img src="${esc(src)}" alt="" /></div>` : "";
}
function dateBig(d: Date | null, locale: PublicLocale) {
  if (!d) return "";
  const m = new Intl.DateTimeFormat(locale, { month: "short" }).format(d).replace(/\.$/, "");
  return `<p class="date-big">${String(d.getDate()).padStart(2, "0")} ${esc(m)}</p><p class="muted">${d.getFullYear()}</p>`;
}

export interface PdfServiceContext {
  images: string[];
  locale: PublicLocale;
}

/* ═════════════ PASSAGEM ═════════════ */
export function renderFlightPdf(service: TripService, ctx: PdfServiceContext): { head: string; body: string; label: string } {
  const { locale } = ctx;
  const t = tWallet(locale), tf = tPublicFlight(locale);
  const data = service.service_data as Partial<TripFlightData> & Record<string, any>;
  const route = publicFlightRoute(data);
  const segments = publicFlightSegments(data);
  const dates = Array.from(new Set(segments.map((s) => fmtShort(s.flight_date, locale)).filter(Boolean)));
  const st = data.flight_status;
  const stLabel = st === "emitido" ? t("stEmitido") : st === "confirmado" ? t("stConfirmado") : st === "pendente" ? t("stPendente") : st;
  const routeTitle = `${esc(route.origin || "—")} <span class="accent">${route.roundTrip ? "⇄" : "→"}</span> ${esc(route.destination || "—")}`;
  const label = [route.origin, route.destination].filter(Boolean).join(route.roundTrip ? " ⇄ " : " → ");

  const head = banner(ctx.images[0], "banner banner-low")
    + titleRow(routeTitle, statusChip(stLabel, st === "emitido"),
      dates.length ? `<p class="svc-sub">${icon("calendar", 13)} ${esc(dates.join(" · "))}</p>` : "")
    + codeBox([[t("fldLocalizador"), data.locator_code]]);

  const segHtml = segments.map((seg) => {
    const kind = seg.segment_type === "volta" ? t("segVolta") : seg.segment_type === "conexao" ? t("segConexao") : t("fldIda");
    const airline = [seg.airline || data.main_airline || data.airline, seg.flight_number].filter(Boolean).join(" · ");
    const end = (code?: string, name?: string, city?: string, time?: string, align = "left") =>
      `<div class="seg-end" style="text-align:${align};"><p class="seg-time">${esc(time || "—")}</p><p class="seg-code">${esc(code || "")}</p><p class="muted seg-city">${esc(city || publicAirportText({ code, customName: name, city }) || "")}</p></div>`;
    const extra = [seg.terminal ? `${t("fldTerminal")} ${seg.terminal}` : "", (seg as any).gate ? `${t("fldPortao")} ${(seg as any).gate}` : ""].filter(Boolean).join(" · ");
    return `<section class="pdf-panel seg">
      <div class="seg-top"><span class="tag">${esc(kind)}${seg.flight_date ? ` · ${esc(fmtShort(seg.flight_date, locale))}` : ""}</span><span class="seg-airline">${esc(airline)}</span></div>
      <table class="seg-grid"><tr>
        <td class="seg-col">${end(seg.origin_airport, (seg as any).origin_airport_name, seg.origin_city, seg.departure_time)}</td>
        <td class="seg-mid"><div class="track"><span class="dot"></span><span class="dash"></span><span class="plane">${icon("plane", 22, "#0891b2")}</span><span class="dash"></span><span class="dot"></span></div></td>
        <td class="seg-col">${end(seg.destination_airport, (seg as any).destination_airport_name, seg.destination_city, seg.arrival_time, "right")}</td>
      </tr></table>
      ${extra ? `<p class="muted small">${esc(extra)}</p>` : ""}
    </section>`;
  }).join("") || `<p class="muted">${esc(tf("noSegments"))}</p>`;

  const pax = (data.passengers || []).filter((p: any) => p?.name);
  const paxHtml = pax.length ? panel(t("sectionPassageirosPerson"), "users", `<ul class="list">${pax.map((p: any) => {
    const meta = [p.ticket_number || p.document ? `${tf("ticket")}: ${p.ticket_number || p.document}` : "", p.seat ? `${t("fldAssento")} ${p.seat}` : "", p.loyalty ? `${tf("loyalty")}: ${p.loyalty}` : "", p.notes].filter(Boolean);
    return `<li>${icon("user", 13, "#64748b")}<div><p class="strong">${esc(p.name)}</p>${meta.length ? `<p class="muted pre">${esc(meta.join(" · "))}</p>` : ""}</div></li>`;
  }).join("")}</ul>`, { ctx: label }) : "";

  const bagCols = [[t("fldMao"), data.carry_on], [t("fldDespachada"), data.checked_baggage]].filter(([, v]) => v);
  const bagExtra = rows([[t("fldExtra"), data.extra_baggage], [t("fldObservacoes"), data.baggage_notes], ["", data.baggage_rules]]);
  const bagHtml = (bagCols.length || bagExtra) ? panel(tf("baggage"), "luggage",
    (bagCols.length ? `<table class="cols"><tr>${bagCols.map(([l, v]) => `<td><p class="code-label">${esc(l)}</p><p class="strong pre">${esc(v)}</p></td>`).join("")}</tr></table>` : "") + bagExtra, { ctx: label }) : "";

  const boarding = rows([
    [t("fldAntecedencia"), data.recommended_arrival], [t("fldTerminal"), data.boarding_terminal],
    [t("fldDocumentosField"), data.required_documents], [t("fldImigracao"), data.immigration_rules],
    [t("fldObservacoes"), data.boarding_notes], [t("fldObservacoes"), data.notes && data.notes !== data.boarding_notes ? data.notes : ""],
  ]);
  const checkin = webUrl(data.checkin_url)
    ? `<p class="row"><a href="${esc(webUrl(data.checkin_url))}">${icon("link", 12)} ${esc(t("ctaCheckinOnline"))}</a>${data.checkin_open_date ? ` <span class="muted">· ${esc(t("fldAbertura"))}: ${esc(data.checkin_open_date)}</span>` : ""}</p>` : "";
  const boardHtml = (boarding || checkin) ? panel(t("sectionOrientacoesEmbarque"), "info", boarding + checkin, { ctx: label, tone: "amber" }) : "";

  return { head, body: segHtml + paxHtml + bagHtml + boardHtml, label };
}

/* ═════════════ HOSPEDAGEM ═════════════ */
export function renderHotelPdf(service: TripService, ctx: PdfServiceContext): { head: string; body: string; label: string } {
  const { locale } = ctx;
  const t = tWallet(locale), th = tPublicHotel(locale);
  const data = service.service_data as Partial<TripHotelData> & Record<string, any>;
  const arrival = hotelDate(data.check_in), departure = hotelDate(data.check_out);
  const nights = hotelNights(data.check_in, data.check_out);
  const st = data.reservation_status;
  const stLabel = st === "emitida" ? t("stEmitido") : st === "confirmada" ? t("stConfirmado") : st === "pre_reserva" ? t("hotelStatusPreReserva").replace(/^\S+\s/, "") : st;
  const label = data.hotel_name || t("serviceHotel");
  const stars = /^[1-5]$/.test(String(data.hotel_category || "")) ? "★".repeat(Number(data.hotel_category))
    : data.hotel_category ? ({ boutique: t("catBoutique"), resort: t("catResort"), pousada: t("catPousada") } as Record<string, string>)[data.hotel_category] || data.hotel_category : "";
  const place = [data.city, data.country].filter(Boolean).join(", ");
  const sub = (stars ? `<p class="stars">${esc(stars)}</p>` : "") + (place ? `<p class="svc-sub">${icon("pin", 13)} ${esc(place)}</p>` : "");
  const extraThumbs = ctx.images.slice(1, 4);

  const inT = data.checkin_time || data.check_in_time, outT = data.checkout_time || data.check_out_time;
  const datesCard = (arrival || departure || inT || outT) ? `<section class="pdf-panel dates"><table class="dates-grid"><tr>
    <td><p class="code-label">${icon("calendar", 12, "#0891b2")} Check-in</p>${dateBig(arrival, locale)}${inT ? `<p class="muted">${esc(inT)}</p>` : ""}</td>
    <td class="dates-mid">${nights !== null ? `<span class="pill">${icon("moon", 12)} ${nights} ${esc(t(nights === 1 ? "nightsLabelOne" : "nightsLabelOther"))}</span>` : ""}</td>
    <td><p class="code-label">${icon("calendar", 12, "#0891b2")} Check-out</p>${dateBig(departure, locale)}${outT ? `<p class="muted">${esc(outT)}</p>` : ""}</td>
  </tr></table></section>` : "";

  const head = banner(ctx.images[0], "banner banner-hotel")
    + (extraThumbs.length ? `<div class="thumbs">${extraThumbs.map((s) => `<img src="${esc(s)}" alt="" />`).join("")}</div>` : "")
    + titleRow(esc(data.hotel_name || t("serviceHotel")), statusChip(stLabel, st === "emitida"), sub)
    + datesCard
    + codeBox([[th("reservation"), data.reservation_number || data.reservation_code], [t("fldLocalizador"), data.locator_code]]);

  const roomTypes: Record<string, string> = { standard: t("roomStandard"), superior: t("roomSuperior"), deluxe: t("roomDeluxe"), suite: t("roomSuite"), suite_junior: t("roomSuiteJunior"), presidencial: t("roomPresidencial"), apartamento: t("roomApartamento"), villa: t("roomVilla"), bangalo: t("roomBangalo") };
  const meals: Record<string, string> = { somente_hospedagem: t("mealSomenteHospedagem"), cafe_manha: t("mealCafeManha"), meia_pensao: t("mealMeiaPensao"), pensao_completa: t("mealPensaoCompleta"), all_inclusive: t("mealAllInclusive") };
  const beds: Record<string, string> = { king: t("bedKing"), queen: t("bedQueen"), twin: t("bedTwin"), single: t("bedSingle"), double: t("bedDouble"), triple: t("bedTriple") };
  const option = (v?: string) => v === "sim" ? t("statusIncluso") : v === "mediante_taxa" ? t("statusMedianteTaxa") : v === "sob_consulta" ? t("statusSobConsulta") : v === "nao" ? t("statusNaoDisponivel") : v;
  const guests = (data.guests || []).filter((g: any) => g?.name);
  const rooms = data.room_count || data.rooms;
  const accom = rows([
    [t("fldHospedes"), data.guest_count], [th("rooms"), rooms],
    [t("fldAcomodacao"), data.room_type ? roomTypes[data.room_type] || data.room_type : ""],
    [t("fldCama"), data.bed_type ? beds[data.bed_type] || data.bed_type : ""],
    [t("fldRegime"), data.meal_plan ? meals[data.meal_plan] || data.meal_plan : ""],
    ["", data.breakfast_included === "sim" ? th("breakfast") : ""],
  ]) + (guests.length ? `<ul class="list">${guests.map((g: any) => `<li>${icon("user", 13, "#64748b")}<div><p class="strong">${esc(g.name)}</p>${[g.age, g.notes].filter(Boolean).length ? `<p class="muted pre">${esc([g.age, g.notes].filter(Boolean).join(" · "))}</p>` : ""}</div></li>`).join("")}</ul>` : "");
  const accomHtml = panel(th("accommodation"), "bed", accom, { ctx: label });

  const maps = webUrl(data.maps_url) || (data.address ? googleDirectionsUrl({ address: data.address, name: data.hotel_name } as any) : undefined);
  const site = webUrl(data.hotel_website);
  const links = [maps ? `<a href="${esc(maps)}">${icon("pin", 12)} ${esc(th("directions"))}</a>` : "", site ? `<a href="${esc(site)}">${icon("link", 12)} ${esc(th("website"))}</a>` : ""].filter(Boolean).join("");
  const loc = rows([["", data.address], ["", data.hotel_phone ? `${data.hotel_phone}` : ""], ["", data.hotel_email]]) + (links ? `<p class="links">${links}</p>` : "");
  const locHtml = panel(th("location"), "pin", loc, { ctx: label });

  const facts: Array<[string, unknown]> = [
    [t("fldTitular"), data.checkin_holder], [t("secCheckin"), data.checkin_instructions], [t("fldEarlyCheckin"), option(data.early_checkin)], [t("fldChegadaTardia"), data.late_arrival_policy],
    [t("fldLateCheckout"), option(data.late_checkout)], [t("fldTaxasDestino"), data.late_checkout_fee], [t("secCheckout"), data.checkout_instructions], [t("fldProcedimento"), data.checkout_procedure ? ({ recepcao: t("checkoutProcRecepcao"), express: t("checkoutProcExpress"), online: t("checkoutProcOnline") } as Record<string, string>)[data.checkout_procedure] || data.checkout_procedure : undefined],
    [th("cleaning"), data.cleaning_policy], [t("fldVista"), data.room_view], [t("fldAmenities"), data.amenities], [t("fldCafeDaManha"), data.breakfast_hours], [t("fldRestaurantes"), data.restaurants_included], [t("sectionAlimentacao"), data.food_notes], [t("fldAllInclusive"), data.all_inclusive_rules],
    [t("badgeWifi"), option(data.wifi_included)], [t("badgeEstacionamento"), option(data.parking_included)], [t("badgeTaxas"), option(data.taxes_included)], [t("badgeTransfer"), option(data.transfer_included)], [t("fldResortFee"), data.resort_fee], [t("secInclusosReserva"), data.other_inclusions],
    [t("fldCancelamento"), data.cancellation_policy], [t("fldAlteracao"), data.change_policy], [t("fldCriancas"), data.children_policy], [t("fldPets"), data.pet_policy], [t("fldTaxasDestino"), data.mandatory_fees], [t("fldCaucao"), data.hotel_deposit], [t("fldPagamento"), data.hotel_deposit_method], [t("fldSolicitacoes"), data.special_requests],
  ];
  const factVals = facts.map(([, v]) => v);
  const notes = Array.from(new Set([data.notes, data.agency_notes].filter((v): v is string => Boolean(v)))).filter((v) => !factVals.includes(v));
  const info = rows(facts) + notes.map((n) => `<p class="row">${text(n)}</p>`).join("");
  const infoHtml = panel(th("information"), "info", info, { ctx: label, tone: "amber" });

  return { head, body: accomHtml + locHtml + infoHtml, label };
}

/* ═════════════ LOCAÇÃO ═════════════ */
export function renderCarPdf(service: TripService, ctx: PdfServiceContext): { head: string; body: string; label: string } {
  const { locale } = ctx;
  const t = tWallet(locale), tc = tPublicCar(locale);
  const data = service.service_data as Partial<TripCarRentalData> & Record<string, any>;
  const model = data.car_model?.trim();
  const showSimilar = model && !/similar|similare/i.test(model);
  const st = data.reservation_status;
  const stLabel = st === "confirmada" ? tc("confirmed") : st === "emitida" ? tc("issued") : st === "a_retirar" ? tc("toPickup") : st;
  const label = model || tc("title");
  const transmission = carTransmissionLabel(data.transmission, locale);
  const days = hotelNights(data.pickup_date, data.dropoff_date);
  const facts = [
    transmission ? `${icon("car", 13, "#0891b2")} ${esc(transmission)}` : "",
    data.passenger_capacity ? `${icon("users", 13, "#0891b2")} ${esc(/^\d+$/.test(String(data.passenger_capacity).trim()) ? tc("passengers", { n: String(data.passenger_capacity).trim() }) : data.passenger_capacity)}` : "",
    days !== null ? `${icon("calendar", 13, "#0891b2")} ${esc(days === 1 ? tc("day") : tc("days", { n: String(days) }))}` : "",
  ].filter(Boolean);
  const img = ctx.images[0];
  const head = (img ? `<div class="banner banner-low rel"><img src="${esc(img)}" alt="" /><span class="illus">${esc(tc("illustrative"))}</span></div>` : "")
    + titleRow(esc(model ? `${model}${showSimilar ? ` ${tc("similar")}` : ""}` : tc("title")), statusChip(stLabel, st === "confirmada" || st === "emitida"),
      data.rental_company ? `<p class="company">${esc(data.rental_company)}</p>` : "")
    + (facts.length ? `<p class="facts">${facts.map((f) => `<span>${f}</span>`).join("")}</p>` : "")
    + codeBox([[tc("reservation"), data.reservation_code]]);

  const place = (p: boolean) => {
    const date = hotelDate(p ? data.pickup_date : data.dropoff_date);
    const time = p ? data.pickup_time : data.dropoff_time;
    const name = p ? data.pickup_location : data.dropoff_location;
    const address = p ? data.pickup_address : data.dropoff_address;
    const city = [p ? data.pickup_city : data.dropoff_city, p ? data.pickup_country : data.dropoff_country].filter(Boolean).join(", ");
    const extra = p ? rows([[t("fldTerminal"), data.pickup_terminal], ["", data.pickup_phone]]) : rows([["", data.dropoff_late_policy]]);
    if (!date && !time && !name && !address && !city && !extra) return "";
    const query = [name, address, city].filter(Boolean).join(", ");
    const dir = (p ? webUrl(data.pickup_maps_url) : undefined) || ((address || name) ? googleDirectionsUrl({ address: query, name } as any) : null);
    const when = date ? `${String(date.getDate()).padStart(2, "0")} ${new Intl.DateTimeFormat(locale, { month: "short" }).format(date).replace(/\.$/, "")} ${date.getFullYear()}` : "";
    return `<td class="place"><section class="pdf-panel">
      <p class="code-label">${esc(p ? tc("pickup") : tc("dropoff"))}</p>
      ${(when || time) ? `<p><span class="date-big">${esc(when)}</span>${time ? ` <span class="time">${esc(time)}</span>` : ""}</p>` : ""}
      ${name ? `<p class="strong">${esc(name)}</p>` : ""}${(address || city) ? `<p class="muted">${esc([address, city].filter(Boolean).join(" · "))}</p>` : ""}
      ${extra}${dir ? `<p class="links"><a href="${esc(dir)}">${icon("pin", 12)} ${esc(tc("directions"))}</a></p>` : ""}
    </section></td>`;
  };
  const pu = place(true), dr = place(false);
  const places = (pu || dr) ? `<table class="places"><tr>${pu}${dr}</tr></table>` : "";

  const insurance = (data.deductible ? `<p class="row"><strong>${esc(tc("deductible"))}:</strong> <span class="pill">${esc(data.deductible)}</span></p>` : "")
    + rows([[t("fldBasico"), data.basic_insurance], [t("fldTotalCdwLdw"), data.full_insurance], [t("fldTerceiros"), data.third_party_protection], [t("fldRoubo"), data.theft_protection], [t("fldDanos"), data.damage_protection], ["", data.insurance_coverage], ["", data.insurance_notes]]);
  const drivers = (data.drivers || []).filter((d: any) => d?.name?.trim());
  const driversHtml = drivers.length ? panel(tc("drivers"), "users", `<ul class="list">${drivers.map((d: any) => `<li>${icon("user", 13, "#64748b")}<div><p class="strong">${esc(d.name)}</p>${[d.age, d.notes].filter(Boolean).length ? `<p class="muted pre">${esc([d.age, d.notes].filter(Boolean).join(" · "))}</p>` : ""}</div></li>`).join("")}</ul>`, { ctx: label }) : "";
  const vehicle = rows([[t("fldCombustivel"), data.fuel_type], [t("wordPortas"), data.doors], [t("sectionBagagem"), data.luggage_capacity], [t("fldPlaca"), data.plate], ["", data.car_type && data.car_type !== model ? data.car_type : ""]]);
  const deposit = rows([[t("fldCaucao"), data.deposit_amount], [t("fldForma"), data.deposit_method], [t("fldCartaoNomeCondutor"), data.card_in_driver_name], [t("fldPagamento"), data.payment_status || data.payment_method]]);
  const fuelPolicy = data.fuel_policy === "cheio_cheio" ? t("fuelPolicyCheioCheio") : data.fuel_policy === "cheio_vazio" ? t("fuelPolicyCheioVazio") : data.fuel_policy;
  const fuel = rows([[t("fldPolitica"), fuelPolicy], ["", data.fuel_rules], [t("fldPenalidade"), data.fuel_penalty], ["", data.fuel_notes]]);
  const guidance = rows([[tc("pickup"), data.pickup_instructions], [tc("dropoff"), data.dropoff_instructions], [t("fldDocumentos"), data.required_documents], [t("fldIdadeMinima"), data.minimum_age], [t("fldPidPermissao"), data.international_permit], ["", data.traffic_rules], [t("fldEmergenciaSos"), data.emergency_contact], ["", data.agency_contact], ["", data.additional_driver_fee], ["", data.car_notes], ["", data.notes]]);

  const body = places
    + panel(tc("insurance"), "shield", insurance, { ctx: label })
    + driversHtml
    + panel(tc("vehicle"), "car", vehicle, { ctx: label })
    + panel(tc("deposit"), "file", deposit, { ctx: label })
    + panel(tc("fuel"), "info", fuel, { ctx: label })
    + panel(tc("guidance"), "info", guidance, { ctx: label, tone: "amber" });
  return { head, body, label };
}

/** Nome amigável do botão de documento por categoria. */
export function documentCta(type: string, locale: PublicLocale): string {
  if (type === "flight") return tPublicFlight(locale)("openPdf");
  if (type === "hotel") return tPublicHotel(locale)("openVoucher");
  if (type === "car_rental") return tPublicCar(locale)("openVoucher");
  return "";
}
export function documentsTitle(type: string, locale: PublicLocale): string {
  if (type === "flight") return tPublicFlight(locale)("documents");
  if (type === "hotel") return tPublicHotel(locale)("documents");
  if (type === "car_rental") return tPublicCar(locale)("documents");
  return tWallet(locale)("fldDocumentos");
}
