import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Crown } from "lucide-react";
import { UpgradeDialog } from "@/components/subscription/UpgradeDialog";

interface UpsellItem {
  label: string;
  limited?: boolean;
  bg: string;
  text: string;
}

const PROFESSIONAL_ITEMS: UpsellItem[] = [
  { label: "Orçamentos", limited: true, bg: "bg-violet-200", text: "text-violet-800" },
  { label: "Carteira Digital", limited: true, bg: "bg-teal-200", text: "text-teal-800" },
  { label: "Roteiros por I.A.", limited: true, bg: "bg-yellow-200", text: "text-yellow-900" },
  { label: "Conteúdos por I.A.", limited: true, bg: "bg-orange-200", text: "text-orange-800" },
  { label: "Raio X do Hotel", limited: true, bg: "bg-cyan-200", text: "text-cyan-800" },
  { label: "Bloqueios Aéreos", bg: "bg-pink-200", text: "text-pink-800" },
  { label: "Vitrine de Ofertas", bg: "bg-violet-200", text: "text-violet-800" },
  { label: "Cartão de Visita", limited: true, bg: "bg-teal-200", text: "text-teal-800" },
  { label: "Personalizador de Lâminas", bg: "bg-yellow-200", text: "text-yellow-900" },
  { label: "Captação de Leads", limited: true, bg: "bg-orange-200", text: "text-orange-800" },
  { label: "Comunidade", limited: true, bg: "bg-cyan-200", text: "text-cyan-800" },
  { label: "Cursos e Mentorias", bg: "bg-pink-200", text: "text-pink-800" },
  { label: "Benefícios e Descontos", bg: "bg-violet-200", text: "text-violet-800" },
  { label: "Travel Advisor", bg: "bg-teal-200", text: "text-teal-800" },
  { label: "Playbook de Vendas", bg: "bg-yellow-200", text: "text-yellow-900" },
  { label: "Gamificação", bg: "bg-orange-200", text: "text-orange-800" },
  { label: "Materiais Complementares", limited: true, bg: "bg-cyan-200", text: "text-cyan-800" },
];

const PREMIUM_ITEMS: UpsellItem[] = [
  { label: "Gestão de Clientes", bg: "bg-yellow-200", text: "text-yellow-900" },
  { label: "Gestão Financeira", bg: "bg-teal-200", text: "text-teal-800" },
  { label: "Comunidades Exclusivas", bg: "bg-orange-200", text: "text-orange-800" },
  { label: "Campanhas de Vendas", bg: "bg-orange-200", text: "text-orange-800" },
  { label: "Oportunidades de Eventos e Famtrips", bg: "bg-cyan-200", text: "text-cyan-800" },
  { label: "Viaja com Agente", bg: "bg-pink-200", text: "text-pink-800" },
];

function UpsellGrid({ items, onClick }: { items: UpsellItem[]; onClick: () => void }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {items.map((item) => (
        <button
          key={item.label}
          onClick={onClick}
          className={`${item.bg} ${item.text} rounded-2xl aspect-square p-3 flex flex-col items-center justify-center text-center transition-all hover:scale-105 hover:shadow-md cursor-pointer`}
        >
          <span className="text-xs sm:text-sm font-semibold leading-tight">
            {item.label}
          </span>
          {item.limited && (
            <span className="text-[10px] mt-1 opacity-80">*Limitado</span>
          )}
        </button>
      ))}
    </div>
  );
}

export function PlanUpsellSection() {
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const openUpgrade = () => setUpgradeOpen(true);

  return (
    <>
    <div className="space-y-6">
      {/* Profissional */}
      <Card className="border-0 shadow-card">
        <CardContent className="pt-5 pb-5 space-y-4">
          <div className="w-fit">
            <h2 className="font-display text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-emerald-600" />
              +Recursos Plano Profissional
            </h2>
            <div className="mt-2 h-1 w-full rounded-full bg-emerald-600" />
          </div>
          <p className="text-sm text-center text-muted-foreground">
            Todos os recursos do plano start + recursos abaixo.
          </p>
          <UpsellGrid items={PROFESSIONAL_ITEMS} onClick={openUpgrade} />
        </CardContent>
      </Card>

      {/* Premium */}
      <Card className="border-0 shadow-card">
        <CardContent className="pt-5 pb-5 space-y-4">
          <div className="w-fit">
            <h2 className="font-display text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
              <Crown className="h-5 w-5 text-emerald-600" />
              +Recursos Plano Premium
            </h2>
            <div className="mt-2 h-1 w-full rounded-full bg-emerald-600" />
          </div>
          <p className="text-sm text-center text-muted-foreground">
            Todos os recursos do plano profissional ilimitado + recursos abaixo.
          </p>
          <UpsellGrid items={PREMIUM_ITEMS} onClick={openUpgrade} />
        </CardContent>
      </Card>
    </div>
    <UpgradeDialog
      open={upgradeOpen}
      onOpenChange={setUpgradeOpen}
      title="Desbloqueie mais recursos"
      description="Faça upgrade para acessar todos os recursos dos planos Profissional e Premium."
    />
    </>
  );
}