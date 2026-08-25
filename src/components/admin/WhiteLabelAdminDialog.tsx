import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle2,
  Globe,
  Loader2,
  Plus,
  Star,
  XCircle,
} from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
}

interface DomainRow {
  id: string;
  hostname: string;
  agency_slug: string;
  is_primary: boolean;
  is_active: boolean;
  admin_portal_enabled: boolean;
}

interface WhiteLabelStatus {
  agency_id: string;
  is_team_member: boolean;
  agency_name: string | null;
  owner_name: string | null;
  owner_email: string | null;
  plan: string | null;
  subscription_is_active: boolean;
  expires_at: string | null;
  is_premium: boolean;
  is_current: boolean;
  has_active_domain: boolean;
  primary_hostname: string | null;
  eligible: boolean;
  domains: DomainRow[];
}

const PLANS = [
  "start",
  "essencial",
  "profissional",
  "premium",
  "fundador",
  "promo_grupo_sc",
  "educa_pass",
  "cartao_digital",
  "fornecedor_parceiro",
];

/**
 * Área administrativa do White Label.
 *
 * Fonte de verdade ÚNICA (servidor): assinatura Premium ativa e vigente +
 * pelo menos um domínio White Label ativo. Não existem flags paralelas.
 * Quando a agência é elegível, a solicitação de reserva é habilitada
 * automaticamente em todos os orçamentos (atuais e futuros).
 */
