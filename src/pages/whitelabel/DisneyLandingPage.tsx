import disneyGoogle from "@/components/landing/disney/disneyHotelsGoogleData.json";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ExternalLink, Map as MapIcon, Ticket } from "lucide-react";
import type { AgencyDomainInfo } from "@/lib/agencyDomains";
import { agencyContextHref } from "@/lib/agencyContextLink";
import { siteThemeRootClass } from "@/lib/agencySiteTheme";
import { useAgencySiteThemeOnBody } from "@/lib/agencySitePortalTheme";
import { resolveAgencyHeaderBrandPreset, resolveAgencyLogoUrl } from "@/lib/agencySiteBrand";
import { AgencyFooter } from "@/components/whitelabel/AgencySiteLayout";
import { Button } from "@/components/ui/button";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from "@/components/ui/carousel";
import { useNoindex } from "@/hooks/useNoindex";
import { DisneyParkMapTrigger } from "@/components/orlando/DisneyParkMapDialog";
import { DisneyTicketsConfigurator } from "@/components/landing/disney/DisneyTicketsConfigurator";
import {
  DISNEY_CONTENT_REVIEWED_AT, DISNEY_EVENTS, DISNEY_FAQ, DISNEY_HERO, DISNEY_HOTEL_BENEFITS, DISNEY_HOTEL_BENEFITS_SOURCE,
  DISNEY_LOGOS, DISNEY_SPRINGS, DISNEY_THEME_PARK_CARDS, DISNEY_WATER_CALENDAR_URL, DISNEY_WATER_PARK_CARDS, EVENT_STATUS_LABEL,
  type DisneyPark,
} from "@/components/landing/disney/content";
import { DISNEY_FUTURE_HOTELS, DISNEY_HOTELS, DISNEY_HOTEL_TABS, KIND_LABEL, OFFICIAL_CATEGORY_LABEL } from "@/components/landing/disney/disneyHotelsCatalog";

const W = "mx-auto w-full max-w-[1200px] px-5 md:px-8";
const heading = "text-balance text-3xl font-semibold leading-tight text-foreground md:text-5xl";
const body = "text-pretty text-[16px] leading-7 text-muted-foreground md:text-[17px]";

function Intro({ kicker, title, children }: { kicker?: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      {kicker && <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-primary">{kicker}</p>}
      <h2 className={heading}>{title}</h2>
      {children ? <div className={`mt-5 space-y-4 ${body}`}>{children}</div> : null}
    </div>
  );
}

function Header({ info }: { info: AgencyDomainInfo }) {
  const logo = resolveAgencyLogoUrl(info);
  const preset = resolveAgencyHeaderBrandPreset(info.hostname);
  const links = [["Ingressos", "#ingressos"], ["Parques", "#parques"], ["Disney Springs", "#disney-springs"], ["Eventos", "#eventos"], ["Hotéis", "#hoteis"], ["Dúvidas", "#duvidas"]];
  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/95 backdrop-blur">
      <div className={`${W} flex min-h-[76px] items-center justify-between gap-3 py-2`}>
        <Link to={agencyContextHref("/")} className="flex min-w-0 items-center gap-3">
          {logo && <img src={preset.logoUrl ?? logo} alt={info.agency_name ?? "Agência"} className="h-14 w-auto max-w-[130px] object-contain" />}
          <span className="hidden text-sm font-medium text-muted-foreground sm:inline">Voltar ao site</span>
        </Link>
        <nav aria-label="Nesta página" className="hidden items-center gap-5 lg:flex">
          {links.map(([l, to]) => <a key={to} href={to} className="text-sm font-medium text-foreground/75 hover:text-primary">{l}</a>)}
        </nav>
        <a href="#ingressos" className="lg:hidden"><Button size="sm" className="rounded-md"><Ticket className="mr-1.5 h-4 w-4" />Ingressos</Button></a>
      </div>
      <nav aria-label="Nesta página (celular)" className="border-t border-border/60 lg:hidden" data-testid="disney-mobile-nav">
        <div className={`${W} flex gap-2 overflow-x-auto py-2 [scrollbar-width:none]`}>
          {links.filter(([, to]) => to !== "#ingressos").map(([l, to]) => <a key={to} href={to} className="shrink-0 rounded-full border border-border px-3 py-1 text-xs font-medium text-foreground/80 hover:text-primary">{l}</a>)}
        </div>
      </nav>
    </header>
  );
}

