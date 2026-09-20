import { useMemo, useState } from "react";
import { FileText, Map, Plus, Users, Wallet, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { QuickAddClientDialog } from "@/components/crm/QuickAddClientDialog";
import {
  QuickCreateItineraryDialog,
  QuickCreateQuoteDialog,
  QuickCreateWalletDialog,
} from "@/components/whitelabel/admin/quickstart/QuickCreateDialogs";
import { UpgradeDialog } from "@/components/subscription/UpgradeDialog";
import { usePermissions } from "@/hooks/usePermissions";
import { useSubscription } from "@/hooks/useSubscription";
import { useOpenInternalWindow } from "@/workspace/useOpenInternalWindow";
import type { Feature } from "@/types/subscription";

interface DashboardAction {
  key: "client" | "quote" | "itinerary" | "wallet";
  label: string;
  icon: LucideIcon;
  permission: string;
  feature?: Feature;
}

export const AGENTES_DASHBOARD_ACTIONS: DashboardAction[] = [
  { key: "client", label: "Criar cliente", icon: Users, permission: "clients.create", feature: "crm_basic" },
  { key: "quote", label: "Criar orçamento", icon: FileText, permission: "quotes.create", feature: "quote_generator" },
  { key: "itinerary", label: "Criar roteiro", icon: Map, permission: "itineraries.create", feature: "itinerary" },
  { key: "wallet", label: "Criar carteira digital", icon: Wallet, permission: "wallet.create", feature: "trip_wallet" },
];

export function DashboardQuickActions() {
  const { can } = usePermissions();
  const { hasFeature } = useSubscription();
  const openInternalWindow = useOpenInternalWindow();
  const [activeDialog, setActiveDialog] = useState<DashboardAction["key"] | null>(null);
  const [upgradeFeature, setUpgradeFeature] = useState<Feature | null>(null);

  const actions = useMemo(
    () => AGENTES_DASHBOARD_ACTIONS.filter((action) => can(action.permission)),
    [can],
  );

  const activate = (action: DashboardAction) => {
    if (action.feature && !hasFeature(action.feature)) {
      setUpgradeFeature(action.feature);
      return;
    }
    setActiveDialog(action.key);
  };

  return (
    <>
      <TooltipProvider delayDuration={200}>
        <div
          className="grid w-full min-w-0 grid-cols-4 gap-2 sm:gap-3 md:flex md:w-auto md:flex-nowrap md:items-center md:gap-2"
          aria-label="Atalhos de criação"
          data-dashboard-quick-actions
        >
          {actions.map((action) => (
            <Tooltip key={action.key}>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label={action.label}
                  onClick={() => activate(action)}
                  className="group relative h-14 w-full min-w-0 rounded-xl border-border/70 bg-card text-primary shadow-sm hover:border-primary hover:bg-primary hover:text-primary-foreground focus-visible:ring-2 focus-visible:ring-ring md:h-11 md:w-11 md:shrink-0"
                >
                  <action.icon className="h-6 w-6 md:h-5 md:w-5" />
                  <span className="absolute -right-1 -top-1 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-background text-primary shadow-sm ring-1 ring-border/70 group-hover:text-primary">
                    <Plus className="h-3 w-3" strokeWidth={2.5} />
                  </span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">{action.label}</TooltipContent>
            </Tooltip>
          ))}
        </div>
      </TooltipProvider>

      <QuickAddClientDialog
        open={activeDialog === "client"}
        onOpenChange={(open) => !open && setActiveDialog(null)}
        onCreated={(client) => openInternalWindow(`/gestao-clientes/clientes?client=${client.id}`, "Clientes")}
      />
      <QuickCreateQuoteDialog
        open={activeDialog === "quote"}
        onOpenChange={(open) => !open && setActiveDialog(null)}
        onCreated={(id) => openInternalWindow(`/ferramentas-ia/gerar-orcamento/${id}`, "Orçamento")}
      />
      <QuickCreateItineraryDialog
        open={activeDialog === "itinerary"}
        onOpenChange={(open) => !open && setActiveDialog(null)}
        onCreated={(id) => openInternalWindow(`/ferramentas-ia/criar-roteiro/${id}`, "Roteiro")}
      />
      <QuickCreateWalletDialog
        open={activeDialog === "wallet"}
        onOpenChange={(open) => !open && setActiveDialog(null)}
        onCreated={(id) => openInternalWindow(`/ferramentas-ia/trip-wallet/${id}`, "Carteira digital")}
      />
      <UpgradeDialog
        open={upgradeFeature !== null}
        onOpenChange={(open) => !open && setUpgradeFeature(null)}
        requiredFeature={upgradeFeature || undefined}
      />
    </>
  );
}