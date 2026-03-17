import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import logoAgentes from "@/assets/logo-agentes-de-sonhos.png";
import testimonialDavid from "@/assets/testimonial-david-leslie.png";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Footer } from "@/components/layout/Footer";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import {
  GraduationCap,
  Map,
  BrainCircuit,
  Wallet,
  Image,
  Globe,
  Users,
  BarChart3,
  DollarSign,
  Trophy,
  CreditCard,
  Store,
  Newspaper,
  MessageCircleQuestion,
  CalendarDays,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Zap,
  ShieldCheck,
  Heart,
  ChevronDown,
  Clock,
  Search,
  FileText,
  MessageSquare,
  Target,
  Quote,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Menu, X } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Scroll-reveal wrapper                                              */
/* ------------------------------------------------------------------ */
function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const { ref, visible } = useScrollReveal(0.12);
  return (
    <div
      ref={ref}
      className={cn(className)}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(32px)",
        transition: `opacity 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

const sectionLinks = [
  { label: "Funcionalidades", id: "funcionalidades" },
  { label: "Benefícios", id: "beneficios" },
  { label: "Diferenciais", id: "diferenciais" },
  { label: "FAQ", id: "faq" },
];

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const features = [
  {
    icon: GraduationCap,
    title: "EducaTravel Academy",
    description:
      "Trilhas de aprendizado completas sobre destinos, técnicas de venda e gestão. Estude no seu ritmo, prove seu conhecimento e receba certificados digitais reconhecidos pelo mercado.",
  },
  {
    icon: Map,
    title: "Travel Advisor",
    description:
      "Banco de dados curado com hotéis, restaurantes, atrações, experiências e opções de compras nos principais destinos do mundo. Recomende com autoridade.",
  },
  {
    icon: BrainCircuit,
    title: "Ferramentas com IA",
    description:
      "Gere roteiros completos em segundos. Transforme lâminas de fornecedores em legendas persuasivas para Instagram, stories e pitches de venda — tudo com IA treinada para turismo.",
  },
  {
    icon: Wallet,
    title: "Carteira Digital de Viagem",
    description:
      "Organize todos os serviços da viagem do seu cliente em uma carteira digital protegida por senha. Compartilhe via link, QR Code ou PDF.",
  },
  {
    icon: Image,
    title: "Materiais de Divulgação",
    description:
      "Biblioteca centralizada com lâminas, PDFs e imagens das principais operadoras e fornecedores do mercado. Sempre atualizado, sempre à mão.",
  },
  {
    icon: Globe,
    title: "Mapa do Turismo",
    description:
      "Diretório completo do trade turístico brasileiro: operadoras, consolidadoras, companhias aéreas, hospedagens, locadoras, cruzeiros, seguros e mais.",
  },
  {
    icon: Users,
    title: "Gestão de Clientes (CRM)",
    description:
      "Pipeline de vendas estilo Kanban, cadastro completo de clientes, metas de vendas e controle de oportunidades. Nunca deixe uma venda escapar.",
  },
  {
    icon: DollarSign,
    title: "Módulo Financeiro",
    description:
      "Registre vendas, custos e fluxo de caixa. Relatórios claros para saber exatamente quanto entrou, saiu e qual é a sua margem real.",
  },
  {
    icon: Trophy,
    title: "Gamificação e Ranking",
    description:
      "Ganhe pontos por login diário, perguntas feitas, respostas dadas e certificados conquistados. Suba no ranking e concorra a prêmios mensais.",
  },
  {
    icon: CreditCard,
    title: "Cartão de Visita Digital",
    description:
      "Crie seu cartão virtual profissional em menos de 2 minutos. Link personalizado, QR Code, botão de WhatsApp, redes sociais e logo da agência.",
  },
  {
    icon: Store,
    title: "Vitrine de Ofertas",
    description:
      "Monte sua vitrine de ofertas online com lâminas dos fornecedores ou imagens próprias. Organize por categoria e destaque as melhores promoções.",
  },
  {
    icon: Newspaper,
    title: "Notícias do Trade",
    description:
      "Curadoria inteligente das últimas 24 horas do mercado turístico. Alertas, destaques e ranking de relevância com filtros por categoria.",
  },
  {
    icon: MessageCircleQuestion,
    title: "Comunidade e P&R",
    description:
      "Rede selecionada de agentes que compartilham experiências, respondem dúvidas e trocam informações sobre destinos pouco conhecidos.",
  },
  {
    icon: CalendarDays,
    title: "Agenda e Eventos",
    description:
      "Fam trips, encontros online, eventos presenciais, workshops e treinamentos pagos. Tudo em um calendário centralizado com lembretes.",
  },
  {
    icon: Sparkles,
    title: "Cursos e Mentorias Exclusivas",
    description:
      "Cursos especializados e programas de mentoria com especialistas do mercado. Encontros ao vivo, vídeos gravados e trilhas organizadas em módulos.",
  },
];

const painPoints = [
  { icon: FileText, text: "Documentos espalhados em dezenas de pastas." },
  { icon: Search, text: "Informações sobre destinos desatualizadas." },
  { icon: MessageSquare, text: "Clientes perguntam e você não tem a resposta na ponta da língua." },
  { icon: Clock, text: "Horas perdidas montando roteiros manualmente." },
  { icon: Image, text: "Materiais de divulgação difíceis de encontrar na hora certa." },
  { icon: Users, text: "Sem tempo para se capacitar, sem comunidade de apoio." },
];

const benefits = [
  {
    before: "Desperdiçar horas montando roteiros manualmente",
    after: "Gere um roteiro completo em menos de 60 segundos com IA",
  },
  {
    before: "Enviar documentos por e-mail de forma desorganizada",
    after: "Entregue uma carteira digital elegante com tudo organizado",
  },
  {
    before: "Não saber o que responder sobre um destino específico",
    after: "Consulte o Travel Advisor e recomende com autoridade",
  },
  {
    before: "Depender de grupos de WhatsApp caóticos",
    after: "Acesse uma comunidade selecionada de profissionais sérios",
  },
  {
    before: "Perder oportunidades por falta de acompanhamento",
    after: "Seu CRM mostra onde está cada cliente e o que fazer",
  },
];

const differentials = [
  {
    icon: Heart,
    title: "Feita de dentro do mercado",
    description:
      "Cada funcionalidade foi pensada para a realidade do agente de viagem brasileiro. Não é uma ferramenta genérica adaptada — é uma plataforma construída do zero para quem vive esse mercado.",
  },
  {
    icon: Zap,
    title: "Tudo em um único lugar",
    description:
      "Sem alternar entre seis ferramentas. CRM, financeiro, materiais, roteiros, cartão digital, vitrine, academy, comunidade — tudo integrado, mesmo login.",
  },
  {
    icon: BrainCircuit,
    title: "Tecnologia que trabalha por você",
    description:
      "IA que entende o contexto do turismo. Geração de roteiros, criação de conteúdo, análise de lâminas — tudo automatizado para você focar no cliente.",
  },
  {
    icon: ShieldCheck,
    title: "Comunidade real, não grupo qualquer",
    description:
      "Rede curada de profissionais que compartilham benefícios exclusivos, experiências de destinos pouco explorados e informações que você não encontra em outro lugar.",
  },
  {
    icon: GraduationCap,
    title: "Capacitação contínua com certificação",
    description:
      "Trilhas de aprendizado sobre destinos, técnicas de venda e gestão. Certificados que comprovam sua especialização. Ranking que valoriza quem se dedica.",
  },
];

const faqs = [
  {
    q: "Para quem é a plataforma?",
    a: "Para agentes de viagem autônomos, consultores e agências que querem trabalhar de forma mais profissional, organizada e competitiva.",
  },
  {
    q: "Preciso ter experiência com tecnologia?",
    a: "Não. A plataforma foi desenvolvida para ser simples e intuitiva. Se você usa WhatsApp, você consegue usar a Agentes de Sonhos.",
  },
  {
    q: "Posso usar no celular?",
    a: "Sim. A plataforma é responsiva e funciona em qualquer dispositivo.",
  },
  {
    q: "O que é a Carteira Digital de Viagem?",
    a: "É uma área onde você organiza todos os serviços da viagem do seu cliente — voos, hotéis, transfers, seguros, ingressos — e compartilha via link protegido por senha ou QR Code.",
  },
  {
    q: "Já tenho um sistema de reservas. A plataforma substitui?",
    a: "Não. A Agentes de Sonhos complementa seu sistema atual, cuidando de tudo que ele não faz: capacitação, relacionamento com cliente, marketing, comunidade e ferramentas de IA.",
  },
];

/* ------------------------------------------------------------------ */
/*  Shared styles                                                      */
/* ------------------------------------------------------------------ */
const sectionContainer = "max-w-[1100px] mx-auto px-6";

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function LandingPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [heroReady, setHeroReady] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    const t = setTimeout(() => setHeroReady(true), 100);
    return () => clearTimeout(t);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (user) return null;

  const goLogin = () => navigate("/auth");
  const goSignup = async () => {
    if (checkoutLoading) return;
    setCheckoutLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-public-checkout");
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error("Checkout error:", err);
      setCheckoutLoading(false);
    }
  };

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-card/70 backdrop-blur-xl">
        <div className={cn(sectionContainer, "flex h-16 items-center justify-between")}>
          <img src={logoAgentes} alt="Agentes de Sonhos" className="h-9" />

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-8">
            {sectionLinks.map((s) => (
              <button
                key={s.id}
                onClick={() => scrollToSection(s.id)}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-200"
              >
                {s.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={goLogin}
              className="hidden sm:inline-flex rounded-xl font-semibold"
            >
              Entrar
            </Button>
            <Button
              size="sm"
              onClick={goSignup}
              className="hidden sm:inline-flex rounded-xl font-semibold shadow-[0_4px_14px_hsl(var(--primary)/0.25)] hover:shadow-[0_6px_20px_hsl(var(--primary)/0.35)] hover:-translate-y-0.5 transition-all duration-250"
            >
              Cadastrar
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border/40 bg-card py-4 px-6 space-y-2">
            {sectionLinks.map((s) => (
              <button
                key={s.id}
                onClick={() => scrollToSection(s.id)}
                className="block w-full text-left text-sm font-medium text-muted-foreground hover:text-foreground py-2 transition-colors"
              >
                {s.label}
              </button>
            ))}
            <div className="flex gap-2 pt-2 border-t border-border/40">
              <Button variant="outline" size="sm" onClick={goLogin} className="flex-1 rounded-xl">
                Entrar
              </Button>
              <Button size="sm" onClick={goSignup} className="flex-1 rounded-xl">
                Cadastrar
              </Button>
            </div>
          </div>
        )}
      </header>

      {/* ── Hero ───────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden min-h-[85vh] flex items-center"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 0%, hsl(var(--primary) / 0.07), transparent 70%)",
        }}
      >
        {/* subtle gradient blobs */}
        <div className="absolute -top-32 -right-32 h-[600px] w-[600px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
        <div className="absolute -bottom-40 -left-40 h-[500px] w-[500px] rounded-full bg-accent/5 blur-[120px] pointer-events-none" />

        <div className={cn(sectionContainer, "py-24 md:py-32 lg:py-40 relative w-full")}>
          <div className="max-w-3xl mx-auto text-center space-y-8">
            <h1
              className="text-4xl sm:text-5xl md:text-6xl lg:text-[3.75rem] font-bold tracking-[-0.02em] leading-[1.08]"
              style={{
                opacity: heroReady ? 1 : 0,
                transform: heroReady ? "translateY(0)" : "translateY(24px)",
                transition: "opacity 0.8s cubic-bezier(0.16,1,0.3,1), transform 0.8s cubic-bezier(0.16,1,0.3,1)",
              }}
            >
              A plataforma que transforma agentes de viagem em{" "}
              <span className="text-primary">especialistas imbatíveis</span>
            </h1>
            <p
              className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-[1.7] font-[450]"
              style={{
                opacity: heroReady ? 1 : 0,
                transform: heroReady ? "translateY(0)" : "translateY(24px)",
                transition: "opacity 0.8s cubic-bezier(0.16,1,0.3,1) 0.15s, transform 0.8s cubic-bezier(0.16,1,0.3,1) 0.15s",
              }}
            >
              Tudo o que você precisa para vender mais, se capacitar melhor e impressionar cada
              cliente — reunido em um só lugar. Feito especialmente para agentes de viagem que
              levam a profissão a sério.
            </p>
            <div
              className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
              style={{
                opacity: heroReady ? 1 : 0,
                transform: heroReady ? "translateY(0)" : "translateY(24px)",
                transition: "opacity 0.8s cubic-bezier(0.16,1,0.3,1) 0.3s, transform 0.8s cubic-bezier(0.16,1,0.3,1) 0.3s",
              }}
            >
              <Button
                size="lg"
                className="gap-2 text-base px-8 py-[14px] rounded-xl font-semibold shadow-[0_10px_30px_hsl(var(--primary)/0.2)] hover:shadow-[0_14px_40px_hsl(var(--primary)/0.3)] hover:-translate-y-0.5 transition-all duration-250"
                onClick={goSignup}
              >
                Quero entrar na plataforma
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="text-base px-8 py-[14px] rounded-xl font-semibold hover:-translate-y-0.5 transition-all duration-250"
                onClick={goLogin}
              >
                Já sou cliente
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Pain Points ────────────────────────────────────────── */}
      <section className="py-[100px] md:py-[120px] bg-card">
        <div className={cn(sectionContainer, "space-y-12")}>
          <Reveal>
            <div className="text-center space-y-4 max-w-2xl mx-auto">
              <h2 className="text-3xl md:text-4xl lg:text-[2.5rem] font-bold tracking-[-0.02em]">
                Você ainda perde tempo com isso?
              </h2>
              <p className="text-muted-foreground leading-[1.7] font-[450]">
                O mercado de turismo exige cada vez mais. Mas a realidade da maioria dos agentes é
                diferente do que deveria ser.
              </p>
            </div>
          </Reveal>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {painPoints.map((p, i) => (
              <Reveal key={i} delay={i * 80}>
                <Card className="border-destructive/15 bg-destructive/[0.03] rounded-2xl hover:-translate-y-1.5 hover:shadow-[0_18px_40px_hsl(var(--foreground)/0.06)] transition-all duration-250">
                  <CardContent className="flex items-start gap-3 p-6">
                    <div className="h-10 w-10 rounded-[10px] bg-destructive/10 flex items-center justify-center shrink-0">
                      <p.icon className="h-[18px] w-[18px] text-destructive" />
                    </div>
                    <p className="text-sm leading-[1.7]">{p.text}</p>
                  </CardContent>
                </Card>
              </Reveal>
            ))}
          </div>
          <Reveal delay={500}>
            <p className="text-center text-muted-foreground font-medium">
              Isso tem um nome: <span className="text-foreground">falta de estrutura</span>. E tem
              solução.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── Solution Intro ─────────────────────────────────────── */}
      <section className="py-[100px] md:py-[120px]">
        <div className={cn(sectionContainer, "max-w-3xl text-center space-y-6")}>
          <Reveal>
            <h2 className="text-3xl md:text-4xl lg:text-[2.5rem] font-bold tracking-[-0.02em]">
              Apresentamos a <span className="text-primary">Agentes de Sonhos</span>
            </h2>
          </Reveal>
          <Reveal delay={120}>
            <p className="text-muted-foreground text-lg leading-[1.7] font-[450]">
              A primeira plataforma completa criada exclusivamente para o profissional de turismo
              brasileiro. Não é um curso. Não é um software de reservas. É um{" "}
              <strong className="text-foreground">ecossistema inteligente</strong> que conecta
              capacitação, ferramentas, comunidade e tecnologia — tudo calibrado para a realidade do
              agente de viagem moderno.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── Features Grid ──────────────────────────────────────── */}
      <section
        id="funcionalidades"
        className="py-[100px] md:py-[120px] scroll-mt-20"
        style={{ backgroundColor: "hsl(210 20% 97%)" }}
      >
        <div className={cn(sectionContainer, "space-y-12")}>
          <Reveal>
            <div className="text-center space-y-4">
              <h2 className="text-3xl md:text-4xl lg:text-[2.5rem] font-bold tracking-[-0.02em]">
                O que você encontra dentro da plataforma
              </h2>
            </div>
          </Reveal>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <Reveal key={i} delay={i * 70}>
                <Card className="group rounded-2xl border-[hsl(var(--foreground)/0.06)] bg-card shadow-[0_6px_20px_hsl(var(--foreground)/0.04)] hover:-translate-y-1.5 hover:shadow-[0_18px_40px_hsl(var(--foreground)/0.08)] transition-all duration-250 h-full">
                  <CardContent className="p-7 space-y-4">
                    <div className="h-[42px] w-[42px] rounded-[10px] bg-primary/10 flex items-center justify-center">
                      <f.icon className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="font-bold text-[15px] tracking-[-0.01em]">{f.title}</h3>
                    <p className="text-[13px] text-muted-foreground leading-[1.7]">
                      {f.description}
                    </p>
                  </CardContent>
                </Card>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Before / After Benefits ────────────────────────────── */}
      <section id="beneficios" className="py-[100px] md:py-[120px] scroll-mt-20">
        <div className={cn(sectionContainer, "max-w-4xl space-y-12")}>
          <Reveal>
            <div className="text-center space-y-4">
              <h2 className="text-3xl md:text-4xl lg:text-[2.5rem] font-bold tracking-[-0.02em]">
                O que muda na sua rotina
              </h2>
            </div>
          </Reveal>
          <div className="space-y-4">
            {benefits.map((b, i) => (
              <Reveal key={i} delay={i * 100}>
                <div className="grid md:grid-cols-2 gap-3 md:gap-5 items-stretch">
                  <Card className="border-destructive/15 bg-destructive/[0.03] rounded-2xl hover:-translate-y-1 transition-all duration-250">
                    <CardContent className="flex items-center gap-4 p-6">
                      <div className="h-10 w-10 rounded-[10px] bg-destructive/10 flex items-center justify-center shrink-0">
                        <Target className="h-[18px] w-[18px] text-destructive" />
                      </div>
                      <p className="text-sm leading-[1.6]">{b.before}</p>
                    </CardContent>
                  </Card>
                  <Card className="border-primary/15 bg-primary/[0.03] rounded-2xl hover:-translate-y-1 transition-all duration-250">
                    <CardContent className="flex items-center gap-4 p-6">
                      <div className="h-10 w-10 rounded-[10px] bg-primary/10 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="h-[18px] w-[18px] text-primary" />
                      </div>
                      <p className="text-sm font-medium leading-[1.6]">{b.after}</p>
                    </CardContent>
                  </Card>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Differentials ──────────────────────────────────────── */}
      <section
        id="diferenciais"
        className="py-[100px] md:py-[120px] scroll-mt-20"
        style={{ backgroundColor: "hsl(210 20% 97%)" }}
      >
        <div className={cn(sectionContainer, "max-w-4xl space-y-12")}>
          <Reveal>
            <div className="text-center space-y-4">
              <h2 className="text-3xl md:text-4xl lg:text-[2.5rem] font-bold tracking-[-0.02em]">
                Por que a Agentes de Sonhos é diferente
              </h2>
            </div>
          </Reveal>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {differentials.map((d, i) => (
              <Reveal key={i} delay={i * 80}>
                <Card className="rounded-2xl border-[hsl(var(--foreground)/0.06)] bg-card shadow-[0_6px_20px_hsl(var(--foreground)/0.04)] hover:-translate-y-1.5 hover:shadow-[0_18px_40px_hsl(var(--foreground)/0.08)] transition-all duration-250 h-full">
                  <CardContent className="p-7 space-y-4">
                    <div className="h-[42px] w-[42px] rounded-[10px] bg-accent/10 flex items-center justify-center">
                      <d.icon className="h-5 w-5 text-accent" />
                    </div>
                    <h3 className="font-bold text-[15px] tracking-[-0.01em]">{d.title}</h3>
                    <p className="text-[13px] text-muted-foreground leading-[1.7]">
                      {d.description}
                    </p>
                  </CardContent>
                </Card>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Depoimentos ────────────────────────────────────────── */}
      <section className="py-[100px] md:py-[120px] scroll-mt-20">
        <div className={cn(sectionContainer, "max-w-3xl space-y-12")}>
          <Reveal>
            <h2 className="text-3xl md:text-4xl lg:text-[2.5rem] font-bold text-center tracking-[-0.02em]">
              O que dizem sobre nós
            </h2>
          </Reveal>

          <Reveal delay={100}>
            <Card className="rounded-2xl border-[hsl(var(--foreground)/0.06)] bg-card shadow-[0_8px_30px_hsl(var(--foreground)/0.06)] overflow-hidden">
              <CardContent className="p-8 md:p-10">
                <div className="flex flex-col items-center text-center space-y-6">
                  {/* Avatar circular */}
                  <div className="relative">
                    <div className="h-28 w-28 rounded-full overflow-hidden ring-4 ring-primary/10 shadow-[0_8px_24px_hsl(var(--primary)/0.12)]">
                      <img
                        src={testimonialDavid}
                        alt="David Leslie Benveniste"
                        className="h-full w-full object-cover"
                      />
                    </div>
                  </div>

                  {/* Ícone de aspas */}
                  <Quote className="h-8 w-8 text-primary/20" />

                  {/* Depoimento */}
                  <blockquote className="text-[15px] md:text-base text-muted-foreground leading-[1.85] font-[450] max-w-2xl italic">
                    Gostaria de parabenizar o meu muito especial amigo Fernando Nobre, um dos mais respeitados profissionais da nossa indústria de turismo que, com uma incrível visão inovadora, vem nos brindar com uma sofisticada ferramenta de trabalho, dedicada exclusivamente aos <span className="font-semibold text-foreground">Agentes de Viagens</span>.
                    <br /><br />
                    O seu novo portal conjuga, de forma fácil e extremamente inteligente, processos que nos oferecem uma profunda familiarização com os mais exclusivos destinos turísticos do planeta, com uma plataforma multifacetada, de altíssima tecnologia (incluindo o uso de IA avançada) que permitem uma eficiente ajuda no atendimento e na coordenação das viagens dos nossos clientes.
                    <br /><br />
                    Obrigado ao Fernando e, mais uma vez, parabéns pela importantíssima iniciativa!
                  </blockquote>

                  {/* Autor */}
                  <div className="pt-2 space-y-1">
                    <p className="font-bold text-foreground text-[15px] tracking-[-0.01em]">David Leslie Benveniste</p>
                    <p className="text-sm text-muted-foreground">CBS Marketing Services</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Reveal>
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────────────── */}
      <section id="faq" className="py-[100px] md:py-[120px] scroll-mt-20" style={{ backgroundColor: "hsl(210 20% 97%)" }}>
        <div className={cn(sectionContainer, "max-w-2xl space-y-12")}>
          <Reveal>
            <h2 className="text-3xl md:text-4xl lg:text-[2.5rem] font-bold text-center tracking-[-0.02em]">
              Perguntas frequentes
            </h2>
          </Reveal>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <Reveal key={i} delay={i * 80}>
                <Card
                  className="cursor-pointer rounded-2xl border-[hsl(var(--foreground)/0.06)] bg-card shadow-[0_4px_12px_hsl(var(--foreground)/0.03)] hover:shadow-[0_8px_24px_hsl(var(--foreground)/0.06)] transition-all duration-250"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between gap-4">
                      <h3 className="font-semibold text-[15px]">{faq.q}</h3>
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-300",
                          openFaq === i && "rotate-180"
                        )}
                      />
                    </div>
                    <div
                      className="overflow-hidden transition-all duration-300"
                      style={{
                        maxHeight: openFaq === i ? "200px" : "0px",
                        opacity: openFaq === i ? 1 : 0,
                      }}
                    >
                      <p className="mt-3 text-sm text-muted-foreground leading-[1.7]">
                        {faq.a}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ──────────────────────────────────────────── */}
      <section
        className="py-[120px] md:py-[140px]"
      >
        <div className={cn(sectionContainer, "max-w-3xl text-center space-y-8")}>
          <Reveal>
            <h2 className="text-3xl md:text-4xl lg:text-[2.75rem] font-bold tracking-[-0.02em]">
              O seu próximo nível começa aqui
            </h2>
          </Reveal>
          <Reveal delay={100}>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto leading-[1.7] font-[450]">
              A plataforma que os melhores agentes de viagem do Brasil já estão usando para fechar
              mais vendas, atender melhor e crescer mais rápido.
            </p>
          </Reveal>
          <Reveal delay={200}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Button
                size="lg"
                className="gap-2 text-base px-10 py-4 rounded-xl font-semibold shadow-[0_10px_30px_hsl(var(--primary)/0.25)] hover:shadow-[0_14px_40px_hsl(var(--primary)/0.35)] hover:-translate-y-0.5 transition-all duration-250 text-[16px]"
                onClick={goSignup}
              >
                Quero meu acesso agora
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="text-base px-10 py-4 rounded-xl font-semibold hover:-translate-y-0.5 transition-all duration-250"
                onClick={goLogin}
              >
                Já sou cliente
              </Button>
            </div>
          </Reveal>
          <Reveal delay={300}>
            <p className="text-sm text-muted-foreground">Acesso imediato. Sem burocracia.</p>
          </Reveal>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <div className="border-t border-border/40 bg-card">
        <div className={cn(sectionContainer, "py-10 text-center space-y-4")}>
          <p className="text-sm text-muted-foreground italic">
            A viagem mais importante é a da sua carreira.
          </p>
          <p className="text-xs text-muted-foreground/80">
            Agentes de Sonhos — Plataforma inteligente para agentes de viagem.
          </p>
          <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
            <a href="/politicasdeprivacidade" className="hover:text-foreground transition-colors underline underline-offset-2">
              Políticas de Privacidade
            </a>
            <span>•</span>
            <a href="/termosdeuso" className="hover:text-foreground transition-colors underline underline-offset-2">
              Termos de Uso
            </a>
          </div>
        </div>
        <Footer />
      </div>
    </div>
  );
}
