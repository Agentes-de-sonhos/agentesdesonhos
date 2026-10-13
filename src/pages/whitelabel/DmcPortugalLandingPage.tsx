import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Check, Compass, ConciergeBell, Handshake, MessageCircle, UserRoundCheck } from "lucide-react";
import { SEO } from "@/components/seo/SEO";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { siteContainer } from "@/lib/agencySiteTheme";
import { type AgencyDomainInfo, agencyWhatsappNumber } from "@/lib/agencyDomains";
import amandaLisboa from "@/assets/whitelabel/100-limites/banner-amanda-lisboa-bonde.png.asset.json";
import amandaPerfil from "@/assets/whitelabel/100-limites/amanda-larini-perfil.png.asset.json";
import destinoGastronomia from "@/assets/whitelabel/destino-gastronomia.jpg";
import ptSintra from "@/assets/whitelabel/100-limites/pt-sintra.jpg";
import ptFatima from "@/assets/whitelabel/100-limites/pt-fatima.jpg";
import ptPorto from "@/assets/whitelabel/100-limites/pt-porto.jpg";
import ptDouro from "@/assets/whitelabel/100-limites/pt-douro.jpg";
import ptAlentejo from "@/assets/whitelabel/100-limites/pt-alentejo.jpg";
import ptAldeias from "@/assets/whitelabel/100-limites/pt-aldeias.jpg";
import dmcGrupos from "@/assets/whitelabel/100-limites/dmc-grupos.jpg";
import dmcEuropa from "@/assets/whitelabel/100-limites/dmc-europa.jpg";
import dmcPet from "@/assets/whitelabel/100-limites/dmc-pet.jpg";
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

/**
 * Orientação comercial da proprietária: a página oferece assistência,
 * acompanhamento e apoio ao visitante. Não oferece transfer, transporte de
 * passageiros, frota, tours fechados nem serviço de guia turístico oficial.
 */
export const DMC_ANCHORS = [
  { id: "servicos", label: "Serviços" },
  { id: "lisboa", label: "Lisboa" },
  { id: "portugal", label: "Portugal" },
  { id: "grupos", label: "Grupos" },
  { id: "europa", label: "Europa" },
  { id: "pet-friendly", label: "Pet Friendly" },
  { id: "sobre", label: "Sobre" },
  { id: "contato", label: "Contato" },
];

const CTA_LABEL = "Solicitar assistência personalizada";
const PARTNER_NOTE =
  "Quando necessário, podemos auxiliar na articulação com empresas parceiras para serviços de transporte, contratados separadamente.";

type Place = { t: string; d: string; note?: string };

const LISBOA: Place[] = [
  { t: "Centro histórico de Lisboa", d: "Acompanhamento durante visitas ao Chiado, Bairro Alto e Alfama, com mirantes e jardins, no seu ritmo e conforme a programação escolhida por você." },
  { t: "Belém e monumentos", d: "Apoio na organização e acompanhamento durante visitas à Torre de Belém, ao Padrão dos Descobrimentos e aos Jerónimos." },
  { t: "Compras em Lisboa", d: "Recomendações e acompanhamento conforme seus interesses: roupas, vinhos, azeites, outlets, brechós, eletrônicos, perfumaria e maquiagem." },
];

