import { useEffect, useRef, useState } from "react";
import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useAgencySiteRequest } from "@/hooks/useAgencySiteRequest";
import { validCircuitContact, type CircuitContact } from "@/lib/circuits/presentation";
import { agencySiteHref } from "@/lib/agencyContextLink";

export interface SportsEventChoice { key: string; title: string; fixedDate?: string; place?: string; image?: string; includes?: readonly string[]; price?: string; priceNote?: string }

const maskPhone = (raw: string) => {
  const d = raw.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d ? `(${d}` : "";
  const local = d.slice(2);
  const split = local.length > 8 ? 5 : 4;
  return `(${d.slice(0, 2)}) ${local.slice(0, split)}${local.length > split ? `-${local.slice(split)}` : ""}`;
};
const empty = (): CircuitContact => ({ name: "", phone: "", email: "", adults: 1, children: 0, notes: "", consent: false });

/** Pedido de orçamento de evento esportivo: evento já definido, só data + observações + contato. */
export function AgencySportsRequestDialog({ hostname, event, onClose }: { hostname: string; event: SportsEventChoice | null; onClose: () => void }) {
  const { state, error, submit, reset } = useAgencySiteRequest(hostname);
  const [step, setStep] = useState<1 | 2>(1);
  const [date, setDate] = useState("");
  const [contact, setContact] = useState<CircuitContact>(empty);
  const [honeypot, setHoneypot] = useState("");
  const sending = useRef(false);
  const presentation = hostname.endsWith(".preview.local") || hostname.endsWith(".demo.local");
  useEffect(() => { if (event) { setStep(1); setDate(event.fixedDate ?? ""); setContact(empty()); setHoneypot(""); reset(); } }, [event, reset]);
  const change = <K extends keyof CircuitContact>(k: K, v: CircuitContact[K]) => setContact(c => ({ ...c, [k]: v }));
  const today = new Date().toISOString().slice(0, 10);

  return <Dialog open={!!event} onOpenChange={o => { if (!o && state !== "submitting") onClose(); }}>
    <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
      <DialogHeader><DialogTitle>Solicitar orçamento</DialogTitle><DialogDescription><span className="block font-semibold text-foreground">{event?.title}</span></DialogDescription></DialogHeader>
      {state === "success" ? <div role="status" className="py-6 text-center"><CheckCircle2 className="mx-auto h-12 w-12 text-primary" /><h3 className="mt-4 text-xl font-semibold">Solicitação enviada com sucesso!</h3><p className="mt-3 text-muted-foreground">Recebemos seu pedido para {event?.title}. Nossa equipe entrará em contato em breve.</p><Button className="mt-6" onClick={onClose}>Fechar</Button></div>
      : step === 1 ? <form className="space-y-4" onSubmit={e => { e.preventDefault(); if (date) setStep(2); }}>
          {event?.fixedDate ? <div className="space-y-3">
            {event.image && <img src={event.image} alt={event.title} className="max-h-72 w-full rounded-md object-cover object-top" />}
            <p className="text-sm text-foreground"><strong>{event.fixedDate}</strong>{event.place ? ` · ${event.place}` : ""}</p>
            {event.includes && <ul className="grid gap-1 text-sm text-muted-foreground sm:grid-cols-2">{event.includes.map(i => <li key={i}>• {i}</li>)}</ul>}
            {event.price && <p className="rounded-md bg-muted/40 p-3 text-sm"><span className="font-semibold text-foreground">{event.price}</span>{event.priceNote ? <span className="block text-muted-foreground">{event.priceNote}</span> : null}</p>}
          </div> : <>
          <div><Label>Evento</Label><Input value={event?.title ?? ""} readOnly className="mt-2 bg-muted/40" /></div>
          <div><Label htmlFor="sport-date">Data do evento</Label><Input id="sport-date" type="date" min={today} required value={date} onChange={e => setDate(e.target.value)} className="mt-2" /></div></>}
          <div><Label htmlFor="sport-notes">Observações (opcional)</Label><Textarea id="sport-notes" maxLength={2000} placeholder={event?.fixedDate ? "Ex.: tipo de quarto, cidade de saída, dúvidas…" : "Ex.: local da corrida ou do jogo, setor preferido, hospedagem…"} value={contact.notes} onChange={e => change("notes", e.target.value)} className="mt-2" /></div>
          <Button type="submit" size="lg" className="w-full" disabled={!date}>Continuar</Button>
        </form>
      : <form className="space-y-4" onSubmit={async e => {
          e.preventDefault();
          if (!event || !validCircuitContact(contact) || sending.current || presentation) return;
          sending.current = true;
          try {
            await submit({
              service_key: "ingressos", service_label: `Evento esportivo — ${event.title}`,
              lead_name: contact.name.trim(), lead_phone: contact.phone, lead_email: contact.email.trim(),
              preferred_channel: contact.phone.replace(/\D/g, "") ? "whatsapp" : "email",
              summary: `${event.title} · Data: ${date} · ${contact.adults} adulto(s), ${contact.children} criança(s) · Origem: Site / Eventos esportivos`,
              notes: contact.notes.trim(), consent: contact.consent, consent_version: "v1", honeypot,
              details: { evento: event.title, evento_chave: event.key, data: date, adultos: contact.adults, criancas: contact.children, origem: "Site / Eventos esportivos", ...(event.fixedDate ? { pacote: event.title, local: event.place, preco_divulgado: event.price } : {}) },
            });
          } finally { sending.current = false; }
        }}>
          <fieldset disabled={state === "submitting"} className="space-y-4">
            <div><Label htmlFor="sport-name">Nome completo</Label><Input id="sport-name" autoComplete="name" required maxLength={200} value={contact.name} onChange={e => change("name", e.target.value)} className="mt-2" /></div>
            <p className="text-sm text-muted-foreground">Informe WhatsApp, e-mail ou os dois.</p>
            <div className="grid gap-4 sm:grid-cols-2"><div><Label htmlFor="sport-phone">WhatsApp com DDD</Label><Input id="sport-phone" type="tel" placeholder="(11) 99999-9999" value={contact.phone} onChange={e => change("phone", maskPhone(e.target.value))} className="mt-2" /></div><div><Label htmlFor="sport-email">E-mail</Label><Input id="sport-email" type="email" maxLength={200} value={contact.email} onChange={e => change("email", e.target.value)} className="mt-2" /></div></div>
            <div className="hidden" aria-hidden="true"><input name="website" tabIndex={-1} autoComplete="off" value={honeypot} onChange={e => setHoneypot(e.target.value)} /></div>
            <div className="flex items-start gap-3"><Checkbox id="sport-consent" checked={contact.consent} onCheckedChange={v => change("consent", v === true)} /><Label htmlFor="sport-consent" className="text-sm font-normal leading-6">Concordo com o envio dos meus dados para que a agência entre em contato comigo sobre este orçamento, conforme a <a href={agencySiteHref("/politicasdeprivacidade")} target="_blank" rel="noopener noreferrer" className="text-primary underline">Política de Privacidade</a>.</Label></div>
          </fieldset>
          {presentation && <p role="status" className="text-sm text-muted-foreground">Apresentação: nenhum dado será enviado.</p>}
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-3">
            <Button type="button" variant="outline" size="lg" onClick={() => setStep(1)} disabled={state === "submitting"}><ArrowLeft className="mr-1 h-4 w-4" />Voltar</Button>
            <Button type="submit" size="lg" className="flex-1" disabled={!validCircuitContact(contact) || state === "submitting" || presentation}>{state === "submitting" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Solicitar orçamento</Button>
          </div>
        </form>}
    </DialogContent>
  </Dialog>;
}
