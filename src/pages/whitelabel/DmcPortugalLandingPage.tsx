import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Car, Check, Dog, Globe2, MapPin, MessageCircle, Plane, Route as RouteIcon, Users } from "lucide-react";
import { SEO } from "@/components/seo/SEO";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { siteContainer } from "@/lib/agencySiteTheme";
import { type AgencyDomainInfo, agencyWhatsappNumber } from "@/lib/agencyDomains";
import dmcAcolhimento from "@/assets/whitelabel/100-limites/dmc-acolhimento-lisboa.jpg";
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

/** Contatos confirmados no portfólio DMC (PDF da agência). */
const PT_WHATSAPP = "351913980085";
const CONTACT_EMAIL = "amanda@100limitesviagens.tur.br";

export const DMC_ANCHORS = [
  { id: "servicos", label: "Serviços" },
  { id: "frota", label: "Frota" },
  { id: "lisboa", label: "Lisboa" },
  { id: "portugal", label: "Portugal" },
  { id: "grupos", label: "Grupos" },
  { id: "europa", label: "Europa" },
  { id: "pet-friendly", label: "Pet Friendly" },
  { id: "sobre", label: "Sobre" },
  { id: "contato", label: "Contato" },
];

type Tour = { t: string; meta?: string; d: string; note?: string };

const LISBOA: Tour[] = [
  { t: "City Walk Lisboa", meta: "Cerca de 6 h · a pé · até 6 pessoas", d: "Centro histórico a pé pelo Chiado, Bairro Alto e Alfama, com mirantes e jardins. Pausas para provar delícias portuguesas podem ser feitas ao longo do caminho.", note: "Grupos acima de 6 pessoas: consulte." },
  { t: "City Tour com veículo executivo", meta: "Cerca de 6 h · panorâmico", d: "Indicado para quem tem dificuldade de locomoção ou prefere um passeio panorâmico, com paradas estratégicas para fotos. Centro histórico, Chiado, Bairro Alto, Alfama, Torre de Belém, Padrão dos Descobrimentos e Jerónimos." },
  { t: "Tour de compras em Lisboa", meta: "Cerca de 6 h", d: "Lojas escolhidas conforme o interesse do grupo: roupas, vinhos, azeites, outlets, brechós, eletrônicos, perfumaria e maquiagem." },
];

