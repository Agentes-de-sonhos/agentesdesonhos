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
  DEFAULT_NOTIFICATION_SETTINGS,
  useProductLandingNotifications,
  type NotificationSettings,
} from "@/hooks/useProductLandingNotifications";

/**
 * "Notificações de novos leads" block shown inside each product landing
 * configuration dialog. Recipients and responsible always come from the
 * agency's own active team; the public form never influences this.
 */
export function LeadNotificationsSection({ landingId }: { landingId: string }) {
  const { query, save } = useProductLandingNotifications(landingId);
  const config = query.data;

  const [values, setValues] = useState<NotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS);
  const [selected, setSelected] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!config || hydrated) return;
    setValues(config.settings ?? DEFAULT_NOTIFICATION_SETTINGS);
    setSelected(config.recipient_member_ids ?? []);
    setHydrated(true);
  }, [config, hydrated]);

  const eligible = useMemo(
    () => (config?.members ?? []).filter((m) => m.eligible),
    [config?.members],
  );
  const ineligible = useMemo(
    () => (config?.members ?? []).filter((m) => !m.eligible),
    [config?.members],
  );
  const assignableMembers = useMemo(
    () => (config?.members ?? []).filter((m) => m.status === "active"),
    [config?.members],
  );

  const ownerEmail = config?.owner_email ?? null;
  const recipientsCount = (values.include_owner && ownerEmail ? 1 : 0) + selected.length;
  const assignee = assignableMembers.find((m) => m.id === values.default_assignee_member_id) ?? null;
  const assigneeIsRecipient = !!assignee && selected.includes(assignee.id);

  const window = {
    days: values.notify_days,
    start: values.notify_start,
    end: values.notify_end,
    timezone: config?.timezone ?? "America/Sao_Paulo",
  };
  const insideNow = isWithinNotifyWindow(window);
  const upcoming = insideNow ? null : nextNotifyAt(window);

  const patch = (p: Partial<NotificationSettings>) => setValues((prev) => ({ ...prev, ...p }));

  const toggleMember = (id: string, on: boolean) =>
    setSelected((prev) => (on ? [...new Set([...prev, id])] : prev.filter((x) => x !== id)));

  const enableEmail = (on: boolean) => {
    // First activation pre-selects the account owner.
    if (on && !values.email_enabled && recipientsCount === 0 && ownerEmail) {
      patch({ email_enabled: true, include_owner: true });
      return;
    }
    patch({ email_enabled: on });
  };

  const blocked =
    values.email_enabled && (recipientsCount === 0 || values.notify_days.length === 0);

  if (query.isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border p-4 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando notificações…
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-xl border p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="flex items-center gap-2 text-sm font-semibold">
            <BellRing className="h-4 w-4 text-pink-600" /> Notificações de novos leads
          </h4>
          <p className="text-xs text-muted-foreground">
            O aviso dentro da plataforma continua sempre ativo. Aqui você escolhe quem também recebe
            por e-mail.
          </p>
        </div>
        <Switch checked={values.email_enabled} onCheckedChange={enableEmail} />
      </div>

      <div className="space-y-3">
        <Label className="text-xs">Destinatários</Label>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={values.include_owner}
            disabled={!ownerEmail}
            onCheckedChange={(v) => patch({ include_owner: !!v })}
          />
          <span>
            Incluir o titular da conta
            {ownerEmail ? (
              <span className="text-muted-foreground"> — {ownerEmail}</span>
            ) : (
              <span className="text-muted-foreground"> — e-mail do titular indisponível</span>
            )}
          </span>
        </label>

        {eligible.map((m) => (
          <label key={m.id} className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={selected.includes(m.id)}
              onCheckedChange={(v) => toggleMember(m.id, !!v)}
            />
            <span>
              {m.full_name}
              <span className="text-muted-foreground"> — {m.email}</span>
            </span>
          </label>
        ))}

        {ineligible.length > 0 && (
          <div className="rounded-lg bg-muted px-3 py-2 text-[11px] text-muted-foreground">
            {ineligible.length} membro(s) não podem receber e-mail por estarem inativos ou sem
            e-mail cadastrado. Cadastre o e-mail em Minha conta → Equipe.
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Responsável padrão pelos leads</Label>
        <select
          className="h-10 w-full rounded-md border bg-background px-3 text-sm"
          value={values.default_assignee_member_id ?? ""}
          onChange={(e) => patch({ default_assignee_member_id: e.target.value || null })}
        >
          <option value="">Titular da conta</option>
          {assignableMembers.map((m) => (
            <option key={m.id} value={m.id}>
              {m.full_name}
              {m.role_title ? ` — ${m.role_title}` : ""}
            </option>
          ))}
        </select>
        {assignee && !assigneeIsRecipient && (
          <div className="flex items-center justify-between gap-2 rounded-lg bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
            <span>
              {assignee.full_name} é o responsável, mas não recebe o e-mail dos novos leads.
            </span>
            {assignee.eligible && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 shrink-0 text-[11px]"
                onClick={() => toggleMember(assignee.id, true)}
              >
                Incluir
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Dias e horário de envio</Label>
        <div className="flex flex-wrap gap-1.5">
          {DAY_KEYS.map((day) => {
            const on = values.notify_days.includes(day);
            return (
              <Button
                key={day}
                type="button"
                size="sm"
                variant={on ? "default" : "outline"}
                className={`h-8 px-2.5 text-xs ${on ? "bg-pink-600 hover:bg-pink-700" : ""}`}
                onClick={() =>
                  patch({
                    notify_days: on
                      ? values.notify_days.filter((d) => d !== day)
                      : ([...values.notify_days, day] as DayKey[]),
                  })
                }
              >
                {DAY_LABELS[day].slice(0, 3)}
              </Button>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="time"
            value={values.notify_start}
            onChange={(e) => patch({ notify_start: e.target.value })}
            className="h-9 w-28"
          />
          <span className="text-xs text-muted-foreground">às</span>
          <Input
            type="time"
            value={values.notify_end}
            onChange={(e) => patch({ notify_end: e.target.value })}
            className="h-9 w-28"
          />
          <Badge variant="outline" className="text-[10px]">
            {config?.timezone}
          </Badge>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Fora desse horário o e-mail é agendado para o início da próxima janela de atendimento.
          Nenhum lead é perdido.
        </p>
      </div>

      <div className="rounded-lg bg-muted px-3 py-2 text-[11px] text-muted-foreground">
        <p className="flex items-center gap-1.5 font-medium text-foreground">
          <MailCheck className="h-3.5 w-3.5" /> Resumo
        </p>
        <p>
          {values.email_enabled ? "E-mail ativo" : "E-mail desativado"} • {recipientsCount}{" "}
          destinatário(s) • {describeNotifyWindow(window)} ({config?.timezone})
        </p>
        <p>
          Responsável: {assignee ? assignee.full_name : "Titular da conta"} •{" "}
          {insideNow
            ? "Agora dentro da janela: envio imediato."
            : upcoming
              ? `Agora fora da janela: próximo envio em ${upcoming.toLocaleString("pt-BR")}.`
              : "Selecione ao menos um dia para permitir o envio."}
        </p>
      </div>

      {blocked && (
        <p className="flex items-center gap-1.5 text-[11px] text-destructive">
          <AlertTriangle className="h-3.5 w-3.5" />
          Selecione ao menos um destinatário válido e um dia da semana para ativar o e-mail.
        </p>
      )}

      <Button
        size="sm"
        className="bg-pink-600 text-white hover:bg-pink-700"
        disabled={save.isPending || blocked}
        onClick={() => save.mutate({ ...values, recipient_member_ids: selected })}
      >
        {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Salvar notificações
      </Button>
    </div>
  );
}