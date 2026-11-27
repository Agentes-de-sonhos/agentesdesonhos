import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fxRateUrl, isValidRate } from "@/lib/fxConversion";
import { circuitNights, circuitMoney, convertCircuitPrice, circuitDepartureDate, tourismRate, upcomingDepartures } from "@/lib/circuits/presentation";
import { CircuitQuoteDialog } from "@/components/whitelabel/CircuitQuoteDialog";
import { CircuitTimeline } from "@/components/whitelabel/CircuitTimeline";
import { ItaliaEmTremRouteMap } from "@/components/whitelabel/ItaliaEmTremRouteMap";
import { CircuitRouteMap } from "@/components/whitelabel/CircuitRouteMap";
import "./circuit-tour.css";
import { useParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, BedDouble, Bus, CalendarDays, Clock, Car, Compass, Download, Hotel, Ship, MapPin, MessageCircle, Plane, Star, UserRound, Utensils } from "lucide-react";
import { SEO } from "@/components/seo/SEO";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { type AgencyDomainInfo, agencyWhatsappNumber } from "@/lib/agencyDomains";
import { findCircuit, formatCircuitPrice, type CircuitTour } from "@/lib/circuits";
import type { CircuitInclusionIcon } from "@/lib/circuits/types";

const ICONS: Record<CircuitInclusionIcon, typeof Hotel> = {
  hotel: BedDouble, tours: Compass, meals: Utensils, bus: Bus, transfer: Car, guide: UserRound, boat: Ship, flight: Plane,
};
const wrap = "mx-auto w-full max-w-[1200px] px-5 md:px-8";
const eyebrow = "circuit-eyebrow text-xs font-semibold uppercase tracking-[0.18em] text-primary";
const h2 = "mt-2 text-3xl font-semibold leading-tight text-foreground md:text-4xl";

function waHref(info: AgencyDomainInfo, c: CircuitTour, extra = "") {
  const n = agencyWhatsappNumber(info);
  const msg = `Olá! Tenho interesse no circuito ${c.title}${extra}. Pode me enviar uma cotação?`;
  return n ? `https://wa.me/${n}?text=${encodeURIComponent(msg)}` : "#contato";
}