const REGIOES: { id: string; title: string; tours: Tour[] }[] = [
  {
    id: "arredores", title: "Arredores de Lisboa: Sintra, Cascais e Cabo da Roca",
    tours: [
      { t: "Cabo da Roca, Sintra, Cascais e Estoril", meta: "8 a 9 h", d: "Ponto mais ocidental do continente, centro histórico de Sintra, retorno pela costa com Boca do Inferno, baía de Cascais e passeio marítimo do Estoril. Visitas a palácios como Pena e Quinta da Regaleira podem ser combinadas. Horário de almoço ajustado ao ritmo do grupo." },
      { t: "Sintra com Palácio da Pena e Quinta da Regaleira", meta: "8 a 9 h", d: "Dia dedicado aos dois principais conjuntos de Sintra.", note: "Ingressos não incluídos." },
      { t: "Cascais — meio dia", meta: "Cerca de 6 h", d: "Passeio pela baía e pelo centro histórico de Cascais." },
      { t: "Sintra — meio dia", meta: "Cerca de 6 h", d: "Centro histórico de Sintra e seus arredores." },
    ],
  },
  {
    id: "fatima", title: "Fátima e Centro de Portugal",
    tours: [
      { t: "Passeio a Fátima", meta: "Cerca de 8 h", d: "Aljustrel e a Casa dos Pastorinhos, Santuário, Capela das Aparições, Basílica de Nossa Senhora do Rosário e Basílica da Santíssima Trindade, com tempo para as lojinhas da região." },
      { t: "Fátima com Procissão das Velas", meta: "Cerca de 11 h · saída à tarde, retorno à noite", d: "Aljustrel, Santuário e tempo livre durante a tarde, seguido da Procissão das Velas no recinto do Santuário.", note: "A programação e os horários da procissão são definidos pelo Santuário e devem ser confirmados para a data da viagem." },
      { t: "Fátima, Batalha, Nazaré e Óbidos", meta: "Cerca de 9 h", d: "Fátima e Aljustrel, Mosteiro da Batalha (Patrimônio da UNESCO), falésias e ondas da Nazaré e a vila medieval de Óbidos." },
      { t: "Batalha, Fátima e Tomar", meta: "Cerca de 9 h", d: "Mosteiro da Batalha, Fátima com Aljustrel e Tomar, cidade do Convento de Cristo, antiga sede dos Templários.", note: "Ingresso no Convento não incluído." },
      { t: "Nazaré e Óbidos", meta: "Cerca de 9 h", d: "Vila de pescadores e falésias da Nazaré, estrada pelo Arelho e São Martinho do Porto e a vila medieval de Óbidos." },
      { t: "Óbidos, Nazaré e Alcobaça", meta: "Cerca de 9 h", d: "Mosteiro de Alcobaça (Patrimônio da UNESCO), ligado à história de D. Pedro e D. Inês de Castro, seguido de Nazaré e Óbidos." },
    ],
  },
  {
    id: "porto", title: "Porto e Douro",
    tours: [
      { t: "Porto — dia inteiro saindo de Lisboa", meta: "Cerca de 10 h", d: "Centro histórico e Sé, Estação de São Bento, Torre dos Clérigos e Livraria Lello por fora, Ribeira e Vila Nova de Gaia. Almoço, caves com prova e cruzeiro no Douro podem ser incluídos conforme a proposta." },
      { t: "Porto com 1 pernoite (2 dias)", meta: "Carro à disposição por 2 diárias", d: "Tempo para conhecer o Porto com calma e retorno a Lisboa ao fim do segundo dia.", note: "Hospedagem não incluída." },
      { t: "Porto e Douro com 1 pernoite (2 dias)", meta: "Carro à disposição por 2 diárias", d: "Porto no primeiro dia e visita a uma quinta do Douro no segundo, com retorno a Lisboa.", note: "Hospedagem não incluída; visita e prova na quinta conforme a proposta." },
    ],
  },
  {
    id: "alentejo", title: "Alentejo",
    tours: [
      { t: "Évora", meta: "Cerca de 6 h · a pé", d: "Cidade Patrimônio da UNESCO: Sé, Templo Romano, muralhas, Aqueduto da Água de Prata e Capela dos Ossos." },
      { t: "Évora e Monsaraz", meta: "Cerca de 8 h", d: "Évora a pé e a vila medieval de Monsaraz, com muralhas, castelo e vista para o Guadiana e o Alqueva." },
      { t: "Évora e Adega Cartuxa", meta: "Cerca de 8 h", d: "Évora a pé e visita a uma das vinícolas mais conhecidas de Portugal, com programas de visita com ou sem prova.", note: "A experiência na vinícola tem custo à parte, conforme o programa escolhido." },
    ],
  },
  {
    id: "aldeias", title: "Aldeias Históricas de Portugal",
    tours: [
      { t: "Monsanto, Sortelha, Marialva e Belmonte", meta: "Roteiro sob medida", d: "Muralhas, castelos e vilarejos de pedra para quem já conhece o essencial de Portugal e busca vivências mais autênticas. Custos definidos conforme o estilo e o ritmo da viagem.", note: "Recomendado para viajantes com boa mobilidade: há ladeiras e pisos irregulares." },
    ],
  },
];

