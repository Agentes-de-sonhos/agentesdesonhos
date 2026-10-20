import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Map as MapIcon, MessageCircle, Ticket } from "lucide-react";
import type { AgencyDomainInfo } from "@/lib/agencyDomains";
import { agencyContextHref } from "@/lib/agencyContextLink";
import { siteThemeRootClass } from "@/lib/agencySiteTheme";
import { useAgencySiteThemeOnBody } from "@/lib/agencySitePortalTheme";
import { resolveAgencyHeaderBrandPreset, resolveAgencyLogoUrl } from "@/lib/agencySiteBrand";
import { AgencyFooter } from "@/components/whitelabel/AgencySiteLayout";
import { Button } from "@/components/ui/button";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from "@/components/ui/carousel";
import { SEO } from "@/components/seo/SEO";
import { DisneyParkMapTrigger, type UniversalMapId } from "@/components/orlando/DisneyParkMapDialog";
import { UniversalTicketsConfigurator } from "@/components/landing/universal/UniversalTicketsConfigurator";
import { xcaretWhatsappUrl } from "@/components/landing/xcaret/content";
import {
  UNIVERSAL_CITYWALK,
  UNIVERSAL_EVENTS,
  UNIVERSAL_HERO,
  UNIVERSAL_HOTELS,
  UNIVERSAL_PARKS,
  UNIVERSAL_PHOTO_CREDIT,
} from "@/components/landing/universal/content";

const contentWidth = "mx-auto w-full max-w-[1200px] px-5 md:px-8";
const heading = "text-balance text-3xl font-semibold leading-tight text-foreground md:text-5xl";
const body = "text-pretty text-[16px] leading-7 text-muted-foreground md:text-[17px]";

function WaButton({ label, message, variant = "default", className = "" }: { label: string; message: string; variant?: "default" | "outline" | "secondary"; className?: string }) {
  return (
    <Button asChild size="lg" variant={variant} className={`h-auto min-h-12 whitespace-normal rounded-md px-6 py-3 text-sm ${className}`}>
      <a href={xcaretWhatsappUrl(message)} target="_blank" rel="noopener noreferrer">
        <MessageCircle className="mr-2 h-4 w-4 shrink-0" aria-hidden /> {label}
      </a>
    </Button>
  );
}

function SectionIntro({ kicker, title, children }: { kicker?: string; title: string; children?: React.ReactNode }) {
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
  const links = [
    { label: "Ingressos", to: "#ingressos" },
    { label: "Conheça os parques", to: "#parques" },
    { label: "CityWalk", to: "#citywalk" },
    { label: "Eventos especiais", to: "#eventos" },
    { label: "Conheça os hotéis", to: "#hoteis" },
  ];
  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/95 backdrop-blur">
      <div className={`${contentWidth} flex min-h-[76px] items-center justify-between gap-3 py-2`}>
        <Link to={agencyContextHref("/")} className="flex min-w-0 items-center gap-3">
          {logo && <img src={preset.logoUrl ?? logo} alt={info.agency_name ?? "Agência"} className="h-14 w-auto max-w-[130px] object-contain" />}
          <span className="hidden text-sm font-medium text-muted-foreground sm:inline">Voltar ao site</span>
        </Link>
        <nav aria-label="Nesta página" className="hidden items-center gap-5 lg:flex">
          {links.map((l) => <a key={l.to} href={l.to} className="text-sm font-medium text-foreground/75 hover:text-primary">{l.label}</a>)}
        </nav>
        <a href="#ingressos" className="lg:hidden"><Button size="sm" className="rounded-md"><Ticket className="mr-1.5 h-4 w-4" />Ingressos</Button></a>
      </div>
    </header>
  );
}

