import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sparkles,
  Crown,
  Calculator,
  Wallet,
  Route,
  FileText,
  Building2,
  Plane,
  Store,
  CreditCard,
  Paintbrush,
  UserPlus,
  Heart,
  GraduationCap,
  Tag,
  Compass,
  BookOpen,
  Trophy,
  Megaphone,
  Users,
  DollarSign,
  MessageSquare,
  Target,
  CalendarDays,
  type LucideIcon,
} from "lucide-react";
import { UpgradeDialog } from "@/components/subscription/UpgradeDialog";

interface UpsellItem {
  label: string;
  icon: LucideIcon;
  limited?: boolean;
  bg: string;
  text: string;
}

const PROFESSIONAL_ITEMS: UpsellItem[] = [
  { label: "Orçamentos", icon: Calculator, limited: true, bg: "bg-violet-200", text: "text-violet-800" },
  { label: "Carteira Digital", icon: Wallet, limited: true, bg: "bg-teal-200", text: "text-teal-800" },
  { label: "Roteiros por I.A.", icon: Route, limited: true, bg: "bg-yellow-200", text: "text-yellow-900" },
  { label: "Conteúdos por I.A.", icon: FileText, limited: true, bg: "bg-orange-200", text: "text-orange-800" },
  { label: "Raio X do Hotel", icon: Building2, limited: true, bg: "bg-cyan-200", text: "text-cyan-800" },
  { label: "Bloqueios Aéreos", icon: Plane, bg: "bg-pink-200", text: "text-pink-800" },
  { label: "Vitrine de Ofertas", icon: Store, bg: "bg-violet-200", text: "text-violet-800" },
  { label: "Cartão de Visita", icon: CreditCard, limited: true, bg: "bg-teal-200", text: "text-teal-800" },
  { label: "Personalizador de Lâminas", icon: Paintbrush, bg: "bg-yellow-200", text: "text-yellow-900" },
  { label: "Captação de Leads", icon: UserPlus, limited: true, bg: "bg-orange-200", text: "text-orange-800" },
  { label: "Comunidade", icon: Heart, limited: true, bg: "bg-cyan-200", text: "text-cyan-800" },
  { label: "Cursos e Mentorias", icon: GraduationCap, bg: "bg-pink-200", text: "text-pink-800" },
  { label: "Benefícios e Descontos", icon: Tag, bg: "bg-violet-200", text: "text-violet-800" },
  { label: "Travel Advisor", icon: Compass, bg: "bg-teal-200", text: "text-teal-800" },
  { label: "Playbook de Vendas", icon: BookOpen, bg: "bg-yellow-200", text: "text-yellow-900" },
  { label: "Gamificação", icon: Trophy, bg: "bg-orange-200", text: "text-orange-800" },
  { label: "Materiais Complementares", icon: Megaphone, limited: true, bg: "bg-cyan-200", text: "text-cyan-800" },
];

const PREMIUM_ITEMS: UpsellItem[] = [
  { label: "Gestão de Clientes", icon: Users, bg: "bg-yellow-200", text: "text-yellow-900" },
  { label: "Gestão Financeira", icon: DollarSign, bg: "bg-teal-200", text: "text-teal-800" },
  { label: "Comunidades Exclusivas", icon: MessageSquare, bg: "bg-orange-200", text: "text-orange-800" },
  { label: "Campanhas de Vendas", icon: Target, bg: "bg-orange-200", text: "text-orange-800" },
  { label: "Oportunidades de Eventos e Famtrips", icon: CalendarDays, bg: "bg-cyan-200", text: "text-cyan-800" },
  { label: "Viaja com Agente", icon: Plane, bg: "bg-pink-200", text: "text-pink-800" },
];

function UpsellGrid({ 
  items, 
  onClick, 
  maxSize = 175,
  layout = 'grid'
}: { 
  items: UpsellItem[]; 
  onClick: () => void;
  maxSize?: number;
  layout?: 'grid' | 'flex';
}) {
  const isFlex = layout === 'flex';
  return (
    <div 
      className={`${isFlex ? 'flex flex-nowrap overflow-x-auto pb-2' : 'grid'} gap-3 w-full`}
      style={isFlex ? {} : { 
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
      }}
    >
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.label}
            onClick={onClick}
            className={`${item.bg} ${item.text} ${isFlex ? 'flex-shrink-0' : 'w-full'} aspect-square rounded-2xl p-3 flex flex-col items-center justify-center text-center gap-2 transition-all hover:scale-105 hover:shadow-md cursor-pointer`}
            style={{ 
              maxWidth: `${maxSize}px`, 
              maxHeight: `${maxSize}px`,
              minWidth: isFlex ? `${maxSize}px` : '140px',
            }}
          >
            <Icon className="h-7 w-7" strokeWidth={2} />
            <span className="text-xs sm:text-sm font-semibold leading-tight">
              {item.label}
            </span>
            {item.limited && (
              <span className="text-[10px] opacity-80">*Limitado</span>
            )}
          </button>
        );
      })}
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
            <UpsellGrid items={PREMIUM_ITEMS} onClick={openUpgrade} maxSize={150} layout="flex" />
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