export function CircuitTourView({ info, circuit: c }: { info: AgencyDomainInfo; circuit: CircuitTour }) {
  const [open, setOpen] = useState<string[]>(["d1"]);
  const [departure, setDeparture] = useState<{ date: string; label: string } | null>(null);
  const enhanced = c.enhancedPresentation === true;
  const rail = c.slug === "italia-em-trem";
  const { data: fx, isError: fxError } = useQuery({
    queryKey: ["circuit-fx", c.currency, "BRL"],
    enabled: enhanced && c.currency !== "BRL",
    queryFn: async () => {
      const response = await fetch(fxRateUrl(c.currency, "BRL"), { headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string } });
      if (!response.ok) throw new Error("Cotação indisponível");
      const data = await response.json();
      if (!isValidRate(data?.rate)) throw new Error("Cotação inválida");
      return data as { rate: number; date?: string };
    },
    staleTime: 60 * 60 * 1000, refetchInterval: 60 * 60 * 1000, refetchOnWindowFocus: false, retry: 1,
  });
  const converted = enhanced && !fxError ? convertCircuitPrice(c.fromPrice, tourismRate(fx?.rate)) : undefined;
  const upcoming = upcomingDepartures(c.departures);
  const monthsRef = useRef<HTMLDivElement>(null);
  const [monthEdges, setMonthEdges] = useState({ start: true, end: false });
  const updateMonthEdges = () => { const el = monthsRef.current; if (!el) return; setMonthEdges({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 }); };
  useEffect(() => { updateMonthEdges(); window.addEventListener("resize", updateMonthEdges); return () => window.removeEventListener("resize", updateMonthEdges); }, [upcoming.length]);
  const scrollMonths = (dir: 1 | -1) => { const el = monthsRef.current; if (el) el.scrollBy({ left: dir * el.clientWidth, behavior: "smooth" }); };
  const scrollToDepartures = () => document.getElementById("saidas-garantidas")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  const brGuide = c.brazilianGuideDepartures ?? [];
  const allDays = c.itinerary.map((d) => `d${d.day}`);
  const price = enhanced ? circuitMoney(converted ?? c.fromPrice, converted == null ? c.currency : "BRL") : formatCircuitPrice(c.fromPrice, c.currency);
  const installments = c.brlInstallments;
  const downPaymentPercent = c.brlDownPaymentPercent ?? 0;
  const totalCents = converted != null ? Math.round(converted * 100) : null;
  const downPaymentCents = totalCents != null && downPaymentPercent > 0 ? Math.round(totalCents * downPaymentPercent / 100) : 0;
  const balanceCents = totalCents != null ? totalCents - downPaymentCents : null;
  const installmentCents = balanceCents != null && installments && installments > 1
    ? Math.round(balanceCents / installments)
    : null;
  const installmentPrice = installmentCents != null ? circuitMoney(installmentCents / 100, "BRL") : null;
  const showRoundingNote = installmentCents != null && installmentCents * (installments ?? 0) !== balanceCents;

  return (
    <div className={`bg-background pb-24 text-foreground md:pb-0 ${enhanced ? "circuit-enhanced" : ""}${rail ? " circuit-curti-italia-trem" : ""}`}>
      <SEO title={`${c.title} · ${c.duration}`} description={c.summary} />

      {/* Hero */}
      <section className="relative">
        <picture>
          {c.heroMobileImage && <source media="(max-width: 639px)" srcSet={c.heroMobileImage} type="image/webp" />}
          <img src={c.heroImage} alt={c.heroAlt} width={c.heroImageSize?.width ?? 1920} height={c.heroImageSize?.height ?? 912} className="h-[420px] w-full object-cover md:h-[520px]" fetchPriority="high" />
        </picture>
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/30 to-transparent" />
        <div className={`${wrap} absolute inset-x-0 bottom-0 pb-10`}>
          <span className="circuit-eyebrow inline-block rounded-full bg-background/90 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">{c.badge}</span>
          <h1 className="mt-3 text-4xl font-semibold leading-tight text-background md:text-6xl">{c.title}</h1>
          {enhanced ? <><div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-base leading-snug text-background md:text-lg">{c.cities.map((city, index) => { const nights = circuitNights(c, city); return <span key={city} className="inline-flex items-center gap-3">{index > 0 && <span aria-hidden="true" className="h-4 w-px bg-background/40" />}<span className="whitespace-nowrap">{city}{nights > 0 && <> • {nights} {nights === 1 ? "noite" : "noites"}</>}</span></span>; })}</div>{brGuide.length > 0 && <button type="button" onClick={scrollToDepartures} className="mt-4 inline-flex flex-wrap items-center gap-x-2 gap-y-1 rounded-full bg-[#009C3B] px-4 py-2 text-left text-sm text-white shadow-md transition hover:bg-[#00852f] md:text-base"><BrFlag /><strong className="font-semibold">Saídas exclusivas com guia brasileiro:</strong><span>{brGuide.map(brGuideLabel).join(" · ")}</span></button>}</> : <p className="mt-2 text-background/90">{c.cities.join(" · ")}</p>}
        </div>
      </section>

      {c.heroCaption && <p className={`${wrap} py-2 text-xs text-muted-foreground`}>{c.heroCaption}</p>}

      {/* Resumo + preço */}
      <section className="wl-alt-gradient"><div className={`${wrap} grid gap-8 py-10 md:grid-cols-[1fr_380px]`}>
        <div>
          <div className="flex flex-wrap gap-2">
            {[
              { i: Clock, t: c.duration },
              { i: MapPin, t: rail ? `${c.cities.length} cidades-base` : `${c.cities.length} cidades` },
              { i: Compass, t: c.countries.join(", ") },
              ...(c.code ? [{ i: Star, t: `Cód. ${c.code}` }] : []),
            ].map(({ i: I, t }) => (
              <span key={t} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-sm"><I className="h-4 w-4 text-primary" />{t}</span>
            ))}
          </div>
          <p className="mt-6 text-lg leading-8 text-muted-foreground">{c.summary}</p>
        </div>
        <aside className="h-fit rounded-2xl border border-border bg-card p-6 shadow-sm md:sticky md:top-24">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">A partir de</p>
          <p className="mt-1 text-4xl font-semibold text-primary">
            {installmentPrice ? <><span className="whitespace-nowrap">{installments}x de</span>{" "}<span className="whitespace-nowrap">{installmentPrice}</span></> : price}
          </p>
          {downPaymentCents > 0 && installmentPrice && <p className="mt-2 text-sm text-foreground">+ entrada de {circuitMoney(downPaymentCents / 100, "BRL")} ({downPaymentPercent}%)</p>}
          {installmentPrice && <p className="mt-2 text-sm font-medium text-foreground">Total em reais: {price}{rail && " por pessoa em acomodação dupla"}</p>}
          {rail && !installmentPrice && <p className="mt-2 text-sm text-muted-foreground">Por pessoa em acomodação dupla. Condição: entrada de {downPaymentPercent}% e saldo em até {installments}x, com valores em reais na cotação.</p>}
          {downPaymentCents > 0 && showRoundingNote && <p className="mt-1 text-xs text-muted-foreground">A última parcela pode variar alguns centavos por arredondamento.</p>}
          {converted != null && fx && <div className="mt-3 space-y-1 text-xs leading-5 text-muted-foreground"><p>Valor original: {circuitMoney(c.fromPrice, c.currency)}</p><p>Câmbio turismo de referência: {c.currency === "EUR" ? "€" : "$"} 1 = R$ {(tourismRate(fx.rate) ?? fx.rate).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</p><p>Valor final sujeito à confirmação da operadora no fechamento.</p>{fx.date && <p>Cotação de {fx.date.split("-").reverse().join("/")}</p>}</div>}
          {c.singleSupplement != null && <p className="mt-1 text-sm text-muted-foreground">Suplemento individual: {formatCircuitPrice(c.singleSupplement, c.currency)}</p>}
          <p className="mt-3 text-xs leading-5 text-muted-foreground">{c.priceNote}</p>
          {c.pdfUrl && <Button asChild variant="outline" size="lg" className="mt-4 w-full"><a href={c.pdfUrl} target="_blank" rel="noopener noreferrer" download><Download className="mr-2 h-4 w-4" />Baixar roteiro em PDF</a></Button>}
          {enhanced ? <Button size="lg" className="circuit-price-quote mt-5 w-full" onClick={scrollToDepartures}><MessageCircle className="mr-2 h-4 w-4" />Solicitar orçamento</Button> : <><Button asChild size="lg" className="mt-5 w-full"><a href={waHref(info, c)} target="_blank" rel="noopener noreferrer"><MessageCircle className="mr-2 h-4 w-4" />Solicitar cotação</a></Button><Button variant="outline" size="lg" className="mt-2 w-full" onClick={() => window.print()}><Download className="mr-2 h-4 w-4" />Baixar roteiro</Button></>}
        </aside>
      </div></section>

      {/* Inclusões */}
      <section className="bg-card py-14">
        <div className={wrap}>
          <p className={eyebrow}>O que está incluído</p>
          <h2 className={h2}>Serviços incluídos</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {c.inclusions.map((x) => { const I = ICONS[x.icon]; return (
              <div key={x.title} className="circuit-inclusion rounded-2xl border border-border bg-card p-5">
                <span className="circuit-inclusion-icon flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><I className="h-5 w-5" /></span>
                <h3 className="mt-4 font-semibold">{x.title}</h3>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{x.text}</p>
              </div>
            ); })}
          </div>
        </div>
      </section>

      {/* Destaques + hotéis */}
      <section className="wl-alt-gradient"><div className={`${wrap} grid gap-10 py-14 md:grid-cols-2`}>
        <div>
          <p className={eyebrow}>Experiências</p>
          <h2 className={h2}>Destaques da viagem</h2>
          <ul className="mt-6 space-y-3">
            {c.highlights.map((h) => <li key={h} className="circuit-highlight flex gap-3"><Star className="mt-0.5 h-5 w-5 shrink-0 text-primary" /><span data-text={h}>{h}</span></li>)}
          </ul>
        </div>
        <div>
          <p className={eyebrow}>Hospedagem</p>
          <h2 className={h2}>Hotéis previstos</h2>
          <div className="mt-6 divide-y divide-border rounded-2xl border border-border bg-card">
            {c.hotels.map((h) => (
              <div key={h.city} className="flex flex-col gap-2 p-4 sm:flex-row sm:gap-4">
                <span className="shrink-0 font-semibold sm:w-40">{h.city}{enhanced && circuitNights(c, h.overnightCity ?? h.city) > 0 && <> • {circuitNights(c, h.overnightCity ?? h.city)} {circuitNights(c, h.overnightCity ?? h.city) === 1 ? "noite" : "noites"}</>}</span>
                <span className="text-sm leading-6 text-muted-foreground">{h.options.join(" ou ")}</span>
              </div>
            ))}
          </div>
          {c.hotelsNote && <p className="mt-2 text-xs text-muted-foreground">{c.hotelsNote}</p>}
        </div>
      </div></section>

      {/* Roteiro */}
      <section className="bg-card py-14">
        <div className={wrap}>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div><p className={eyebrow}>Dia a dia</p><h2 className={h2}>Roteiro</h2></div>
            {!enhanced && <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setOpen(allDays)}>Expandir todos</Button>
              <Button variant="outline" size="sm" onClick={() => setOpen([])}>Recolher todos</Button>
            </div>}
          </div>
          {rail ? <ItaliaEmTremRouteMap circuit={c} /> : <CircuitRouteMap circuit={c} />}
          {enhanced ? <CircuitTimeline days={c.itinerary} breakfastCup={rail} /> : <Accordion type="multiple" value={open} onValueChange={setOpen} className="mt-6 space-y-3">
            {c.itinerary.map((d) => (
              <AccordionItem key={d.day} value={`d${d.day}`} className="rounded-2xl border border-border bg-card px-5">
                <AccordionTrigger className="text-left hover:no-underline">
                  <span className="flex items-center gap-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">{d.day}</span>
                    <span><span className="block text-xs uppercase tracking-wider text-muted-foreground">Dia {d.day} · {d.weekday}</span><span className="font-semibold">{d.title}</span></span>
                  </span>
                </AccordionTrigger>
                <AccordionContent className="pl-14">
                  <p className="leading-7 text-muted-foreground">{d.description}</p>
                  {d.meals?.length ? <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-primary"><Utensils className="h-4 w-4" />{d.meals.join(" · ")}</p> : null}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>}
        </div>
      </section>

      {/* Saídas */}
      <section id="saidas-garantidas" className="wl-alt-gradient scroll-mt-24"><div className={`${wrap} py-14`}>
        <p className={eyebrow}>{enhanced ? "Escolha sua data de embarque" : "Calendário"}</p>
        <h2 className={h2}>{c.departuresTitle ?? (enhanced ? "Saídas garantidas aos domingos" : "Saídas garantidas")}</h2>
        {enhanced && <p className={`mt-3 text-base leading-7 text-muted-foreground${rail ? "" : " max-w-2xl"}`}>
          {rail ? <>Peça seu orçamento à <span className="whitespace-nowrap">Curti Viagens.</span></> : <>{c.departurePrompt ?? "Clique no domingo desejado para verificar a disponibilidade e solicitar seu orçamento"} com a {info.agency_name ?? "agência"}.</>}
        </p>}
        {enhanced && brGuide.length > 0 && <p className="mt-3 inline-flex items-center gap-4 rounded-2xl border border-primary/30 bg-card px-4 py-2 text-sm"><span aria-hidden="true" className="relative h-5 w-5 shrink-0 rounded bg-[#009C3B] ring-2 ring-primary ring-offset-2"><GuideCornerFlag /></span><span> <strong className="font-semibold text-primary">Datas destacadas</strong> têm guia acompanhante brasileiro exclusivo. As demais contam com guia em espanhol.</span></p>}
        {enhanced ? (
          <div className="relative mt-6">
            {!monthEdges.start && <Button type="button" variant="outline" size="icon" aria-label="Meses anteriores" onClick={() => scrollMonths(-1)} className="circuit-calendar-arrow absolute -left-3 top-1/2 z-10 h-10 w-10 -translate-y-1/2 rounded-full border-border bg-background text-primary shadow-md hover:bg-background hover:text-primary sm:-left-5"><ChevronLeft className="h-5 w-5" /></Button>}
            {!monthEdges.end && <Button type="button" variant="outline" size="icon" aria-label="Próximos meses" onClick={() => scrollMonths(1)} className="circuit-calendar-arrow absolute -right-3 top-1/2 z-10 h-10 w-10 -translate-y-1/2 rounded-full border-border bg-background text-primary shadow-md hover:bg-background hover:text-primary sm:-right-5"><ChevronRight className="h-5 w-5" /></Button>}
            <div ref={monthsRef} onScroll={updateMonthEdges} className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {upcoming.map((m) => (
                <div key={m.month} className="circuit-calendar-month w-full shrink-0 snap-start rounded-2xl border border-border bg-card p-4 sm:w-[calc((100%-1rem)/2)] lg:w-[calc((100%-3rem)/4)]">
                  <p className="flex items-center gap-2 font-semibold"><CalendarDays className="h-4 w-4 text-primary" />{m.month}</p>
                  <div className={rail ? "circuit-calendar-grid mt-3" : "mt-3 flex flex-wrap gap-2"}>
                    {m.days.map((d) => { const iso = circuitDepartureDate(m.month, d); const br = brGuide.includes(iso); return (
                      <Button key={d} variant="ghost" className={`circuit-calendar-day relative h-10 w-10 p-0 ${br ? "!bg-[#009C3B] !text-white ring-2 ring-primary ring-offset-2 hover:!bg-[#00852f]" : "bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground"}`} aria-label={`Solicitar orçamento: ${d} de ${m.month}${br ? " (guia brasileiro)" : ""}`} onClick={() => setDeparture({ date: iso, label: `${d} de ${m.month}${br ? " · com guia brasileiro" : ""}` })}>{d}{br && <GuideCornerFlag />}</Button>
                    ); })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {c.departures.map((m) => (
            <div key={m.month} className="rounded-2xl border border-border bg-card p-4">
              <p className="flex items-center gap-2 font-semibold"><CalendarDays className="h-4 w-4 text-primary" />{m.month}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {m.days.map((d) => (
                  <a key={d} href={waHref(info, c, ` com saída em ${d} de ${m.month}`)} target="_blank" rel="noopener noreferrer" className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold text-primary transition hover:bg-primary hover:text-primary-foreground">{d}</a>
                ))}
              </div>
            </div>
          ))}
        </div>
        )}
        {c.departuresNote && <p className="mt-3 text-sm text-muted-foreground">{c.departuresNote}</p>}
      </div></section>

      {/* Notas + FAQ */}
      <section className="bg-card py-14">
        <div className={`${wrap} grid gap-10 md:grid-cols-2`}>
          {c.notes?.length ? (
            <div>
              <p className={eyebrow}>Antes de viajar</p>
              <h2 className={h2}>Informações importantes</h2>
              <div className="mt-6 space-y-3">
                {c.notes.map((n) => <div key={n.title} className={`rounded-2xl border border-border bg-card p-4${rail ? " circuit-note circuit-inclusion" : ""}`}><p className="font-semibold">{n.title}</p><p className="mt-1 text-sm leading-6 text-muted-foreground">{n.text}</p></div>)}
              </div>
            </div>
          ) : null}
          <div>
            <p className={eyebrow}>Dúvidas</p>
            <h2 className={h2}>Perguntas frequentes</h2>
            <Accordion type="single" collapsible className="mt-6">
              {c.faq.map((f, i) => (
                <AccordionItem key={f.q} value={`f${i}`}><AccordionTrigger className="text-left">{f.q}</AccordionTrigger><AccordionContent className="leading-7 text-muted-foreground">{f.a}</AccordionContent></AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      {/* Barra fixa mobile */}
      <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-3 border-t border-border bg-background/95 px-4 py-3 backdrop-blur md:hidden">
        <div className="min-w-0"><p className="truncate text-sm font-semibold">{c.title}</p><p className="text-xs text-muted-foreground">A partir de {price}</p></div>
        {enhanced ? <Button size="sm" className="shrink-0" onClick={scrollToDepartures}>Solicitar orçamento</Button> : <Button asChild size="sm"><a href={waHref(info, c)} target="_blank" rel="noopener noreferrer"><MessageCircle className="mr-1.5 h-4 w-4" />Cotar</a></Button>}
      </div>
      {enhanced && <CircuitQuoteDialog hostname={info.hostname} circuit={c} departure={departure} onClose={() => setDeparture(null)} />}
    </div>
  );
}

const BR_MONTHS = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
const brGuideLabel = (iso: string) => { const [, m, d] = iso.split("-").map(Number); return `${d} de ${BR_MONTHS[m - 1]}`; };

function GuideCornerFlag() {
  return <span aria-hidden="true" className="absolute -right-2 -top-2"><BrFlag className="h-3 w-[18px]" /></span>;
}

function BrFlag({ className = "h-3.5 w-5" }: { className?: string }) { return <svg viewBox="0 0 20 14" aria-hidden="true" className={`${className} shrink-0 rounded-[2px] shadow-sm`}><rect width="20" height="14" fill="#009C3B" /><path d="M10 1.6 18.2 7 10 12.4 1.8 7Z" fill="#FFDF00" /><circle cx="10" cy="7" r="3" fill="#002776" /></svg>; }
export default function CircuitTourPage({ info }: { info: AgencyDomainInfo }) {
  const { slug } = useParams();
  const circuit = findCircuit(slug, info.hostname);
  if (!circuit) return <div className={`${wrap} py-24 text-center text-muted-foreground`}>Circuito não encontrado.</div>;
  return <CircuitTourView info={info} circuit={circuit} />;
}
