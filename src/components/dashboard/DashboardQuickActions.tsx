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
  shortLabel: string;
  icon: LucideIcon;
  permission: string;
  feature?: Feature;
}

export const AGENTES_DASHBOARD_ACTIONS: DashboardAction[] = [
  { key: "client", label: "Criar cliente", shortLabel: "Cliente", icon: Users, permission: "clients.create", feature: "crm_basic" },
  { key: "quote", label: "Criar orçamento", shortLabel: "Orçamento", icon: FileText, permission: "quotes.create", feature: "quote_generator" },
  { key: "itinerary", label: "Criar roteiro", shortLabel: "Roteiro", icon: Map, permission: "itineraries.create", feature: "itinerary" },
  { key: "wallet", label: "Criar carteira digital", shortLabel: "Carteira", icon: Wallet, permission: "wallet.create", feature: "trip_wallet" },
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
                  aria-label={action.label}
                  onClick={() => activate(action)}
                  className="group relative flex h-[4.5rem] w-full min-w-0 flex-col items-center justify-center gap-1 rounded-lg border-border bg-card px-1 text-primary shadow-sm hover:border-primary hover:bg-primary hover:text-primary-foreground focus-visible:ring-2 focus-visible:ring-ring md:h-11 md:w-11 md:shrink-0 md:p-0"
                >
                  <action.icon className="h-5 w-5 md:h-5 md:w-5" />
                  <span className="max-w-full truncate text-[11px] font-medium leading-tight md:sr-only">{action.shortLabel}</span>
                  <span aria-hidden="true" className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-muted text-muted-foreground ring-1 ring-border group-hover:bg-primary-foreground/15 group-hover:text-primary-foreground">
                    <Plus className="h-2.5 w-2.5" strokeWidth={2.25} />
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