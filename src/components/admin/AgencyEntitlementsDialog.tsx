import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  AGENCY_ENTITLEMENTS,
  AGENCY_ENTITLEMENT_DESCRIPTIONS,
  AGENCY_ENTITLEMENT_LABELS,
  type AgencyEntitlementKey,
} from "@/hooks/useAgencyEntitlements";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * user_id do usuário selecionado na lista — pode ser titular OU colaborador.
   * O titular real (agency_id) é resolvido no servidor via
   * `admin_resolve_agency_owner`, garantindo que o entitlement nunca seja
   * criado para o user_id de um membro de equipe.
   */
  userId: string;
  userName: string;
}

interface Row {
  id: string;
  entitlement_key: string;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  notes: string | null;
}

const KEYS = Object.values(AGENCY_ENTITLEMENTS) as AgencyEntitlementKey[];

const toDateInput = (v: string | null) => (v ? v.slice(0, 10) : "");

interface ResolvedOwner {
  agency_owner_id: string;
  agency_name: string | null;
  owner_name: string | null;
  owner_email: string | null;
}

export function AgencyEntitlementsDialog({ open, onOpenChange, userId, userName }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // 1) Resolve SEMPRE o titular da agência antes de qualquer escrita.
  const { data: owner, isLoading: resolvingOwner } = useQuery({
    queryKey: ["admin-resolve-agency-owner", userId],
    enabled: open && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_resolve_agency_owner" as any, {
        _user_id: userId,
      });
      if (error) throw error;
      const row = (Array.isArray(data) ? data[0] : data) as ResolvedOwner | undefined;
      return row ?? null;
    },
  });

  const agencyId = owner?.agency_owner_id ?? null;
  const isTeamMember = !!agencyId && agencyId !== userId;
  const agencyName =
    owner?.agency_name || owner?.owner_name || userName;
  const queryKey = ["admin-agency-entitlements", agencyId];

  const { data: rows = [], isLoading } = useQuery({
    queryKey,
    enabled: open && !!agencyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agency_entitlements" as any)
        .select("id, entitlement_key, is_active, starts_at, ends_at, notes")
        .eq("agency_id", agencyId!);
      if (error) throw error;
      return (data || []) as unknown as Row[];
    },
  });

  const byKey = new Map(rows.map((r) => [r.entitlement_key, r]));

  const upsert = useMutation({
    mutationFn: async (payload: {
      key: AgencyEntitlementKey;
      is_active?: boolean;
      starts_at?: string | null;
      ends_at?: string | null;
      notes?: string | null;
    }) => {
      if (!agencyId) throw new Error("Titular da agência não resolvido");
      const existing = byKey.get(payload.key);
      const values = {
        agency_id: agencyId,
        entitlement_key: payload.key,
        is_active: payload.is_active ?? existing?.is_active ?? true,
        starts_at: payload.starts_at !== undefined ? payload.starts_at : existing?.starts_at ?? null,
        ends_at: payload.ends_at !== undefined ? payload.ends_at : existing?.ends_at ?? null,
        notes: payload.notes !== undefined ? payload.notes : existing?.notes ?? null,
        granted_by: user?.id ?? null,
      };
      const { error } = await supabase
        .from("agency_entitlements" as any)
        .upsert(values as any, { onConflict: "agency_id,entitlement_key" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ["agency-entitlements"] });
    },
    onError: (e: any) => toast.error(e?.message || "Não foi possível salvar o entitlement"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="h-4 w-4 text-amber-500" />
            Pacote VIP — {agencyName}
          </DialogTitle>
          <DialogDescription>
            Capacidades concedidas à agência inteira (titular e equipe). Independente do plano de
            assinatura: Premium não recebe VIP automaticamente.
          </DialogDescription>
        </DialogHeader>

        {isTeamMember && (
          <p className="text-xs rounded-md border border-amber-300/60 bg-amber-50/60 dark:bg-amber-500/10 p-2 text-amber-700 dark:text-amber-400">
            <strong>{userName}</strong> é membro de equipe. O pacote será concedido ao titular da
            agência ({owner?.owner_name || owner?.owner_email || agencyId}), valendo para todos.
          </p>
        )}

        {resolvingOwner || isLoading || !agencyId ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {KEYS.map((key) => {
              const row = byKey.get(key);
              const isOn = !!row?.is_active;
              return (
                <div key={key} className="rounded-lg border border-border p-3 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Label className="text-sm font-medium">{AGENCY_ENTITLEMENT_LABELS[key]}</Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {AGENCY_ENTITLEMENT_DESCRIPTIONS[key]}
                      </p>
                      <code className="text-[10px] text-muted-foreground">{key}</code>
                    </div>
                    <Switch
                      checked={isOn}
                      disabled={upsert.isPending}
                      onCheckedChange={(checked) => upsert.mutate({ key, is_active: checked })}
                    />
                  </div>

                  {isOn && (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Início (opcional)</Label>
                          <Input
                            type="date"
                            defaultValue={toDateInput(row?.starts_at ?? null)}
                            onBlur={(e) =>
                              upsert.mutate({
                                key,
                                starts_at: e.target.value ? new Date(e.target.value).toISOString() : null,
                              })
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Fim (opcional)</Label>
                          <Input
                            type="date"
                            defaultValue={toDateInput(row?.ends_at ?? null)}
                            onBlur={(e) =>
                              upsert.mutate({
                                key,
                                ends_at: e.target.value ? new Date(e.target.value).toISOString() : null,
                              })
                            }
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Notas internas</Label>
                        <Textarea
                          rows={2}
                          defaultValue={row?.notes ?? ""}
                          placeholder="Ex.: contrato VIP assinado em 08/2026"
                          onBlur={(e) => upsert.mutate({ key, notes: e.target.value || null })}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
