import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Check, Globe2, MapPin, MessageCircle, Route as RouteIcon, Users } from "lucide-react";
import { SEO } from "@/components/seo/SEO";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { siteContainer } from "@/lib/agencySiteTheme";
import { type AgencyDomainInfo, agencyWhatsappNumber } from "@/lib/agencyDomains";
import amandaLisboa from "@/assets/whitelabel/100-limites/banner-amanda-lisboa-bonde.png.asset.json";
import destinoGastronomia from "@/assets/whitelabel/destino-gastronomia.jpg";
import ptSintra from "@/assets/whitelabel/100-limites/pt-sintra.jpg";
import ptFatima from "@/assets/whitelabel/100-limites/pt-fatima.jpg";
import ptPorto from "@/assets/whitelabel/100-limites/pt-porto.jpg";
import ptDouro from "@/assets/whitelabel/100-limites/pt-douro.jpg";
import ptAlentejo from "@/assets/whitelabel/100-limites/pt-alentejo.jpg";
import ptAldeias from "@/assets/whitelabel/100-limites/pt-aldeias.jpg";
import dmcGrupos from "@/assets/whitelabel/100-limites/dmc-grupos.jpg";
import dmcEuropa from "@/assets/whitelabel/100-limites/dmc-europa.jpg";
import { DmcRequestButton, DmcRequestCartProvider, useDmcCart } from "@/components/whitelabel/DmcRequestCart";

const PT_SLIDES = [
  { src: ptSintra, label: "Sintra, Cascais e Cabo da Roca" },
  { src: ptFatima, label: "Fátima e Centro de Portugal" },
  { src: ptPorto, label: "Porto" },
  { src: ptDouro, label: "Vale do Douro" },
  { src: ptAlentejo, label: "Alentejo" },
  { src: ptAldeias, label: "Aldeias Históricas" },
];

