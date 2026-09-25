import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, ChevronDown, MessageCircle, Play } from "lucide-react";
import type { AgencyDomainInfo } from "@/lib/agencyDomains";
import { agencyContextHref, agencySiteHref } from "@/lib/agencyContextLink";
import { siteThemeRootClass } from "@/lib/agencySiteTheme";
import { useAgencySiteThemeOnBody } from "@/lib/agencySitePortalTheme";
import { resolveAgencyHeaderBrandPreset, resolveAgencyLogoUrl } from "@/lib/agencySiteBrand";
import { AgencyFooter } from "@/components/whitelabel/AgencySiteLayout";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from "@/components/ui/carousel";
import { SEO } from "@/components/seo/SEO";
import {
  XCARET_EXPERIENCES,
  XCARET_FAQ,
  XCARET_HERO_SLIDES,
  XCARET_IMAGES,
  XCARET_MEDIA_SLOTS,
  xcaretWhatsappUrl,
  type XcaretImage,
} from "@/components/landing/xcaret/content";

const contentWidth = "mx-auto w-full max-w-[1200px] px-5 md:px-8";
const heading = "text-balance text-3xl font-semibold leading-tight text-foreground md:text-5xl";
const body = "text-[16px] leading-7 text-muted-foreground md:text-[17px]";

function Photo({ image, className = "", priority = false }: { image: XcaretImage; className?: string; priority?: boolean }) {
  return <img src={image.src} alt={image.alt} className={className} loading={priority ? "eager" : "lazy"} fetchPriority={priority ? "high" : "auto"} sizes="(max-width: 768px) 100vw, 50vw" />;
}

function WaButton({ label, message, className = "" }: { label: string; message: string; className?: string }) {
  return (
    <Button asChild size="lg" className={`h-auto min-h-12 max-w-full whitespace-normal rounded-md px-6 py-3 text-center text-sm leading-5 ${className}`}>
      <a href={xcaretWhatsappUrl(message)} target="_blank" rel="noopener noreferrer">
        <MessageCircle className="mr-2 h-4 w-4 shrink-0" aria-hidden /> <span>{label}</span>
      </a>
    </Button>
  );
}

type Slots = typeof XCARET_MEDIA_SLOTS;

function SectionIntro({ title, children }: { title: string; children?: React.ReactNode }) {
  return <div className="mx-auto max-w-3xl text-center"><h2 className={heading}>{title}</h2>{children ? <div className={`mt-5 space-y-4 ${body}`}>{children}</div> : null}</div>;
}

function XcaretHeader({ info }: { info: AgencyDomainInfo }) {
  const logo = resolveAgencyLogoUrl(info);
  const preset = resolveAgencyHeaderBrandPreset(info.hostname);
  const links = [{ label: "Parques", to: "#parques" }, { label: "Hotéis", to: "#hoteis" }, { label: "Roteiro", to: "#roteiro" }, { label: "Dúvidas", to: "#duvidas" }];
  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/95 backdrop-blur">
      <div className={`${contentWidth} flex min-h-[76px] items-center justify-between gap-3 py-2`}>
        <Link to={agencyContextHref("/")} className="flex min-w-0 items-center gap-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">
          {logo && <img src={preset.logoUrl ?? logo} alt="Destinos com a Ju" className="h-14 w-auto max-w-[130px] object-contain" />}
          <span className="hidden text-sm font-medium text-muted-foreground sm:inline">Voltar ao site</span>
        </Link>
        <nav aria-label="Nesta página" className="hidden items-center gap-5 lg:flex">
          {links.map((link) => <a key={link.to} href={link.to} className="text-sm font-medium text-foreground/75 hover:text-primary">{link.label}</a>)}
        </nav>
        <WaButton label="Falar com a Ju" message="Oi, Ju! Vi a página sobre Xcaret e gostaria de conhecer as opções para a minha viagem." className="min-h-11 shrink-0 px-3 text-xs sm:px-4 sm:text-sm" />
      </div>
    </header>
  );
}

