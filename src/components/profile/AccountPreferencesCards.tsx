import { useState } from "react";
import { Layers, Users } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useSubscription } from "@/hooks/useSubscription";
import { useUserRole } from "@/hooks/useUserRole";
import { usePermissions } from "@/hooks/usePermissions";
import { useTeamQuota } from "@/hooks/useTeamMembers";
import { TeamMembersDialog } from "@/components/team/TeamMembersDialog";
import { getWorkspacePref, setWorkspacePref, isWorkspaceEligible } from "@/workspace/featureFlag";
import { CollapsibleSettingsCard } from "./CollapsibleSettingsCard";

/** Equipe e Permissões (migrado de Minha Conta). */
export function TeamPermissionsSettingsCard() {
  const { plan, getPlanLabel } = useSubscription();
  const { isMaster, can } = usePermissions();
  const { data: teamQuota } = useTeamQuota();
  const [open, setOpen] = useState(false);
  if (!(isMaster || can("team.manage"))) return null;
  return (
    <CollapsibleSettingsCard title="Equipe e Permissões">
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Equipe e Permissões
          </CardTitle>
          <CardDescription>
            Cadastre colaboradores com login próprio e defina o que cada um acessa,
            quais dados enxerga e em quais etapas do funil pode atuar.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border p-3">
              <p className="text-xl font-semibold leading-none">
                {teamQuota ? `${teamQuota.used}/${teamQuota.total}` : "—"}
              </p>
              <p className="text-xs text-muted-foreground">Acessos utilizados</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xl font-semibold leading-none">{teamQuota?.pending ?? "—"}</p>
              <p className="text-xs text-muted-foreground">Convites pendentes</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xl font-semibold leading-none">{getPlanLabel(plan)}</p>
              <p className="text-xs text-muted-foreground">Limite conforme o plano</p>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              Também disponível em Gestão de Clientes e Gestão Financeira.
            </p>
            <Button onClick={() => setOpen(true)}>Gerenciar equipe e permissões</Button>
          </div>
        </CardContent>
      </Card>
      <TeamMembersDialog open={open} onOpenChange={setOpen} />
    </CollapsibleSettingsCard>
  );
}

/** Preferências de Navegação (migrado de Minha Conta). */
export function NavigationPrefsSettingsCard() {
  const { plan } = useSubscription();
  const { role } = useUserRole();
  const [enabled, setEnabled] = useState<boolean>(() => getWorkspacePref() !== "off");
  if (!isWorkspaceEligible(role, plan)) return null;
  const toggle = (next: boolean) => {
    setEnabled(next);
    setWorkspacePref(next ? "on" : "off");
    toast.success(next ? "Workspace com Abas ativado. Recarregando…" : "Workspace com Abas desativado. Recarregando…");
    setTimeout(() => window.location.reload(), 400);
  };
  return (
    <CollapsibleSettingsCard title="Preferências de Navegação">
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            Preferências de Navegação
          </CardTitle>
          <CardDescription>Personalize como você navega entre as telas do sistema.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
            <div className="space-y-1">
              <Label htmlFor="workspace-tabs" className="text-sm font-medium">Workspace com Abas</Label>
              <p className="max-w-md text-xs text-muted-foreground">
                Permite abrir várias telas do sistema ao mesmo tempo em abas internas,
                preservando o estado de cada uma. Limite de 10 abas simultâneas.
              </p>
            </div>
            <Switch id="workspace-tabs" checked={enabled} onCheckedChange={toggle} />
          </div>
        </CardContent>
      </Card>
    </CollapsibleSettingsCard>
  );
}
