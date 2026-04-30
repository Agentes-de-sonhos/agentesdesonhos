import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageCircle, Sparkles, Globe, ArrowRight } from "lucide-react";

export default function CaptacaoLeads() {
  const navigate = useNavigate();

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in max-w-5xl">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-pink-600" />
            Captação de Leads
          </h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Escolha como quer captar seus próximos clientes.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Card 1: Conversacional */}
          <Card
            onClick={() => navigate("/meus-leads/conversacional")}
            className="cursor-pointer border-0 shadow-card hover:shadow-lg transition-all hover:-translate-y-0.5"
          >
            <CardContent className="p-6 space-y-4">
              <div className="h-12 w-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <MessageCircle className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h2 className="font-semibold text-lg">Formulário Conversacional</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Capte leads através de uma conversa interativa e dinâmica, simulando um
                  atendimento via WhatsApp.
                </p>
              </div>
              <Button variant="ghost" className="text-emerald-700 hover:text-emerald-800 px-0">
                Acessar <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </CardContent>
          </Card>

          {/* Card 2: Página de Vendas */}
          <Card
            onClick={() => navigate("/meus-leads/landings")}
            className="cursor-pointer border-0 shadow-card hover:shadow-lg transition-all hover:-translate-y-0.5"
          >
            <CardContent className="p-6 space-y-4">
              <div className="h-12 w-12 rounded-2xl bg-pink-100 text-pink-600 flex items-center justify-center">
                <Globe className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h2 className="font-semibold text-lg">Página de Vendas Personalizada</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Crie páginas simples e diretas para captar leads promovendo um produto,
                  destino ou oferta específica.
                </p>
              </div>
              <Button variant="ghost" className="text-pink-700 hover:text-pink-800 px-0">
                Acessar <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}