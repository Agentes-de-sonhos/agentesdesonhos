import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Crown, Loader2, Plus, Trash2, Info } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { serviceTypeLabel } from "@/lib/operationServiceMap";
import { useAgencyEntitlements, AGENCY_ENTITLEMENTS } from "@/hooks/useAgencyEntitlements";
import {
  useQuoteBookingConfig,
  SELECTION_MODE_HINTS,
  SELECTION_MODE_LABELS,
} from "@/hooks/useQuoteBookingConfig";
import type { QuoteSelectionMode, QuoteService } from "@/types/quote";
import { groupHint, requiresGroup, validateBookingConfig } from "@/lib/quoteBookingRules";

interface Props {
  quote: any;
  onUpdated?: () => void;
}

const MODES: QuoteSelectionMode[] = ["optional", "required", "alternative", "free"];

const DEFAULT_DISCLAIMER =
  "Esta é uma solicitação de reserva. Serviços, disponibilidade e valores serão reconfirmados pela agência antes da conclusão.";

export function QuoteBookingRequestSettings({ quote, onUpdated }: Props) {
  const { hasAgencyEntitlement, loading: loadingEntitlements } = useAgencyEntitlements();
  const allowed = hasAgencyEntitlement(AGENCY_ENTITLEMENTS.booking_requests);

  const {
    groups,
    loadingGroups,
    updateQuoteBooking,
    createGroup,
    renameGroup,
    deleteGroup,
    setServiceSelection,
  } = useQuoteBookingConfig(quote?.id);

  const [enabled, setEnabled] = useState<boolean>(!!quote?.booking_requests_enabled);
  const [disclaimer, setDisclaimer] = useState<string>(
    quote?.booking_disclaimer || DEFAULT_DISCLAIMER
  );
  const [deadline, setDeadline] = useState<string>(quote?.booking_deadline?.slice(0, 10) || "");
  const [newGroupTitle, setNewGroupTitle] = useState("");
  const [newGroupType, setNewGroupType] = useState<"alternative" | "free">("alternative");

  // Não expor nada a agência sem entitlement.
  if (loadingEntitlements || !allowed) return null;

  const services: QuoteService[] = quote?.services || [];

  const persist = async (payload: Parameters<typeof updateQuoteBooking.mutateAsync>[0]) => {
    try {
      await updateQuoteBooking.mutateAsync(payload);
      onUpdated?.();
    } catch (e: any) {
      toast.error(e?.message || "Não foi possível salvar a configuração de pedidos de reserva.");
    }
  };

  const handleToggle = async (checked: boolean) => {
    if (checked) {
      const errors = validateBookingConfig(services as any, groups);
      if (errors.length > 0) {
        toast.error("Corrija a configuração dos serviços antes de ativar", {
          description: errors.slice(0, 3).join(" • "),
        });
        return;
      }
    }
    setEnabled(checked);
    // Desativar preserva grupos e modos dos serviços para reativação futura.
    await persist({ booking_requests_enabled: checked });
    toast.success(
      checked
        ? "Seleção de serviços ativada no orçamento web."
        : "Seleção desativada. Sua configuração de serviços e grupos foi preservada."
    );
  };

  const handleCreateGroup = async () => {
    if (!newGroupTitle.trim()) {
      toast.error("Dê um nome ao grupo (ex.: Hotéis em Orlando).");
      return;
    }
    try {
      await createGroup.mutateAsync({ title: newGroupTitle, group_type: newGroupType });
      setNewGroupTitle("");
      toast.success("Grupo criado.");
    } catch (e: any) {
      toast.error(e?.message || "Não foi possível criar o grupo.");
    }
  };

  const handleMode = async (service: QuoteService, mode: QuoteSelectionMode) => {
    if (mode === "alternative" || mode === "free") {
      const compatible = groups.filter((g) => g.group_type === mode);
      if (compatible.length === 0) {
        toast.error(
          mode === "alternative"
            ? "Crie primeiro um grupo de alternativas para vincular este serviço."
            : "Crie primeiro um grupo de escolha livre para vincular este serviço."
        );
        return;
      }
      // Vincula ao primeiro grupo compatível; o usuário pode trocar no seletor ao lado.
      await save(service.id, mode, compatible[0].id);
      return;
    }
    await save(service.id, mode, null);
  };

  const save = async (
    serviceId: string,
    mode: QuoteSelectionMode,
    groupId: string | null
  ) => {
    try {
      await setServiceSelection.mutateAsync({
        serviceId,
        selection_mode: mode,
        choice_group_id: groupId,
      });
      onUpdated?.();
    } catch (e: any) {
      toast.error(e?.message || "Não foi possível salvar a regra deste serviço.");
    }
  };

  return (
    <div className="space-y-5 rounded-xl border border-amber-300/60 bg-amber-50/40 dark:bg-amber-500/5 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Crown className="h-4 w-4 text-amber-500" />
            <p className="text-sm font-semibold">Pedido de reserva pelo orçamento web</p>
            <Badge className="bg-amber-500 text-white hover:bg-amber-500 text-[10px]">VIP</Badge>
          </div>
          <p className="text-xs text-muted-foreground max-w-prose">
            Permite que o cliente escolha serviços no link público e envie um pedido para a sua
            análise. A seleção do cliente <strong>não confirma reserva</strong> — nada é vendido
            automaticamente.
          </p>
        </div>
        <Switch
          checked={enabled}
          disabled={updateQuoteBooking.isPending}
          onCheckedChange={handleToggle}
          aria-label="Permitir que o cliente selecione serviços e solicite reserva"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Prazo para o cliente responder (opcional)</Label>
        <Input
          type="date"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          onBlur={() => persist({ booking_deadline: deadline || null })}
          className="max-w-[220px]"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Aviso exibido ao cliente</Label>
        <Textarea
          rows={3}
          value={disclaimer}
          onChange={(e) => setDisclaimer(e.target.value)}
          onBlur={() => persist({ booking_disclaimer: disclaimer || DEFAULT_DISCLAIMER })}
        />
      </div>

      {/* Grupos de escolha */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium">Grupos de escolha</Label>
          {loadingGroups && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
        </div>
        <p className="text-xs text-muted-foreground">
          Use grupos para organizar opções concorrentes (ex.: “Hotéis em Orlando”).
        </p>

        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            placeholder="Nome do grupo (ex.: Hotéis em Orlando)"
            value={newGroupTitle}
            onChange={(e) => setNewGroupTitle(e.target.value)}
          />
          <Select value={newGroupType} onValueChange={(v: any) => setNewGroupType(v)}>
            <SelectTrigger className="sm:w-[220px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="alternative">Alternativa (escolhe 1)</SelectItem>
              <SelectItem value="free">Livre (várias opções)</SelectItem>
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            onClick={handleCreateGroup}
            disabled={createGroup.isPending}
            className="gap-1.5 shrink-0"
          >
            <Plus className="h-4 w-4" /> Criar grupo
          </Button>
        </div>

        {groups.length > 0 && (
          <div className="space-y-2">
            {groups.map((g) => (
              <div
                key={g.id}
                className="flex items-center gap-2 rounded-lg border border-border bg-background p-2"
              >
                <Input
                  defaultValue={g.title}
                  onBlur={(e) => {
                    const title = e.target.value.trim();
                    if (title && title !== g.title) renameGroup.mutate({ id: g.id, title });
                  }}
                  className="h-8 text-sm"
                />
                <Badge variant="secondary" className="shrink-0 text-[10px]">
                  {groupHint(g.group_type)}
                </Badge>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-destructive shrink-0"
                  title="Excluir grupo (serviços voltam para Opcional)"
                  onClick={() => deleteGroup.mutate(g.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Regras por serviço */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Regras por serviço</Label>
        {services.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Adicione serviços ao orçamento para configurar as regras de seleção.
          </p>
        ) : (
          <div className="space-y-2">
            {services.map((s) => {
              const mode = (s.selection_mode || "optional") as QuoteSelectionMode;
              const compatible = groups.filter(
                (g) => g.group_type === (mode === "free" ? "free" : "alternative")
              );
              const needsGroup = requiresGroup(mode);
              return (
                <div
                  key={s.id}
                  className="rounded-lg border border-border bg-background p-3 space-y-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {s.option_label || serviceTypeLabel(s.service_type)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {serviceTypeLabel(s.service_type)}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Select value={mode} onValueChange={(v: any) => handleMode(s, v)}>
                        <SelectTrigger className="h-8 w-[150px] text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {MODES.map((m) => (
                            <SelectItem key={m} value={m} className="text-xs">
                              {SELECTION_MODE_LABELS[m]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {needsGroup && (
                        <Select
                          value={s.choice_group_id || ""}
                          onValueChange={(v) => save(s.id, mode, v)}
                        >
                          <SelectTrigger
                            className={cn(
                              "h-8 w-[210px] text-xs",
                              !s.choice_group_id && "border-destructive text-destructive"
                            )}
                          >
                            <SelectValue placeholder="Selecione o grupo" />
                          </SelectTrigger>
                          <SelectContent>
                            {compatible.map((g) => (
                              <SelectItem key={g.id} value={g.id} className="text-xs">
                                {g.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground flex items-start gap-1">
                    <Info className="h-3 w-3 mt-0.5 shrink-0" />
                    {SELECTION_MODE_HINTS[mode]}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
