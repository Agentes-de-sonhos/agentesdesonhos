import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Mail, CheckCircle2 } from "lucide-react";
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
import { useAgencySiteRequest } from "@/hooks/useAgencySiteRequest";
import {
  buildInspirationPayload,
  maskBrazilianPhone,
  safeWhatsappGroupUrl,
  validateInspirationLead,
  type InspirationLeadForm,
} from "@/lib/agencyInspirationLead";

/**
 * Captador de leads padrão da seção "Receba inspirações" (template compartilhado).
 *
 * Modo A — com URL de grupo do WhatsApp válida: grava o lead e SÓ depois
 * redireciona na mesma aba. Falha de gravação nunca redireciona.
 * Modo B — sem URL: grava o lead e mostra confirmação elegante.
 */
export function AgencyInspirationDialog({
  open,
  onOpenChange,
  hostname,
  agencyName,
  groupUrl,
  title,
  description,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hostname: string;
  agencyName: string;
  groupUrl?: string | null;
  title?: string;
  description?: string;
}) {
  const { state, error, submit, reset } = useAgencySiteRequest(hostname);
  const [form, setForm] = useState<InspirationLeadForm>({ first_name: "", phone: "", email: "" });
  const [errors, setErrors] = useState<Partial<Record<keyof InspirationLeadForm, string>>>({});
  const [done, setDone] = useState(false);
  const submittingRef = useRef(false);
  const safeUrl = safeWhatsappGroupUrl(groupUrl);

  useEffect(() => {
    if (!open) return;
    setForm({ first_name: "", phone: "", email: "" });
    setErrors({});
    setDone(false);
    submittingRef.current = false;
    reset();
  }, [open, reset]);

  const handleSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      if (submittingRef.current) return; // duplo envio bloqueado
      const found = validateInspirationLead(form);
      setErrors(found);
      if (Object.keys(found).length) return;

      submittingRef.current = true;
      const result = await submit(buildInspirationPayload(form));
      if (!("success" in result) || !result.success) {
        submittingRef.current = false;
        return; // erro exibido; nunca redireciona
      }
      if (safeUrl) {
        window.location.assign(safeUrl);
        return;
      }
      setDone(true);
      submittingRef.current = false;
    },
    [form, safeUrl, submit],
  );

  const submitting = state === "submitting";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-[var(--brand-border)] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[var(--brand-primary)]">
            <Mail className="h-5 w-5" aria-hidden="true" />
            {title ?? "Quero receber inspirações"}
          </DialogTitle>
          <DialogDescription>
            {description ??
              `Deixe seus dados e a equipe da ${agencyName} passa a enviar inspirações, novidades e promoções de viagem.`}
          </DialogDescription>
        </DialogHeader>

        {done ? (
          <div
            role="status"
            className="rounded-xl bg-[var(--brand-tertiary)] p-6 text-center"
          >
            <CheckCircle2
              className="mx-auto h-9 w-9 text-[var(--brand-primary)]"
              aria-hidden="true"
            />
            <p className="mt-3 text-base font-semibold text-[var(--brand-primary)]">
              Pronto! Você receberá nossas próximas inspirações.
            </p>
            <Button type="button" variant="outline" className="mt-5" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="inspiration-first-name">Primeiro nome</Label>
              <Input
                id="inspiration-first-name"
                autoComplete="given-name"
                value={form.first_name}
                aria-invalid={!!errors.first_name}
                aria-describedby={errors.first_name ? "inspiration-first-name-error" : undefined}
                onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))}
              />
              {errors.first_name && (
                <p id="inspiration-first-name-error" role="alert" className="text-xs text-destructive">
                  {errors.first_name}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="inspiration-phone">WhatsApp</Label>
              <Input
                id="inspiration-phone"
                inputMode="tel"
                autoComplete="tel"
                placeholder="(00) 00000-0000"
                value={form.phone}
                aria-invalid={!!errors.phone}
                aria-describedby={errors.phone ? "inspiration-phone-error" : undefined}
                onChange={(e) => setForm((f) => ({ ...f, phone: maskBrazilianPhone(e.target.value) }))}
              />
              {errors.phone && (
                <p id="inspiration-phone-error" role="alert" className="text-xs text-destructive">
                  {errors.phone}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="inspiration-email">E-mail</Label>
              <Input
                id="inspiration-email"
                type="email"
                autoComplete="email"
                placeholder="voce@email.com"
                value={form.email}
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? "inspiration-email-error" : undefined}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
              {errors.email && (
                <p id="inspiration-email-error" role="alert" className="text-xs text-destructive">
                  {errors.email}
                </p>
              )}
            </div>

            {state === "error" && error && (
              <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            <Button
              type="submit"
              size="lg"
              disabled={submitting}
              className="w-full bg-[var(--brand-secondary)] text-[var(--brand-on-secondary)] hover:bg-[var(--brand-secondary-hover)]"
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
              Confirmar
            </Button>
            <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
              Ao confirmar, você autoriza o contato da agência para envio de inspirações,
              novidades e promoções de viagem.
            </p>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