function PortugalDestinationsGallery() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % PT_SLIDES.length), 4500);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="relative mt-6 aspect-[16/9] w-full overflow-hidden rounded-2xl md:aspect-[3/1]">
      {PT_SLIDES.map((s, idx) => (
        <img
          key={s.label}
          src={s.src}
          alt={s.label}
          loading={idx === 0 ? undefined : "lazy"}
          width={1808}
          height={768}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${idx === i ? "opacity-100" : "opacity-0"}`}
        />
      ))}
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-gradient-to-t from-foreground/70 to-transparent p-4 md:p-5">
        <span className="text-sm font-semibold text-background md:text-base">{PT_SLIDES[i].label}</span>
        <div className="flex gap-1.5">
          {PT_SLIDES.map((s, idx) => (
            <button
              key={s.label}
              type="button"
              aria-label={s.label}
              onClick={() => setI(idx)}
              className={`h-2 rounded-full transition-all ${idx === i ? "w-6 bg-primary" : "w-2 bg-background/70"}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export const DMC_ANCHORS = [
  { id: "servicos", label: "Assistência" },
  { id: "lisboa", label: "Lisboa" },
  { id: "portugal", label: "Portugal" },
  { id: "grupos", label: "Grupos" },
  { id: "europa", label: "Europa" },
  { id: "pet-friendly", label: "Estadia com pets" },
  { id: "sobre", label: "Sobre" },
  { id: "contato", label: "Contato" },
];

export const DMC_SERVICES = [
  { i: Users, t: "Acompanhamento personalizado — dia completo", d: "Assistência ao longo do dia, com apoio na organização da programação e acompanhamento durante visitas e atividades escolhidas pelo cliente." },
  { i: MapPin, t: "Concierge e assistência ao visitante", d: "Apoio com reservas, recomendações, organização da agenda e orientações práticas para sua estadia em Lisboa e região." },
  { i: RouteIcon, t: "Consultoria e planejamento de itinerários", d: "Planejamento personalizado para conhecer Portugal, com sugestões de destinos, experiências e programação de acordo com seu perfil." },
  { i: Globe2, t: "Apoio local para agências e clientes internacionais", d: "Serviços de apoio operacional, representação local e assistência a clientes internacionais durante sua estadia em Portugal." },
];

type Place = { t: string; d: string; note?: string };

const LISBOA: Place[] = [
  { t: "Acompanhamento no centro histórico de Lisboa", d: "Apoio para organizar visitas escolhidas pelo cliente no Chiado, Bairro Alto e Alfama, com atenção ao seu ritmo e às suas necessidades." },
  { t: "Assistência para visitas em Belém", d: "Consultoria de programação para conhecer a Torre de Belém, o Padrão dos Descobrimentos e os Jerónimos, conforme seus interesses." },
  { t: "Concierge para compras em Lisboa", d: "Recomendações de lojas, reservas e organização da agenda conforme o interesse do visitante." },
];

const REGIOES: { id: string; title: string; places: Place[] }[] = [
  { id: "arredores", title: "Sintra, Cascais e Cabo da Roca", places: [
    { t: "Acompanhamento nos arredores de Lisboa", d: "Apoio no planejamento de visitas em Sintra, Cascais, Estoril e Cabo da Roca. Os locais, atividades e horários são definidos com o cliente, sem programação fechada." },
  ] },
  { id: "fatima", title: "Fátima e Centro de Portugal", places: [
    { t: "Assistência para conhecer Fátima e região", d: "Consultoria de itinerário e apoio ao visitante para atividades de seu interesse em Fátima, Aljustrel, Batalha, Tomar, Nazaré e Óbidos.", note: "A programação do Santuário de Fátima deve ser confirmada para a data da visita." },
  ] },
  { id: "porto", title: "Porto e Douro", places: [
    { t: "Planejamento e apoio no Porto e Douro", d: "Sugestões de destinos, reservas e organização de uma programação personalizada no Porto, Vila Nova de Gaia e Vale do Douro." },
  ] },
  { id: "alentejo", title: "Alentejo", places: [
    { t: "Consultoria para conhecer o Alentejo", d: "Planejamento de visitas escolhidas pelo cliente em Évora e Monsaraz, com recomendações de experiências e apoio com reservas." },
  ] },
  { id: "aldeias", title: "Aldeias Históricas de Portugal", places: [
    { t: "Planejamento nas aldeias históricas", d: "Sugestões para conhecer Monsanto, Sortelha, Marialva e Belmonte, de acordo com seus interesses, ritmo e necessidades de mobilidade." },
  ] },
];

const FAQ = [
  { q: "Que tipo de assistência posso solicitar?", a: "Acompanhamento personalizado, concierge, assistência ao visitante, consultoria de itinerários e apoio local para agências e clientes internacionais." },
  { q: "Posso escolher os locais e a programação?", a: "Sim. Lisboa, Sintra, Fátima e outras regiões são locais onde podemos apoiar sua experiência. A programação é personalizada conforme seus interesses, ritmo e necessidades, sem tours fechados." },
  { q: "Vocês atendem grupos?", a: "Sim. Organizamos a assistência e o acompanhamento conforme o perfil do grupo e os serviços acordados na proposta." },
  { q: "A assistência inclui transporte ou guia turístico oficial?", a: "Não oferecemos transfer, transporte de passageiros, veículos como produto ou serviço de guia turístico oficial. Quando necessário, podemos auxiliar na articulação com empresas parceiras para serviços de transporte, contratados separadamente." },
  { q: "O que está incluído na assistência?", a: "Os serviços de assistência e acompanhamento são descritos na proposta. Reservas, ingressos, refeições e experiências escolhidas pelo cliente têm suas condições e custos definidos separadamente." },
  { q: "Posso solicitar apoio para uma estadia com pets?", a: "Sim. Podemos apoiar o planejamento da estadia, com recomendações e organização da agenda conforme as necessidades do visitante e do animal. A documentação do pet é de responsabilidade do tutor." },
  { q: "Vocês atendem visitantes diretos e agências?", a: "Sim. Oferecemos assistência a visitantes e apoio operacional e representação local para agências e clientes internacionais durante a estadia em Portugal." },
];

function wa(number: string, text: string) {
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}

function PlaceList({ places, prefix }: { places: Place[]; prefix: string }) {
  return (
    <Accordion type="multiple" className="rounded-xl border border-border/60 bg-card px-4">
      {places.map((place, i) => (
        <AccordionItem key={place.t} value={`${prefix}-${i}`}>
          <AccordionTrigger className="text-left">
            <span>
              <span className="block font-semibold">{place.t}</span>
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <p className="text-sm leading-relaxed text-muted-foreground">{place.d}</p>
            {place.note && <p className="mt-2 text-xs font-semibold text-foreground">{place.note}</p>}
            <DmcRequestButton kind="assistencia" title={place.t} className="mt-3" />
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

function CartCta() {
  const cart = useDmcCart();
  if (!cart) return null;
  return (
    <Button size="lg" onClick={() => (cart.items.length ? cart.openCart() : cart.open("assistencia", "Assistência personalizada em Portugal"))}>
      {cart.items.length ? `Finalizar solicitação (${cart.items.length})` : "Solicitar assistência personalizada"}
    </Button>
  );
}

export default function DmcPortugalLandingPage({ info }: { info: AgencyDomainInfo }) {
  const location = useLocation();
  const br = agencyWhatsappNumber(info);
  const talkHref = br ? wa(br, "Olá, Amanda! Gostaria de solicitar assistência e acompanhamento personalizado em Portugal.") : null;
  const netHref = br ? wa(br, "Olá, Amanda! Sou de uma agência de viagens e gostaria de uma proposta de apoio local e assistência personalizada para meus clientes em Portugal.") : null;

  useEffect(() => {
    const id = location.hash.replace("#", "");
    if (!id) return;
    const t = window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
    return () => window.clearTimeout(t);
  }, [location.hash]);

  const Section = ({ id, alt, children }: { id: string; alt?: boolean; children: React.ReactNode }) => (
    <section id={id} className={`scroll-mt-32 ${alt ? "wl-alt-gradient" : "bg-card"}`}>
      <div className={`${siteContainer(true)} py-12 md:py-16`}>{children}</div>
    </section>
  );
  const H2 = ({ k, children }: { k: string; children: React.ReactNode }) => (
    <>
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{k}</p>
      <h2 className="mt-2 text-2xl font-extrabold leading-tight md:text-3xl">{children}</h2>
    </>
  );
  const Ctas = ({ className = "" }: { className?: string }) => (
    <div className={`flex flex-col gap-3 sm:flex-row ${className}`}>
      <CartCta />
      {talkHref && (
        <Button asChild size="lg" variant="outline">
          <a href={talkHref} target="_blank" rel="noopener noreferrer"><MessageCircle className="mr-2 h-4 w-4" />Falar com a Amanda</a>
        </Button>
      )}
    </div>
  );

  return (
    <DmcRequestCartProvider hostname={info.hostname} whatsapp={br}>
      <SEO
        title="Assistência e acompanhamento personalizado em Portugal | 100 Limites"
        exactTitle
        canonical={`https://${info.hostname}/dmc-portugal`}
        description="Assistência e acompanhamento personalizado em Portugal com a 100 Limites: concierge turístico, apoio ao visitante e consultoria de itinerários."
      />

      {/* Hero */}
      <section className="bg-card">
        <div className={`${siteContainer(true)} grid items-center gap-10 py-12 md:grid-cols-[1.1fr_0.9fr] md:py-20`}>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">100 Limites · Apoio local em Portugal</p>
            <h1 className="mt-3 text-4xl font-extrabold leading-tight tracking-tight md:text-5xl">
              Assistência e acompanhamento personalizado em Portugal
            </h1>
            <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
              Conte com a 100 Limites para planejar sua estadia e aproveitar Portugal com apoio local, atenção aos detalhes e acompanhamento personalizado. Oferecemos serviços de concierge turístico, assistência ao visitante e consultoria de itinerários, respeitando seus interesses, seu ritmo e suas necessidades.
            </p>
            <Ctas className="mt-7" />
          </div>
          <img src={amandaLisboa.url} alt="Amanda Larini em Lisboa, Portugal" className="aspect-[4/3] w-full rounded-2xl object-cover" />
        </div>
        <nav aria-label="Seções da página" className="border-y border-border/60">
          <div className={`${siteContainer(true)} flex gap-2 overflow-x-auto py-3`}>
            {DMC_ANCHORS.map((a) => (
              <a key={a.id} href={`#${a.id}`} className="shrink-0 rounded-full border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted">
                {a.label}
              </a>
            ))}
          </div>
        </nav>
      </section>

      {/* Serviços */}
      <Section id="servicos" alt>
        <H2 k="Serviços">Assistência para sua estadia em Portugal</H2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {DMC_SERVICES.map(({ i: Icon, t, d }) => (
            <div key={t} className="flex flex-col rounded-xl border border-border/60 bg-card p-5">
              <Icon className="h-5 w-5" aria-hidden="true" />
              <p className="mt-3 font-semibold">{t}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{d}</p>
              <DmcRequestButton kind="assistencia" title={t} className="mt-auto self-start pt-3" />
            </div>
          ))}
        </div>
      </Section>

      {/* Lisboa */}
      <Section id="lisboa" alt>
        <div className="grid gap-8 md:grid-cols-[0.8fr_1.2fr]">
          <div>
            <H2 k="Acompanhamento em Lisboa">Lisboa, no seu ritmo</H2>
            <img src={destinoGastronomia} alt="Gastronomia portuguesa" className="mt-6 hidden aspect-[4/3] w-full rounded-2xl object-cover md:block" />
          </div>
          <PlaceList places={LISBOA} prefix="lx" />
        </div>
      </Section>

      {/* Portugal */}
      <Section id="portugal">
        <H2 k="Acompanhamento em Portugal">Locais para sua programação personalizada</H2>
        <PortugalDestinationsGallery />
        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          {REGIOES.map((r) => (
            <div key={r.id} id={r.id} className="scroll-mt-32">
              <h3 className="mb-3 text-lg font-bold">{r.title}</h3>
              <PlaceList places={r.places} prefix={r.id} />
            </div>
          ))}
        </div>
        <p className="mt-6 text-sm text-muted-foreground">
          Os destinos são sugestões para planejar sua estadia, não tours fechados. A assistência é definida na proposta; experiências e serviços de terceiros são contratados separadamente.
        </p>
      </Section>

      {/* Grupos */}
      <Section id="grupos" alt>
        <div className="grid items-center gap-8 md:grid-cols-2">
          <img src={dmcGrupos} alt="Família brindando em uma quinta portuguesa" loading="lazy" className="aspect-[4/3] w-full rounded-2xl object-cover" />
          <div>
            <H2 k="Grupos">Assistência personalizada para grupos</H2>
            <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
              Apoio na organização da agenda, recomendações e acompanhamento para grupos familiares, corporativos, escolares, religiosos e de lazer. A programação é construída com o cliente ou agência, conforme os interesses e as necessidades do grupo.
            </p>
            <DmcRequestButton kind="assistencia" title="Assistência personalizada para grupos" className="mt-5" />
          </div>
        </div>
      </Section>

      {/* Europa */}
      <Section id="europa">
        <div className="grid items-center gap-8 md:grid-cols-2">
          <div>
            <H2 k="Europa">Acompanhamento personalizado pela Europa</H2>
            <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
              Para quem não se sente à vontade viajando sozinho ou quer mais tranquilidade, oferecemos a companhia de uma
              profissional com experiência em roteiros e logística europeia. O roteiro é criado sob medida, conforme os interesses
              do viajante: gastronomia, arte, cultura, compras e momentos de descanso.
            </p>
            <DmcRequestButton kind="assistencia" title="Acompanhamento na Europa" className="mt-5" />
          </div>
          <img src={dmcEuropa} alt="Casal de viajantes com malas em uma ponte europeia" loading="lazy" className="aspect-[4/3] w-full rounded-2xl object-cover" />
        </div>
      </Section>

      {/* Pet friendly */}
      <Section id="pet-friendly" alt>
        <div className="grid items-center gap-8 md:grid-cols-2">
          <img src={ptAlentejo} alt="Paisagem do Alentejo, Portugal" loading="lazy" className="aspect-[4/3] w-full rounded-2xl object-cover" />
          <div>
            <H2 k="Pet friendly">O pet também faz parte da família</H2>
            <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
              Assistência no planejamento de uma estadia com seu animal, com recomendações de locais e apoio na organização da agenda conforme suas necessidades.
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              Informe as necessidades do animal para o planejamento da estadia. A documentação do pet é
              de responsabilidade do tutor.
            </p>
            <DmcRequestButton kind="assistencia" title="Assistência para estadia com pets" className="mt-5" />
          </div>
        </div>
      </Section>

      {/* Processo */}
      <Section id="como-funciona">
        <H2 k="Como funciona">Da solicitação ao acompanhamento</H2>
        <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { t: "Briefing", d: "O cliente ou agência informa datas, adultos, crianças, locais de interesse e assistência desejada." },
            { t: "Proposta", d: "Enviamos a proposta com o que está incluído." },
            { t: "Confirmação", d: "O cliente ou agência confirma a proposta e alinhamos a programação." },
            { t: "Assistência e suporte", d: "Oferecemos o apoio e o acompanhamento acordados para a estadia." },
          ].map((s, i) => (
            <li key={s.t} className="rounded-xl border border-border/60 bg-card p-5">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-foreground text-sm font-bold text-background">{i + 1}</span>
              <p className="mt-3 font-semibold">{s.t}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{s.d}</p>
            </li>
          ))}
        </ol>
      </Section>

      {/* NET */}
      <Section id="tarifario" alt>
        <div className="rounded-2xl border border-border/60 bg-card p-6 md:flex md:items-center md:justify-between md:gap-8 md:p-8">
          <div>
            <H2 k="Para agências">Apoio local para sua agência</H2>
            <p className="mt-3 max-w-2xl text-[15px] text-muted-foreground">
              Solicite uma proposta de apoio operacional, representação local e assistência aos seus clientes durante a estadia em Portugal.
            </p>
          </div>
          {netHref && (
            <Button asChild size="lg" className="mt-5 shrink-0 md:mt-0">
              <a href={netHref} target="_blank" rel="noopener noreferrer"><MessageCircle className="mr-2 h-4 w-4" />Solicitar assistência personalizada</a>
            </Button>
          )}
        </div>
      </Section>

      {/* Sobre */}
      <Section id="sobre">
        <div className="grid items-center gap-8 md:grid-cols-[0.9fr_1.1fr]">
          <img src={amandaLisboa.url} alt="Amanda Larini em Lisboa" className="aspect-[4/5] w-full max-w-md rounded-2xl object-cover" />
          <div>
            <H2 k="Quem somos">Amanda Larini</H2>
            <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
              Mais de 20 anos de experiência no turismo e à frente da 100 Limites Viagens desde 2015. Morar fora do Brasil ampliou
              sua visão sobre atendimento: o diferencial está no cuidado humano, na atenção aos detalhes e no compromisso com cada
              etapa da viagem.
            </p>
            <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
              Em Portugal, Amanda oferece assistência ao visitante, acompanhamento personalizado e apoio local para agências e clientes internacionais.
            </p>
            <ul className="mt-5 space-y-2 text-sm">
              {["100 Limites desde 2015", "Mais de 20 anos de experiência no turismo", "Base em Lisboa, Portugal"].map((f) => (
                <li key={f} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />{f}</li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      {/* FAQ */}
      <Section id="faq" alt>
        <H2 k="Perguntas frequentes">Dúvidas sobre a assistência</H2>
        <Accordion type="single" collapsible className="mt-6 rounded-xl border border-border/60 bg-card px-4">
          {FAQ.map((f, i) => (
            <AccordionItem key={f.q} value={`faq-${i}`}>
              <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
              <AccordionContent className="text-sm leading-relaxed text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </Section>

      {/* Contato */}
      <Section id="contato">
        <div className="text-center">
          <H2 k="Contato">Sua estadia, com apoio em cada detalhe</H2>
          <p className="mx-auto mt-4 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">Conte-nos o que você deseja conhecer e o tipo de assistência de que precisa. Vamos ajudar a organizar uma programação personalizada para sua experiência em Portugal.</p>
          <Ctas className="mt-7 justify-center" />
        </div>
      </Section>
    </DmcRequestCartProvider>
  );
}