const FAQ = [
  { q: "Os passeios saem de Lisboa?", a: "Sim. Os principais tours do portfólio têm saída de Lisboa. Outros pontos de partida podem ser cotados." },
  { q: "Posso personalizar ou combinar passeios?", a: "Sim. As combinações de passeios de dia inteiro podem ser ajustadas conforme o perfil do cliente." },
  { q: "Vocês atendem grupos?", a: "Sim. Para grupos maiores trabalhamos com parceiros de mini-ônibus (20 lugares) e ônibus de turismo (43 lugares), sob solicitação." },
  { q: "Como funcionam capacidade e bagagens?", a: "A capacidade dos veículos é diferente das faixas de tarifa. As tarifas consideram faixas de até 3 e de 4 a 7 pessoas, com 1 mala de 23 kg e 1 mala de mão por pessoa. Bagagem extra ou volumes especiais devem ser informados na cotação." },
  { q: "O que está incluído em cada passeio?", a: "Somente o que constar na proposta. Ingressos, refeições, provas, barcos e experiências citados nos roteiros não estão incluídos, salvo indicação expressa." },
  { q: "Quais são as condições para viajar com pets?", a: "O transporte de pets é sob consulta. Porte, quantidade de animais, caixa de transporte e documentação devem ser confirmados com antecedência. A documentação do animal é de responsabilidade do tutor." },
  { q: "Vocês atendem passageiros diretos ou apenas agências?", a: "Nosso foco como DMC é representar agências de viagens. Agências recebem o tarifário NET e o suporte operacional." },
];

function wa(number: string, text: string) {
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}

