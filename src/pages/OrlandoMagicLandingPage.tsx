import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Ticket,
  ShieldCheck,
  Headphones,
  Sparkles,
  Trophy,
  Star,
  MapPin,
  Calendar,
  Users,
  PlayCircle,
  Check,
  ArrowRight,
  Quote,
} from "lucide-react";
import arenaInterior from "@/assets/orlando-magic/arena-interior.jpg";
import arenaExterior from "@/assets/orlando-magic/arena-exterior.jpg";
import familyFun from "@/assets/orlando-magic/family-fun.jpg";
import seatsUpper from "@/assets/orlando-magic/seats-upper.jpg";
import seatsCourtside from "@/assets/orlando-magic/seats-courtside.jpg";
import seatsMid from "@/assets/orlando-magic/seats-mid.jpg";

const BENEFITS = [
  {
    icon: Ticket,
    title: "Ingressos oficiais",
    text: "Emissão direta pela franquia, com garantia de autenticidade e entrega digital imediata.",
  },
  {
    icon: ShieldCheck,
    title: "Compra 100% segura",
    text: "Pagamento em BRL, parcelado em até 12x, com proteção total ao agente e ao cliente final.",
  },
  {
    icon: Headphones,
    title: "Suporte especializado",
    text: "Atendimento em português antes, durante e depois do jogo, direto de Orlando.",
  },
  {
    icon: Sparkles,
    title: "Experiência premium",
    text: "Opções de meet & greet, hospitalidade e experiências VIP para elevar o pacote.",
  },
];

const CATEGORIES = [
  {
    image: seatsUpper,
    tag: "Fan Zone",
    title: "Terrace Level",
    price: "US$ 79",
    perks: [
      "Vista panorâmica do jogo",
      "Acesso a áreas de alimentação",
      "Ideal para famílias",
    ],
  },
  {
    image: seatsMid,
    tag: "Mais vendido",
    title: "Club Level",
    price: "US$ 189",
    perks: [
      "Assentos preferenciais no meio da arena",
      "Entrada exclusiva Club",
      "Bar e lounge privativo",
    ],
    highlight: true,
  },
  {
    image: seatsCourtside,
    tag: "VIP",
    title: "Courtside Experience",
    price: "US$ 899",
    perks: [
      "Assentos à beira da quadra",
      "Serviço dedicado in-seat",
      "Acesso a experiências exclusivas",
    ],
  },
];

const TESTIMONIALS = [
  {
    name: "Marina Alves",
    role: "Agência Rota Livre — SP",
    quote:
      "Vendemos 14 ingressos em uma semana. O material de apoio e o suporte fizeram toda a diferença para fechar as vendas.",
  },
  {
    name: "Rafael Souza",
    role: "Sonho Americano Viagens — RJ",
    quote:
      "O checkout em BRL parcelado destravou clientes que antes desistiam. Ficou fácil montar pacotes completos.",
  },
  {
    name: "Camila Prado",
    role: "Viaje Mais — MG",
    quote:
      "Entrega digital instantânea e atendimento em português. Meus clientes chegaram na arena sem nenhuma dúvida.",
  },
];

const FAQS = [
  {
    q: "Como funciona a comissão para agentes de viagens?",
    a: "Trabalhamos com uma tabela de comissão exclusiva para agentes cadastrados, com repasses transparentes e pagamentos em BRL.",
  },
  {
    q: "Os ingressos são oficiais?",
    a: "Sim. Todos os ingressos são emitidos oficialmente pela franquia, com autenticidade garantida e envio digital.",
  },
  {
    q: "Consigo montar pacotes com hospedagem e transfer?",
    a: "Sim. Você pode combinar os ingressos com serviços complementares dentro do seu portfólio ou solicitar apoio da nossa operação.",
  },
  {
    q: "Qual é a política de cancelamento?",
    a: "Cancelamentos seguem a política do evento. Nosso time envia todas as condições antes da confirmação do pedido.",
  },
  {
    q: "Como recebo o material de vendas?",
    a: "Após o cadastro, você recebe acesso a fotos, textos prontos, tabela de preços e vídeos para usar com seus clientes.",
  },
];

