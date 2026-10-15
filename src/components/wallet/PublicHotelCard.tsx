import { useState, type ReactNode } from "react";
import { BedDouble, CalendarDays, CheckCircle2, Check, Copy, MapPin, Moon, Users, Coffee, Phone, ExternalLink, Navigation, FileText, ChevronDown, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { FormattedText } from "@/components/ui/formatted-text";
import { ServiceImageCarousel } from "@/components/quote/ServiceImageCarousel";
import { PlaceMapCard } from "@/components/shared/PlaceMapCard";
import { ServiceDocumentsCard, type ServiceDocumentsAccess } from "./ServiceDocumentsCard";
import { resolveServicePlaceId } from "@/lib/serviceImages";
import { googleDirectionsUrl, hasCoordinates, type MapPoint } from "@/lib/mapLinks";
import { parseLocalDate, type PublicLocale } from "@/i18n/publicMaterials/locale";
import { tWallet } from "@/i18n/publicMaterials/wallet";
import { tPublicHotel } from "@/i18n/publicMaterials/hotels";
import type { TripService, TripHotelData } from "@/types/trip";
import { toast } from "sonner";

type HotelData = Partial<TripHotelData> & MapPoint & { locator_code?: string; reservation_number?: string; room_count?: string | number; rooms?: string | number; check_in_time?: string; check_out_time?: string };

export function hotelDate(value?: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = parseLocalDate(value);
  if (!parsed) return null;
  const [year, month, day] = value.split("-").map(Number);
  return parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day ? parsed : null;
}
export function hotelNights(start?: string, end?: string) {
  const a = hotelDate(start), b = hotelDate(end);
  if (!a || !b) return null;
  const nights = Math.round((b.getTime() - a.getTime()) / 86400000);
  return nights > 0 ? nights : null;
}
function Panel({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return <section className="rounded-2xl border border-border bg-card p-4 sm:p-5"><h3 className="mb-3 flex items-center gap-3 text-base font-bold"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">{icon}</span>{title}</h3>{children}</section>;
}
function webUrl(value?: string) { return value && /^https?:\/\//i.test(value) ? value : undefined; }

export function PublicHotelCard({ service, access, locale = "pt-BR" }: { service: TripService; access: ServiceDocumentsAccess; locale?: PublicLocale }) {
  const data = service.service_data as HotelData;
  const t = tWallet(locale), th = tPublicHotel(locale);
  const [copied, setCopied] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const images = service.image_urls?.length ? service.image_urls : service.image_url ? [service.image_url] : [];
  const arrival = hotelDate(data.check_in), departure = hotelDate(data.check_out);
  const nights = hotelNights(data.check_in, data.check_out);
  const reservation = data.reservation_number || data.reservation_code;
  const locator = data.locator_code;
  const point = { latitude: data.latitude, longitude: data.longitude, address: data.address, name: data.hotel_name, placeId: resolveServicePlaceId(service) };
  const hasLocation = Boolean(data.address || hasCoordinates(point) || point.placeId || webUrl(data.maps_url));
  const directions = hasLocation ? webUrl(data.maps_url) || googleDirectionsUrl(point) : undefined;
  const phone = data.hotel_phone?.replace(/[^\d+]/g, "");
  const website = webUrl(data.hotel_website);
  const roomTypes: Record<string, string> = { standard: t("roomStandard"), superior: t("roomSuperior"), deluxe: t("roomDeluxe"), suite: t("roomSuite"), suite_junior: t("roomSuiteJunior"), presidencial: t("roomPresidencial"), apartamento: t("roomApartamento"), villa: t("roomVilla"), bangalo: t("roomBangalo") };
  const meals: Record<string, string> = { somente_hospedagem: t("mealSomenteHospedagem"), cafe_manha: t("mealCafeManha"), meia_pensao: t("mealMeiaPensao"), pensao_completa: t("mealPensaoCompleta"), all_inclusive: t("mealAllInclusive") };
  const beds: Record<string, string> = { king: t("bedKing"), queen: t("bedQueen"), twin: t("bedTwin"), single: t("bedSingle"), double: t("bedDouble"), triple: t("bedTriple") };
  const option = (value?: string) => value === "sim" ? t("statusIncluso") : value === "mediante_taxa" ? t("statusMedianteTaxa") : value === "sob_consulta" ? t("statusSobConsulta") : value === "nao" ? t("statusNaoDisponivel") : value;
  const facts = [
    [t("fldTitular"), data.checkin_holder], [t("secCheckin"), data.checkin_instructions], [t("fldEarlyCheckin"), option(data.early_checkin)], [t("fldChegadaTardia"), data.late_arrival_policy],
    [t("fldLateCheckout"), option(data.late_checkout)], [t("fldTaxasDestino"), data.late_checkout_fee], [t("secCheckout"), data.checkout_instructions], [t("fldProcedimento"), data.checkout_procedure ? ({ recepcao: t("checkoutProcRecepcao"), express: t("checkoutProcExpress"), online: t("checkoutProcOnline") }[data.checkout_procedure] || data.checkout_procedure) : undefined],
    [th("cleaning"), data.cleaning_policy], [t("fldVista"), data.room_view], [t("fldAmenities"), data.amenities], [t("fldCafeDaManha"), data.breakfast_hours], [t("fldRestaurantes"), data.restaurants_included], [t("sectionAlimentacao"), data.food_notes], [t("fldAllInclusive"), data.all_inclusive_rules],
    [t("badgeWifi"), option(data.wifi_included)], [t("badgeEstacionamento"), option(data.parking_included)], [t("badgeTaxas"), option(data.taxes_included)], [t("badgeTransfer"), option(data.transfer_included)], [t("fldResortFee"), data.resort_fee], [t("secInclusosReserva"), data.other_inclusions],
    [t("fldCancelamento"), data.cancellation_policy], [t("fldAlteracao"), data.change_policy], [t("fldCriancas"), data.children_policy], [t("fldPets"), data.pet_policy], [t("fldTaxasDestino"), data.mandatory_fees], [t("fldCaucao"), data.hotel_deposit], [t("fldPagamento"), data.hotel_deposit_method], [t("fldSolicitacoes"), data.special_requests],
  ].filter(([, value]) => value) as [string, string][];
  // Only discard exact duplicate free text; never parse or truncate ambiguous notes.
  const notes = Array.from(new Set([data.notes, data.agency_notes].filter((v): v is string => Boolean(v)))).filter(value => !facts.some(([, fact]) => fact === value));
  const guests = data.guests || [];
  const rooms = data.room_count || data.rooms;
  const hasAccommodation = Boolean(data.guest_count || guests.length || rooms || data.room_type || data.bed_type || data.meal_plan || data.breakfast_included);
  const copy = async (label: string, value: string) => {
    try { await navigator.clipboard.writeText(value); setCopied(label); toast.success(th("copied")); } catch { toast.error(th("copyError")); }
  };
  const dateColumn = (label: string, value: Date | null, time?: string) => value || time ? <div className="min-w-0 text-center"><p className="mb-2 flex items-center justify-center gap-1.5 text-[11px] font-semibold uppercase text-muted-foreground"><CalendarDays className="h-4 w-4 shrink-0 text-primary" />{label}</p>{value && <><p className="text-xl font-bold uppercase leading-tight sm:text-2xl">{new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short" }).format(value)}</p><p className="mt-1 text-sm text-muted-foreground">{value.getFullYear()}</p></>}{time && <p className="mt-1 text-sm text-muted-foreground">{time}</p>}</div> : null;

  return <article id={`service-${service.id}`} data-testid="public-hotel-card" className="wallet-hotel-theme min-w-0 space-y-4 text-sm leading-relaxed text-foreground [overflow-wrap:anywhere] sm:space-y-5">
    {images.length > 0 && <ServiceImageCarousel images={images} alt={data.hotel_name || t("serviceHotel")} placeId={point.placeId} hideFallback panoramic viewPhotosLabel={th("photos")} />}
    {(data.hotel_name || data.reservation_status || data.hotel_category || data.city || data.country) && <header className="space-y-1.5"><div className="flex items-start justify-between gap-3">{data.hotel_name && <h2 className="min-w-0 flex-1 text-xl font-bold leading-snug sm:text-2xl">{data.hotel_name}</h2>}{data.reservation_status && <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${data.reservation_status === "emitida" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>{data.reservation_status === "emitida" && <CheckCircle2 className="h-4 w-4" />}{data.reservation_status === "emitida" ? t("stEmitido") : data.reservation_status === "confirmada" ? t("stConfirmado") : data.reservation_status === "pre_reserva" ? t("hotelStatusPreReserva").replace(/^\S+\s/, "") : data.reservation_status}</span>}</div>
    {data.hotel_category && <p className="flex gap-1 text-warning">{/^[1-5]$/.test(data.hotel_category) ? Array.from({ length: Number(data.hotel_category) }, (_, i) => <Star key={i} className="h-4 w-4 fill-current" />) : ({ boutique: t("catBoutique"), resort: t("catResort"), pousada: t("catPousada") }[data.hotel_category] || data.hotel_category)}</p>}
    {(data.city || data.country) && <p className="flex items-center gap-2 text-muted-foreground"><MapPin className="h-4 w-4 shrink-0" />{[data.city, data.country].filter(Boolean).join(", ")}</p>}</header>}
    {(arrival || departure || data.checkin_time || data.checkout_time || data.check_in_time || data.check_out_time) && <section aria-label={`${t("secCheckin")} / ${t("secCheckout")}`} className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 rounded-2xl border border-border bg-card p-4 sm:p-5">{dateColumn("Check-in", arrival, data.checkin_time || data.check_in_time)}<div>{nights !== null && <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-2 text-xs font-semibold text-primary sm:gap-2 sm:px-3"><Moon className="h-4 w-4 shrink-0" />{nights} {t(nights === 1 ? "nightsLabelOne" : "nightsLabelOther")}</span>}</div>{dateColumn("Check-out", departure, data.checkout_time || data.check_out_time)}</section>}
    {(reservation || locator) && <section className="rounded-2xl border border-primary/15 bg-primary/5 p-4 sm:p-5">{[[th("reservation"), reservation], [t("fldLocalizador"), locator]].filter(([, value]) => value).map(([label, value], i) => <div key={label} className={`flex items-center justify-between gap-3 ${i ? "mt-3 border-t border-primary/15 pt-3" : ""}`}><div className="min-w-0"><p className="text-xs font-semibold text-muted-foreground">{label}</p><p className={`${i ? "text-lg" : "text-2xl"} select-all font-bold`}>{value}</p></div><Button variant="outline" size="icon" className="h-11 w-11 shrink-0 rounded-xl border-primary/20 bg-primary/10 text-primary" aria-label={th("copy", { label: label || "" })} onClick={() => { if (label && value) void copy(label, value); }}>{copied === label ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}</Button></div>)}<span className="sr-only" role="status">{copied ? th("copied") : ""}</span></section>}
    {hasAccommodation && <Panel title={th("accommodation")} icon={<BedDouble className="h-5 w-5" />}><div className="space-y-2 text-muted-foreground">{(data.guest_count || rooms) && <p className="flex items-start gap-2"><Users className="h-4 w-4 shrink-0" />{[data.guest_count ? `${t("fldHospedes")}: ${data.guest_count}` : "", rooms ? `${th("rooms")}: ${rooms}` : ""].filter(Boolean).join(" · ")}</p>}{data.room_type && <p>{roomTypes[data.room_type] || data.room_type}</p>}{data.bed_type && <p>{t("fldCama")}: {beds[data.bed_type] || data.bed_type}</p>}{data.meal_plan && <p className="flex items-center gap-2"><Coffee className="h-4 w-4 shrink-0" />{meals[data.meal_plan] || data.meal_plan}</p>}{data.breakfast_included && <p>{data.breakfast_included === "sim" ? <span className="rounded-md bg-primary/10 px-2 py-1 text-primary">{th("breakfast")}</span> : `${t("fldCafeDaManha")}: ${option(data.breakfast_included)}`}</p>}{guests.map((g, i) => <p key={i}>{g.name}{g.age ? ` (${g.age})` : ""}{g.notes ? ` · ${g.notes}` : ""}</p>)}</div></Panel>}
    {(hasLocation || phone || website || data.hotel_email) && <Panel title={t("secLocalizacaoContato")} icon={<MapPin className="h-5 w-5" />}>{data.address && <p className="mb-3 text-muted-foreground">{data.address}</p>}{hasLocation && <PlaceMapCard {...point} compact hideActions locale={locale} />}{data.hotel_email && <p className="my-2 text-muted-foreground">{data.hotel_email}</p>}<div className="mt-3 flex flex-wrap gap-2">{directions && <Button asChild className="h-auto min-h-11 min-w-0 flex-[1_1_140px] gap-2 whitespace-normal rounded-xl px-3 py-2 text-sm"><a href={directions} target="_blank" rel="noopener noreferrer"><Navigation className="h-4 w-4 shrink-0" />{th("directions")}</a></Button>}{phone && <Button asChild variant="outline" className="h-auto min-h-11 flex-[1_1_140px] gap-2 whitespace-normal rounded-xl px-3 py-2 text-sm text-primary"><a href={`tel:${phone}`}><Phone className="h-4 w-4 shrink-0" />{th("call")}</a></Button>}{website && <Button asChild variant="outline" className="h-auto min-h-11 flex-[1_1_140px] gap-2 whitespace-normal rounded-xl px-3 py-2 text-sm text-primary"><a href={website} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4 shrink-0" />{th("website")}</a></Button>}</div></Panel>}
    {(facts.length > 0 || notes.length > 0) && <Collapsible open={expanded} onOpenChange={setExpanded} className="rounded-2xl border border-border bg-card"><CollapsibleTrigger asChild><Button variant="ghost" className="h-auto min-h-14 w-full gap-3 whitespace-normal rounded-2xl p-4 text-left text-base font-bold"><FileText className="h-5 w-5 shrink-0 text-primary" /><span className="flex-1">{th("information")}</span><ChevronDown className={`h-5 w-5 shrink-0 ${expanded ? "rotate-180" : ""}`} /></Button></CollapsibleTrigger><CollapsibleContent><div className="space-y-3 border-t border-border p-4 text-muted-foreground">{facts.map(([label, value], i) => <div key={i}><p className="font-semibold text-foreground">{label}</p><FormattedText>{value}</FormattedText></div>)}{notes.map((value, i) => <FormattedText key={i}>{value}</FormattedText>)}</div></CollapsibleContent></Collapsible>}
    <ServiceDocumentsCard service={service} access={access} locale={locale} variant="hotel" />
  </article>;
}