import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Plane, BedDouble, Car, Bus, Ticket, ShieldCheck, Ship, Compass,
  MessageCircle, ArrowRight, Sparkles, ChevronLeft, ChevronRight, Mail,
  MapPin, CheckCircle2, Quote, Route,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BrandText } from "@/components/ui/brand-text";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";
import {
  type AgencyDomainInfo,
  agencyDisplayName,
  agencyWhatsappNumber,
} from "@/lib/agencyDomains";
import { AgencyQuickQuote } from "@/components/whitelabel/AgencyQuickQuote";
import { AgencyDmcSection } from "@/components/whitelabel/AgencyDmcSection";
import {
  DEFAULT_DIFFERENTIALS, DEFAULT_FAQ, DEFAULT_HIGHLIGHTS,
  resolveDestinations, resolveDmc, resolveHeroSlides, resolveModules, resolveSections,
  type AgencySectionKey,
} from "@/lib/agencySiteConfig";
import { REQUEST_SERVICES } from "@/lib/agencySiteRequests";
import { isEditorialTheme, siteContainer } from "@/lib/agencySiteTheme";
import heroPraia from "@/assets/whitelabel/hero-praia.jpg";
import destinoLitoral from "@/assets/whitelabel/destino-litoral.jpg";
import destinoResort from "@/assets/whitelabel/destino-resort.jpg";
import destinoCruzeiro from "@/assets/whitelabel/destino-cruzeiro.jpg";
import destinoEuropa from "@/assets/whitelabel/destino-europa.jpg";
import destinoParques from "@/assets/whitelabel/destino-parques.jpg";

/** Image slots referenced by the editorial config (config stays asset-free). */
const DESTINATION_IMAGES: Record<string, string> = {
  litoral: destinoLitoral,
  resort: destinoResort,
  cruzeiro: destinoCruzeiro,
  europa: destinoEuropa,
  parques: destinoParques,
};

/** Kept exported: other white-label surfaces import this service list. */
export const AGENCY_SERVICES = [
  { key: "aereo", title: "Aéreo", icon: Plane },
  { key: "hospedagem", title: "Hospedagem", icon: BedDouble },
  { key: "carro", title: "Aluguel de Carro", icon: Car },
  { key: "transfer", title: "Transfer", icon: Bus },
  { key: "ingressos", title: "Ingressos e Atrações", icon: Ticket },
  { key: "seguro", title: "Seguro Viagem", icon: ShieldCheck },
  { key: "cruzeiros", title: "Cruzeiros", icon: Ship },
  { key: "pacotes", title: "Pacotes e Circuitos", icon: Compass },
] as const;

/** Ícone semântico por destaque (nunca o mesmo ícone repetido). */
const HIGHLIGHT_ICONS: Record<string, typeof Route> = {
  "Roteiro sob medida": Route,
  "Aéreo com estratégia": Plane,
  "Viagem protegida": ShieldCheck,
};