function TourList({ tours, prefix }: { tours: Tour[]; prefix: string }) {
  return (
    <Accordion type="multiple" className="rounded-xl border border-border/60 bg-card px-4">
      {tours.map((tour, i) => (
        <AccordionItem key={tour.t} value={`${prefix}-${i}`}>
          <AccordionTrigger className="text-left">
            <span>
              <span className="block font-semibold">{tour.t}</span>
              {tour.meta && <span className="block text-xs font-normal text-muted-foreground">{tour.meta}</span>}
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <p className="text-sm leading-relaxed text-muted-foreground">{tour.d}</p>
            {tour.note && <p className="mt-2 text-xs font-semibold text-foreground">{tour.note}</p>}
            <DmcRequestButton kind="passeio" title={tour.t} className="mt-3" />
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
    <Button size="lg" onClick={() => (cart.items.length ? cart.openCart() : document.getElementById("frota")?.scrollIntoView({ behavior: "smooth" }))}>
      {cart.items.length ? `Finalizar solicitação (${cart.items.length})` : "Montar minha solicitação"}
    </Button>
  );
}

export default function DmcPortugalLandingPage({ info }: { info: AgencyDomainInfo }) {
  const location = useLocation();
  const br = agencyWhatsappNumber(info);
  const talkHref = br ? wa(br, "Olá, Amanda! Gostaria de falar sobre os serviços de DMC em Portugal.") : null;
  const netHref = br ? wa(br, "Olá, Amanda! Sou de uma agência de viagens e gostaria de receber o tarifário NET atualizado da DMC em Portugal.") : null;

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
        title="DMC em Portugal para agências | 100 Limites"
        description="Receptivo em Portugal para agências brasileiras: transfers privativos, passeios em Lisboa e Portugal, grupos, acompanhamento na Europa e pet friendly."
      />

      {/* Hero */}
      <section className="bg-card">
        <div className={`${siteContainer(true)} grid items-center gap-10 py-12 md:grid-cols-[1.1fr_0.9fr] md:py-20`}>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">DMC em Portugal · Para agências</p>
            <h1 className="mt-3 text-4xl font-extrabold leading-tight tracking-tight md:text-5xl">
              Sua operação receptiva em Portugal, com o cuidado da sua marca
            </h1>
            <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
              A 100 Limites recebe, transporta e acompanha em Portugal os passageiros de agências brasileiras, para que cada
              cliente receba o mesmo cuidado e dedicação que o agente oferece.
            </p>
            <Ctas className="mt-7" />
          </div>
          <img src={dmcAcolhimento} alt="Motorista recebendo passageiros com malas em uma rua de Lisboa" className="aspect-[4/3] w-full rounded-2xl object-cover" />
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
        <H2 k="Serviços">O que operamos para a sua agência</H2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { i: Plane, t: "Transfers privativos", d: "Recepção no desembarque com placa indicativa e contato com o cliente. No transfer out, contato na véspera para organizar o horário de recolha." },
            { i: RouteIcon, t: "Passeios privados", d: "Lisboa, arredores e principais regiões de Portugal, com saída de Lisboa." },
            { i: MapPin, t: "Roteiros sob medida", d: "Combinações de passeios ajustadas ao perfil e ao ritmo de cada cliente." },
            { i: Users, t: "Grupos", d: "Familiares, corporativos, escolares, religiosos e de lazer, com suporte à agência." },
            { i: Globe2, t: "Acompanhamento na Europa", d: "Companhia e apoio logístico personalizado para quem viaja pela Europa." },
            { i: Dog, t: "Pet friendly", d: "Transporte adaptado para viajantes com seus animais, sob consulta." },
          ].map(({ i: Icon, t, d }) => (
            <div key={t} className="flex flex-col rounded-xl border border-border/60 bg-card p-5">
              <Icon className="h-5 w-5" aria-hidden="true" />
              <p className="mt-3 font-semibold">{t}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
        <p className="mt-6 text-sm text-muted-foreground">Transfers com saída de Lisboa para o aeroporto, hotéis, Porto, Coimbra, Algarve e demais regiões de Portugal, sob cotação.</p>
      </Section>

      {/* Frota */}
      <Section id="frota">
        <H2 k="Frota">Veículos conforme o tamanho do grupo</H2>
        {/* 4 colunas só a partir de 1280px: abaixo disso o título da Minivan
            (204px em Manrope 600) não caberia numa coluna de ~250px. A coluna
            central é mais larga justamente para o nome do veículo não quebrar. */}
        <Accordion
          type="multiple"
          className="mt-6 grid items-start gap-4 md:grid-cols-2 xl:grid-cols-[1fr_1.35fr_1fr_1fr]"
        >
          {[
            { t: "Carros executivos", c: "Até 4 passageiros", d: "Modelos premium como Mercedes-Benz V-Class e Jeep Compass, para traslados privados, executivos ou casais." },
            { t: "Minivan Mercedes V-Class", c: "Até 8 pessoas", d: "Mais espaço para famílias e pequenos grupos, com conforto e praticidade." },
            { t: "Mini-ônibus", c: "20 lugares", d: "Por meio de parceiros, sob solicitação, para grupos maiores." },
            { t: "Ônibus de turismo", c: "43 lugares", d: "Por meio de parceiros, sob solicitação, para grupos maiores." },
          ].map((v) => (
            <AccordionItem
              key={v.t}
              value={v.t}
              className="flex flex-col rounded-xl border border-border/60 bg-card px-5 data-[state=open]:self-stretch [&>div:last-child]:flex-1"
            >
              <AccordionTrigger className="text-left">
                <span className="flex items-center gap-3">
                  <Car className="h-5 w-5 shrink-0" aria-hidden="true" />
                  <span>
                    <span className="block min-[360px]:whitespace-nowrap font-semibold">{v.t}</span>
                    <span className="block text-xs font-normal text-muted-foreground">{v.c}</span>
                  </span>
                </span>
              </AccordionTrigger>
              <AccordionContent className="flex h-full flex-col">
                <p className="text-sm leading-relaxed text-muted-foreground">{v.d}</p>
                <div className="mt-auto pt-3">
                  <DmcRequestButton kind="veiculo" title={`${v.t} (${v.c.toLowerCase()})`} />
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        <p className="mt-5 text-sm text-muted-foreground">
          A capacidade de cada veículo é diferente das faixas de tarifa (até 3 e de 4 a 7 pessoas, com 1 mala de 23 kg e 1 mala de
          mão por pessoa). O modelo é definido conforme o número de pessoas e as bagagens, e a disponibilidade é confirmada na proposta.
        </p>
      </Section>

      {/* Lisboa */}
      <Section id="lisboa" alt>
        <div className="grid gap-8 md:grid-cols-[0.8fr_1.2fr]">
          <div>
            <H2 k="Passeios em Lisboa">Lisboa a pé, de carro ou às compras</H2>
            <img src={destinoGastronomia} alt="Gastronomia portuguesa" className="mt-6 hidden aspect-[4/3] w-full rounded-2xl object-cover md:block" />
          </div>
          <TourList tours={LISBOA} prefix="lx" />
        </div>
      </Section>

      {/* Portugal */}
      <Section id="portugal">
        <H2 k="Passeios em Portugal">Saindo de Lisboa para todo o país</H2>
        <PortugalDestinationsGallery />
        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          {REGIOES.map((r) => (
            <div key={r.id} id={r.id} className="scroll-mt-32">
              <h3 className="mb-3 text-lg font-bold">{r.title}</h3>
              <TourList tours={r.tours} prefix={r.id} />
            </div>
          ))}
        </div>
        <p className="mt-6 text-sm text-muted-foreground">
          Refeições, ingressos, provas, barcos e experiências citados nos roteiros só estão incluídos quando constarem na proposta.
        </p>
      </Section>

      {/* Grupos */}
      <Section id="grupos" alt>
        <div className="grid items-center gap-8 md:grid-cols-2">
          <img src={dmcGrupos} alt="Família brindando em uma quinta portuguesa" loading="lazy" className="aspect-[4/3] w-full rounded-2xl object-cover" />
          <div>
            <H2 k="Grupos">Roteiros sob medida para cada grupo</H2>
            <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
              Grupos familiares, corporativos, escolares, religiosos e de lazer, com roteiros criados em parceria com cada agência ou
              operador. Da escolha dos passeios à curadoria de experiências, a agência conta com suporte em cada etapa, da van ao
              ônibus de turismo de 43 lugares.
            </p>
            <DmcRequestButton kind="especial" title="Grupos" className="mt-5" />
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
            <DmcRequestButton kind="especial" title="Acompanhamento na Europa" className="mt-5" />
          </div>
          <img src={dmcEuropa} alt="Casal de viajantes com malas em uma ponte europeia" loading="lazy" className="aspect-[4/3] w-full rounded-2xl object-cover" />
        </div>
      </Section>

      {/* Pet friendly */}
      <Section id="pet-friendly" alt>
        <div className="grid items-center gap-8 md:grid-cols-2">
          <img src={dmcPet} alt="Cão viajando ao lado da tutora em veículo privativo" loading="lazy" className="aspect-[4/3] w-full rounded-2xl object-cover" />
          <div>
            <H2 k="Pet friendly">O pet também faz parte da família</H2>
            <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
              Transporte e acompanhamento para quem chega ou se desloca pela Europa com seus animais, seja em mudança ou lazer.
              Veículos climatizados e adaptados, sob consulta.
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              Porte, quantidade de animais e condições de transporte devem ser confirmados com antecedência. A documentação do pet é
              de responsabilidade do tutor.
            </p>
            <DmcRequestButton kind="especial" title="Pet friendly" className="mt-5" />
          </div>
        </div>
      </Section>

      {/* Processo */}
      <Section id="como-funciona">
        <H2 k="Como funciona">Da cotação à operação</H2>
        <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { t: "Briefing", d: "A agência envia datas, número de passageiros, bagagens e interesses." },
            { t: "Proposta", d: "Enviamos a proposta com o que está incluído." },
            { t: "Confirmação", d: "A agência confirma e alinhamos os detalhes operacionais." },
            { t: "Operação e suporte", d: "Recebemos e acompanhamos os passageiros, com suporte à agência." },
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
            <H2 k="Para agências">Agências: solicite o tarifário NET atualizado</H2>
            <p className="mt-3 max-w-2xl text-[15px] text-muted-foreground">
              Os valores para agências são enviados diretamente pela Amanda, com a comissão a ser adicionada pela própria agência.
            </p>
          </div>
          {netHref && (
            <Button asChild size="lg" className="mt-5 shrink-0 md:mt-0">
              <a href={netHref} target="_blank" rel="noopener noreferrer"><MessageCircle className="mr-2 h-4 w-4" />Solicitar tarifário NET</a>
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
              Como DMC em Portugal, o foco é representar agências de viagens e refletir a confiança da sua marca em cada atendimento.
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
        <H2 k="Perguntas frequentes">Dúvidas das agências</H2>
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
          <H2 k="Contato">Vamos receber seus clientes em Portugal?</H2>
          <Ctas className="mt-7 justify-center" />
        </div>
      </Section>
    </DmcRequestCartProvider>
  );
}