export function HeroVideoButton() {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label="Assistir ao vídeo sobre o Xcaret"
          className="group flex h-20 w-20 items-center justify-center rounded-full border border-background/60 bg-foreground/35 text-background shadow-lg backdrop-blur transition hover:scale-105 hover:bg-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-background md:h-24 md:w-24"
        >
          <Play className="ml-1 h-8 w-8 md:h-10 md:w-10" aria-hidden />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader><DialogTitle>{XCARET_HERO_VIDEO?.title ?? "Vídeo em breve"}</DialogTitle></DialogHeader>
        {XCARET_HERO_VIDEO ? (
          <video src={XCARET_HERO_VIDEO.src} poster={XCARET_HERO_VIDEO.poster} controls autoPlay playsInline className="aspect-video w-full rounded-md bg-foreground" />
        ) : (
          <p className="text-sm leading-6 text-muted-foreground">O vídeo do Xcaret será exibido aqui assim que o arquivo for enviado.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function Hero({ slots = XCARET_MEDIA_SLOTS }: { slots?: Slots }) {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    if (!api) return;
    const update = () => setCurrent(api.selectedScrollSnap());
    update(); api.on("select", update); return () => { api.off("select", update); };
  }, [api]);
  const total = XCARET_HERO_SLIDES.length;
  const slide = XCARET_HERO_SLIDES[current] ?? XCARET_HERO_SLIDES[0];
  return (
    <section id="inicio" className="relative isolate flex min-h-[640px] flex-col bg-foreground text-background lg:min-h-[min(760px,calc(100vh-76px))]">
      <Carousel setApi={setApi} opts={{ loop: true }} aria-label="Destaques dos parques Xcaret" className="absolute inset-0 -z-10 [&>div]:h-full">
        <CarouselContent className="ml-0 h-full">
          {XCARET_HERO_SLIDES.map((item, index) => (
            <CarouselItem key={item.name} className="relative h-full pl-0" aria-roledescription="slide" aria-label={`${index + 1} de ${total}: ${item.name}`}>
              <Photo image={item.image} priority={index === 0} className="absolute inset-0 h-full w-full object-cover" />
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
      <div className="pointer-events-none absolute inset-0 -z-[5] bg-gradient-to-r from-foreground/90 via-foreground/60 to-foreground/20" aria-hidden />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 -z-[5] h-1/2 bg-gradient-to-t from-foreground/80 to-transparent" aria-hidden />
      <div className={`${contentWidth} pointer-events-none flex flex-1 items-center pb-8 pt-14`}>
        <div className="pointer-events-auto max-w-2xl text-background">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-background/80">Riviera Maya • México</p>
          <h1 className="mt-5 text-balance text-4xl font-semibold leading-[1.05] md:text-6xl lg:text-7xl">Xcaret. Um destino inteiro para se apaixonar.</h1>
          <p className="mt-5 max-w-xl text-[16px] leading-7 text-background/90 md:text-lg">Parques surpreendentes, hotéis à beira-mar e experiências mexicanas em uma viagem planejada para você pela Destinos com a Ju.</p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <WaButton label="Planejar minha viagem com a Ju" message="Oi, Ju! Vi a página sobre Xcaret e gostaria de conhecer as opções para a minha viagem." className="w-full sm:w-auto" />
            <Button asChild variant="outline" size="lg" className="h-auto min-h-12 w-full whitespace-normal border-background/70 bg-background/10 py-3 text-background hover:bg-background/20 hover:text-background sm:w-auto"><a href="#destino">Explorar o destino</a></Button>
          </div>
          <div className="mt-6 flex flex-col items-start gap-2">
            {slots.expertBadge && <img src={slots.expertBadge.src} alt={slots.expertBadge.alt} className="w-36 max-w-[48vw] shrink-0 rounded-lg bg-background/95 object-contain p-2 shadow-md sm:w-44" />}
            <p className="max-w-sm text-sm text-background/80">Conheça com quem esteve lá: Juliana, sua especialista em Xcaret.</p>
          </div>
        </div>
        <div className="pointer-events-auto hidden flex-1 items-center justify-center lg:flex">
          <HeroVideoButton />
        </div>
      </div>
      <div className="pointer-events-none absolute inset-x-0 top-1/2 z-10 flex -translate-y-1/2 justify-center lg:hidden">
        <div className="pointer-events-auto"><HeroVideoButton /></div>
      </div>
      <div className={`${contentWidth} flex flex-col gap-3 pb-4 sm:flex-row sm:items-end sm:justify-between`}>
        <p className="max-w-xl text-sm font-medium text-background" aria-live="polite"><strong>{slide.name}</strong> · {slide.caption} <span className="ml-2 text-xs text-background/75">{String(current + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}</span></p>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="icon" aria-label="Foto anterior" onClick={() => api?.scrollPrev()} className="h-11 w-11 shrink-0 rounded-full border-background/60 bg-foreground/25 text-background hover:bg-foreground/50 hover:text-background"><ArrowLeft className="h-4 w-4" aria-hidden /></Button>
          <div className="flex" role="group" aria-label={`Slide ${current + 1} de ${total}`}>
            {XCARET_HERO_SLIDES.map((item, index) => (
              <button key={item.name} type="button" aria-label={`Ir para ${item.name}`} aria-current={index === current ? "true" : undefined} onClick={() => api?.scrollTo(index)} className="flex h-11 w-7 items-center justify-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-background sm:w-9">
                <span className={`block h-2 rounded-full bg-background transition-[width,opacity] ${index === current ? "w-5 opacity-100" : "w-2 opacity-50"}`} aria-hidden />
              </button>
            ))}
          </div>
          <Button type="button" variant="outline" size="icon" aria-label="Próxima foto" onClick={() => api?.scrollNext()} className="h-11 w-11 shrink-0 rounded-full border-background/60 bg-foreground/25 text-background hover:bg-foreground/50 hover:text-background"><ArrowRight className="h-4 w-4" aria-hidden /></Button>
        </div>
      </div>
    </section>
  );
}

const experienceCards = [
  ["Parques e experiências", "Da tranquilidade da água às aventuras na selva.", XCARET_IMAGES.undergroundRiver],
  ["Hotéis para diferentes estilos", "Em família, a dois ou em uma viagem com mais exclusividade.", XCARET_IMAGES.hotelMexico],
  ["A essência do México", "Gastronomia, música e tradições que fazem parte da viagem.", XCARET_IMAGES.mexicoShow],
] as const;

const xcaretCards = [
  ["Uma natureza que surpreende", "Rios, cavernas e águas cristalinas para explorar de um jeito diferente.", XCARET_IMAGES.undergroundRiver],
  ["Tempo para curtir o Caribe", "Entre uma descoberta e outra, aproveite a paisagem e os espaços para relaxar.", XCARET_IMAGES.xcaret],
  ["Um México que emociona", "Música, cores e tradições em um espetáculo para guardar na memória.", XCARET_IMAGES.mexicoShow],
] as const;

const hotels = [
  ["Hotel Xcaret México", "Para compartilhar em família", "Natureza, piscinas e espaços para diferentes idades. Uma opção para combinar os dias de parque com momentos de descanso e diversão em família.", XCARET_IMAGES.hotelMexico],
  ["Hotel Xcaret Arte", "Para aproveitar a dois ou entre amigos", "Arte mexicana, experiências gastronômicas e oficinas criativas em uma hospedagem que recebe visitantes a partir de 16 anos.", XCARET_IMAGES.hotelArte],
  ["La Casa de la Playa", "Para uma viagem com mais exclusividade", "Um hotel boutique somente para adultos, com 63 suítes, piscinas privativas e experiências personalizadas. Um convite para celebrar e desacelerar.", XCARET_IMAGES.casaPlaya],
] as const;

const itinerary = [
  ["Dia 1", "Bem-vindo ao Caribe", "Chegada, acomodação e primeiros momentos para conhecer o hotel."],
  ["Dia 2", "Um dia no Xcaret", "Natureza, rios subterrâneos e o espetáculo mexicano para encerrar o dia."],
  ["Dia 3", "Aproveite o seu hotel", "Piscinas, gastronomia e tempo livre para descansar no seu ritmo."],
  ["Dia 4", "Mergulhe no Xel-Há", "Um dia de águas cristalinas, snorkel e paisagens para guardar na memória."],
  ["Dia 5", "Aventura no Xplor", "Tirolesas, trilhas e descobertas abaixo da terra."],
  ["Dia 6", "Escolha o seu último encantamento", "Xenses, um passeio de cenotes ou mais tempo no hotel. A escolha é sua."],
  ["Dia 7", "Até a próxima, México", "Despedida e retorno, conforme o horário do voo."],
] as const;

export function Specialist({ slots = XCARET_MEDIA_SLOTS }: { slots?: Slots }) {
  const media = [slots.portraitJuliana, slots.trainingPhoto].filter((m): m is XcaretImage => !!m);
  return (
    <section id="especialista" className="scroll-mt-24 bg-secondary py-16 md:py-24"><div className={`${contentWidth} ${media.length ? "grid items-center gap-10 lg:grid-cols-2" : ""}`}>
      {media.length > 0 && (
        <div className={`grid gap-4 ${media.length > 1 ? "sm:grid-cols-2" : ""}`} data-testid="specialist-media">
          {media.map((m) => <Photo key={m.src} image={m} className="aspect-[4/5] w-full rounded-md object-cover" />)}
        </div>
      )}
      <div className={media.length ? "" : "mx-auto max-w-3xl"}>
        <div className="flex flex-wrap items-center gap-3"><p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Atendimento pessoal</p>{slots.expertBadge && <img src={slots.expertBadge.src} alt={slots.expertBadge.alt} loading="lazy" className="w-36 max-w-[52vw] rounded-lg bg-card object-contain p-2 shadow-sm ring-1 ring-border sm:w-44" />}</div>
        <h2 className={`${heading} mt-4`}>Eu fui conhecer o Xcaret para planejar a sua viagem com ainda mais cuidado.</h2>
        <div className={`mt-6 space-y-4 ${body}`}><p>Sou a Juliana, da Destinos com a Ju. Estive no Xcaret para conhecer o destino de perto e participar de uma capacitação especializada.</p><p>Voltei com o selo Expert e ainda mais preparada para ajudar você a escolher a hospedagem, os parques e as experiências que combinam com o seu jeito de viajar.</p><p>Quero ouvir o que você imagina para essas férias e transformar tantas possibilidades em uma viagem que faça sentido para você.</p></div>
        <p className="mt-6 font-semibold">Juliana<br/><span className="font-normal text-muted-foreground">Destinos com a Ju</span></p>
        <WaButton label="Conversar com a Ju sobre minha viagem" message="Oi, Ju! Quero conhecer o Xcaret e gostaria da sua ajuda para planejar a viagem." className="mt-7 w-full sm:w-auto" />
      </div>
    </div></section>
  );
}

export function Closing({ slots = XCARET_MEDIA_SLOTS }: { slots?: Slots }) {
  return (
    <section id="contato" className="scroll-mt-24 bg-foreground py-16 text-background md:py-24"><div className={`${contentWidth} text-center`}><div className="mx-auto max-w-3xl">
      {slots.julianaAtDestination && <Photo image={slots.julianaAtDestination} className="mx-auto mb-8 aspect-[16/9] w-full max-w-2xl rounded-md object-cover" />}
      {slots.expertBadge && <img src={slots.expertBadge.src} alt={slots.expertBadge.alt} loading="lazy" className="mx-auto mb-6 w-44 max-w-[70vw] rounded-lg bg-background/95 object-contain p-2 shadow-md" />}
      <h2 className="text-balance text-3xl font-semibold leading-tight md:text-5xl">Seu próximo destino pode ser Xcaret. Vamos planejar juntos?</h2>
      <div className="mt-6 space-y-4 text-[16px] leading-7 text-background/80 md:text-[17px]"><p>Você já imaginou quais dessas experiências gostaria de viver? Agora, vamos combinar suas favoritas com a hospedagem e o ritmo que fazem sentido para você.</p><p>Conte quando pretende viajar, com quem e o que espera dessas férias. Eu ajudo você a transformar essa ideia em uma proposta personalizada.</p></div>
      <p className="mt-6 font-semibold">Juliana<br/><span className="font-normal text-background/70">Destinos com a Ju</span></p>
      <WaButton label="Quero planejar minha viagem com a Ju" message="Oi, Ju! Vi a página sobre Xcaret e quero planejar minha viagem. Gostaria de conversar sobre hotéis, experiências e valores." className="mt-7 w-full sm:w-auto"/>
      <p className="mt-4 text-sm text-background/70">Ainda não definiu as datas? Podemos começar pelas suas ideias.</p>
    </div></div></section>
  );
}

export default function XcaretLandingPage({ info }: { info: AgencyDomainInfo }) {
  useAgencySiteThemeOnBody(info.hostname);
  return (
    <div className={`min-h-screen overflow-x-clip bg-background text-foreground ${siteThemeRootClass(info.hostname)}`}>
      <SEO exactTitle title="Xcaret com a Ju | Parques, Hotéis e Viagem Personalizada" description="Descubra parques, hotéis e experiências Xcaret na Riviera Maya com uma viagem personalizada pela Destinos com a Ju." canonical="https://www.destinoscomaju.com.br/xcaret" image={XCARET_IMAGES.xcaret.src} />
      <XcaretHeader info={info} />
      <main>
        <Hero />

        <section id="destino" className="scroll-mt-24 py-16 md:py-24"><div className={contentWidth}>
          <SectionIntro title="Você chega pelo Caribe. E se apaixona por um México inteiro.">
            <p>Na Riviera Maya, perto de Playa del Carmen, o universo Xcaret reúne parques, hotéis à beira-mar e experiências que combinam natureza, aventura e cultura mexicana.</p>
            <p>Imagine nadar por rios subterrâneos, descobrir paisagens de água cristalina e terminar o dia com os sabores e espetáculos do México. Entre uma descoberta e outra, tempo para aproveitar o seu hotel e viajar no seu ritmo.</p>
          </SectionIntro>
          <div className="mt-10 grid gap-5 md:grid-cols-3">{experienceCards.map(([title, text, image]) => <article key={title} className="overflow-hidden rounded-md border border-border bg-card"><Photo image={image} className="aspect-[4/3] w-full object-cover" /><div className="p-5"><h3 className="text-xl font-semibold">{title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p></div></article>)}</div>
          <p className="mx-auto mt-8 max-w-3xl text-center text-base leading-7 text-foreground">Com a Destinos com a Ju, você descobre quais dessas experiências combinam com você e como reuni-las em uma viagem planejada para o seu perfil.</p>
        </div></section>

        <Specialist />

        <section id="xcaret-parque" className="scroll-mt-24 py-16 md:py-24"><div className={contentWidth}>
          <SectionIntro title="Xcaret. Um dia para descobrir, sentir e se encantar."><p>Nade por rios subterrâneos, descubra caminhos entre a vegetação e aproveite as águas do Caribe. No parque Xcaret, a natureza e a cultura mexicana fazem parte de cada descoberta.</p><p>Ao anoitecer, a experiência continua com o Xcaret México Espectacular, um espetáculo de música, dança e tradições que transforma o encerramento do dia em um dos grandes momentos da viagem.</p></SectionIntro>
          <div className="mt-10 grid gap-5 md:grid-cols-3">{xcaretCards.map(([title, text, image]) => <article key={title} className="overflow-hidden rounded-md bg-card shadow-sm ring-1 ring-border"><Photo image={image} className="aspect-[4/3] w-full object-cover"/><div className="p-5"><h3 className="text-xl font-semibold">{title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p></div></article>)}</div>
          <div className="mx-auto mt-8 max-w-3xl text-center"><p className={body}>A Ju ajuda você a incluir o Xcaret no roteiro e organizar o dia conforme os interesses de quem vai viajar.</p><WaButton label="Quero viver essa experiência" message="Oi, Ju! Me encantei com o parque Xcaret e quero incluí-lo na minha viagem." className="mt-6" /></div>
        </div></section>

        <section id="parques" className="scroll-mt-24 bg-secondary py-16 md:py-24"><div className={contentWidth}>
          <SectionIntro title="Qual dessas experiências tem a sua cara?"><p>Um mergulho em águas cristalinas, uma aventura sobre a selva ou uma noite de festa mexicana. Descubra outras formas de aproveitar o universo Xcaret e escolha suas favoritas com a ajuda da Ju.</p></SectionIntro>
          <Carousel opts={{ align: "start" }} className="mx-auto mt-10 max-w-[1120px]" aria-label="Outras experiências Xcaret"><CarouselContent>{XCARET_EXPERIENCES.map((item) => <CarouselItem key={item.title} className="basis-[88%] sm:basis-1/2 lg:basis-1/3"><article className="h-full overflow-hidden rounded-md bg-card shadow-sm"><Photo image={item.image} className="aspect-[4/3] w-full object-cover"/><div className="p-5"><h3 className="text-xl font-semibold">{item.title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{item.text}</p></div></article></CarouselItem>)}</CarouselContent><CarouselPrevious aria-label="Experiência anterior" className="-left-2 top-[35%] h-11 w-11 md:-left-5"/><CarouselNext aria-label="Próxima experiência" className="-right-2 top-[35%] h-11 w-11 md:-right-5"/></Carousel>
          <div className="mx-auto mt-8 max-w-3xl text-center"><p className={body}>Você não precisa fazer tudo. A Ju ajuda a combinar suas experiências favoritas com tempo para aproveitar o hotel e descansar.</p><WaButton label="Me ajude a escolher minhas experiências" message="Oi, Ju! Quero conhecer o Xcaret e gostaria da sua ajuda para escolher os parques e experiências que combinam comigo." className="mt-6"/></div>
        </div></section>

        <section id="passeios" className="scroll-mt-24 py-16 md:py-24"><div className={contentWidth}>
          <SectionIntro title="Seu próximo encantamento pode estar em um cenote. Ou em uma antiga cidade maia."><p>O universo Xcaret também convida você a explorar outras paisagens e histórias da região. Entre águas cercadas de vegetação e construções que atravessaram séculos, descubra passeios que podem tornar sua viagem ainda mais especial.</p></SectionIntro>
          <div className="mt-10 grid gap-6 md:grid-cols-2">{[["Xenotes: conexão com a natureza", "Conheça cenotes, piscinas naturais formadas na rocha, em um passeio que combina água, vegetação e atividades como caiaque, natação e rapel assistido.", XCARET_IMAGES.xenotes], ["Cultura maia: histórias para descobrir", "Explore sítios arqueológicos como Chichén Itzá ou Tulum em passeios guiados. Uma oportunidade de conhecer outra dimensão do México e enriquecer a sua viagem.", XCARET_IMAGES.chichen]].map(([title,text,image]) => <article key={title as string} className="overflow-hidden rounded-md border border-border"><Photo image={image as XcaretImage} className="aspect-[16/9] w-full object-cover"/><div className="p-6"><h3 className="text-2xl font-semibold">{title as string}</h3><p className="mt-3 leading-7 text-muted-foreground">{text as string}</p></div></article>)}</div>
          <p className="mx-auto mt-8 max-w-3xl text-center text-base leading-7 text-foreground">Conte à Ju o que mais desperta sua curiosidade. Ela ajuda a escolher os passeios e verificar como encaixá-los no seu roteiro.</p>
        </div></section>

        <section id="hoteis" className="scroll-mt-24 bg-secondary py-16 md:py-24"><div className={contentWidth}>
          <SectionIntro title="O hotel também faz parte da descoberta."><p>Imagine voltar de um dia de aventuras e encontrar piscinas, boa gastronomia e paisagens do Caribe esperando por você. Os três hotéis do Xcaret oferecem diferentes formas de viver o destino, com conforto e personalidade mexicana.</p></SectionIntro>
          <div className="mt-10 grid gap-5 lg:grid-cols-3">{hotels.map(([name, label, text, image]) => <article key={name} className="overflow-hidden rounded-md bg-card shadow-sm"><Photo image={image} className="aspect-[4/3] w-full object-cover"/><div className="p-5"><p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">{label}</p><h3 className="mt-2 text-2xl font-semibold">{name}</h3><p className="mt-3 text-sm leading-6 text-muted-foreground">{text}</p></div></article>)}</div>
          <div className="mt-8 rounded-md bg-foreground px-6 py-7 text-background md:px-9"><p className="text-sm font-bold uppercase tracking-[0.16em] text-background/70">Muito além da hospedagem</p><p className="mt-3 max-w-4xl text-lg leading-7">Nos Hotéis Xcaret, a estadia combina alimentação, acesso a parques e experiências e transporte, conforme o hotel e as condições da reserva. A Ju explica o que está incluído e ajuda você a aproveitar essa combinação.</p></div>
          <div className="mx-auto mt-8 max-w-3xl text-center"><p className={body}>Qual deles combina com a sua viagem? Conte à Ju com quem você vai viajar e o que mais valoriza na hospedagem.</p><WaButton label="Quero ajuda para escolher meu hotel" message="Oi, Ju! Gostaria de conhecer as opções de hospedagem do Xcaret e entender qual hotel combina melhor com a minha viagem." className="mt-6"/></div>
        </div></section>

        <section id="roteiro" className="scroll-mt-24 py-16 md:py-24"><div className={contentWidth}>
          <SectionIntro title="Dias de descoberta. Tempo para aproveitar. Uma viagem com a sua cara."><p>Como combinar tantos lugares incríveis? Uma estadia de 6 noites pode ser o ponto de partida para conhecer alguns dos principais parques e ainda aproveitar o hotel. Veja uma ideia de como essa viagem pode acontecer.</p></SectionIntro>
          <div className="mt-10 grid items-start gap-8 lg:grid-cols-[0.85fr_1.15fr]"><Photo image={XCARET_IMAGES.xelHa} className="aspect-[4/5] w-full rounded-md object-cover lg:sticky lg:top-28"/><div><p className="mb-4 text-sm font-bold uppercase tracking-[0.16em] text-primary">Roteiro sugerido · 7 dias / 6 noites</p><ol className="divide-y divide-border border-y border-border">{itinerary.map(([day,title,text]) => <li key={day} className="grid gap-2 py-4 sm:grid-cols-[72px_1fr]"><span className="text-sm font-bold text-primary">{day}</span><div><h3 className="font-semibold">{title}</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">{text}</p></div></li>)}</ol><p className="mt-5 text-sm leading-6 text-muted-foreground">Uma inspiração para a sua viagem. A programação será ajustada às suas datas, ao perfil dos viajantes e à disponibilidade das experiências.</p></div></div>
          <div className="mt-8 rounded-md bg-secondary p-6 md:p-8"><h3 className="text-2xl font-semibold">Quer estender a viagem em Cancún?</h3><p className="mt-3 max-w-3xl leading-7 text-muted-foreground">A Ju também pode combinar sua estadia no Xcaret com alguns dias em Cancún, organizando os hotéis e deslocamentos para você aproveitar os dois destinos.</p></div>
          <div className="text-center"><WaButton label="Quero um roteiro para minha viagem" message="Oi, Ju! Gostei da sugestão de roteiro do Xcaret e quero planejar uma viagem com as minhas datas e preferências." className="mt-7"/></div>
        </div></section>

        <section id="duvidas" className="scroll-mt-24 bg-secondary py-16 md:py-24"><div className={`${contentWidth} max-w-4xl`}><SectionIntro title="Pensando em conhecer o Xcaret? Tire suas primeiras dúvidas."/><Accordion type="single" collapsible className="mt-10 rounded-md border border-border bg-card px-5 md:px-7">{XCARET_FAQ.map(([q,a],index)=><AccordionItem value={`faq-${index}`} key={q}><AccordionTrigger className="min-h-14 text-left text-base hover:no-underline">{q}</AccordionTrigger><AccordionContent className="pr-8 text-[15px] leading-7 text-muted-foreground">{a}</AccordionContent></AccordionItem>)}</Accordion></div></section>

        <Closing />
      </main>
      <AgencyFooter info={info} />
      <a href={agencySiteHref("/#destinos")} className="sr-only">Voltar aos destinos</a>
    </div>
  );
}