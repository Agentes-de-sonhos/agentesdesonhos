import { useEffect, useMemo, useState } from "react";
import {
  Plane, BedDouble, Car, Bus, Ticket, ShieldCheck, Ship, Compass,
  MessageCircle, ArrowRight, Sparkles, Users, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BrandText } from "@/components/ui/brand-text";
import {
  type AgencyDomainInfo,
  agencyDisplayName,
  agencyWhatsappNumber,
} from "@/lib/agencyDomains";

export const AGENCY_SERVICES = [
  { key: "aereo", title: "Aéreo", icon: Plane, text: "Passagens nacionais e internacionais com as melhores combinações de rota e tarifa." },
  { key: "hospedagem", title: "Hospedagem", icon: BedDouble, text: "Hotéis, resorts e pousadas selecionados de acordo com o seu estilo de viagem." },
  { key: "carro", title: "Aluguel de Carro", icon: Car, text: "Locação com cobertura, categorias e retiradas conferidas antes da reserva." },
  { key: "transfer", title: "Transfer", icon: Bus, text: "Traslados privativos e compartilhados para chegar tranquilo ao destino." },
  { key: "ingressos", title: "Ingressos e Atrações", icon: Ticket, text: "Parques, passeios e experiências com organização de datas e horários." },
  { key: "seguro", title: "Seguro Viagem", icon: ShieldCheck, text: "Coberturas adequadas ao destino, à duração e ao perfil dos viajantes." },
  { key: "cruzeiros", title: "Cruzeiros", icon: Ship, text: "Itinerários, cabines e categorias explicados com clareza antes de decidir." },
  { key: "pacotes", title: "Pacotes e Circuitos", icon: Compass, text: "Roteiros completos, sob medida ou prontos, com apoio do início ao fim." },
] as const;

interface HeroSlide {
  title: string;
  subtitle: string;
  image?: string | null;
}

