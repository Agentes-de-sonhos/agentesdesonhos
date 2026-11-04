import { useRef, useState } from "react";
import { CheckCircle2, Compass, Loader2, Radar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useAgencySiteRequest } from "@/hooks/useAgencySiteRequest";
import { validCircuitContact } from "@/lib/circuits/presentation";

const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
/** Novembro/2026 até Dezembro/2027, mês a mês. */
export const RADAR_PERIODS: string[] = [
  "Novembro de 2026", "Dezembro de 2026",
  ...MONTHS.map(m => `${m} de 2027`),
];
const BUDGETS = ["Até R$ 6.000", "R$ 6.000 a R$ 12.000", "R$ 12.000 a R$ 20.000", "Acima de R$ 20.000", "Ainda não sei / flexível"];

export interface RadarSelection { destination: string; period: string; travelers: string; budget: string }

const maskPhone = (raw: string) => {
  const d = raw.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d ? `(${d}` : "";
  const local = d.slice(2);
  const split = local.length > 8 ? 5 : 4;
  return `(${d.slice(0, 2)}) ${local.slice(0, split)}${local.length > split ? `-${local.slice(split)}` : ""}`;
};

export function OpportunityRadar({ hostname }: { hostname: string }) {
  const [selection, setSelection] = useState<RadarSelection>({ destination: "", period: "", travelers: "2", budget: "" });
  const [open, setOpen] = useState(false);
  const [contact, setContact] = useState({ name: "", phone: "", email: "", consent: false });
  const [honeypot, setHoneypot] = useState("");
  const sending = useRef(false);
  const { state, error, submit, reset } = useAgencySiteRequest(hostname);
  const update = (key: keyof RadarSelection, value: string) => setSelection(p => ({ ...p, [key]: value }));
  const ready = selection.destination.trim().length >= 2 && !!selection.period && !!selection.budget;
  const contactOk = validCircuitContact({ ...contact, adults: 1, children: 0, notes: "" });
  const travelersLabel = selection.travelers === "5" ? "5 ou mais pessoas" : `${selection.travelers} ${selection.travelers === "1" ? "pessoa" : "pessoas"}`;

  const close = () => { if (state === "submitting") return; setOpen(false); if (state === "success") { setSelection({ destination: "", period: "", travelers: "2", budget: "" }); setContact({ name: "", phone: "", email: "", consent: false }); } reset(); };

  return <section id="radar" className="campaign-container campaign-radar">
    <div className="campaign-radar-top">
      <div className="campaign-radar-heading"><span className="campaign-radar-icon"><Compass aria-hidden="true" /></span><div><h2>Radar de Oportunidades</h2><p>Não encontrou nos destaques da semana? Conte para onde e quando quer viajar e nossa equipe fica de olho em uma oferta para você.</p></div></div>
      <p className="campaign-radar-aside">Deixe seu destino no radar da O Mundo em Cores.</p>
    </div>
    <form onSubmit={e => { e.preventDefault(); if (ready) setOpen(true); }} className="campaign-radar-form">
      <label><span>Destino de interesse</span><Input aria-label="Destino" required maxLength={120} placeholder="Ex.: Orlando, Paris, Maceió" value={selection.destination} onChange={e => update("destination", e.target.value)} /></label>
      <label><span>Quando pretende viajar?</span><select aria-label="Período" required value={selection.period} onChange={e => update("period", e.target.value)}><option value="">Escolha o mês</option>{RADAR_PERIODS.map(p => <option key={p} value={p}>{p}</option>)}<option value="Datas flexíveis">Datas flexíveis</option></select></label>
      <label><span>Quantas pessoas?</span><select aria-label="Viajantes" value={selection.travelers} onChange={e => update("travelers", e.target.value)}>{[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n === 5 ? "5 ou mais pessoas" : `${n} ${n === 1 ? "pessoa" : "pessoas"}`}</option>)}</select></label>
      <label><span>Qual é o seu orçamento previsto?</span><select aria-label="Orçamento" required value={selection.budget} onChange={e => update("budget", e.target.value)}><option value="">Selecione uma faixa</option>{BUDGETS.map(b => <option key={b} value={b}>{b}</option>)}</select></label>
      <Button type="submit" size="lg" disabled={!ready}><Radar />Colocar no radar</Button>
    </form>

    <Dialog open={open} onOpenChange={o => { if (!o) close(); }}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader><DialogTitle>Colocar no radar da agência</DialogTitle><DialogDescription>{selection.destination} · {selection.period} · {travelersLabel} · {selection.budget}</DialogDescription></DialogHeader>
        {state === "success" ? <div role="status" className="py-6 text-center"><CheckCircle2 className="mx-auto h-12 w-12 text-primary" /><h3 className="mt-4 text-xl font-semibold">Pedido recebido!</h3><p className="mt-3 text-muted-foreground">Seu destino está no radar. Nossa equipe vai procurar uma oferta e entrar em contato.</p><Button className="mt-6" onClick={close}>Fechar</Button></div>
        : <form className="space-y-4" onSubmit={async e => {
            e.preventDefault();
            if (!contactOk || sending.current) return;
            sending.current = true;
            try {
              await submit({
                service_key: "pacotes", service_label: `Radar de Oportunidades — ${selection.destination.trim()}`,
                lead_name: contact.name.trim(), lead_phone: contact.phone, lead_email: contact.email.trim(),
                preferred_channel: contact.phone.replace(/\D/g, "") ? "whatsapp" : "email",
                summary: `Radar: ${selection.destination.trim()} · ${selection.period} · ${travelersLabel} · Orçamento: ${selection.budget} · Origem: Oportunidades de Novembro`,
                notes: "", consent: contact.consent, consent_version: "v1", honeypot,
                details: { destino: selection.destination.trim(), periodo: selection.period, viajantes: travelersLabel, orcamento: selection.budget, origem: "Site / Oportunidades de Novembro / Radar" },
              });
            } finally { sending.current = false; }
          }}>
            <fieldset disabled={state === "submitting"} className="space-y-4">
              <div><Label htmlFor="radar-name">Nome completo</Label><Input id="radar-name" autoComplete="name" required maxLength={200} value={contact.name} onChange={e => setContact(c => ({ ...c, name: e.target.value }))} className="mt-2" /></div>
              <p className="text-sm text-muted-foreground">Informe WhatsApp, e-mail ou os dois.</p>
              <div className="grid gap-4 sm:grid-cols-2"><div><Label htmlFor="radar-phone">WhatsApp com DDD</Label><Input id="radar-phone" type="tel" placeholder="(11) 99999-9999" value={contact.phone} onChange={e => setContact(c => ({ ...c, phone: maskPhone(e.target.value) }))} className="mt-2" /></div><div><Label htmlFor="radar-email">E-mail</Label><Input id="radar-email" type="email" maxLength={200} value={contact.email} onChange={e => setContact(c => ({ ...c, email: e.target.value }))} className="mt-2" /></div></div>
              <div className="hidden" aria-hidden="true"><input name="website" tabIndex={-1} autoComplete="off" value={honeypot} onChange={e => setHoneypot(e.target.value)} /></div>
              <div className="flex items-start gap-3"><Checkbox id="radar-consent" checked={contact.consent} onCheckedChange={v => setContact(c => ({ ...c, consent: v === true }))} /><Label htmlFor="radar-consent" className="text-sm font-normal leading-6">Concordo com o envio dos meus dados para que a O Mundo em Cores entre em contato comigo sobre esta viagem.</Label></div>
            </fieldset>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <Button type="submit" size="lg" className="w-full" disabled={!contactOk || state === "submitting"}>{state === "submitting" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Enviar para o radar</Button>
          </form>}
      </DialogContent>
    </Dialog>
  </section>;
}
