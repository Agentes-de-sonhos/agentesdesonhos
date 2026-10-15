import { useState, type ReactNode } from "react";
import { Car, CarFront, CalendarDays, Check, CheckCircle2, ChevronDown, Copy, Info, MapPin, Navigation, Settings, ShieldCheck, UserRound, Users, Fuel, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { FormattedText } from "@/components/ui/formatted-text";
import { ServiceImageCarousel } from "@/components/quote/ServiceImageCarousel";
import { ServiceDocumentsCard, type ServiceDocumentsAccess } from "./ServiceDocumentsCard";
import { resolveServicePlaceId } from "@/lib/serviceImages";
import { googleDirectionsUrl } from "@/lib/mapLinks";
import { hotelDate, hotelNights } from "./PublicHotelCard";
import { tWallet } from "@/i18n/publicMaterials/wallet";
import { tPublicCar } from "@/i18n/publicMaterials/cars";
import type { PublicLocale } from "@/i18n/publicMaterials/locale";
import type { TripService, TripCarRentalData } from "@/types/trip";
import { toast } from "sonner";

type CarData = Partial<TripCarRentalData> & { drivers?: Partial<TripCarRentalData["drivers"][number]>[] };

const webUrl = (v?: string) => (v && /^https?:\/\//i.test(v) ? v : undefined);

/** Rótulo seguro da transmissão: nunca imprime valores brutos ou expressões. */
export function carTransmissionLabel(value: unknown, locale: PublicLocale = "pt-BR") {
  const tc = tPublicCar(locale);
  const v = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (/^autom/.test(v)) return tc("automatic");
  if (/^manual/.test(v)) return tc("manual");
  return null;
}

function Panel({ icon, title, children, aside }: { icon: ReactNode; title: string; children: ReactNode; aside?: ReactNode }) {
  return <section className="flex gap-3 rounded-2xl border border-border bg-card p-4 sm:gap-4 sm:p-5">
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">{icon}</span>
    <div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-2"><h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>{aside}</div><div className="mt-1">{children}</div></div>
  </section>;
}

export function PublicCarRentalCard({ service, access, locale = "pt-BR" }: { service: TripService; access: ServiceDocumentsAccess; locale?: PublicLocale }) {
  const data = service.service_data as CarData;
  const t = tWallet(locale), tc = tPublicCar(locale);
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  const images = service.image_urls?.length ? service.image_urls : service.image_url ? [service.image_url] : [];
  const model = data.car_model?.trim();
  const showSimilar = model && !/similar|similare/i.test(model);
  const transmission = carTransmissionLabel(data.transmission, locale);
  const days = hotelNights(data.pickup_date, data.dropoff_date);
  const status = data.reservation_status;
  const statusLabel = status === "confirmada" ? tc("confirmed") : status === "emitida" ? tc("issued") : status === "a_retirar" ? tc("toPickup") : status;
  const positive = status === "confirmada" || status === "emitida";
  const drivers = (data.drivers || []).filter((d) => d?.name?.trim());

  const copy = async () => {
    if (!data.reservation_code) return;
    try { await navigator.clipboard.writeText(data.reservation_code); setCopied(true); toast.success(tc("copied")); }
    catch { toast.error(tc("copyError")); }
  };

  const place = (kind: "pickup" | "dropoff") => {
    const p = kind === "pickup";
    const date = hotelDate(p ? data.pickup_date : data.dropoff_date);
    const time = p ? data.pickup_time : data.dropoff_time;
    const name = p ? data.pickup_location : data.dropoff_location;
    const address = p ? data.pickup_address : data.dropoff_address;
    const city = [p ? data.pickup_city : data.dropoff_city, p ? data.pickup_country : data.dropoff_country].filter(Boolean).join(", ");
    if (!date && !time && !name && !address && !city) return null;
    const query = [name, address, city].filter(Boolean).join(", ");
    const directions = (p ? webUrl(data.pickup_maps_url) : undefined) || ((address || name) ? googleDirectionsUrl({ address: query, name }) : null);
    const extra = p
      ? [[t("fldTerminal"), data.pickup_terminal], ["", data.pickup_phone]]
      : [["", data.dropoff_late_policy]];
    const Icon = p ? Car : CarFront;
    return <section aria-label={p ? tc("pickup") : tc("dropoff")} className="flex gap-3 rounded-2xl border border-border bg-card p-4 sm:gap-4 sm:p-5">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon className="h-5 w-5" /></span>
      <div className="min-w-0 flex-1 space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{p ? tc("pickup") : tc("dropoff")}</h3>
        {(date || time) && <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">{date && <span className="text-xl font-bold uppercase sm:text-2xl">{String(date.getDate()).padStart(2, "0")} {new Intl.DateTimeFormat(locale, { month: "short" }).format(date).replace(/\.$/, "")} {date.getFullYear()}</span>}{time && <span className="text-lg text-muted-foreground sm:text-xl">{time}</span>}</p>}
        {(name || address || city) && <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-[1_1_180px] gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" /><div className="min-w-0">{name && <p className="font-semibold">{name}</p>}{(address || city) && <p className="text-muted-foreground">{[address, city].filter(Boolean).join(" · ")}</p>}</div></div>
          {directions && <Button asChild variant="outline" className="h-auto min-h-11 shrink-0 gap-2 whitespace-normal rounded-xl border-primary/40 px-4 py-2 text-primary"><a href={directions} target="_blank" rel="noopener noreferrer"><Navigation className="h-4 w-4 shrink-0" />{tc("directions")}</a></Button>}
        </div>}
        {extra.filter(([, v]) => v).map(([l, v], i) => <p key={i} className="text-muted-foreground">{l ? `${l}: ` : ""}{v}</p>)}
      </div>
    </section>;
  };

  const insurance = [[t("fldBasico"), data.basic_insurance], [t("fldTotalCdwLdw"), data.full_insurance], [t("fldTerceiros"), data.third_party_protection], [t("fldRoubo"), data.theft_protection], [t("fldDanos"), data.damage_protection], ["", data.insurance_coverage]].filter(([, v]) => v);
  const vehicle = [[t("fldCombustivel"), data.fuel_type], [t("wordPortas"), data.doors], ["🧳", data.luggage_capacity], [t("fldPlaca"), data.plate], ["", data.car_type && data.car_type !== model ? data.car_type : ""]].filter(([, v]) => v);
  const deposit = [[t("fldCaucao"), data.deposit_amount], [t("fldForma"), data.deposit_method], [t("fldCartaoNomeCondutor"), data.card_in_driver_name], [t("fldPagamento"), data.payment_status || data.payment_method]].filter(([, v]) => v);
  const fuelPolicy = data.fuel_policy === "cheio_cheio" ? t("fuelPolicyCheioCheio") : data.fuel_policy === "cheio_vazio" ? t("fuelPolicyCheioVazio") : data.fuel_policy;
  const fuel = [[t("fldPolitica"), fuelPolicy], ["", data.fuel_rules], [t("fldPenalidade"), data.fuel_penalty], ["", data.fuel_notes]].filter(([, v]) => v);
  const guidance = [[t("secRetirada").replace(/^\S+\s/, ""), data.pickup_instructions], [t("secDevolucao").replace(/^\S+\s/, ""), data.dropoff_instructions], [t("fldDocumentos"), data.required_documents], [t("fldIdadeMinima"), data.minimum_age], [t("fldPidPermissao"), data.international_permit], ["", data.traffic_rules], [t("fldEmergenciaSos"), data.emergency_contact], ["", data.agency_contact], ["", data.additional_driver_fee], ["", data.car_notes], ["", data.notes]].filter(([, v]) => v);
  const rows = (list: (string | undefined)[][]) => <div className="space-y-1 text-muted-foreground">{list.map(([l, v], i) => <div key={i}>{l && <span className="font-semibold text-foreground">{l}: </span>}<FormattedText>{String(v)}</FormattedText></div>)}</div>;
  const facts = [
    transmission && [<Settings key="i" className="h-5 w-5 shrink-0 text-primary" />, transmission],
    data.passenger_capacity && [<Users key="i" className="h-5 w-5 shrink-0 text-primary" />, /^\d+$/.test(data.passenger_capacity.trim()) ? tc("passengers", { n: data.passenger_capacity.trim() }) : data.passenger_capacity],
    days !== null && [<CalendarDays key="i" className="h-5 w-5 shrink-0 text-primary" />, days === 1 ? tc("day") : tc("days", { n: String(days) })],
  ].filter(Boolean) as [ReactNode, string][];

  return <article id={`service-${service.id}`} data-testid="public-car-card" className="wallet-hotel-theme min-w-0 space-y-4 text-sm leading-relaxed text-foreground [overflow-wrap:anywhere] sm:space-y-5">
    {images.length > 0
      ? <div className="relative overflow-hidden rounded-2xl"><ServiceImageCarousel images={images} alt={model || tc("title")} placeId={resolveServicePlaceId(service)} hideFallback panoramic /><span className="pointer-events-none absolute bottom-2 left-2 rounded-md bg-foreground/70 px-2 py-0.5 text-xs text-background">{tc("illustrative")}</span></div>
      : <div aria-hidden="true" className="flex h-28 items-center justify-center rounded-2xl border border-border bg-primary/5 text-primary/50 sm:h-36"><Car className="h-14 w-14" /></div>}
    {(model || statusLabel || data.rental_company) && <header className="space-y-1">
      <div className="flex items-start justify-between gap-3">
        <h2 className="min-w-0 flex-1 text-xl font-bold leading-snug sm:text-2xl">{model ? `${model}${showSimilar ? ` ${tc("similar")}` : ""}` : tc("title")}</h2>
        {statusLabel && <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${positive ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>{positive && <CheckCircle2 className="h-4 w-4" />}{statusLabel}</span>}
      </div>
      {data.rental_company && <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{data.rental_company}</p>}
    </header>}
    {facts.length > 0 && <div className="flex flex-wrap items-center gap-x-4 gap-y-2">{facts.map(([icon, label], i) => <span key={i} className={`flex items-center gap-2 text-base ${i ? "sm:border-l sm:border-border sm:pl-4" : ""}`}>{icon}{label}</span>)}</div>}
    {data.reservation_code && <section className="flex items-center justify-between gap-3 rounded-2xl border border-primary/15 bg-primary/5 p-4 sm:p-5">
      <div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{tc("reservation")}</p><p className="select-all text-2xl font-bold">{data.reservation_code}</p></div>
      <Button variant="outline" size="icon" className="h-11 w-11 shrink-0 rounded-full border-primary/20 bg-card text-primary" aria-label={tc("copy")} onClick={() => void copy()}>{copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}</Button>
      <span className="sr-only" role="status">{copied ? tc("copied") : ""}</span>
    </section>}
    {place("pickup")}
    {place("dropoff")}
    {(insurance.length > 0 || data.deductible || data.insurance_notes) && <Panel icon={<ShieldCheck className="h-5 w-5" />} title={tc("insurance")}>
      {data.deductible && <div className="mb-1 flex flex-wrap items-center justify-between gap-2"><span>{tc("deductible")}</span><span className="rounded-full bg-primary/10 px-3 py-1 font-semibold text-primary">{data.deductible}</span></div>}
      {rows(insurance)}{data.insurance_notes && <div className="mt-1 text-muted-foreground"><FormattedText>{String(data.insurance_notes)}</FormattedText></div>}
    </Panel>}
    {drivers.length > 0 && <Panel icon={<Users className="h-5 w-5" />} title={tc("drivers")}><ul className="divide-y divide-border">{drivers.map((d, i) => <li key={i} className="flex gap-3 py-2 first:pt-0 last:pb-0"><UserRound className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" /><div className="min-w-0"><p className="text-base">{d.name}</p>{drivers.length > 1 && <p className="text-xs text-muted-foreground">{i === 0 ? tc("mainDriver") : tc("additionalDriver")}</p>}{[d.age, d.notes].filter(Boolean).map((v, j) => <p key={j} className="text-muted-foreground">{v}</p>)}</div></li>)}</ul></Panel>}
    {vehicle.length > 0 && <Panel icon={<Car className="h-5 w-5" />} title={tc("vehicle")}>{rows(vehicle)}</Panel>}
    {deposit.length > 0 && <Panel icon={<Wallet className="h-5 w-5" />} title={tc("deposit")}>{rows(deposit)}</Panel>}
    {fuel.length > 0 && <Panel icon={<Fuel className="h-5 w-5" />} title={tc("fuel")}>{rows(fuel)}</Panel>}
    {guidance.length > 0 && <Collapsible open={open} onOpenChange={setOpen} className="rounded-2xl border border-border bg-card">
      <CollapsibleTrigger asChild><Button variant="ghost" className="h-auto min-h-14 w-full justify-start gap-3 whitespace-normal rounded-2xl p-4 text-left hover:bg-muted hover:text-foreground"><Info className="h-5 w-5 shrink-0 text-warning" /><span className="flex-1 text-xs font-semibold uppercase tracking-wider">{tc("guidance")}</span><ChevronDown className={`h-5 w-5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} /></Button></CollapsibleTrigger>
      <CollapsibleContent><div className="border-t border-border p-4">{rows(guidance)}</div></CollapsibleContent>
    </Collapsible>}
    <ServiceDocumentsCard service={service} access={access} locale={locale} variant="car" />
  </article>;
}