function SectionHeading({
  title,
  subtitle,
  editorial,
}: {
  title: string;
  subtitle?: string;
  editorial?: boolean;
}) {
  if (editorial) {
    return (
      <div className="mb-10 max-w-2xl">
        <h2 className="text-3xl font-extrabold leading-tight text-foreground md:text-[2.6rem]">{title}</h2>
        {subtitle && <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground md:text-base">{subtitle}</p>}
      </div>
    );
  }
  return (
    <div className="mb-8 max-w-2xl">
      <h2 className="text-2xl font-semibold text-foreground md:text-3xl">{title}</h2>
      <div className="mt-2 h-1 w-fit min-w-16 rounded-full bg-primary/70" />
      {subtitle && <p className="mt-4 text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

/** Only shows the offers teaser when this agency actually has a published showcase. */
function useAgencyShowcasePublished(slug: string | null | undefined) {
  const { data } = useQuery({
    queryKey: ["agency-site-showcase-published", slug],
    enabled: !!slug,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agency_showcases")
        .select("id")
        .eq("slug", slug as string)
        .eq("is_active", true)
        .maybeSingle();
      if (error) return null;
      return data?.id ?? null;
    },
  });
  return !!data;
}

export default function AgencySiteHome({ info }: { info: AgencyDomainInfo }) {
  const name = agencyDisplayName(info);
  const wa = agencyWhatsappNumber(info);
  const location = [info.city, info.state].filter(Boolean).join(" · ");
  const hostname = info.hostname;

  // Faixa B2B/DMC: exclusiva das agências configuradas por hostname.
  const dmc = useMemo(() => resolveDmc(hostname), [hostname]);
  const sections = useMemo(() => resolveSections({ dmc: !!dmc }), [dmc]);
  const modules = useMemo(() => resolveModules(), []);
  const destinations = useMemo(() => resolveDestinations(), []);
  const showcasePublished = useAgencyShowcasePublished(info.public_slug || info.agency_slug);

  const [service, setService] = useState(REQUEST_SERVICES[0].key);
  const [requestOpen, setRequestOpen] = useState(false);
  const requestCenterRef = useRef<HTMLDivElement | null>(null);

  const openRequest = useCallback((key: string) => {
    setService(key);
    setRequestOpen(true);
  }, []);

  // Hero banners (1 to 5) come from the central config — no hardcoded copy here.
  const slides = useMemo(
    () => resolveHeroSlides(name, info.cover_image_url, undefined, heroPraia),
    [name, info.cover_image_url],
  );

  const [slide, setSlide] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused || slides.length < 2) return;
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (reduced) return;
    const timer = window.setInterval(() => setSlide((s) => (s + 1) % slides.length), 7000);
    return () => window.clearInterval(timer);
  }, [paused, slides.length]);

  const current = slides[slide];
  const waHref = wa
    ? `https://wa.me/${wa}?text=${encodeURIComponent(`Olá! Vim pelo site da ${name} e gostaria de um atendimento personalizado.`)}`
    : null;

  const renderSection = (key: AgencySectionKey) => {
    switch (key) {
      case "dmc":
        if (!dmc) return null;
        return (
          <AgencyDmcSection
            key={key}
            config={dmc}
            whatsappNumber={wa}
            onFallbackContact={() => openRequest("transfer")}
          />
        );

      case "highlights":
        return (
          <section key={key} id="destaques" className="mx-auto max-w-6xl px-4 py-14 md:py-16">
            <SectionHeading
              title="Destaques"
              subtitle="Três formas de começar agora o planejamento da sua próxima viagem."
            />
            <div className="grid gap-4 md:grid-cols-3">
              {DEFAULT_HIGHLIGHTS.map((h) => (
                <Card key={h.title} className="flex h-full flex-col p-6 transition-shadow hover:shadow-lg">
                  <Sparkles className="mb-4 h-5 w-5 text-primary" aria-hidden="true" />
                  <h3 className="text-base font-semibold text-foreground">{h.title}</h3>
                  <p className="mt-2 flex-1 text-sm text-muted-foreground">{h.text}</p>
                  <Button variant="outline" className="mt-5 w-fit" onClick={() => openRequest(h.service)}>
                    {h.cta} <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Card>
              ))}
            </div>
          </section>
        );

      case "modules":
        return (
          <section key={key} id="campanhas" className="border-y border-border/60 bg-muted/30">
            <div className="mx-auto max-w-6xl px-4 py-14 md:py-16">
              <SectionHeading
                title="Experiências e campanhas"
                subtitle="Temas que a nossa equipe acompanha de perto. Escolha um e conte os detalhes."
              />
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {modules.map((m) => (
                  <Card key={m.key} className="group h-full p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg">
                    <h3 className="text-base font-semibold text-foreground">{m.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{m.text}</p>
                    <Button
                      variant="ghost"
                      className="mt-4 h-auto p-0 text-primary hover:bg-transparent"
                      onClick={() => openRequest(m.service)}
                    >
                      Solicitar atendimento <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Card>
                ))}
              </div>
            </div>
          </section>
        );

      case "offers":
        if (!showcasePublished) return null;
        return (
          <section key={key} id="ofertas" className="mx-auto max-w-6xl px-4 py-14 md:py-16">
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
              <div className="max-w-2xl">
                <h2 className="text-2xl font-semibold text-foreground md:text-3xl">Ofertas selecionadas</h2>
                <div className="mt-2 h-1 w-fit min-w-16 rounded-full bg-primary/70" />
                <p className="mt-4 text-muted-foreground">
                  Nossa vitrine reúne as oportunidades do momento, atualizadas pela equipe.
                </p>
              </div>
              <Button asChild variant="outline">
                <a href="/ofertas">Ver todas as ofertas <ArrowRight className="ml-2 h-4 w-4" /></a>
              </Button>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {destinations.slice(0, 3).map((d) => (
                <a
                  key={d.key}
                  href="/ofertas"
                  className="group relative block overflow-hidden rounded-2xl border border-border/60"
                >
                  <img
                    src={DESTINATION_IMAGES[d.image]}
                    alt={d.title}
                    loading="lazy"
                    className="h-64 w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-5">
                    <span className="inline-flex rounded-full bg-white/20 px-2.5 py-1 text-xs font-medium text-primary-foreground backdrop-blur">
                      {d.label}
                    </span>
                    <h3 className="mt-3 text-lg font-semibold text-primary-foreground">{d.title}</h3>
                    <p className="mt-1 text-sm text-primary-foreground/85">{d.text}</p>
                  </div>
                </a>
              ))}
            </div>
          </section>
        );

      case "destinations":
        return (
          <section key={key} id="destinos" className="border-y border-border/60 bg-muted/30">
            <div className="mx-auto max-w-6xl px-4 py-14 md:py-16">
              <SectionHeading
                title="Descubra o seu próximo destino"
                subtitle="Inspirações que a nossa equipe conhece de perto. Escolha uma e receba uma proposta sob medida."
              />
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {destinations.map((d) => (
                  <button
                    key={d.key}
                    type="button"
                    onClick={() => openRequest(d.service)}
                    className="group relative block overflow-hidden rounded-2xl border border-border/60 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    <img
                      src={DESTINATION_IMAGES[d.image]}
                      alt={d.title}
                      loading="lazy"
                      className="h-56 w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-5">
                      <span className="inline-flex rounded-full bg-white/20 px-2.5 py-1 text-xs font-medium text-primary-foreground backdrop-blur">
                        {d.label}
                      </span>
                      <h3 className="mt-3 text-lg font-semibold text-primary-foreground">{d.title}</h3>
                      <p className="mt-1 text-sm text-primary-foreground/85">{d.text}</p>
                      <span className="mt-3 inline-flex items-center text-sm font-medium text-primary-foreground">
                        Solicitar proposta <ArrowRight className="ml-2 h-4 w-4" />
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </section>
        );

      case "about":
        return (
          <section key={key} id="sobre" className="border-y border-border/60 bg-muted/30">
            <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 md:grid-cols-2 md:py-16">
              <div>
                <h2 className="text-2xl font-semibold text-foreground md:text-3xl">
                  Sobre a <BrandText>{name}</BrandText>
                </h2>
                <div className="mt-2 h-1 w-fit min-w-16 rounded-full bg-primary/70" />
                <p className="mt-6 whitespace-pre-line text-muted-foreground">
                  {info.bio?.trim() ||
                    `A ${name} cuida de cada viagem com atenção aos detalhes: entende o momento de cada cliente, apresenta opções claras e acompanha a experiência do planejamento ao retorno.`}
                </p>
                {info.owner_name && (
                  <p className="mt-6 text-sm text-muted-foreground">
                    Atendimento com <span className="font-medium text-foreground">{info.owner_name}</span>
                  </p>
                )}
                {location && (
                  <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" aria-hidden="true" /> {location}
                  </p>
                )}
              </div>
              <div className="overflow-hidden rounded-2xl border border-border/60 bg-card">
                {info.cover_image_url ? (
                  <img
                    src={info.cover_image_url}
                    alt={`Ambiente de atendimento da ${name}`}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="grid h-full min-h-56 place-items-center bg-gradient-to-br from-primary/15 to-primary/5 p-8 text-center">
                    <p className="text-sm text-muted-foreground">
                      Atendimento personalizado, do planejamento ao retorno da viagem.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </section>
        );

      case "differentials":
        return (
          <section key={key} id="diferenciais" className="mx-auto max-w-6xl px-4 py-14 md:py-16">
            <SectionHeading title="Diferenciais" subtitle="O que muda quando a viagem é planejada com quem acompanha cada detalhe." />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {DEFAULT_DIFFERENTIALS.map((d) => (
                <Card key={d.title} className="h-full p-5">
                  <CheckCircle2 className="mb-3 h-5 w-5 text-primary" aria-hidden="true" />
                  <h3 className="text-sm font-semibold text-foreground">{d.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{d.text}</p>
                </Card>
              ))}
            </div>
          </section>
        );

      case "concierge":
        return (
          <section key={key} id="atendimento" className="border-y border-border/60 bg-muted/30">
            <div className="mx-auto max-w-6xl px-4 py-14 md:py-16">
              <Card className="grid gap-8 p-8 md:grid-cols-2 md:p-10">
                <div>
                  <h2 className="text-2xl font-semibold text-foreground md:text-3xl">Atendimento humano</h2>
                  <div className="mt-2 h-1 w-fit min-w-16 rounded-full bg-primary/70" />
                  <p className="mt-4 text-muted-foreground">
                    Nada de robô decidindo pela sua viagem. Um consultor analisa a sua solicitação,
                    monta as melhores opções e explica cada detalhe antes de você decidir.
                  </p>
                  <div className="mt-8 flex flex-wrap gap-3">
                    <Button size="lg" onClick={() => openRequest("pacotes")}>
                      Solicitar atendimento <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                    {waHref && (
                      <Button asChild size="lg" variant="outline">
                        <a href={waHref} target="_blank" rel="noopener noreferrer">
                          <MessageCircle className="mr-2 h-4 w-4" /> Falar no WhatsApp
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
                <div className="rounded-2xl bg-muted/50 p-6">
                  <h3 className="text-sm font-semibold text-foreground">Como funciona</h3>
                  <ol className="mt-4 space-y-4 text-sm text-muted-foreground">
                    <li><span className="font-medium text-foreground">1.</span> Você envia a solicitação pela Central.</li>
                    <li><span className="font-medium text-foreground">2.</span> Montamos as melhores opções para o seu perfil.</li>
                    <li><span className="font-medium text-foreground">3.</span> Você recebe um orçamento claro para decidir.</li>
                    <li><span className="font-medium text-foreground">4.</span> Reservado, tudo fica na sua Área do Cliente.</li>
                  </ol>
                </div>
              </Card>
            </div>
          </section>
        );

      case "team":
        return (
          <section key={key} id="equipe" className="mx-auto max-w-6xl px-4 py-14 md:py-16">
            <SectionHeading title="Equipe" />
            {info.owner_name ? (
              <Card className="flex items-center gap-4 p-6">
                <span className="grid h-12 w-12 place-items-center rounded-full bg-primary/10 font-semibold text-primary">
                  {info.owner_name.slice(0, 1).toUpperCase()}
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">{info.owner_name}</p>
                  <p className="text-sm text-muted-foreground">Consultoria de viagens</p>
                </div>
              </Card>
            ) : null}
          </section>
        );

      case "testimonials":
        return (
          <section key={key} id="depoimentos" className="mx-auto max-w-6xl px-4 py-14 md:py-16">
            <SectionHeading title="Depoimentos" />
            <Card className="p-6">
              <Quote className="h-5 w-5 text-primary" aria-hidden="true" />
              <p className="mt-3 text-sm text-muted-foreground">
                Espaço reservado para depoimentos reais de clientes, publicados pela agência.
              </p>
            </Card>
          </section>
        );

      case "faq":
        return (
          <section key={key} id="faq" className="border-y border-border/60 bg-muted/30">
            <div className="mx-auto max-w-4xl px-4 py-14 md:py-16">
              <SectionHeading title="Perguntas frequentes" />
              <Accordion type="single" collapsible className="w-full">
                {DEFAULT_FAQ.map((item, index) => (
                  <AccordionItem key={item.q} value={`faq-${index}`}>
                    <AccordionTrigger className="text-left text-base">{item.q}</AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">{item.a}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </section>
        );

      case "newsletter":
        return (
          <section key={key} id="novidades" className="mx-auto max-w-6xl px-4 py-14 md:py-16">
            <Card className="flex flex-col items-start gap-6 p-8 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Mail className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Receba novidades e oportunidades</h2>
                  <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
                    Envie uma solicitação com o seu e-mail e o canal preferido: passamos a avisar
                    quando surgirem oportunidades no seu perfil de viagem.
                  </p>
                </div>
              </div>
              <Button size="lg" variant="outline" onClick={() => openRequest("pacotes")}>
                Quero receber novidades
              </Button>
            </Card>
          </section>
        );

      default:
        return null;
    }
  };

  return (
    <>
      {/* PRIMEIRA DOBRA: hero + Central de Solicitações avançando sobre o banner */}
      <section
        className="relative overflow-hidden pb-32 md:pb-40"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        aria-roledescription="carrossel"
        aria-label="Destaques da agência"
      >
        <div className="absolute inset-0">
          {current.image ? (
            <img src={current.image} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-primary/90 via-primary to-primary/70" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/25" />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 pb-10 pt-20 md:pt-32">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-primary-foreground backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            {location ? `Consultoria de viagens · ${location}` : "Consultoria de viagens"}
          </p>
          <h1 className="max-w-3xl text-3xl font-semibold leading-[1.1] tracking-tight text-primary-foreground md:text-6xl">
            {current.title}
          </h1>
          <p className="mt-4 max-w-2xl text-base text-primary-foreground/85 md:text-lg">{current.subtitle}</p>

          {slides.length > 1 && (
            <div className="mt-8 flex items-center gap-3">
              <button
                type="button"
                aria-label="Destaque anterior"
                onClick={() => setSlide((s) => (s - 1 + slides.length) % slides.length)}
                className="grid h-9 w-9 place-items-center rounded-full bg-white/15 text-primary-foreground backdrop-blur transition hover:bg-white/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="flex gap-2">
                {slides.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    aria-label={`Ir para o destaque ${i + 1}`}
                    aria-current={i === slide}
                    onClick={() => setSlide(i)}
                    className={`h-1.5 rounded-full transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
                      i === slide ? "w-8 bg-white" : "w-4 bg-white/40"
                    }`}
                  />
                ))}
              </div>
              <button
                type="button"
                aria-label="Próximo destaque"
                onClick={() => setSlide((s) => (s + 1) % slides.length)}
                className="grid h-9 w-9 place-items-center rounded-full bg-white/15 text-primary-foreground backdrop-blur transition hover:bg-white/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </section>

      <div ref={requestCenterRef} className="relative z-10 mx-auto -mt-24 max-w-5xl px-4 md:-mt-28">
        <AgencyQuickQuote
          hostname={hostname}
          agencyName={name}
          service={service}
          onServiceChange={setService}
          open={requestOpen}
          onOpenChange={setRequestOpen}
        />
      </div>

      {sections.map((section) => renderSection(section.key))}
    </>
  );
}