function Hero() {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    if (!api) return;
    const u = () => setCurrent(api.selectedScrollSnap());
    u(); api.on("select", u);
    const t = window.setInterval(() => api.scrollNext(), 7000);
    return () => { api.off("select", u); window.clearInterval(t); };
  }, [api]);
  return (
    <section aria-label="Parques temáticos do Walt Disney World Resort" className="relative">
      <Carousel setApi={setApi} opts={{ loop: true }}>
        <CarouselContent className="ml-0">
          {DISNEY_HERO.map((s, i) => (
            <CarouselItem key={s.park} className="pl-0">
              <div className="relative h-[530px] max-h-[530px] w-full overflow-hidden bg-gradient-to-br from-primary to-foreground">
                <img src={DISNEY_PARK_PHOTOS[s.park].url} alt={s.alt ?? s.kicker} className="absolute inset-0 h-full w-full object-cover" loading={i === 0 ? "eager" : "lazy"} />
                <div className="absolute inset-0 bg-gradient-to-r from-foreground/80 via-foreground/45 to-transparent" />
                <PhotoCredit p={DISNEY_PARK_PHOTOS[s.park]} className="right-3 top-3" />
                <div className={`${W} relative flex h-full flex-col justify-end pb-16 md:justify-center md:pb-0`}>
                  <div className="max-w-xl text-background">
                    <img src={DISNEY_LOGOS[s.park]} alt="" className="mb-5 h-16 w-auto object-contain brightness-0 invert drop-shadow md:h-20" data-testid="hero-logo" />
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-background/80">{s.kicker}</p>
                    <h1 className="mt-3 text-balance text-4xl font-semibold leading-tight md:text-6xl">{s.title}</h1>
                    <p className="mt-4 text-pretty text-base leading-7 text-background/90 md:text-lg">{s.subtitle}</p>
                  </div>
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious aria-label="Parque anterior" className="left-4 hidden h-11 w-11 md:flex" />
        <CarouselNext aria-label="Próximo parque" className="right-4 hidden h-11 w-11 md:flex" />
      </Carousel>
      <div className="absolute inset-x-0 bottom-6 flex justify-center gap-2">
        {DISNEY_HERO.map((s, i) => <button key={s.park} type="button" aria-label={`Ver ${s.kicker}`} onClick={() => api?.scrollTo(i)} className={`h-2 rounded-full transition-all ${i === current ? "w-8 bg-background" : "w-2 bg-background/50"}`} />)}
      </div>
    </section>
  );
}

function PhotoCredit({ p, className = "" }: { p: DisneyPhoto; className?: string }) {
  const label = `Foto: ${p.credit}`;
  return p.source
    ? <a href={p.source} target="_blank" rel="noopener noreferrer" className={`absolute z-10 max-w-[80%] truncate rounded bg-foreground/60 px-2 py-0.5 text-[10px] text-background hover:underline ${className}`}>{label}</a>
    : <span className={`absolute z-10 max-w-[80%] truncate rounded bg-foreground/60 px-2 py-0.5 text-[10px] text-background ${className}`}>{label}</span>;
}

function ParkCard({ p }: { p: DisneyPark }) {
  const photo = DISNEY_PARK_PHOTOS[p.id];
  return (
    <article className="flex flex-col overflow-hidden rounded-md border border-border bg-card shadow-sm" data-testid={`park-${p.id}`}>
      <div className="relative">
        <img src={photo.url} alt={p.name} className="aspect-[16/10] w-full object-cover" loading="lazy" />
        <img src={DISNEY_LOGOS[p.id]} alt={p.name} className="absolute bottom-3 left-3 h-16 w-16 rounded-full bg-background object-contain p-1.5 shadow-md" />
        <PhotoCredit p={photo} className="bottom-2 right-2" />
      </div>
      <div className="flex flex-1 flex-col p-6">
      <h3 className="text-2xl font-semibold">{p.name}</h3>
      <p className="mt-3 flex-1 leading-7 text-muted-foreground">{p.description}</p>
      <ul className="mt-4 flex flex-wrap gap-2">{p.highlights.map((h) => <li key={h} className="rounded-full bg-muted px-3 py-1 text-xs font-medium">{h}</li>)}</ul>
      <div className="mt-6 flex flex-wrap items-center gap-4">
        <DisneyParkMapTrigger park={p.id} ariaLabel={`Explorar o mapa de ${p.name}`} className="flex h-11 w-fit items-center gap-2 rounded-md border border-border bg-background px-5 text-sm font-medium hover:border-primary/60 hover:text-primary">
          <MapIcon className="h-4 w-4" aria-hidden /> Explorar mapa
        </DisneyParkMapTrigger>
        <a href={p.source} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary">Fonte oficial <ExternalLink className="h-3 w-3" /></a>
      </div>
      </div>
    </article>
  );
}

const STEP = 6;
const GCOVER: Record<string, { url: string; credit?: string } | undefined> = Object.fromEntries(Object.entries(disneyGoogle as Record<string, { photos: { url: string; credit?: string }[] } | null>).map(([k, v]) => [k, v?.photos[0]]));

function HotelsGallery() {
  const [tab, setTab] = useState<(typeof DISNEY_HOTEL_TABS)[number]>("Todos");
  const [n, setN] = useState(STEP);
  const list = tab === "Todos" ? DISNEY_HOTELS : DISNEY_HOTELS.filter((h) => h.category === tab);
  const shown = list.slice(0, n);
  return (
    <div className="mx-auto mt-10 max-w-[1120px]">
      <div role="tablist" aria-label="Categorias oficiais de hospedagem" className="flex gap-2 overflow-x-auto pb-2 md:flex-wrap md:justify-center">
        {DISNEY_HOTEL_TABS.map((t) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => { setTab(t); setN(STEP); }}
            className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium ${tab === t ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-foreground/80 hover:border-primary/60"}`}>
            {t}{t !== "Todos" && ` (${DISNEY_HOTELS.filter((h) => h.category === t).length})`}
          </button>
        ))}
      </div>
      {tab !== "Todos" && <p className="mt-3 text-center text-sm text-muted-foreground">Categoria oficial: {OFFICIAL_CATEGORY_LABEL[tab]}{tab === "Deluxe" ? " (hotéis de luxo)" : ""}</p>}
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3" data-testid="disney-hotels-grid">
        {shown.map((h) => (
          <article key={h.slug} className="flex h-full flex-col overflow-hidden rounded-md border border-border bg-card shadow-sm">
            {GCOVER[h.slug] && (
              <figure className="relative">
                <img src={GCOVER[h.slug]!.url} alt={h.name} loading="lazy" className="aspect-[16/10] w-full object-cover" />
                {GCOVER[h.slug]!.credit && <figcaption className="absolute bottom-2 left-2 max-w-[80%] truncate rounded bg-foreground/60 px-1.5 py-0.5 text-[10px] text-background" data-testid="cover-credit">Foto: {GCOVER[h.slug]!.credit} · Google</figcaption>}
              </figure>
            )}
            <div className="flex flex-1 flex-col p-5">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">{h.category} · {KIND_LABEL[h.kind]}</p>
            <h3 className="mt-2 text-lg font-semibold">{h.name}</h3>
            {h.parent && <p className="mt-1 text-xs text-muted-foreground">Parte do complexo {h.parent}</p>}
            <p className="mt-3 flex-1 text-sm leading-6 text-muted-foreground line-clamp-4">{h.paragraphs[0]}</p>
            <Link to={agencyContextHref(`/disney/hoteis/${h.slug}`)} className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">Conhecer e solicitar cotação <ArrowRight className="h-4 w-4" aria-hidden /></Link>
            </div>
          </article>
        ))}
      </div>
      {list.length > shown.length && (
        <div className="mt-8 flex justify-center"><Button variant="outline" size="lg" className="rounded-md" onClick={() => setN((v) => v + STEP)}>Ver mais hotéis ({list.length - shown.length})</Button></div>
      )}
    </div>
  );
}

export default function DisneyLandingPage({ info }: { info: AgencyDomainInfo }) {
  useAgencySiteThemeOnBody(info.hostname);
  useNoindex();
  useEffect(() => { document.title = `Walt Disney World Resort | ${info.agency_name ?? "Ingressos e hotéis"}`; }, [info.agency_name]);
  return (
    <div className={`min-h-screen overflow-x-clip bg-background text-foreground ${siteThemeRootClass(info.hostname)}`}>
      <Header info={info} />
      <main>
        <Hero />
        <section id="ingressos" className="scroll-mt-24 wl-alt-gradient py-16 md:py-20"><div className={W}><DisneyTicketsConfigurator hostname={info.hostname} /></div></section>

        <section id="parques" className="scroll-mt-24 bg-background py-16 md:py-24">
          <div className={W}>
            <Intro kicker="4 temáticos + 2 aquáticos" title="Os parques do Walt Disney World Resort"><p>Quatro parques temáticos e dois parques aquáticos, cada um com sua personalidade. Explore os mapas e descubra quais combinam com a sua viagem.</p></Intro>
            <h3 className="mt-12 text-xl font-semibold">Parques temáticos</h3>
            <div className="mt-4 grid gap-6 md:grid-cols-2">{DISNEY_THEME_PARK_CARDS.map((p) => <ParkCard key={p.id} p={p} />)}</div>
            <h3 className="mt-12 text-xl font-semibold">Parques aquáticos</h3>
            <div className="mt-4 grid gap-6 md:grid-cols-2">{DISNEY_WATER_PARK_CARDS.map((p) => <ParkCard key={p.id} p={p} />)}</div>
            <p className="mt-6 rounded-md bg-muted/60 p-4 text-sm leading-6 text-muted-foreground">Os dois parques aquáticos não funcionam necessariamente ao mesmo tempo: reformas, clima, capacidade e calendário alteram a operação. <a href={DISNEY_WATER_CALENDAR_URL} target="_blank" rel="noopener noreferrer" className="text-primary underline">Consulte o calendário oficial</a>.</p>
          </div>
        </section>

        <section id="disney-springs" className="scroll-mt-24 wl-alt-gradient py-16 md:py-24">
          <div className={`${W} max-w-4xl`}>
            <Intro kicker="Compras, gastronomia e entretenimento" title={DISNEY_SPRINGS.title}>{DISNEY_SPRINGS.paragraphs.map((t) => <p key={t}>{t}</p>)}</Intro>
          </div>
          <div className={`${W} mt-10`}>
            <Carousel opts={{ align: "start" }} data-testid="springs-gallery">
              <CarouselContent>
                {DISNEY_SPRINGS_SPOTS.map((s) => (
                  <CarouselItem key={s.name} className="basis-[85%] sm:basis-1/2 lg:basis-1/3">
                    <article className="h-full overflow-hidden rounded-md bg-card shadow-sm">
                      <div className="relative"><img src={s.photo.url} alt={s.name} className="aspect-[4/3] w-full object-cover" loading="lazy" /><PhotoCredit p={s.photo} className="bottom-2 right-2" /></div>
                      <div className="p-5">
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">{s.kind}</p>
                        <h3 className="mt-1 text-lg font-semibold">{s.name}</h3>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">{s.text}</p>
                      </div>
                    </article>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious aria-label="Anterior" className="-left-3 hidden md:flex" />
              <CarouselNext aria-label="Próximo" className="-right-3 hidden md:flex" />
            </Carousel>
          </div>
        </section>

        <section id="eventos" className="scroll-mt-24 bg-background py-16 md:py-24">
          <div className={W}>
            <Intro kicker="Ao longo do ano" title="Eventos especiais"><p>Os festivais do EPCOT estão incluídos na entrada válida do parque (comidas, bebidas e produtos à parte). As festas exigem ingresso separado, em noites selecionadas.</p></Intro>
            <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {DISNEY_EVENTS.map((e) => (
                <article key={e.id} className="flex flex-col rounded-md border border-border bg-card p-6 shadow-sm" data-testid={`event-${e.id}`}>
                  {e.logo && <img src={e.logo} alt="" className="mb-4 h-14 w-auto self-start object-contain" />}
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">{e.park}</p>
                  <h3 className="mt-2 text-lg font-semibold">{e.name}</h3>
                  <p className="mt-2 flex-1 text-sm leading-6 text-muted-foreground">{e.description}</p>
                  <p className="mt-3 text-xs text-muted-foreground">{e.season}{e.edition ? ` · Edição anunciada: ${e.edition}` : ""}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${e.ticket === "separate" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>{e.ticket === "separate" ? "Ingresso separado" : "Incluído no ingresso do EPCOT"}</span>
                    <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium">{EVENT_STATUS_LABEL[e.status]}</span>
                  </div>
                  <a href={e.source} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary">Fonte oficial <ExternalLink className="h-3 w-3" /></a>
                </article>
              ))}
            </div>
            <p className="mx-auto mt-8 max-w-3xl text-center text-sm leading-6 text-muted-foreground">Datas e disponibilidade mudam a cada edição; nenhum evento está garantido. Confirmamos tudo para as datas da sua viagem.</p>
          </div>
        </section>

        <section id="hoteis" className="scroll-mt-24 wl-alt-gradient py-16 md:py-24">
          <div className={W}>
            <Intro kicker="Hospedagem" title="Hotéis do Walt Disney World Resort"><p>31 opções nas cinco categorias oficiais: Econômica, Moderada, Deluxe, Villas Deluxe e Acampamento. Villas compartilham complexo com hotéis, mas são acomodações próprias.</p></Intro>
            <ul className="mx-auto mt-6 max-w-3xl space-y-2 text-sm leading-6 text-muted-foreground">{DISNEY_HOTEL_BENEFITS.map((b) => <li key={b}>• {b}</li>)}</ul>
            <p className="mt-2 text-center text-xs"><a href={DISNEY_HOTEL_BENEFITS_SOURCE} target="_blank" rel="noopener noreferrer" className="text-muted-foreground underline">Fonte oficial dos benefícios</a></p>
            <HotelsGallery />
            <div className="mx-auto mt-10 max-w-[1120px] rounded-md border border-dashed border-border p-5">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Em breve · fora do catálogo atual</p>
              {DISNEY_FUTURE_HOTELS.map((h) => (
                <p key={h.slug} className="mt-2 text-sm"><Link to={agencyContextHref(`/disney/hoteis/${h.slug}`)} className="font-semibold text-primary hover:underline">{h.name}</Link> — Deluxe, inauguração anunciada para {h.opening}.</p>
              ))}
            </div>
          </div>
        </section>

        <section id="duvidas" className="scroll-mt-24 bg-background py-16 md:py-24">
          <div className={`${W} max-w-3xl`}>
            <Intro title="Dúvidas frequentes" />
            <div className="mt-10 space-y-3">{DISNEY_FAQ.map(([q, a]) => <details key={q} className="rounded-md border border-border bg-card p-4"><summary className="cursor-pointer font-semibold">{q}</summary><p className="mt-3 text-sm leading-6 text-muted-foreground">{a}</p></details>)}</div>
            <div className="mt-10 flex justify-center"><a href="#ingressos"><Button size="lg" className="rounded-md">Solicitar cotação</Button></a></div>
            <p className="mt-10 text-center text-xs text-muted-foreground">Conteúdo revisado em fontes oficiais Disney em {DISNEY_CONTENT_REVIEWED_AT.split("-").reverse().join("/")}. Disponibilidade, preços e operação são confirmados na cotação. Sem afiliação oficial com a Disney.</p>
          </div>
        </section>
      </main>
      <AgencyFooter info={info} />
    </div>
  );
}