function Hero() {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    if (!api) return;
    const update = () => setCurrent(api.selectedScrollSnap());
    update();
    api.on("select", update);
    const t = window.setInterval(() => api.scrollNext(), 7000);
    return () => { api.off("select", update); window.clearInterval(t); };
  }, [api]);
  return (
    <section aria-label="Parques da Universal Orlando Resort" className="relative">
      <Carousel setApi={setApi} opts={{ loop: true }}>
        <CarouselContent className="ml-0">
          {UNIVERSAL_HERO.map((s, i) => (
            <CarouselItem key={s.title} className="pl-0">
              <div className="relative h-[530px] max-h-[530px] w-full overflow-hidden">
                <img src={s.image} alt={s.alt} className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: s.focal ?? "center" }} loading={i === 0 ? "eager" : "lazy"} />
                <div className="absolute inset-0 bg-gradient-to-r from-foreground/80 via-foreground/45 to-transparent" />
                <div className={`${contentWidth} relative flex h-full flex-col justify-end pb-16 md:justify-center md:pb-0`}>
                  <div className="max-w-xl text-background">
                    <img src={s.logo} alt="" className="mb-5 h-16 w-auto object-contain md:h-20" />
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
        {UNIVERSAL_HERO.map((s, i) => (
          <button key={s.title} type="button" aria-label={`Ver ${s.park}`} onClick={() => api?.scrollTo(i)} className={`h-2 rounded-full transition-all ${i === current ? "w-8 bg-background" : "w-2 bg-background/50"}`} />
        ))}
      </div>
    </section>
  );
}

