import { useState, type ReactNode } from "react";
import { Plane, CalendarDays, Copy, Check, Users, UserRound, Luggage, Briefcase, AlertTriangle, ChevronDown, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { FormattedText } from "@/components/ui/formatted-text";
import { ServiceImageCarousel } from "@/components/quote/ServiceImageCarousel";
import { FlightStatusBadge } from "@/components/trip/FlightStatusBadge";
import { ServiceDocumentsCard, type ServiceDocumentsAccess } from "./ServiceDocumentsCard";
import { publicFlightRoute, publicFlightSegments } from "@/lib/publicWalletFlight";
import { resolveServicePlaceId } from "@/lib/serviceImages";
import { publicAirportText } from "@/lib/airportDisplay";
import { tWallet } from "@/i18n/publicMaterials/wallet";
import { tPublicFlight } from "@/i18n/publicMaterials/flights";
import { formatPublicShortDate, type PublicLocale } from "@/i18n/publicMaterials/locale";
import type { TripService, TripFlightData } from "@/types/trip";
import { toast } from "sonner";

function Section({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
    <h3 className="mb-4 flex items-center gap-2 text-base font-bold">{icon}{title}</h3>{children}
  </section>;
}

export function PublicFlightCard({ service, access, locale = "pt-BR" }: { service: TripService; access: ServiceDocumentsAccess; locale?: PublicLocale }) {
  const data = service.service_data as Partial<TripFlightData>;
  const t = tWallet(locale);
  const tf = tPublicFlight(locale);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [boardingOpen, setBoardingOpen] = useState(false);
  const route = publicFlightRoute(data);
  const segments = publicFlightSegments(data);
  const date = (value?: string) => value ? formatPublicShortDate(value, locale) || value : "";
  const dates = Array.from(new Set(segments.map((s) => date(s.flight_date)).filter(Boolean)));
  const images = service.image_urls?.length ? service.image_urls : service.image_url ? [service.image_url] : [];
  const copy = async () => {
    if (!data.locator_code) return;
    try { await navigator.clipboard.writeText(data.locator_code); setCopiedCode(data.locator_code); toast.success(tf("copied")); }
    catch { toast.error(tf("copyError")); }
  };
  const boardingFields = [
    [t("fldAntecedencia"), data.recommended_arrival], [t("fldTerminal"), data.boarding_terminal],
    [t("fldDocumentosField"), data.required_documents], [t("fldImigracao"), data.immigration_rules],
    [t("fldObservacoes"), data.boarding_notes], [t("fldObservacoes"), data.notes && data.notes !== data.boarding_notes ? data.notes : ""],
  ].filter(([, value]) => value);
  const baggageFields = [[t("fldExtra"), data.extra_baggage], [t("fldObservacoes"), data.baggage_notes], ["", data.baggage_rules]].filter(([, value]) => value);

  return <article id={`service-${service.id}`} data-testid="public-flight-card" className="wallet-flight-theme min-w-0 space-y-4 text-sm leading-relaxed text-foreground [overflow-wrap:anywhere] sm:space-y-5">
    {images.length > 0 && <div className="wallet-flight-banner overflow-hidden rounded-2xl"><ServiceImageCarousel images={images} alt={data.main_airline || data.airline || t("svcSectionFlight")} placeId={resolveServicePlaceId(service)} hideFallback /></div>}
    <header className="space-y-3 py-1">
      <h2 className="text-xl font-bold leading-snug sm:text-2xl">{route.origin || "—"} <span className="text-primary">{route.roundTrip ? "⇄" : "→"}</span> {route.destination || "—"}</h2>
      {data.flight_status && <span className={data.flight_status === "emitido" ? "inline-flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 text-sm font-semibold text-success" : "inline-flex rounded-full bg-muted px-3 py-1 text-sm text-muted-foreground"}>
        {data.flight_status === "emitido" && <CheckCircle2 className="h-4 w-4" />}
        {data.flight_status === "emitido" ? t("stEmitido") : data.flight_status === "confirmado" ? t("stConfirmado") : data.flight_status === "pendente" ? t("stPendente") : data.flight_status}
      </span>}
      {dates.length > 0 && <p className="flex items-start gap-2 text-muted-foreground"><CalendarDays className="mt-0.5 h-4 w-4 shrink-0" /><span>{dates.join(" · ")}</span></p>}
    </header>
    <section className="flex items-center justify-between gap-3 rounded-2xl border border-primary/15 bg-primary/5 p-4 sm:p-5" aria-label={t("fldLocalizador")}>
      <div className="min-w-0"><h3 className="mb-1 text-xs font-semibold uppercase text-muted-foreground">{t("fldLocalizador")}</h3><p className="select-all text-2xl font-bold sm:text-3xl">{data.locator_code || "—"}</p></div>
      {data.locator_code && <Button variant="outline" size="icon" className="h-11 w-11 shrink-0 rounded-xl border-primary/20 bg-card text-primary" onClick={() => void copy()} aria-label={tf("copy")} title={tf("copy")}>{copiedCode === data.locator_code ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}</Button>}
      <span className="sr-only" role="status">{copiedCode && copiedCode === data.locator_code ? tf("copied") : ""}</span>
    </section>
    <div className="space-y-4">
      {segments.map((seg, i) => <section key={i} className="rounded-2xl border border-border bg-card p-4 sm:p-5" aria-label={`${t("fldVoo")} ${i + 1}`}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <span className="rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-bold uppercase text-primary">{seg.segment_type === "volta" ? t("segVolta") : seg.segment_type === "conexao" ? t("segConexao") : t("fldIda")}{seg.flight_date ? ` · ${date(seg.flight_date)}` : ""}</span>
          <span className="text-sm font-semibold">{seg.airline || data.main_airline || data.airline}{seg.flight_number ? ` · ${seg.flight_number}` : ""}</span>
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_48px_minmax(0,1fr)] items-start gap-2 sm:grid-cols-[minmax(0,1fr)_80px_minmax(0,1fr)]">
          <div><p className="text-2xl font-bold leading-none sm:text-3xl">{seg.departure_time || "—"}</p><p className="mt-2 text-base font-bold">{seg.origin_airport || "—"}</p><p className="text-sm text-muted-foreground">{seg.origin_city || ""}</p></div>
          <div className="relative mt-3 flex items-center justify-center border-t-2 border-dotted border-primary/30"><Plane className="absolute -top-3 h-6 w-6 bg-card px-0.5 text-primary" aria-hidden /></div>
          <div className="text-right"><p className="text-2xl font-bold leading-none sm:text-3xl">{seg.arrival_time || "—"}</p><p className="mt-2 text-base font-bold">{seg.destination_airport || "—"}</p><p className="text-sm text-muted-foreground">{seg.destination_city || ""}</p></div>
        </div>
        {(seg.origin_airport_name || seg.destination_airport_name) && <p className="mt-3 text-sm text-muted-foreground">{publicAirportText({ code: seg.origin_airport, customName: seg.origin_airport_name, city: seg.origin_city })} → {publicAirportText({ code: seg.destination_airport, customName: seg.destination_airport_name, city: seg.destination_city })}</p>}
        {(seg.terminal || seg.gate) && <p className="mt-3 text-sm text-muted-foreground">{[seg.terminal ? `${t("fldTerminal")}: ${seg.terminal}` : "", seg.gate ? `${t("fldPortao")}: ${seg.gate}` : ""].filter(Boolean).join(" · ")}</p>}
        {seg.flight_number && seg.flight_date && <div className="mt-3"><FlightStatusBadge tripServiceId={service.id} flightNumber={seg.flight_number} flightDate={seg.flight_date} locale={locale} /></div>}
      </section>)}
      {!segments.length && <p className="text-muted-foreground">{tf("noSegments")}</p>}
    </div>
    {!!data.passengers?.length && <Section title={t("fldPassageiros")} icon={<Users className="h-5 w-5 text-primary" />}><ul className="divide-y divide-border">
      {data.passengers.map((p, i) => <li key={i} className="flex gap-3 py-3 first:pt-0 last:pb-0"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"><UserRound className="h-4 w-4" /></span><div className="min-w-0 flex-1"><p className="text-base font-bold">{p.name || "—"}</p>
        {p.passenger_type && <p className="text-sm text-muted-foreground">{p.passenger_type === "adulto" ? t("paxAdulto") : p.passenger_type === "crianca" ? t("paxCrianca") : p.passenger_type === "bebe" ? t("paxBebe") : p.passenger_type}</p>}
        {p.seat && <p className="text-sm text-muted-foreground">{t("fldAssento")}: {p.seat}</p>}{p.document && <p className="text-sm text-muted-foreground">{tf("ticket")}: {p.document}</p>}{p.notes && <FormattedText>{p.notes}</FormattedText>}
      </div></li>)}
    </ul></Section>}
    <Section title={tf("baggage")} icon={<Luggage className="h-5 w-5 text-primary" />}>
      <div className="grid grid-cols-2 gap-4"><div><Briefcase className="mb-2 h-5 w-5 text-muted-foreground" /><h4 className="font-semibold">{t("fldMao")}</h4><p className="mt-1 text-muted-foreground">{data.carry_on || t("fldNaoInformado")}</p></div><div><Luggage className="mb-2 h-5 w-5 text-muted-foreground" /><h4 className="font-semibold">{t("fldDespachada")}</h4><p className="mt-1 text-muted-foreground">{data.checked_baggage || t("fldNaoInformado")}</p></div></div>
      {baggageFields.map(([label, value], i) => <div key={i} className="mt-3 border-t border-border pt-3 text-muted-foreground">{label && <span className="font-semibold">{label}: </span>}<FormattedText>{String(value)}</FormattedText></div>)}
    </Section>
    {boardingFields.length > 0 && <Collapsible open={boardingOpen} onOpenChange={setBoardingOpen} className="rounded-2xl border border-border bg-card">
      <CollapsibleTrigger asChild><Button variant="ghost" className="h-auto min-h-14 w-full justify-start gap-3 whitespace-normal rounded-2xl p-4 text-left text-base font-semibold hover:bg-muted hover:text-foreground"><AlertTriangle className="h-5 w-5 shrink-0 text-warning" /><span className="flex-1">{t("sectionOrientacoesEmbarquePlain")}</span><ChevronDown className={`h-5 w-5 shrink-0 transition-transform motion-reduce:transition-none ${boardingOpen ? "rotate-180" : ""}`} /></Button></CollapsibleTrigger>
      <CollapsibleContent><div className="space-y-3 border-t border-border p-4 text-sm">{boardingFields.map(([label, value], i) => <div key={i}><p className="font-semibold">{label}</p><FormattedText>{String(value)}</FormattedText></div>)}</div></CollapsibleContent>
    </Collapsible>}
    {(data.checkin_url || data.checkin_notes || data.checkin_open_date || data.checkin_status) && <Section title={t("fldCheckin")} icon={<CheckCircle2 className="h-5 w-5 text-primary" />}>
      {data.checkin_status && <p className="mb-2">{data.checkin_status === "realizado" ? t("stRealizado") : t("stPendente")}</p>}
      {data.checkin_url && /^https?:\/\//i.test(data.checkin_url) && <Button asChild className="h-11 w-full rounded-xl"><a href={data.checkin_url} target="_blank" rel="noopener noreferrer">{t("ctaCheckinOnline")}</a></Button>}
      {data.checkin_open_date && <p className="mt-2 text-muted-foreground">{t("fldAbertura")}: {data.checkin_open_date}</p>}{data.checkin_notes && <FormattedText>{data.checkin_notes}</FormattedText>}
    </Section>}
    <ServiceDocumentsCard service={service} access={access} locale={locale} variant="flight" />
  </article>;
}