function LeadForm({ id = "lead-form" }: { id?: string }) {
  const [submitted, setSubmitted] = useState(false);
  return (
    <Card
      id={id}
      className="rounded-3xl border-none shadow-2xl bg-card/95 backdrop-blur"
    >
      <CardContent className="p-6 sm:p-8">
        {submitted ? (
          <div className="text-center py-10 space-y-3">
            <div className="mx-auto h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
              <Check className="h-7 w-7 text-primary" />
            </div>
            <h3 className="text-xl font-bold">Recebemos seu contato!</h3>
            <p className="text-sm text-muted-foreground">
              Nosso time comercial vai responder em até 1 dia útil.
            </p>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setSubmitted(true);
            }}
            className="space-y-4"
          >
            <div className="text-center space-y-1 mb-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-primary">
                Acesso para agentes
              </p>
              <h3 className="text-2xl font-bold tracking-tight">
                Receba o material de vendas
              </h3>
              <p className="text-sm text-muted-foreground">
                Preencha e desbloqueie preços, comissão e datas disponíveis.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${id}-nome`}>Nome completo</Label>
              <Input id={`${id}-nome`} required placeholder="Seu nome" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor={`${id}-email`}>E-mail</Label>
                <Input id={`${id}-email`} type="email" required placeholder="voce@agencia.com" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`${id}-tel`}>WhatsApp</Label>
                <Input id={`${id}-tel`} required placeholder="(11) 90000-0000" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${id}-agencia`}>Nome da agência</Label>
              <Input id={`${id}-agencia`} placeholder="Sua agência" />
            </div>
            <Button
              type="submit"
              size="lg"
              className="w-full rounded-xl text-base font-semibold h-12"
            >
              Quero vender Orlando Magic
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <p className="text-[11px] text-center text-muted-foreground">
              Ao enviar, você concorda em receber contato do nosso time comercial.
            </p>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

export default function OrlandoMagicLandingPage() {
  useEffect(() => {
    document.title = "Orlando Magic — Ingressos para agentes de viagens";
    const meta = document.querySelector('meta[name="description"]');
    if (meta)
      meta.setAttribute(
        "content",
        "Venda ingressos oficiais do Orlando Magic com preço em BRL, comissão exclusiva e suporte em português.",
      );
  }, []);

  const scrollToForm = () => {
    document.getElementById("lead-form-hero")?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* NAV */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[hsl(217,91%,55%)] to-[hsl(258,90%,60%)] flex items-center justify-center shadow-md">
              <Trophy className="h-5 w-5 text-white" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-bold">Orlando Magic</p>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Programa para agentes
              </p>
            </div>
          </div>
          <Button onClick={scrollToForm} className="rounded-xl">
            Quero vender
          </Button>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={arenaInterior}
            alt="Interior de arena de basquete em dia de jogo"
            className="h-full w-full object-cover"
            width={1600}
            height={1000}
          />
          <div className="absolute inset-0 bg-gradient-to-br from-[hsl(222,47%,11%)]/95 via-[hsl(222,47%,11%)]/80 to-[hsl(258,90%,25%)]/75" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-16 lg:py-24 grid lg:grid-cols-2 gap-10 items-center">
          <div className="text-white space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-3 py-1 text-xs font-medium backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" />
              Temporada NBA 2026 — vagas limitadas
            </span>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-black leading-[1.05] tracking-tight">
              Venda ingressos do{" "}
              <span className="bg-gradient-to-r from-[hsl(217,91%,70%)] to-[hsl(45,93%,60%)] bg-clip-text text-transparent">
                Orlando Magic
              </span>{" "}
              com comissão exclusiva.
            </h1>
            <p className="text-lg text-white/80 max-w-xl">
              Ingressos oficiais, preços em BRL, entrega digital instantânea e
              suporte em português para agentes de viagens do Brasil.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button
                size="lg"
                onClick={scrollToForm}
                className="rounded-xl h-12 px-6 text-base font-semibold bg-white text-[hsl(222,47%,11%)] hover:bg-white/90"
              >
                Receber material de vendas
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="rounded-xl h-12 px-6 text-base border-white/30 text-white bg-white/5 hover:bg-white/10 hover:text-white"
                onClick={() =>
                  document.getElementById("video")?.scrollIntoView({ behavior: "smooth" })
                }
              >
                <PlayCircle className="mr-2 h-5 w-5" />
                Ver a experiência
              </Button>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2 pt-2 text-sm text-white/80">
              <span className="inline-flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-400" /> +2.000 agentes cadastrados
              </span>
              <span className="inline-flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-400" /> Ingressos oficiais
              </span>
              <span className="inline-flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-400" /> Pagamento em BRL
              </span>
            </div>
          </div>

          <div className="lg:justify-self-end w-full max-w-md">
            <LeadForm id="lead-form-hero" />
          </div>
        </div>
      </section>

      {/* BENEFITS */}
      <section className="py-16 sm:py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">
              Por que vender com a gente
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">
              Uma operação pronta para o agente brasileiro.
            </h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {BENEFITS.map((b) => (
              <Card
                key={b.title}
                className="rounded-2xl border-border/60 hover:border-primary/30 hover:shadow-lg transition-all"
              >
                <CardContent className="p-6 space-y-3">
                  <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/20 flex items-center justify-center">
                    <b.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold">{b.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {b.text}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* VIDEO */}
      <section id="video" className="py-16 sm:py-20 bg-muted/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 grid lg:grid-cols-2 gap-10 items-center">
          <div className="space-y-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">
              A experiência
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">
              Mais do que um jogo. Uma noite inesquecível em Orlando.
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Arena de nível mundial, shows durante os intervalos, mascotes,
              gastronomia e o melhor da NBA em quadra. Um produto perfeito para
              famílias, casais e grupos que já vão para Orlando.
            </p>
            <div className="grid grid-cols-3 gap-4 pt-2">
              <div>
                <p className="text-2xl font-black text-primary">18k+</p>
                <p className="text-xs text-muted-foreground">Lugares na arena</p>
              </div>
              <div>
                <p className="text-2xl font-black text-primary">41</p>
                <p className="text-xs text-muted-foreground">Jogos por temporada</p>
              </div>
              <div>
                <p className="text-2xl font-black text-primary">2h30</p>
                <p className="text-xs text-muted-foreground">Duração média</p>
              </div>
            </div>
          </div>
          <div className="relative rounded-3xl overflow-hidden shadow-2xl aspect-video group cursor-pointer">
            <img
              src={familyFun}
              alt="Família se divertindo em jogo de basquete"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
              width={1200}
              height={1200}
            />
            <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors flex items-center justify-center">
              <div className="h-20 w-20 rounded-full bg-white/95 flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform">
                <PlayCircle className="h-10 w-10 text-primary" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">
              Categorias disponíveis
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">
              Ingresso ideal para cada perfil de cliente.
            </h2>
            <p className="text-muted-foreground mt-3">
              Valores de referência por pessoa. Preços finais em BRL variam por
              partida e disponibilidade.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {CATEGORIES.map((c) => (
              <Card
                key={c.title}
                className={`rounded-3xl overflow-hidden border-2 transition-all hover:-translate-y-1 hover:shadow-2xl ${
                  c.highlight
                    ? "border-primary shadow-xl relative"
                    : "border-border/60 shadow-md"
                }`}
              >
                {c.highlight && (
                  <div className="absolute top-4 right-4 z-10 bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full shadow">
                    {c.tag}
                  </div>
                )}
                <div className="aspect-[4/3] relative overflow-hidden">
                  <img
                    src={c.image}
                    alt={c.title}
                    className="h-full w-full object-cover"
                    loading="lazy"
                    width={1000}
                    height={700}
                  />
                  {!c.highlight && (
                    <div className="absolute top-4 left-4 bg-background/95 text-foreground text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full shadow">
                      {c.tag}
                    </div>
                  )}
                </div>
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-baseline justify-between">
                    <h3 className="text-xl font-bold">{c.title}</h3>
                    <div className="text-right">
                      <p className="text-[11px] text-muted-foreground uppercase tracking-wider">
                        a partir de
                      </p>
                      <p className="text-2xl font-black text-primary">{c.price}</p>
                    </div>
                  </div>
                  <ul className="space-y-2">
                    {c.perks.map((p) => (
                      <li
                        key={p}
                        className="flex items-start gap-2 text-sm text-foreground/80"
                      >
                        <Check className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                        {p}
                      </li>
                    ))}
                  </ul>
                  <Button
                    onClick={scrollToForm}
                    variant={c.highlight ? "default" : "outline"}
                    className="w-full rounded-xl"
                  >
                    Simular venda
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* SOCIAL PROOF STRIP */}
      <section className="py-14 bg-gradient-to-br from-[hsl(222,47%,11%)] to-[hsl(258,90%,25%)] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4 text-center">
          {[
            { n: "+2.000", l: "Agentes ativos" },
            { n: "+15k", l: "Ingressos vendidos" },
            { n: "4.9/5", l: "Avaliação dos agentes" },
            { n: "98%", l: "Clientes satisfeitos" },
          ].map((s) => (
            <div key={s.l} className="space-y-1">
              <p className="text-4xl font-black bg-gradient-to-r from-white to-[hsl(45,93%,70%)] bg-clip-text text-transparent">
                {s.n}
              </p>
              <p className="text-sm text-white/70">{s.l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-16 sm:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">
              Depoimentos
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">
              Agências que já venderam Orlando Magic.
            </h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <Card
                key={t.name}
                className="rounded-2xl border-border/60 shadow-sm hover:shadow-lg transition-shadow"
              >
                <CardContent className="p-6 space-y-4">
                  <Quote className="h-6 w-6 text-primary/50" />
                  <p className="text-sm text-foreground/85 leading-relaxed italic">
                    "{t.quote}"
                  </p>
                  <div className="flex gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className="h-4 w-4 fill-amber-400 text-amber-400"
                      />
                    ))}
                  </div>
                  <div className="pt-2 border-t border-border/60">
                    <p className="text-sm font-semibold">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* VENUE INFO */}
      <section className="py-16 sm:py-20 bg-muted/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 grid lg:grid-cols-2 gap-10 items-center">
          <div className="rounded-3xl overflow-hidden shadow-xl">
            <img
              src={arenaExterior}
              alt="Arena em Orlando ao entardecer"
              className="w-full h-full object-cover"
              loading="lazy"
              width={1400}
              height={1000}
            />
          </div>
          <div className="space-y-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">
              A arena
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">
              No coração de Orlando, a poucos minutos dos parques.
            </h2>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold">Localização privilegiada</p>
                  <p className="text-muted-foreground">
                    Downtown Orlando, com fácil acesso por Uber e estacionamento.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold">Temporada regular</p>
                  <p className="text-muted-foreground">
                    Jogos entre outubro e abril, com opções em quase todos os finais de semana.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Users className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold">Ideal para todo perfil</p>
                  <p className="text-muted-foreground">
                    Famílias, casais, grupos corporativos e viagens de amigos.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 sm:py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">
              Perguntas frequentes
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">
              Tudo o que você precisa saber.
            </h2>
          </div>
          <Accordion type="single" collapsible className="space-y-3">
            {FAQS.map((f, i) => (
              <AccordionItem
                key={i}
                value={`faq-${i}`}
                className="rounded-2xl border border-border/60 bg-card px-5 shadow-sm"
              >
                <AccordionTrigger className="text-left text-base font-semibold hover:no-underline">
                  {f.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                  {f.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-16 sm:py-20 bg-gradient-to-br from-[hsl(222,47%,11%)] via-[hsl(258,90%,25%)] to-[hsl(217,91%,25%)] text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-6">
          <Sparkles className="h-10 w-10 mx-auto text-[hsl(45,93%,60%)]" />
          <h2 className="font-display text-3xl sm:text-5xl font-black tracking-tight">
            Pronto para vender uma experiência que seus clientes nunca esquecerão?
          </h2>
          <p className="text-lg text-white/80 max-w-2xl mx-auto">
            Cadastre-se agora e receba tabela de preços, comissão exclusiva e o
            material completo para transformar seus clientes em torcedores.
          </p>
          <Button
            size="lg"
            onClick={scrollToForm}
            className="rounded-xl h-14 px-8 text-lg font-semibold bg-white text-[hsl(222,47%,11%)] hover:bg-white/90"
          >
            Quero começar a vender
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border/60 bg-background py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center text-xs text-muted-foreground space-y-2">
          <p>Página demonstrativa — Programa de venda para agentes de viagens.</p>
          <p>© {new Date().getFullYear()} Agentes de Sonhos. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}