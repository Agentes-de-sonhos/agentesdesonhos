import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import logoAgentes from "@/assets/logo-agentes-de-sonhos.png";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Footer } from "@/components/layout/Footer";
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
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Menu, X } from "lucide-react";

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
    title: "Vitrine Virtual",
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
    title: "Mentorias Exclusivas",
    description:
      "Programas de mentoria com especialistas do mercado. Encontros ao vivo, vídeos gravados e trilhas organizadas em módulos.",
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
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function LandingPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    if (!loading && user) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (user) return null;

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const goLogin = () => navigate("/auth");
  const goSignup = () => navigate("/auth?tab=signup");

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-card/80 backdrop-blur-lg">
        <div className="container flex h-16 items-center justify-between">
          <img src={logoAgentes} alt="Agentes de Sonhos" className="h-9" />

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6">
            {sectionLinks.map((s) => (
              <button
                key={s.id}
                onClick={() => scrollToSection(s.id)}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {s.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={goLogin} className="hidden sm:inline-flex">
              Entrar
            </Button>
            <Button size="sm" onClick={goSignup} className="hidden sm:inline-flex">
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
          <div className="md:hidden border-t border-border/40 bg-card py-4 px-4 space-y-2">
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
              <Button variant="outline" size="sm" onClick={goLogin} className="flex-1">
                Entrar
              </Button>
              <Button size="sm" onClick={goSignup} className="flex-1">
                Cadastrar
              </Button>
            </div>
          </div>
        )}
      </header>

      {/* ── Hero ───────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* subtle gradient blob */}
        <div className="absolute -top-32 -right-32 h-[500px] w-[500px] rounded-full bg-primary/5 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 -left-40 h-[400px] w-[400px] rounded-full bg-accent/5 blur-3xl pointer-events-none" />

        <div className="container py-20 md:py-28 lg:py-32 relative">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold tracking-tight leading-[1.1]">
              A plataforma que transforma agentes de viagem em{" "}
              <span className="text-primary">especialistas imbatíveis</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Tudo o que você precisa para vender mais, se capacitar melhor e impressionar cada
              cliente — reunido em um só lugar. Feito especialmente para agentes de viagem que
              levam a profissão a sério.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Button size="lg" className="gap-2 text-base px-8" onClick={goSignup}>
                Quero conhecer a plataforma
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" className="text-base px-8" onClick={goLogin}>
                Já sou cliente
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Pain Points ────────────────────────────────────────── */}
      <section className="py-16 md:py-24 bg-card">
        <div className="container max-w-4xl space-y-10">
          <div className="text-center space-y-3">
            <h2 className="text-3xl md:text-4xl font-display font-bold">
              Você ainda perde tempo com isso?
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              O mercado de turismo exige cada vez mais. Mas a realidade da maioria dos agentes é
              diferente do que deveria ser.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {painPoints.map((p, i) => (
              <Card key={i} className="border-destructive/20 bg-destructive/[0.03]">
                <CardContent className="flex items-start gap-3 p-5">
                  <p.icon className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                  <p className="text-sm leading-relaxed">{p.text}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <p className="text-center text-muted-foreground font-medium">
            Isso tem um nome: <span className="text-foreground">falta de estrutura</span>. E tem
            solução.
          </p>
        </div>
      </section>

      {/* ── Solution Intro ─────────────────────────────────────── */}
      <section className="py-16 md:py-24">
        <div className="container max-w-3xl text-center space-y-6">
          <h2 className="text-3xl md:text-4xl font-display font-bold">
            Apresentamos a <span className="text-primary">Agentes de Sonhos</span>
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed">
            A primeira plataforma completa criada exclusivamente para o profissional de turismo
            brasileiro. Não é um curso. Não é um software de reservas. É um{" "}
            <strong className="text-foreground">ecossistema inteligente</strong> que conecta
            capacitação, ferramentas, comunidade e tecnologia — tudo calibrado para a realidade do
            agente de viagem moderno.
          </p>
        </div>
      </section>

      {/* ── Features Grid ──────────────────────────────────────── */}
      <section className="py-16 md:py-24 bg-card">
        <div className="container space-y-10">
          <div className="text-center space-y-3">
            <h2 className="text-3xl md:text-4xl font-display font-bold">
              O que você encontra dentro da plataforma
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <Card
                key={i}
                className="group hover:shadow-lg transition-shadow duration-300 border-border/60"
              >
                <CardContent className="p-6 space-y-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <f.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-base">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {f.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── Before / After Benefits ────────────────────────────── */}
      <section className="py-16 md:py-24">
        <div className="container max-w-4xl space-y-10">
          <div className="text-center space-y-3">
            <h2 className="text-3xl md:text-4xl font-display font-bold">
              O que muda na sua rotina
            </h2>
          </div>
          <div className="space-y-4">
            {benefits.map((b, i) => (
              <div
                key={i}
                className="grid md:grid-cols-2 gap-3 md:gap-5 items-stretch"
              >
                <Card className="border-destructive/20 bg-destructive/[0.03]">
                  <CardContent className="flex items-center gap-3 p-5">
                    <Target className="h-5 w-5 text-destructive shrink-0" />
                    <p className="text-sm">{b.before}</p>
                  </CardContent>
                </Card>
                <Card className="border-primary/20 bg-primary/[0.03]">
                  <CardContent className="flex items-center gap-3 p-5">
                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                    <p className="text-sm font-medium">{b.after}</p>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Differentials ──────────────────────────────────────── */}
      <section className="py-16 md:py-24 bg-card">
        <div className="container max-w-4xl space-y-10">
          <div className="text-center space-y-3">
            <h2 className="text-3xl md:text-4xl font-display font-bold">
              Por que a Agentes de Sonhos é diferente
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {differentials.map((d, i) => (
              <Card key={i} className="border-border/60">
                <CardContent className="p-6 space-y-3">
                  <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
                    <d.icon className="h-5 w-5 text-accent" />
                  </div>
                  <h3 className="font-semibold text-base">{d.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {d.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────────────── */}
      <section className="py-16 md:py-24">
        <div className="container max-w-2xl space-y-10">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-center">
            Perguntas frequentes
          </h2>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <Card
                key={i}
                className="cursor-pointer border-border/60"
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
              >
                <CardContent className="p-5">
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="font-medium text-sm">{faq.q}</h3>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 text-muted-foreground shrink-0 transition-transform",
                        openFaq === i && "rotate-180"
                      )}
                    />
                  </div>
                  {openFaq === i && (
                    <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                      {faq.a}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ──────────────────────────────────────────── */}
      <section className="py-20 md:py-28">
        <div className="container max-w-3xl text-center space-y-6">
          <h2 className="text-3xl md:text-4xl font-display font-bold">
            O seu próximo nível começa aqui
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto leading-relaxed">
            A plataforma que os melhores agentes de viagem do Brasil já estão usando para fechar
            mais vendas, atender melhor e crescer mais rápido.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button size="lg" className="gap-2 text-base px-8" onClick={goSignup}>
              Quero meu acesso agora
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" className="text-base px-8" onClick={goLogin}>
              Já sou cliente
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">Acesso imediato. Sem burocracia.</p>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <div className="border-t border-border/40 bg-card">
        <div className="container py-10 text-center space-y-2">
          <p className="text-sm text-muted-foreground italic">
            A viagem mais importante é a da sua carreira.
          </p>
          <p className="text-xs text-muted-foreground/80">
            Agentes de Sonhos — Plataforma inteligente para agentes de viagem.
          </p>
        </div>
        <Footer />
      </div>
    </div>
  );
}
