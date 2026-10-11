import { useState } from "react";
import { Check, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAgencySiteRequest } from "@/hooks/useAgencySiteRequest";
import { cn } from "@/lib/utils";

const CONSULADOS = ["Brasília", "São Paulo", "Rio de Janeiro", "Recife", "Porto Alegre", "Ainda não sei"] as const;

/**
 * Solicitação simples de proposta da assessoria de visto americano B1/B2.
 * Envia pela mesma Edge Function segura da Central de Solicitações: o tenant
 * é resolvido no servidor pelo hostname e o lead chega ao CRM + e-mail da agência.
 */
export function UsVisaProposalDialog({ hostname, whatsapp, className = "" }: {
  hostname: string;
  whatsapp: string | null;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const { state, error, submit, reset } = useAgencySiteRequest(hostname);
  const [f, setF] = useState({ name: "", phone: "", email: "", adultos: "1", criancas: "0", consulado: "", notes: "", consent: false });
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (f.name.trim().length < 2) return setFormError("Informe seu nome.");
    const digits = f.phone.replace(/\D/g, "");
    if (!digits && !f.email.trim()) return setFormError("Informe um WhatsApp ou e-mail.");
    if (digits && (digits.length < 10 || digits.length > 15)) return setFormError("Informe um WhatsApp válido com DDD.");
    if (!f.consent) return setFormError("É necessário aceitar o uso dos seus dados para contato.");
    const adultos = Math.max(1, Number(f.adultos) || 1);
    const criancas = Math.max(0, Number(f.criancas) || 0);
    const res = await submit({
      service_key: "pacotes",
      service_label: "Visto americano B1/B2",
      lead_name: f.name.trim(),
      lead_phone: f.phone.trim(),
      lead_email: f.email.trim(),
      destination: "Estados Unidos",
      summary: [
        "Solicitação de proposta — assessoria de visto americano B1/B2",
        `${adultos} adulto(s), ${criancas} criança(s)`,
        f.consulado ? `Consulado de preferência: ${f.consulado}` : "Consulado de preferência: não informado",
      ].join(" | ").slice(0, 2000),
      notes: f.notes.trim().slice(0, 2000),
      consent: true,
      consent_version: "v1",
      details: {
        origem_pagina: "Visto americano",
        adultos: String(adultos),
        criancas: String(criancas),
        ...(f.consulado ? { consulado_preferencia: f.consulado } : {}),
      },
    });
    if ("success" in res) setSent(true);
  };

  const close = (o: boolean) => {
    setOpen(o);
    if (!o && sent) { setSent(false); reset(); }
  };

  const waText = `Olá, Amanda! Acabei de pedir uma proposta de assessoria de visto americano B1/B2 pelo site. Nome: ${f.name}`;

  return (
    <>
      <Button type="button" size="lg" onClick={() => setOpen(true)} className={cn("wl-visa-cta", className)}>
        Consulte a proposta
      </Button>
      <Dialog open={open} onOpenChange={close}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          {sent ? (
            <div className="py-4 text-center">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary text-primary-foreground">
                <Check className="h-6 w-6" />
              </div>
              <DialogTitle className="mt-4">Solicitação enviada!</DialogTitle>
              <DialogDescription className="mt-2">
                A Amanda recebeu seu pedido e retorna com a proposta da assessoria de visto americano.
              </DialogDescription>
              {whatsapp && (
                <Button asChild size="lg" className="mt-6">
                  <a href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(waText)}`} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="mr-2 h-4 w-4" />Continuar no WhatsApp
                  </a>
                </Button>
              )}
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Consulte a proposta</DialogTitle>
                <DialogDescription>
                  Conte rapidamente quem viaja e a Amanda retorna com a proposta da assessoria B1/B2. Nada é cobrado agora.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={send} className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label htmlFor="visa-n" className="text-xs">Nome completo *</Label>
                  <Input id="visa-n" className="mt-1" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="visa-p" className="text-xs">WhatsApp (com DDD)</Label>
                  <Input id="visa-p" type="tel" className="mt-1" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="visa-e" className="text-xs">E-mail</Label>
                  <Input id="visa-e" type="email" className="mt-1" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="visa-a" className="text-xs">Adultos</Label>
                  <Input id="visa-a" type="number" min={1} max={20} className="mt-1" value={f.adultos} onChange={(e) => setF({ ...f, adultos: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="visa-c" className="text-xs">Crianças</Label>
                  <Input id="visa-c" type="number" min={0} max={20} className="mt-1" value={f.criancas} onChange={(e) => setF({ ...f, criancas: e.target.value })} />
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-xs">Consulado de preferência (opcional)</Label>
                  <Select value={f.consulado} onValueChange={(v) => setF({ ...f, consulado: v })}>
                    <SelectTrigger className="mt-1" aria-label="Consulado de preferência">
                      <SelectValue placeholder="Escolha agora ou deixe para depois" />
                    </SelectTrigger>
                    <SelectContent>
                      {CONSULADOS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="visa-o" className="text-xs">Observações</Label>
                  <Textarea id="visa-o" rows={3} maxLength={1500} className="mt-1" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />
                </div>
                <label className="flex items-start gap-2 text-xs text-muted-foreground sm:col-span-2">
                  <input type="checkbox" className="mt-0.5" checked={f.consent} onChange={(e) => setF({ ...f, consent: e.target.checked })} />
                  Autorizo a 100 Limites a usar meus dados para retornar com a proposta, conforme a privacidade do site.
                </label>
                {(formError || error) && <p className="text-sm font-medium text-destructive sm:col-span-2" role="alert">{formError ?? error}</p>}
                <Button type="submit" size="lg" disabled={state === "submitting"} className="wl-visa-cta sm:col-span-2">
                  {state === "submitting" ? "Enviando…" : "Enviar solicitação"}
                </Button>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
