import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { CheckCircle2, Clock, Loader2, MessageCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAgencySiteRequest } from "@/hooks/useAgencySiteRequest";
import {
  type AgencyDomainInfo,
  agencyDisplayName,
  agencyWhatsappNumber,
} from "@/lib/agencyDomains";
import {
  assistWhatsappMessage,
  buildAssistMessagePayload,
  isWithinAssistHours,
  maskAssistPhone,
  resolveSiteAssist,
  validateAssistMessage,
  type AssistMessageForm,
} from "@/lib/agencySiteAssist";

const EMPTY_FORM: AssistMessageForm = { name: "", phone: "", message: "" };

/**
 * Atendimento flutuante do site: em expediente abre o WhatsApp real da agência
 * sem nenhuma etapa intermediária; fora do expediente coleta um recado que
 * entra no CRM pelo endpoint público já existente (tenant resolvido no
 * servidor pelo hostname). Hosts sem preset não renderizam nada.
 */
export function AgencyAssistLauncher({ info }: { info: AgencyDomainInfo }) {
  const config = resolveSiteAssist(info.hostname);
  const location = useLocation();
  const name = agencyDisplayName(info);
  const digits = agencyWhatsappNumber(info);
  const { state, error, submit, reset } = useAgencySiteRequest(info.hostname);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<AssistMessageForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof AssistMessageForm, string>>>({});
  const [done, setDone] = useState(false);
  const [now, setNow] = useState(() => new Date());

  // Reavalia o expediente a cada minuto: quem fica com a aba aberta vê a
  // transição (ex.: 18h01) sem precisar recarregar a página.
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const online = useMemo(
    () => (config ? isWithinAssistHours(config.hours, now) : false),
    [config, now],
  );

  const waHref = useMemo(() => {
    if (!digits) return null;
    const text = assistWhatsappMessage(name, location.pathname, location.hash);
    return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
  }, [digits, location.hash, location.pathname, name]);

  const openCard = useCallback(() => {
    setForm(EMPTY_FORM);
    setErrors({});
    setDone(false);
    reset();
    setOpen(true);
  }, [reset]);

  const handleSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      const found = validateAssistMessage(form);
      setErrors(found);
      if (Object.keys(found).length) return;
      const result = await submit(buildAssistMessagePayload(form));
      if ("success" in result && result.success) setDone(true);
    },
    [form, submit],
  );

  if (!config || !waHref) return null;
  const submitting = state === "submitting";

  return (
    <>
      <div className="fixed bottom-4 right-4 z-40 print:hidden">
        {online ? (
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${config.onlineLabel} no WhatsApp`}
            className="flex items-center gap-2.5 rounded-full bg-[hsl(var(--wl-whatsapp))] py-3 pl-3 pr-4 text-sm font-semibold text-white shadow-lg transition hover:brightness-95"
          >
            <MessageCircle className="h-5 w-5" aria-hidden="true" />
            <span className="hidden sm:inline">{config.onlineLabel}</span>
            <span className="relative flex h-2 w-2" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
            </span>
          </a>
        ) : (
          <button
            type="button"
            onClick={openCard}
            aria-label={config.offlineLabel}
            className="flex items-center gap-2.5 rounded-full bg-[hsl(var(--wl-navy))] py-3 pl-3 pr-4 text-sm font-semibold text-white shadow-lg transition hover:brightness-110"
          >
            <Clock className="h-5 w-5" aria-hidden="true" />
            <span className="hidden sm:inline">{config.offlineLabel}</span>
          </button>
        )}
      </div>

      {open && (
        <div className="fixed inset-x-0 bottom-0 z-50 flex justify-end p-4 sm:inset-auto sm:bottom-20 sm:right-4 print:hidden">
          <div
            role="dialog"
            aria-modal="false"
            aria-label={config.offlineTitle}
            className="w-full max-w-sm rounded-2xl border border-border/60 bg-background p-5 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-base font-semibold text-foreground">{config.offlineTitle}</p>
                <p className="mt-1 text-xs text-muted-foreground">Atendimento {config.hoursLabel}.</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fechar"
                className="rounded-full p-1 text-muted-foreground transition hover:bg-muted"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            {done ? (
              <div role="status" className="mt-4 rounded-xl bg-muted/60 p-4 text-center">
                <CheckCircle2 className="mx-auto h-8 w-8 text-[hsl(var(--wl-whatsapp))]" aria-hidden="true" />
                <p className="mt-2 text-sm font-medium text-foreground">
                  Recado recebido! Retornamos no seu WhatsApp no próximo expediente.
                </p>
                <Button type="button" variant="outline" className="mt-4" onClick={() => setOpen(false)}>
                  Fechar
                </Button>
              </div>
            ) : (
              <form className="mt-4 space-y-3" onSubmit={handleSubmit} noValidate>
                <p className="text-sm leading-relaxed text-muted-foreground">{config.offlineText}</p>

                <div className="space-y-1.5">
                  <Label htmlFor="assist-name">Nome</Label>
                  <Input
                    id="assist-name"
                    autoComplete="name"
                    value={form.name}
                    aria-invalid={!!errors.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  />
                  {errors.name && <p role="alert" className="text-xs text-destructive">{errors.name}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="assist-phone">WhatsApp</Label>
                  <Input
                    id="assist-phone"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="(00) 00000-0000"
                    value={form.phone}
                    aria-invalid={!!errors.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: maskAssistPhone(e.target.value) }))}
                  />
                  {errors.phone && <p role="alert" className="text-xs text-destructive">{errors.phone}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="assist-message">Para onde você quer viajar?</Label>
                  <Textarea
                    id="assist-message"
                    rows={3}
                    placeholder="Conte a ideia inicial da viagem."
                    value={form.message}
                    aria-invalid={!!errors.message}
                    onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                  />
                  {errors.message && <p role="alert" className="text-xs text-destructive">{errors.message}</p>}
                </div>

                {state === "error" && error && (
                  <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {error}
                  </p>
                )}

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-[hsl(var(--wl-navy))] text-white hover:bg-[hsl(var(--wl-navy))]/90"
                >
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
                  Enviar recado para a equipe
                </Button>

                <a
                  href={waHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-center text-xs font-medium text-muted-foreground underline-offset-4 hover:underline"
                >
                  Prefere enviar pelo WhatsApp agora mesmo?
                </a>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