export function WhiteLabelAdminDialog({ open, onOpenChange, userId, userName }: Props) {
  const queryClient = useQueryClient();
  const [newHostname, setNewHostname] = useState("");
  const [newSlug, setNewSlug] = useState("");

  const { data: status, isLoading } = useQuery({
    queryKey: ["admin-whitelabel-status", userId],
    enabled: open && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_whitelabel_status" as any, {
        _user_id: userId,
      });
      if (error) throw error;
      return data as unknown as WhiteLabelStatus;
    },
  });

  const refresh = (data?: unknown) => {
    if (data) queryClient.setQueryData(["admin-whitelabel-status", userId], data);
    queryClient.invalidateQueries({ queryKey: ["admin-whitelabel-status", userId] });
  };

  const call = async (fn: string, params: Record<string, unknown>) => {
    const { data, error } = await supabase.rpc(fn as any, params);
    if (error) throw error;
    return data;
  };

  const setSubscription = useMutation({
    mutationFn: (params: Record<string, unknown>) =>
      call("admin_whitelabel_set_subscription", { _user_id: userId, ...params }),
    onSuccess: (data) => {
      refresh(data);
      toast.success("Assinatura atualizada.");
    },
    onError: (e: any) => toast.error(e?.message || "Não foi possível atualizar a assinatura."),
  });

  const upsertDomain = useMutation({
    mutationFn: (params: Record<string, unknown>) =>
      call("admin_whitelabel_upsert_domain", { _user_id: userId, ...params }),
    onSuccess: (data) => {
      refresh(data);
      setNewHostname("");
      setNewSlug("");
      toast.success("Domínio salvo.");
    },
    onError: (e: any) => toast.error(e?.message || "Não foi possível salvar o domínio."),
  });

  const setPrimary = useMutation({
    mutationFn: (id: string) => call("admin_whitelabel_set_primary_domain", { _domain_id: id }),
    onSuccess: (data) => {
      refresh(data);
      toast.success("Domínio principal definido.");
    },
    onError: (e: any) => toast.error(e?.message || "Não foi possível definir o principal."),
  });

  const setDomainActive = useMutation({
    mutationFn: (p: { id: string; active: boolean }) =>
      call("admin_whitelabel_set_domain_active", { _domain_id: p.id, _is_active: p.active }),
    onSuccess: (data) => {
      refresh(data);
      toast.success("Situação do domínio atualizada.");
    },
    onError: (e: any) => toast.error(e?.message || "Não foi possível atualizar o domínio."),
  });

  const setAdminPortal = useMutation({
    mutationFn: (p: { id: string; enabled: boolean }) =>
      call("admin_whitelabel_set_admin_portal", { _domain_id: p.id, _enabled: p.enabled }),
    onSuccess: (data) => {
      refresh(data);
      toast.success("Painel administrativo atualizado.");
    },
    onError: (e: any) =>
      toast.error(e?.message || "Não foi possível atualizar o painel administrativo."),
  });

  const reasons: string[] = [];
  if (status) {
    if (!status.is_premium) reasons.push("plano não é Premium");
    else if (!status.subscription_is_active) reasons.push("assinatura inativa");
    else if (!status.is_current) reasons.push("assinatura vencida");
    if (!status.has_active_domain) reasons.push("nenhum domínio White Label ativo");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            White Label — {status?.agency_name || userName}
          </DialogTitle>
          <DialogDescription>
            A elegibilidade é calculada no servidor: assinatura <strong>Premium ativa e vigente</strong>{" "}
            + pelo menos um <strong>domínio ativo</strong>. Agências elegíveis recebem a solicitação de
            reserva ativada automaticamente em todos os orçamentos.
          </DialogDescription>
        </DialogHeader>

        {isLoading || !status ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Status calculado */}
            <div
              className={
                "rounded-xl border p-4 " +
                (status.eligible
                  ? "border-emerald-300/70 bg-emerald-50/50 dark:bg-emerald-500/10"
                  : "border-destructive/40 bg-destructive/5")
              }
            >
              <div className="flex items-center gap-2">
                {status.eligible ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-destructive" />
                )}
                <p className="text-sm font-semibold">
                  {status.eligible ? "White Label habilitado" : "White Label bloqueado"}
                </p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {status.eligible
                  ? "Site white label e solicitação de reserva pelo orçamento web liberados."
                  : `Pendências: ${reasons.join(" · ")}.`}
              </p>
              {status.is_team_member && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Este usuário é colaborador. As configurações se aplicam à agência titular
                  {status.owner_email ? ` (${status.owner_email})` : ""}.
                </p>
              )}
            </div>

            {/* Assinatura */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Assinatura da agência</Label>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Plano</Label>
                  <Select
                    value={status.plan || ""}
                    onValueChange={(v) => setSubscription.mutate({ _plan: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o plano" />
                    </SelectTrigger>
                    <SelectContent>
                      {PLANS.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Validade (opcional)</Label>
                  <div className="flex gap-2">
                    <Input
                      type="date"
                      value={status.expires_at ? status.expires_at.slice(0, 10) : ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v)
                          setSubscription.mutate({
                            _expires_at: new Date(`${v}T23:59:59`).toISOString(),
                          });
                      }}
                    />
                    {status.expires_at && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setSubscription.mutate({ _clear_expires: true })}
                        disabled={setSubscription.isPending}
                      >
                        Sem prazo
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <p className="text-sm font-medium">Assinatura ativa</p>
                  <p className="text-xs text-muted-foreground">
                    Desligar bloqueia o White Label imediatamente.
                  </p>
                </div>
                <Switch
                  checked={status.subscription_is_active}
                  disabled={setSubscription.isPending}
                  onCheckedChange={(v) => setSubscription.mutate({ _is_active: v })}
                />
              </div>
            </div>

            <Separator />

            {/* Domínios */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Domínios White Label</Label>
              {status.domains.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Nenhum domínio cadastrado para esta agência.
                </p>
              )}
              <div className="space-y-2">
                {status.domains.map((d) => (
                  <div key={d.id} className="rounded-lg border border-border p-3 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium">{d.hostname}</p>
                      {d.is_primary && (
                        <Badge variant="secondary" className="text-[10px]">
                          <Star className="mr-1 h-3 w-3" /> Principal
                        </Badge>
                      )}
                      <Badge
                        variant={d.is_active ? "default" : "outline"}
                        className="text-[10px]"
                      >
                        {d.is_active ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <Input
                        defaultValue={d.agency_slug}
                        className="h-8 text-sm sm:max-w-[240px]"
                        onBlur={(e) => {
                          const slug = e.target.value.trim().toLowerCase();
                          if (slug && slug !== d.agency_slug)
                            upsertDomain.mutate({
                              _domain_id: d.id,
                              _hostname: d.hostname,
                              _agency_slug: slug,
                            });
                        }}
                      />
                      <div className="flex items-center gap-2">
                        {!d.is_primary && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setPrimary.mutate(d.id)}
                            disabled={setPrimary.isPending}
                          >
                            Tornar principal
                          </Button>
                        )}
                        <Button
                          type="button"
                          size="sm"
                          variant={d.is_active ? "outline" : "default"}
                          onClick={() =>
                            setDomainActive.mutate({ id: d.id, active: !d.is_active })
                          }
                          disabled={setDomainActive.isPending}
                        >
                          {d.is_active ? "Desativar" : "Ativar"}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-lg border border-dashed border-border p-3 space-y-2">
                <p className="text-xs font-medium">Adicionar domínio</p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    placeholder="minhaagencia.com.br"
                    value={newHostname}
                    onChange={(e) => setNewHostname(e.target.value)}
                  />
                  <Input
                    placeholder="slug-da-agencia"
                    value={newSlug}
                    onChange={(e) => setNewSlug(e.target.value)}
                    className="sm:max-w-[220px]"
                  />
                  <Button
                    type="button"
                    className="gap-1.5 shrink-0"
                    disabled={upsertDomain.isPending || !newHostname.trim() || !newSlug.trim()}
                    onClick={() =>
                      upsertDomain.mutate({
                        _hostname: newHostname,
                        _agency_slug: newSlug,
                      })
                    }
                  >
                    <Plus className="h-4 w-4" /> Adicionar
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  O apontamento de DNS continua sendo feito fora daqui; este cadastro apenas vincula
                  o host à agência.
                </p>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
