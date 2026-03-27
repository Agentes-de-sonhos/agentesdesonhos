import { useState } from "react";
import { useNavigate } from "react-router-dom";
import logoAgentes from "@/assets/logo-agentes-de-sonhos.png";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  CheckCircle2,
  ArrowRight,
  Loader2,
  GraduationCap,
  Map,
  BrainCircuit,
  Wallet,
  Image,
  Globe,
  Users,
  DollarSign,
  Trophy,
  CreditCard,
  Store,
  Newspaper,
  MessageCircleQuestion,
  CalendarDays,
  Sparkles,
  ArrowLeft,
  BadgePercent,
  ShieldCheck,
  Lock,
} from "lucide-react";

const planFeatures = [
  { icon: GraduationCap, label: "EducaTravel Academy — trilhas completas com certificado" },
  { icon: Map, label: "Travel Advisor — hotéis, restaurantes, atrações e experiências" },
  { icon: BrainCircuit, label: "Ferramentas com IA — roteiros, conteúdo e análise de lâminas" },
  { icon: Wallet, label: "Carteira Digital de Viagem com compartilhamento" },
  { icon: Image, label: "Materiais de Divulgação atualizados" },
  { icon: Globe, label: "Mapa do Turismo — diretório completo do trade" },
  { icon: Users, label: "CRM com pipeline Kanban e gestão de clientes" },
  { icon: DollarSign, label: "Módulo Financeiro completo" },
  { icon: Trophy, label: "Gamificação e Ranking de engajamento" },
  { icon: CreditCard, label: "Cartão de Visita Digital profissional" },
  { icon: Store, label: "Vitrine de Ofertas personalizada" },
  { icon: Newspaper, label: "Notícias do Trade com curadoria inteligente" },
  { icon: MessageCircleQuestion, label: "Comunidade exclusiva e Perguntas & Respostas" },
  { icon: CalendarDays, label: "Agenda de Eventos, Fam Trips e Workshops" },
  { icon: Sparkles, label: "Cursos e Mentorias exclusivas" },
];

const STRIPE_LINK = "https://buy.stripe.com/cNicN5gqe99k4mEelF9sk01";

export default function Desconto30Off() {
  const navigate = useNavigate();

  const handleCheckout = () => {
    window.location.href = STRIPE_LINK;
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-card/70 backdrop-blur-xl">
        <div className="max-w-[1100px] mx-auto px-6 flex h-16 items-center justify-between">
          <img
            src={logoAgentes}
            alt="Agentes de Sonhos"
            className="h-9 cursor-pointer"
            onClick={() => navigate("/")}
          />
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/auth")} className="rounded-xl font-semibold">
              Já sou cliente
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-16 md:py-24">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>

        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-semibold mb-4">
            <BadgePercent className="h-4 w-4" />
            Cupom AGENTES30 — 30% de desconto
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
            Plano Profissional
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Acesso completo a todas as funcionalidades da plataforma Agentes de Sonhos com desconto exclusivo.
          </p>
        </div>

        <Card className="border-primary/40 shadow-[0_8px_30px_hsl(var(--primary)/0.1)]">
          <CardContent className="p-8">
            {/* Price */}
            <div className="text-center mb-8">
              <p className="text-muted-foreground line-through text-lg mb-1">
                De R$ 127,90/mês
              </p>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-muted-foreground text-lg">R$</span>
                <span className="text-5xl font-bold tracking-tight">97</span>
                <span className="text-2xl font-bold">,90</span>
                <span className="text-muted-foreground text-lg">/mês</span>
              </div>
              <p className="text-sm text-primary font-semibold mt-2">
                Com cupom AGENTES30
              </p>
            </div>

            {/* Discount highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
              <div className="flex items-center gap-2 bg-muted/50 rounded-xl px-4 py-3">
                <Lock className="h-5 w-5 text-primary flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold">Desconto vitalício</p>
                  <p className="text-xs text-muted-foreground">Mesmo valor para sempre</p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-muted/50 rounded-xl px-4 py-3">
                <ShieldCheck className="h-5 w-5 text-primary flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold">7 dias de garantia</p>
                  <p className="text-xs text-muted-foreground">Devolução total do valor</p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-muted/50 rounded-xl px-4 py-3">
                <BadgePercent className="h-5 w-5 text-primary flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold">Ajuste anual</p>
                  <p className="text-xs text-muted-foreground">Apenas pela inflação</p>
                </div>
              </div>
            </div>

            {/* Features */}
            <div className="space-y-3 mb-8">
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                Tudo incluso:
              </p>
              {planFeatures.map((f, i) => (
                <div key={i} className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm">{f.label}</span>
                </div>
              ))}
            </div>

            {/* CTA */}
            <Button
              size="lg"
              className="w-full gap-2 text-base py-4 rounded-xl font-semibold shadow-[0_10px_30px_hsl(var(--primary)/0.2)] hover:shadow-[0_14px_40px_hsl(var(--primary)/0.3)] hover:-translate-y-0.5 transition-all duration-250"
              onClick={handleCheckout}
            >
              Quero participar com desconto
              <ArrowRight className="h-5 w-5" />
            </Button>

            <p className="text-xs text-center text-muted-foreground mt-4">
              Pagamento seguro via Stripe. O cupom <strong>AGENTES30</strong> já será aplicado automaticamente. Após o pagamento, você receberá um e-mail com o link para concluir seu cadastro.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