export default function UniversalLandingPage({ info, noindex = false }: { info: AgencyDomainInfo; noindex?: boolean }) {
  useAgencySiteThemeOnBody(info.hostname);
  const agency = info.agency_name ?? "nossa equipe";
  return (
    <div className={`min-h-screen overflow-x-clip bg-background text-foreground ${siteThemeRootClass(info.hostname)}`}>
      {!noindex && <SEO exactTitle title={`Universal Orlando Resort | ${info.agency_name ?? "Ingressos e hotéis"}`} description="Ingressos, parques, hotéis, CityWalk e eventos especiais da Universal Orlando Resort com consultoria personalizada." image={UNIVERSAL_HERO[2].image} />}
      <Header info={info} />
      <main>
        <Hero />

        <section id="ingressos" className="scroll-mt-24 wl-alt-gradient py-16 md:py-20">
          <div className={contentWidth}>
            <UniversalTicketsConfigurator hostname={info.hostname} />
          </div>
        </section>

        <section id="parques" className="scroll-mt-24 bg-background py-16 md:py-24">
          <div className={contentWidth}>
            <SectionIntro kicker="Quatro parques" title="Aproveite ao máximo os parques da Universal Orlando Resort">
              <p>Três parques temáticos e um parque aquático, cada um com sua personalidade. Explore os mapas e descubra quais combinam com a sua viagem.</p>
            </SectionIntro>
            <div className="mt-12 grid gap-6 md:grid-cols-2">
              {UNIVERSAL_PARKS.map((p) => (
                <article key={p.id} className="flex flex-col overflow-hidden rounded-md border border-border bg-card shadow-sm">
                  <div className="relative">
                    <img src={p.image} alt={p.alt} className="aspect-[16/10] w-full object-cover" loading="lazy" />
                    <img src={p.logo} alt={p.name} className="absolute bottom-3 left-3 h-16 w-16 rounded-full bg-background object-contain p-1.5 shadow-md" />
                  </div>
                  <div className="flex flex-1 flex-col p-6">
                    <h3 className="text-2xl font-semibold">{p.name}</h3>
                    <p className="mt-3 flex-1 text-pretty leading-7 text-muted-foreground">{p.description}</p>
                    <ul className="mt-4 flex flex-wrap gap-2">{p.highlights.map((h) => <li key={h} className="rounded-full bg-muted px-3 py-1 text-xs font-medium">{h}</li>)}</ul>
                    <DisneyParkMapTrigger park={p.id as UniversalMapId} ariaLabel={`Explorar o mapa de ${p.name}`} className="mt-6 flex h-11 w-fit items-center gap-2 rounded-md border border-border bg-background px-5 text-sm font-medium hover:border-primary/60 hover:text-primary">
                      <MapIcon className="h-4 w-4" aria-hidden /> Explorar mapa
                    </DisneyParkMapTrigger>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="citywalk" className="scroll-mt-24 wl-alt-gradient py-16 md:py-24">
          <div className={`${contentWidth} grid items-center gap-10 lg:grid-cols-2`}>
            <img src={UNIVERSAL_CITYWALK.image} alt={UNIVERSAL_CITYWALK.alt} className="aspect-square w-full rounded-md object-cover" loading="lazy" />
            <div>
              <img src={UNIVERSAL_CITYWALK.logo} alt="Universal CityWalk" className="mb-5 h-16 w-auto object-contain" />
              <h2 className={heading}>{UNIVERSAL_CITYWALK.title}</h2>
              <div className={`mt-5 space-y-4 ${body}`}>{UNIVERSAL_CITYWALK.paragraphs.map((t) => <p key={t}>{t}</p>)}</div>
              <ul className="mt-6 grid gap-3 sm:grid-cols-2">{UNIVERSAL_CITYWALK.items.map(([t, d]) => <li key={t} className="rounded-md bg-card p-4"><p className="font-semibold">{t}</p><p className="mt-1 text-sm leading-6 text-muted-foreground">{d}</p></li>)}</ul>
            </div>
          </div>
        </section>

        <section id="eventos" className="scroll-mt-24 bg-background py-16 md:py-24">
          <div className={contentWidth}>
            <SectionIntro kicker="Ao longo do ano" title="Eventos especiais da Universal">
              <p>Cada época do ano traz uma Universal diferente. Alguns eventos estão incluídos no ingresso do parque; outros exigem ingresso separado.</p>
            </SectionIntro>
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {UNIVERSAL_EVENTS.map((e) => (
                <article key={e.title} className="flex flex-col overflow-hidden rounded-md border border-border bg-card shadow-sm">
                  {e.image ? <img src={e.image} alt={e.alt} className="aspect-[16/10] w-full object-cover" loading="lazy" /> : <div className="flex aspect-[16/10] w-full items-center justify-center bg-gradient-to-br from-primary/85 to-foreground p-6 text-center text-2xl font-semibold text-background">{e.title}</div>}
                  <div className="flex flex-1 flex-col p-6">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">{e.period}</p>
                    <h3 className="mt-2 text-xl font-semibold">{e.title}</h3>
                    <p className="mt-3 flex-1 text-pretty text-sm leading-6 text-muted-foreground">{e.description}</p>
                    <p className={`mt-4 w-fit rounded-full px-3 py-1 text-xs font-semibold ${e.separateTicket ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>{e.separateTicket ? "Ingresso separado" : "Incluído no ingresso do parque"}</p>
                  </div>
                </article>
              ))}
            </div>
            <p className="mx-auto mt-8 max-w-3xl text-center text-sm leading-6 text-muted-foreground">Datas, programação e condições mudam a cada ano. Confirmamos tudo para as datas da sua viagem.</p>
          </div>
        </section>

        <section id="hoteis" className="scroll-mt-24 wl-alt-gradient py-16 md:py-24">
          <div className={contentWidth}>
            <SectionIntro kicker="Hospedagem" title="Conheça os hotéis da Universal Orlando Resort">
              <p>Hospedar-se no complexo traz vantagens como entrada antecipada nos parques (Early Park Admission, conforme regras vigentes) e transporte gratuito até os parques. Nos hotéis Signature, o Universal Express Unlimited está incluído nos parques participantes.</p>
            </SectionIntro>
            <HotelsGallery />
          </div>
        </section>

        <section className="bg-background py-16 md:py-24">
          <div className={`${contentWidth} max-w-3xl text-center`}>
            <h2 className={heading}>Universal com quem conhece cada detalhe</h2>
            <p className={`mt-5 ${body}`}>Quantos dias reservar, quais parques combinar, quando vale o Express Pass e qual hotel faz sentido para o seu grupo: {agency} ajuda você a planejar a Universal no seu ritmo.</p>
            <div className="mt-8 flex justify-center"><WaButton label="Planejar minha Universal" message="Olá! Quero planejar minha viagem para a Universal Orlando Resort." /></div>
            <p className="mt-10 text-xs text-muted-foreground">{UNIVERSAL_PHOTO_CREDIT}</p>
          </div>
        </section>
      </main>
      <AgencyFooter info={info} />
    </div>
  );
}
