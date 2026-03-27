import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
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

export default function Planos() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-public-checkout");
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error("Checkout error:", err);
    } finally {
      setLoading(false);
    }
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
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
            Plano Profissional
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Acesso completo a todas as funcionalidades da plataforma Agentes de Sonhos.
          </p>
        </div>

        <Card className="border-primary/40 shadow-[0_8px_30px_hsl(var(--primary)/0.1)]">
          <CardContent className="p-8">
            {/* Price */}
            <div className="text-center mb-8">
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-muted-foreground text-lg">R$</span>
                <span className="text-5xl font-bold tracking-tight">127</span>
                <span className="text-2xl font-bold">,90</span>
                <span className="text-muted-foreground text-lg">/mês</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Cancele quando quiser. Sem fidelidade.
              </p>
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
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Redirecionando para pagamento...
                </>
              ) : (
                <>
                  Quero participar agora
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground mt-4">
              Pagamento seguro via Stripe. Após o pagamento, você receberá um e-mail com o link para concluir seu cadastro.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
