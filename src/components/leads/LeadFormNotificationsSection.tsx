import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle, BellRing, Loader2, MailCheck } from "lucide-react";
import { DAY_KEYS, DAY_LABELS, type DayKey } from "@/lib/officeHours";
import { describeNotifyWindow, isWithinNotifyWindow, nextNotifyAt } from "@/lib/leadNotificationSchedule";
import {
  DEFAULT_LEAD_FORM_NOTIFICATIONS,
  useLeadFormNotifications,
  type LeadFormNotificationSettings,
} from "@/hooks/useLeadFormSettings";

/**
 * "Notificações de novos leads" for the conversational form. Recipients always
 * come from the agency's own active team; visitors never influence this list.
 */
export function LeadFormNotificationsSection({ formId }: { formId: string }) {
  const { query, save } = useLeadFormNotifications(formId);
  const config = query.data;

  const [values, setValues] = useState<LeadFormNotificationSettings>(DEFAULT_LEAD_FORM_NOTIFICATIONS);
  const [selected, setSelected] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!config || hydrated) return;
    setValues(config.settings ?? DEFAULT_LEAD_FORM_NOTIFICATIONS);
    setSelected(config.recipient_member_ids ?? []);
    setHydrated(true);
  }, [config, hydrated]);

  const eligible = useMemo(() => (config?.members ?? []).filter((m) => m.eligible), [config?.members]);
  const ineligible = useMemo(() => (config?.members ?? []).filter((m) => !m.eligible), [config?.members]);

  const ownerEmail = config?.owner_email ?? null;
  const recipientsCount = (values.include_owner && ownerEmail ? 1 : 0) + selected.length;

  const window = {
    days: values.notify_days,
    start: values.notify_start,
    end: values.notify_end,
    timezone: config?.timezone ?? "America/Sao_Paulo",
  };
  const insideNow = isWithinNotifyWindow(window);
  const upcoming = insideNow ? null : nextNotifyAt(window);

  const patch = (p: Partial<LeadFormNotificationSettings>) => setValues((prev) => ({ ...prev, ...p }));

  const toggleDay = (day: DayKey, on: boolean) =>
    patch({
      notify_days: on
        ? DAY_KEYS.filter((d) => d === day || values.notify_days.includes(d))
        : values.notify_days.filter((d) => d !== day),
    });

  const blocked = values.email_enabled && (recipientsCount === 0 || values.notify_days.length === 0);

  if (query.isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border p-4 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando notificações…
      </div>
    );
  }

  if (query.error) {
    return (
      <div className="rounded-xl border p-4 text-sm text-muted-foreground">
        Não foi possível carregar as notificações agora.
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-xl border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <BellRing className="h-5 w-5 text-emerald-600 mt-0.5" />
          <div>
            <p className="text-sm font-semibold">Avisar por e-mail a cada novo lead</p>
            <p className="text-xs text-muted-foreground">
              Um e-mail por destinatário, sem expor os outros endereços.
            </p>
          </div>
        </div>
        <Switch checked={values.email_enabled} onCheckedChange={(on) => patch({ email_enabled: on })} />
      </div>

      {values.email_enabled && (
        <>
          <div className="space-y-2">
            <Label className="text-xs">Destinatários</Label>
            {ownerEmail && (
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={values.include_owner}
                  onCheckedChange={(v) => patch({ include_owner: v === true })}
                />
                <span>
                  Minha conta <span className="text-muted-foreground">({ownerEmail})</span>
                </span>
              </label>
            )}
            {eligible.map((m) => (
              <label key={m.id} className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={selected.includes(m.id)}
                  onCheckedChange={(v) =>
                    setSelected((prev) =>
                      v === true ? [...new Set([...prev, m.id])] : prev.filter((x) => x !== m.id),
                    )
                  }
                />
                <span>
                  {m.full_name}
                  {m.role_title ? <span className="text-muted-foreground"> • {m.role_title}</span> : null}
                </span>
              </label>
            ))}
            {!eligible.length && (
              <p className="text-xs text-muted-foreground">
                Nenhum membro da equipe está elegível: é preciso estar ativo e ter e-mail de notificação válido.
              </p>
            )}
            {!!ineligible.length && (
              <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                {ineligible.length} membro(s) não podem receber avisos (inativos ou sem e-mail válido).
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Dias de envio</Label>
            <div className="flex flex-wrap gap-1.5">
              {DAY_KEYS.map((day) => {
                const on = values.notify_days.includes(day);
                return (
                  <Button
                    key={day}
                    type="button"
                    size="sm"
                    variant={on ? "default" : "outline"}
                    onClick={() => toggleDay(day, !on)}
                  >
                    {DAY_LABELS[day].slice(0, 3)}
                  </Button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Início</Label>
              <Input
                type="time"
                value={values.notify_start}
                onChange={(e) => patch({ notify_start: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Fim</Label>
              <Input
                type="time"
                value={values.notify_end}
                onChange={(e) => patch({ notify_end: e.target.value })}
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm">Permitir envios em modo de teste</p>
              <p className="text-xs text-muted-foreground">Útil para validar o fluxo antes de divulgar.</p>
            </div>
            <Switch
              checked={values.allow_test_sends}
              onCheckedChange={(on) => patch({ allow_test_sends: on })}
            />
          </div>

          <p className="text-xs text-muted-foreground">
            {describeNotifyWindow(window)}.{" "}
            {insideNow
              ? "Estamos dentro da janela: novos leads são avisados na hora."
              : upcoming
                ? `Fora da janela agora: o próximo envio acontece em ${upcoming.toLocaleString("pt-BR")}.`
                : "Fora da janela agora."}
          </p>
        </>
      )}

      <div className="flex items-center justify-between gap-3 pt-2 border-t">
        <span className="text-xs text-muted-foreground flex items-center gap-1.5">
          <MailCheck className="h-3.5 w-3.5" />
          {values.email_enabled ? (
            <>
              {recipientsCount} destinatário(s)
              {blocked && <Badge variant="destructive" className="ml-2">Configuração incompleta</Badge>}
            </>
          ) : (
            "Avisos desativados"
          )}
        </span>
        <Button
          size="sm"
          onClick={() => save.mutate({ ...values, recipient_member_ids: selected })}
          disabled={save.isPending || blocked}
        >
          {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar notificações"}
        </Button>
      </div>
    </div>
  );
}
