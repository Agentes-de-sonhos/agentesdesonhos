import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useAgencySiteRequest } from "@/hooks/useAgencySiteRequest";
import { circuitRequestPayload, validCircuitContact, type CircuitContact } from "@/lib/circuits/presentation";
import type { CircuitTour } from "@/lib/circuits";

const emptyContact = (): CircuitContact => ({ name: "", phone: "", email: "", adults: 1, children: 0, notes: "", consent: false });
const maskPhone = (raw: string) => {
  const digits = raw.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits ? `(${digits}` : "";
  const local = digits.slice(2);
  const split = local.length > 8 ? 5 : 4;
  return `(${digits.slice(0, 2)}) ${local.slice(0, split)}${local.length > split ? `-${local.slice(split)}` : ""}`;
};

function PassengerStepper({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (value: number) => void }) {
  return <div><Label>{label}</Label><div className="mt-2 flex h-11 items-center justify-between rounded-lg border border-border bg-background px-1">
    <Button type="button" size="icon" variant="ghost" className="h-9 w-9" aria-label={`Diminuir ${label.toLowerCase()}`} disabled={value <= min} onClick={() => onChange(value - 1)}><Minus className="h-4 w-4" /></Button>
    <output aria-label={label} className="w-8 text-center font-semibold tabular-nums">{value}</output>
    <Button type="button" size="icon" variant="ghost" className="h-9 w-9" aria-label={`Aumentar ${label.toLowerCase()}`} disabled={value >= max} onClick={() => onChange(value + 1)}><Plus className="h-4 w-4" /></Button>
  </div></div>;
}

export function CircuitQuoteDialog({ hostname, circuit, departure, onClose }: { hostname: string; circuit: CircuitTour; departure: { date: string; label: string } | null; onClose: () => void }) {
  const { state, error, submit, reset } = useAgencySiteRequest(hostname);
  const [contact, setContact] = useState<CircuitContact>(emptyContact);
  const [honeypot, setHoneypot] = useState("");
  const submitting = useRef(false);
  const presentation = hostname.endsWith(".preview.local") || hostname.endsWith(".demo.local");
  useEffect(() => { if (departure) { setContact(emptyContact()); setHoneypot(""); reset(); } }, [departure, reset]);
  const change = <K extends keyof CircuitContact>(key: K, value: CircuitContact[K]) => setContact(current => ({ ...current, [key]: value }));

  return <Dialog open={!!departure} onOpenChange={open => { if (!open && state !== "submitting") onClose(); }}>
    <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg" onEscapeKeyDown={event => { if (state === "submitting") event.preventDefault(); }} onPointerDownOutside={event => { if (state === "submitting") event.preventDefault(); }}>
      <DialogHeader><DialogTitle>Solicitar orçamento</DialogTitle><DialogDescription><span className="block font-semibold text-foreground">{circuit.title}</span><span className="mt-1 block">Saída selecionada: {departure?.label}</span></DialogDescription></DialogHeader>
      {state === "success" ? <div role="status" className="py-6 text-center"><CheckCircle2 className="mx-auto h-12 w-12 text-primary" /><h3 className="mt-4 text-xl font-semibold">Solicitação enviada com sucesso!</h3><p className="mt-3 text-muted-foreground">Recebemos seu pedido de orçamento para {circuit.title}. Nossa equipe entrará em contato com você em breve.</p><Button className="mt-6" onClick={onClose}>Fechar</Button></div> :
      <form className="space-y-5" onSubmit={async event => {
        event.preventDefault();
        if (!departure || !validCircuitContact(contact) || submitting.current || presentation) return;
        submitting.current = true;
        try { await submit(circuitRequestPayload(circuit, departure.date, contact, honeypot)); }
        finally { submitting.current = false; }
      }}>
        <fieldset disabled={state === "submitting"} className="space-y-4">
          <legend className="mb-3 text-sm font-semibold">Dados de contato</legend>
          <div><Label htmlFor="circuit-name">Nome completo</Label><Input id="circuit-name" autoComplete="name" required maxLength={200} value={contact.name} onChange={event => change("name", event.target.value)} className="mt-2" /></div>
          <div className="grid gap-4 sm:grid-cols-2"><div><Label htmlFor="circuit-phone">WhatsApp com DDD</Label><Input id="circuit-phone" type="tel" autoComplete="tel-national" placeholder="(11) 99999-9999" required value={contact.phone} onChange={event => change("phone", maskPhone(event.target.value))} className="mt-2" /></div><div><Label htmlFor="circuit-email">E-mail</Label><Input id="circuit-email" type="email" autoComplete="email" required maxLength={200} value={contact.email} onChange={event => change("email", event.target.value)} className="mt-2" /></div></div>
          <div className="grid grid-cols-2 gap-4"><PassengerStepper label="Adultos" value={contact.adults} min={1} max={30} onChange={value => change("adults", value)} /><PassengerStepper label="Crianças" value={contact.children} min={0} max={12} onChange={value => change("children", value)} /></div>
          <div><Label htmlFor="circuit-notes">Observações (opcional)</Label><Textarea id="circuit-notes" maxLength={2000} value={contact.notes} onChange={event => change("notes", event.target.value)} className="mt-2" /></div>
          <div className="hidden" aria-hidden="true"><input name="website" tabIndex={-1} autoComplete="off" value={honeypot} onChange={event => setHoneypot(event.target.value)} /></div>
          <div className="flex items-start gap-3"><Checkbox id="circuit-consent" checked={contact.consent} onCheckedChange={value => change("consent", value === true)} /><Label htmlFor="circuit-consent" className="text-sm font-normal leading-6">Concordo com o envio dos meus dados para que a agência entre em contato comigo sobre este orçamento, conforme a <a href="/politicasdeprivacidade" target="_blank" rel="noopener noreferrer" className="text-primary underline">Política de Privacidade</a>.</Label></div>
        </fieldset>
        {presentation && <p role="status" className="text-sm text-muted-foreground">Apresentação: nenhum dado será enviado.</p>}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button type="submit" size="lg" className="w-full" disabled={!validCircuitContact(contact) || state === "submitting" || presentation}>{state === "submitting" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Solicitar orçamento</Button>
      </form>}
    </DialogContent>
  </Dialog>;
}