const REGIOES: { id: string; title: string; places: Place[] }[] = [
  {
    id: "arredores", title: "Arredores de Lisboa: Sintra, Cascais e Cabo da Roca",
    places: [
      { t: "Sintra, Cascais, Estoril e Cabo da Roca", d: "Apoio na organização da programação e acompanhamento durante visitas a Sintra, à costa de Cascais e Estoril e ao Cabo da Roca. Palácios como Pena e Quinta da Regaleira podem fazer parte do dia." },
      { t: "Palácio da Pena e Quinta da Regaleira", d: "Assistência para planejar e aproveitar as visitas aos dois principais conjuntos de Sintra.", note: "Ingressos não incluídos." },
    ],
  },
  {
    id: "fatima", title: "Fátima e Centro de Portugal",
    places: [
      { t: "Fátima", d: "Acompanhamento em Aljustrel, na Casa dos Pastorinhos, no Santuário, na Capela das Aparições e nas Basílicas, com tempo para as lojinhas da região." },
      { t: "Fátima e Procissão das Velas", d: "Apoio na organização do dia e acompanhamento durante a Procissão das Velas no recinto do Santuário.", note: "A programação e os horários da procissão são definidos pelo Santuário e devem ser confirmados para a data da viagem." },
      { t: "Batalha, Nazaré, Óbidos, Alcobaça e Tomar", d: "Planejamento e acompanhamento em visitas aos mosteiros da Batalha e de Alcobaça, às falésias da Nazaré, à vila medieval de Óbidos e a Tomar.", note: "Ingressos não incluídos." },
    ],
  },
  {
    id: "porto", title: "Porto e Douro",
    places: [
      { t: "Porto e Vila Nova de Gaia", d: "Acompanhamento no centro histórico, na Sé, na Estação de São Bento, na Ribeira e em Gaia. Caves, provas e cruzeiro no Douro podem ser incluídos na programação, conforme a proposta." },
      { t: "Quintas do Douro", d: "Apoio com reservas e acompanhamento em visitas a quintas do Douro.", note: "Hospedagem, visitas e provas conforme a proposta." },
    ],
  },
  {
    id: "alentejo", title: "Alentejo",
    places: [
      { t: "Évora e Monsaraz", d: "Acompanhamento em Évora, cidade Patrimônio da UNESCO, e na vila medieval de Monsaraz, com vista para o Guadiana e o Alqueva." },
      { t: "Vinícolas do Alentejo", d: "Apoio com reservas e acompanhamento em visitas a vinícolas, como a Adega Cartuxa.", note: "A experiência na vinícola tem custo à parte, conforme o programa escolhido." },
    ],
  },
  {
    id: "aldeias", title: "Aldeias Históricas de Portugal",
    places: [
      { t: "Monsanto, Sortelha, Marialva e Belmonte", d: "Consultoria de itinerário e acompanhamento para quem já conhece o essencial de Portugal e busca vivências mais autênticas.", note: "Recomendado para viajantes com boa mobilidade: há ladeiras e pisos irregulares." },
    ],
  },
];

const FAQ = [
  { q: "Que tipo de serviço a 100 Limites oferece em Portugal?", a: "Assistência e acompanhamento personalizado, concierge turístico, assistência ao visitante e consultoria de itinerários, respeitando seus interesses, seu ritmo e suas necessidades." },
  { q: "Posso personalizar a programação?", a: "Sim. A programação é organizada de acordo com o seu perfil, os locais que você deseja conhecer e o tipo de assistência de que precisa." },
  { q: "Vocês atendem grupos?", a: "Sim. Oferecemos apoio a grupos familiares, corporativos, escolares, religiosos e de lazer, com assistência à agência ou ao organizador." },
  { q: "O transporte está incluído?", a: PARTNER_NOTE },
  { q: "O que está incluído?", a: "Somente o que constar na proposta. Ingressos, refeições, provas, barcos e experiências citados na página não estão incluídos, salvo indicação expressa." },
  { q: "Vocês atendem agências de viagens?", a: "Sim. Oferecemos apoio operacional, representação local e assistência a clientes internacionais de agências durante a estadia em Portugal." },
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
            <span className="block font-semibold">{place.t}</span>
          </AccordionTrigger>
          <AccordionContent>
            <p className="text-sm leading-relaxed text-muted-foreground">{place.d}</p>
            {place.note && <p className="mt-2 text-xs font-semibold text-foreground">{place.note}</p>}
            <DmcRequestButton kind="passeio" title={`Assistência: ${place.t}`} className="mt-3" />
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
    <Button size="lg" onClick={() => (cart.items.length ? cart.openCart() : document.getElementById("servicos")?.scrollIntoView({ behavior: "smooth" }))}>
      {cart.items.length ? `Finalizar solicitação (${cart.items.length})` : CTA_LABEL}
    </Button>
  );
}

const SERVICES = [
  { i: UserRoundCheck, t: "Acompanhamento personalizado — dia completo", d: "Assistência ao longo do dia, com apoio na organização da programação e acompanhamento durante visitas e atividades escolhidas pelo cliente." },
  { i: ConciergeBell, t: "Concierge e assistência ao visitante", d: "Apoio com reservas, recomendações, organização da agenda e orientações práticas para sua estadia em Lisboa e região." },
  { i: Compass, t: "Consultoria e planejamento de itinerários", d: "Planejamento personalizado para conhecer Portugal, com sugestões de destinos, experiências e programação de acordo com seu perfil." },
  { i: Handshake, t: "Apoio local para agências e clientes internacionais", d: "Serviços de apoio operacional, representação local e assistência a clientes internacionais durante sua estadia em Portugal." },
];