export default function AgencySiteHome({ info }: { info: AgencyDomainInfo }) {
  const name = agencyDisplayName(info);
  const wa = agencyWhatsappNumber(info);
  const location = [info.city, info.state].filter(Boolean).join(" · ");

  const slides = useMemo<HeroSlide[]>(
    () => [
      {
        title: "Sua próxima viagem começa com quem entende de viagem",
        subtitle: `Planejamento completo, atendimento humano e acompanhamento em cada etapa com a ${name}.`,
        image: info.cover_image_url,
      },
      {
        title: "Roteiros sob medida, do primeiro voo ao último passeio",
        subtitle: "Aéreo, hospedagem, transfers, ingressos e seguro organizados em um só lugar.",
        image: info.cover_image_url,
      },
      {
        title: "Solicite seu orçamento sem compromisso",
        subtitle: "Conte o que você imagina e receba uma proposta clara, com valores e condições.",
        image: info.cover_image_url,
      },
    ],
    [name, info.cover_image_url],
  );

  const [slide, setSlide] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setSlide((s) => (s + 1) % slides.length), 7000);
    return () => window.clearInterval(t);
  }, [slides.length]);

  const current = slides[slide];
  const waHref = wa ? `https://wa.me/${wa}?text=${encodeURIComponent(`Olá! Vim pelo site da ${name} e gostaria de um orçamento de viagem.`)}` : null;

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          {current.image ? (
            <img src={current.image} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-primary/90 via-primary to-primary/70" />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/55 to-black/25" />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 py-24 md:py-32">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" />
            {location ? `Consultoria de viagens · ${location}` : "Consultoria de viagens"}
          </p>
          <h1 className="max-w-3xl text-3xl font-semibold leading-tight text-white md:text-5xl">
            {current.title}
          </h1>
          <p className="mt-4 max-w-2xl text-base text-white/85 md:text-lg">{current.subtitle}</p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <a href="#atendimento">Solicitar orçamento <ArrowRight className="ml-2 h-4 w-4" /></a>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <a href="/ofertas">Ver ofertas</a>
            </Button>
          </div>

          <div className="mt-10 flex gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Ir para o destaque ${i + 1}`}
                onClick={() => setSlide(i)}
                className={`h-1.5 rounded-full transition-all ${i === slide ? "w-8 bg-white" : "w-4 bg-white/40"}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* SERVIÇOS */}
      <section id="servicos" className="mx-auto max-w-6xl px-4 py-16 md:py-20">
        <div className="mb-10 max-w-2xl">
          <h2 className="text-2xl font-semibold text-foreground md:text-3xl">Serviços</h2>
          <div className="mt-2 h-1 w-fit min-w-16 rounded-full bg-primary/70" />
          <p className="mt-4 text-muted-foreground">
            Tudo o que a sua viagem precisa, organizado por quem acompanha cada detalhe.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {AGENCY_SERVICES.map((s) => (
            <Card key={s.key} className="group h-full p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg">
              <span className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
                <s.icon className="h-5 w-5" />
              </span>
              <h3 className="text-base font-semibold text-foreground">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.text}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* INSTITUCIONAL */}
      <section id="sobre" className="border-y border-border/60 bg-muted/30">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-2 md:py-20">
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
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { icon: Users, title: "Atendimento consultivo", text: "Cada proposta é montada a partir do seu perfil e do seu orçamento." },
              { icon: ShieldCheck, title: "Reservas conferidas", text: "Documentos, prazos e coberturas revisados antes da confirmação." },
              { icon: Clock, title: "Acompanhamento na viagem", text: "Suporte durante o período da viagem, com todos os dados à mão." },
              { icon: Compass, title: "Experiências selecionadas", text: "Fornecedores e passeios escolhidos com critério, não por catálogo." },
            ].map((b) => (
              <Card key={b.title} className="p-5">
                <b.icon className="mb-3 h-5 w-5 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">{b.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{b.text}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ATENDIMENTO / CTA */}
      <section id="atendimento" className="mx-auto max-w-6xl px-4 py-16 md:py-20">
        <Card className="overflow-hidden">
          <div className="grid gap-8 p-8 md:grid-cols-2 md:p-12">
            <div>
              <h2 className="text-2xl font-semibold text-foreground md:text-3xl">
                Vamos planejar a sua viagem?
              </h2>
              <div className="mt-2 h-1 w-fit min-w-16 rounded-full bg-primary/70" />
              <p className="mt-4 text-muted-foreground">
                Conte o destino, as datas aproximadas e quem viaja. A partir disso enviamos um
                orçamento personalizado, com valores e condições de pagamento.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                {waHref ? (
                  <Button asChild size="lg">
                    <a href={waHref} target="_blank" rel="noopener noreferrer">
                      <MessageCircle className="mr-2 h-4 w-4" /> Solicitar orçamento no WhatsApp
                    </a>
                  </Button>
                ) : (
                  <Button asChild size="lg">
                    <a href="/ofertas">Ver ofertas disponíveis</a>
                  </Button>
                )}
                <Button asChild size="lg" variant="outline">
                  <a href="/area-do-cliente">Acessar Área do Cliente</a>
                </Button>
              </div>

              {!waHref && (
                <p className="mt-4 text-xs text-muted-foreground">
                  Canal de WhatsApp em configuração. Enquanto isso, utilize o contato informado
                  pelo seu consultor.
                </p>
              )}
            </div>

            <div className="rounded-2xl bg-muted/40 p-6">
              <h3 className="text-sm font-semibold text-foreground">Como funciona</h3>
              <ol className="mt-4 space-y-4 text-sm text-muted-foreground">
                <li><span className="font-medium text-foreground">1.</span> Você conta a ideia da viagem.</li>
                <li><span className="font-medium text-foreground">2.</span> Recebemos e montamos as melhores opções.</li>
                <li><span className="font-medium text-foreground">3.</span> Você recebe um orçamento claro para decidir.</li>
                <li><span className="font-medium text-foreground">4.</span> Reservado, tudo fica na sua Área do Cliente.</li>
              </ol>
            </div>
          </div>
        </Card>
      </section>
    </>
  );
}