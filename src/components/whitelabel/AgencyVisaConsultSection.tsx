import { useState } from "react";
import { z } from "zod";
import { CheckCircle2, Stamp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useAgencySiteRequest } from "@/hooks/useAgencySiteRequest";
import { siteContainer } from "@/lib/agencySiteTheme";

const schema = z.object({
  name: z.string().trim().min(2, "Informe seu nome.").max(200),
  whatsapp: z.string().trim().min(8, "Informe um WhatsApp válido.").max(40),
  email: z.string().trim().email("E-mail inválido.").max(200).or(z.literal("")),
});

/**
 * Chamada compacta de consultoria de visto americano. Coleta apenas dados de
 * contato e envia pelo fluxo existente de solicitações (CRM + notificações),
 * identificando o interesse em visto americano. Nenhum documento é pedido.
 */
export function AgencyVisaConsultSection({
  hostname,
  content,
}: {
  hostname: string;
  content: { kicker?: string; title: string; text: string; cta: string };
}) {
  const { submit, state, error } = useAgencySiteRequest(hostname);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", whatsapp: "", email: "" });
  const [consent, setConsent] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [requestId] = useState(() => crypto.randomUUID());

  const send = async () => {
    const parsed = schema.safeParse(form);
    if (!parsed.success) { setFormError(parsed.error.issues[0]?.message ?? "Revise seus dados."); return; }
    if (!consent) { setFormError("Autorize o contato para enviar."); return; }
    setFormError(null);
    await submit({
      service_key: "pacotes",
      service_label: "Consultoria de visto americano",
      destination: "Estados Unidos",
      summary: "Interesse: Consultoria de visto americano (contato inicial)",
      notes: "Solicitação de consultoria de visto americano enviada pela home.",
      lead_name: parsed.data.name,
      lead_phone: parsed.data.whatsapp,
      lead_email: parsed.data.email || null,
      preferred_channel: "WhatsApp",
      best_time: "Qualquer horário",
      consent: true,
      consent_version: "v1",
      honeypot,
      details: { origem: "home_visto_americano", interesse: "visto_americano", request_id: requestId },
    });
  };

  return (
    <section id="visto-americano" aria-labelledby="visto-americano-title" className="scroll-mt-32 bg-background md:scroll-mt-36">
      <div className={`${siteContainer(true)} py-10 md:py-14`}>
        <div className="grid gap-6 rounded-2xl border border-border bg-card p-6 md:grid-cols-[1fr_auto] md:items-center md:p-8">
          <div className="flex gap-4">
            <Stamp className="mt-1 h-6 w-6 shrink-0 text-primary" aria-hidden="true" />
            <div>
              {content.kicker && <p className="text-[11px] font-bold tracking-[0.18em] text-muted-foreground">{content.kicker}</p>}
              <h2 id="visto-americano-title" className="mt-1 text-2xl font-extrabold leading-tight md:text-3xl">{content.title}</h2>
              <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">{content.text}</p>
            </div>
          </div>
          {!open && state !== "success" && (
            <Button size="lg" className="w-full md:w-auto" onClick={() => setOpen(true)}>{content.cta}</Button>
          )}
          {state === "success" ? (
            <p className="flex items-center gap-2 text-sm font-semibold md:col-span-2" role="status">
              <CheckCircle2 className="h-5 w-5 text-primary" aria-hidden="true" /> Recebemos seu pedido. A Amanda vai entrar em contato.
            </p>
          ) : open && (
            <div className="grid gap-3 md:col-span-2 md:grid-cols-3">
              <Input aria-label="Nome" placeholder="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <Input aria-label="WhatsApp" placeholder="WhatsApp" inputMode="tel" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
              <Input aria-label="E-mail (opcional)" placeholder="E-mail (opcional)" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <input type="text" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
              <label className="flex items-start gap-2 text-sm text-muted-foreground md:col-span-2">
                <Checkbox checked={consent} onCheckedChange={(v) => setConsent(v === true)} className="mt-0.5" />
                Autorizo o contato da agência para tratar da consultoria.
              </label>
              <Button size="lg" onClick={send} disabled={state === "submitting"} className="w-full">
                {state === "submitting" ? "Enviando..." : content.cta}
              </Button>
              {(formError || error) && <p className="text-sm text-destructive md:col-span-3" role="alert">{formError ?? error}</p>}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