export default function DmcPortugalLandingPage({ info }: { info: AgencyDomainInfo }) {
  const location = useLocation();
  const br = agencyWhatsappNumber(info);
  const talkHref = br ? wa(br, "Olá, Amanda! Gostaria de falar sobre assistência e acompanhamento personalizado em Portugal.") : null;
  const netHref = br ? wa(br, "Olá, Amanda! Sou de uma agência de viagens e gostaria de conhecer as condições de apoio local e assistência para meus clientes em Portugal.") : null;

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
        description="Concierge turístico, assistência ao visitante e consultoria de itinerários em Portugal, com apoio local e acompanhamento personalizado da 100 Limites."
      />

      {/* Hero */}
      <section className="bg-card">
        <div className={`${siteContainer(true)} grid items-center gap-10 py-12 md:grid-cols-[1.1fr_0.9fr] md:py-20`}>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Portugal · Assistência ao visitante</p>
            <h1 className="mt-3 text-4xl font-extrabold leading-tight tracking-tight md:text-5xl">
              Assistência e acompanhamento personalizado em Portugal
            </h1>
            <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
              Conte com a 100 Limites para planejar sua estadia e aproveitar Portugal com apoio local, atenção aos detalhes e
              acompanhamento personalizado. Oferecemos serviços de concierge turístico, assistência ao visitante e consultoria de
              itinerários, respeitando seus interesses, seu ritmo e suas necessidades.
            </p>
            <Ctas className="mt-7" />
          </div>
          <img src={amandaLisboa.url} alt="Amanda Larini, da 100 Limites, em Lisboa" className="aspect-[4/3] w-full rounded-2xl object-cover" />
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
        <H2 k="Serviços">Como podemos ajudar em Portugal</H2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {SERVICES.map(({ i: Icon, t, d }) => (
            <div key={t} className="flex flex-col rounded-xl border border-border/60 bg-card p-5">
              <Icon className="h-5 w-5" aria-hidden="true" />
              <p className="mt-3 font-semibold">{t}</p>
              <p className="mt-1 flex-1 text-sm leading-relaxed text-muted-foreground">{d}</p>
              <div className="pt-3">
                <DmcRequestButton kind="especial" title={t} />
              </div>
            </div>
          ))}
        </div>
        <p className="mt-6 text-sm text-muted-foreground">{PARTNER_NOTE}</p>
      </Section>

      {/* Lisboa */}
      <Section id="lisboa">
        <div className="grid gap-8 md:grid-cols-[0.8fr_1.2fr]">
          <div>
            <H2 k="Lisboa">Acompanhamento em Lisboa</H2>
            <img src={destinoGastronomia} alt="Gastronomia portuguesa" className="mt-6 hidden aspect-[4/3] w-full rounded-2xl object-cover md:block" />
          </div>
          <PlaceList places={LISBOA} prefix="lx" />
        </div>
      </Section>

      {/* Portugal */}
      <Section id="portugal" alt>
        <H2 k="Portugal">Onde oferecemos acompanhamento</H2>
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
          Refeições, ingressos, provas, barcos e experiências citados só estão incluídos quando constarem na proposta. {PARTNER_NOTE}
        </p>
      </Section>

      {/* Grupos */}
      <Section id="grupos">
        <div className="grid items-center gap-8 md:grid-cols-2">
          <img src={dmcGrupos} alt="Família brindando em uma quinta portuguesa" loading="lazy" className="aspect-[4/3] w-full rounded-2xl object-cover" />
          <div>
            <H2 k="Grupos">Assistência personalizada para grupos</H2>
            <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
              Grupos familiares, corporativos, escolares, religiosos e de lazer contam com apoio na organização da programação,
              recomendações e acompanhamento durante a estadia, em parceria com cada agência ou organizador.
            </p>
            <DmcRequestButton kind="especial" title="Assistência para grupos" className="mt-5" />
          </div>
        </div>
      </Section>

      {/* Europa */}
      <Section id="europa" alt>
        <div className="grid items-center gap-8 md:grid-cols-2">
          <div>
            <H2 k="Europa">Acompanhamento personalizado pela Europa</H2>
            <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
              Para quem não se sente à vontade viajando sozinho ou quer mais tranquilidade, oferecemos a companhia de uma
              profissional com experiência em roteiros e organização de viagens pela Europa. A programação é criada sob medida,
              conforme os interesses do viajante: gastronomia, arte, cultura, compras e momentos de descanso.
            </p>
            <DmcRequestButton kind="especial" title="Acompanhamento na Europa" className="mt-5" />
          </div>
          <img src={dmcEuropa} alt="Casal de viajantes com malas em uma ponte europeia" loading="lazy" className="aspect-[4/3] w-full rounded-2xl object-cover" />
        </div>
      </Section>

      {/* Pet friendly */}
      <Section id="pet-friendly">
        <div className="grid items-center gap-8 md:grid-cols-2">
          <img src={dmcPet} alt="Cão viajando ao lado da tutora" loading="lazy" className="aspect-[4/3] w-full rounded-2xl object-cover" />
          <div>
            <H2 k="Pet friendly">O pet também faz parte da família</H2>
            <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
              Assistência e orientações práticas para quem chega a Portugal ou viaja pela Europa com seus animais, seja em
              mudança ou lazer, com apoio na organização da estadia e das atividades.
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              As condições devem ser confirmadas com antecedência. A documentação do pet é de responsabilidade do tutor.
            </p>
            <DmcRequestButton kind="especial" title="Assistência pet friendly" className="mt-5" />
          </div>
        </div>
      </Section>

      {/* Processo */}
      <Section id="como-funciona" alt>
        <H2 k="Como funciona">Do primeiro contato à sua estadia</H2>
        <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { t: "Conversa inicial", d: "Você conta datas, número de pessoas, interesses e o tipo de assistência de que precisa." },
            { t: "Proposta", d: "Enviamos a proposta com o que está incluído." },
            { t: "Confirmação", d: "Você confirma e alinhamos os detalhes da programação." },
            { t: "Assistência na estadia", d: "Acompanhamos e apoiamos você durante a estadia em Portugal." },
          ].map((s, i) => (
            <li key={s.t} className="rounded-xl border border-border/60 bg-card p-5">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-foreground text-sm font-bold text-background">{i + 1}</span>
              <p className="mt-3 font-semibold">{s.t}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{s.d}</p>
            </li>
          ))}
        </ol>
      </Section>

      {/* Agências */}
      <Section id="tarifario">
        <div className="rounded-2xl border border-border/60 bg-card p-6 md:flex md:items-center md:justify-between md:gap-8 md:p-8">
          <div>
            <H2 k="Para agências">Apoio local para os clientes da sua agência</H2>
            <p className="mt-3 max-w-2xl text-[15px] text-muted-foreground">
              Apoio operacional, representação local e assistência aos seus clientes durante a estadia em Portugal. As condições
              para agências são enviadas diretamente pela Amanda.
            </p>
          </div>
          {netHref && (
            <Button asChild size="lg" className="mt-5 shrink-0 md:mt-0">
              <a href={netHref} target="_blank" rel="noopener noreferrer"><MessageCircle className="mr-2 h-4 w-4" />Falar sobre parceria</a>
            </Button>
          )}
        </div>
      </Section>

      {/* Sobre */}
      <Section id="sobre" alt>
        <div className="grid items-center gap-8 md:grid-cols-[0.9fr_1.1fr]">
          <img src={amandaPerfil.url} alt="Amanda Larini" className="aspect-[4/5] w-full max-w-md rounded-2xl object-cover" />
          <div>
            <H2 k="Quem somos">Amanda Larini</H2>
            <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
              Mais de 20 anos de experiência no turismo e à frente da 100 Limites Viagens desde 2015. Morar fora do Brasil ampliou
              sua visão sobre atendimento: o diferencial está no cuidado humano, na atenção aos detalhes e no compromisso com cada
              etapa da viagem.
            </p>
            <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
              Em Portugal, a 100 Limites oferece assistência e acompanhamento personalizado a visitantes e a clientes de agências
              parceiras.
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
      <Section id="faq">
        <H2 k="Perguntas frequentes">Dúvidas sobre a assistência em Portugal</H2>
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
      <Section id="contato" alt>
        <div className="text-center">
          <H2 k="Contato">Sua estadia, com apoio em cada detalhe</H2>
          <p className="mx-auto mt-4 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
            Conte-nos o que você deseja conhecer e o tipo de assistência de que precisa. Vamos ajudar a organizar uma programação
            personalizada para sua experiência em Portugal.
          </p>
          <Ctas className="mt-7 justify-center" />
        </div>
      </Section>
    </DmcRequestCartProvider>
  );
}
