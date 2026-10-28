import { useState } from "react";
import { useParams } from "react-router-dom";
import { BedDouble, Bus, CalendarDays, Clock, Compass, Download, Hotel, MapPin, MessageCircle, Plane, Star, UserRound, Utensils } from "lucide-react";
import { SEO } from "@/components/seo/SEO";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { type AgencyDomainInfo, agencyWhatsappNumber } from "@/lib/agencyDomains";
import { findCircuit, formatCircuitPrice, type CircuitTour } from "@/lib/circuits";
import type { CircuitInclusionIcon } from "@/lib/circuits/types";

const ICONS: Record<CircuitInclusionIcon, typeof Hotel> = {
  hotel: BedDouble, tours: Compass, meals: Utensils, bus: Bus, transfer: Plane, guide: UserRound,
};
const wrap = "mx-auto w-full max-w-[1200px] px-5 md:px-8";
const eyebrow = "text-xs font-semibold uppercase tracking-[0.18em] text-primary";
const h2 = "mt-2 text-3xl font-semibold leading-tight text-foreground md:text-4xl";

function waHref(info: AgencyDomainInfo, c: CircuitTour, extra = "") {
  const n = agencyWhatsappNumber(info);
  const msg = `Olá! Tenho interesse no circuito ${c.title}${extra}. Pode me enviar uma cotação?`;
  return n ? `https://wa.me/${n}?text=${encodeURIComponent(msg)}` : "#contato";
}

export function CircuitTourView({ info, circuit: c }: { info: AgencyDomainInfo; circuit: CircuitTour }) {
  const [open, setOpen] = useState<string[]>(["d1"]);
  const allDays = c.itinerary.map((d) => `d${d.day}`);
  const price = formatCircuitPrice(c.fromPrice, c.currency);

  return (
    <div className="bg-background pb-24 text-foreground md:pb-0">
      <SEO title={`${c.title} · ${c.duration}`} description={c.summary} />

      {/* Hero */}
      <section className="relative">
        <img src={c.heroImage} alt={c.heroAlt} width={1920} height={912} className="h-[420px] w-full object-cover md:h-[520px]" fetchPriority="high" />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/30 to-transparent" />
        <div className={`${wrap} absolute inset-x-0 bottom-0 pb-10`}>
          <span className="inline-block rounded-full bg-background/90 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">{c.badge}</span>
          <h1 className="mt-3 text-4xl font-semibold leading-tight text-background md:text-6xl" style={{ textShadow: "0 2px 12px rgba(0,0,0,.35)" }}>{c.title}</h1>
          <p className="mt-2 text-background/90">{c.cities.join(" · ")}</p>
        </div>
      </section>

      {/* Resumo + preço */}
      <section className={`${wrap} grid gap-8 py-10 md:grid-cols-[1fr_380px]`}>
        <div>
          <div className="flex flex-wrap gap-2">
            {[
              { i: Clock, t: c.duration },
              { i: MapPin, t: `${c.cities.length} cidades` },
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
          <p className="mt-1 text-4xl font-semibold text-primary">{price}</p>
          {c.singleSupplement != null && <p className="mt-1 text-sm text-muted-foreground">Suplemento individual: {formatCircuitPrice(c.singleSupplement, c.currency)}</p>}
          <p className="mt-3 text-xs leading-5 text-muted-foreground">{c.priceNote}</p>
          <Button asChild size="lg" className="mt-5 w-full"><a href={waHref(info, c)} target="_blank" rel="noopener noreferrer"><MessageCircle className="mr-2 h-4 w-4" />Solicitar cotação</a></Button>
          <Button variant="outline" size="lg" className="mt-2 w-full" onClick={() => window.print()}><Download className="mr-2 h-4 w-4" />Baixar roteiro</Button>
        </aside>
      </section>

      {/* Inclusões */}
      <section className="bg-muted/40 py-14">
        <div className={wrap}>
          <p className={eyebrow}>O que está incluído</p>
          <h2 className={h2}>Serviços incluídos</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {c.inclusions.map((x) => { const I = ICONS[x.icon]; return (
              <div key={x.title} className="rounded-2xl border border-border bg-card p-5">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><I className="h-5 w-5" /></span>
                <h3 className="mt-4 font-semibold">{x.title}</h3>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{x.text}</p>
              </div>
            ); })}
          </div>
        </div>
      </section>

      {/* Destaques + hotéis */}
      <section className={`${wrap} grid gap-10 py-14 md:grid-cols-2`}>
        <div>
          <p className={eyebrow}>Experiências</p>
          <h2 className={h2}>Destaques da viagem</h2>
          <ul className="mt-6 space-y-3">
            {c.highlights.map((h) => <li key={h} className="flex gap-3"><Star className="mt-0.5 h-5 w-5 shrink-0 text-primary" /><span>{h}</span></li>)}
          </ul>
        </div>
        <div>
          <p className={eyebrow}>Hospedagem</p>
          <h2 className={h2}>Hotéis previstos</h2>
          <div className="mt-6 divide-y divide-border rounded-2xl border border-border bg-card">
            {c.hotels.map((h) => (
              <div key={h.city} className="flex gap-4 p-4">
                <span className="w-28 shrink-0 font-semibold">{h.city}</span>
                <span className="text-sm leading-6 text-muted-foreground">{h.options.join(" ou ")}</span>
              </div>
            ))}
          </div>
          {c.hotelsNote && <p className="mt-2 text-xs text-muted-foreground">{c.hotelsNote}</p>}
        </div>
      </section>

      {/* Roteiro */}
      <section className="bg-muted/40 py-14">
        <div className={wrap}>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div><p className={eyebrow}>Dia a dia</p><h2 className={h2}>Roteiro</h2></div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setOpen(allDays)}>Expandir todos</Button>
              <Button variant="outline" size="sm" onClick={() => setOpen([])}>Recolher todos</Button>
            </div>
          </div>
          <Accordion type="multiple" value={open} onValueChange={setOpen} className="mt-6 space-y-3">
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
          </Accordion>
        </div>
      </section>

      {/* Saídas */}
      <section className={`${wrap} py-14`}>
        <p className={eyebrow}>Calendário</p>
        <h2 className={h2}>Saídas garantidas</h2>
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
        {c.departuresNote && <p className="mt-3 text-sm text-muted-foreground">{c.departuresNote}</p>}
      </section>

      {/* Notas + FAQ */}
      <section className="bg-muted/40 py-14">
        <div className={`${wrap} grid gap-10 md:grid-cols-2`}>
          {c.notes?.length ? (
            <div>
              <p className={eyebrow}>Antes de viajar</p>
              <h2 className={h2}>Informações importantes</h2>
              <div className="mt-6 space-y-3">
                {c.notes.map((n) => <div key={n.title} className="rounded-2xl border border-border bg-card p-4"><p className="font-semibold">{n.title}</p><p className="mt-1 text-sm leading-6 text-muted-foreground">{n.text}</p></div>)}
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
        <Button asChild size="sm"><a href={waHref(info, c)} target="_blank" rel="noopener noreferrer"><MessageCircle className="mr-1.5 h-4 w-4" />Cotar</a></Button>
      </div>
    </div>
  );
}

export default function CircuitTourPage({ info }: { info: AgencyDomainInfo }) {
  const { slug } = useParams();
  const circuit = findCircuit(slug, info.hostname);
  if (!circuit) return <div className={`${wrap} py-24 text-center text-muted-foreground`}>Circuito não encontrado.</div>;
  return <CircuitTourView info={info} circuit={circuit} />;
}
