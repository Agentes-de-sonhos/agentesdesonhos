import { useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { agencyDisplayName, type AgencyDomainInfo } from "@/lib/agencyDomains";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AgencyBrandSpinner } from "@/components/whitelabel/AgencyBrandSpinner";
import { AgencyRequestCenter } from "@/components/whitelabel/AgencyRequestCenter";
import { CheckCircle2, Info, Loader2 } from "lucide-react";
import {
  EMPTY_OFFER_REQUEST,
  OFFER_CONSENT_VERSION,
  OFFER_PRICE_NOTICE,
  formatOfferPeriod,
  formatOfferPrice,
  isProvenPromotion,
  similarQuotePrefill,
  validateOfferRequest,
  type OfferRequestForm,
  type PublicOffer,
} from "@/lib/offers";

function readUtm(): Record<string, string> {
  const out: Record<string, string> = {};
  try {
    const p = new URLSearchParams(window.location.search);
    for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"]) {
      const v = p.get(k);
      if (v) out[k] = v.slice(0, 120);
    }
  } catch {
    /* ignore */
  }
  return out;
}

function Unavailable({ title, text, basePath }: { title: string; text: string; basePath: string }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6 text-center">
      <div className="max-w-md space-y-3">
        <h1 className="text-xl font-semibold text-foreground">{title}</h1>
        <p className="text-sm text-muted-foreground">{text}</p>
        <Button asChild variant="outline"><Link to={`${basePath}/ofertas`}>Ver outras ofertas</Link></Button>
      </div>
    </div>
  );
}

/** Página pública da oferta. Sem atalho para WhatsApp: contato só pelo formulário. */
export default function AgencyOfferDetail({ info, basePath = "" }: { info: AgencyDomainInfo; basePath?: string }) {
  const { slug = "" } = useParams<{ slug: string }>();
  const { data: offer, isLoading } = useQuery({
    queryKey: ["public-offer", info.hostname, slug],
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_public_offer_by_slug", { p_hostname: info.hostname, p_slug: slug });
      if (error) return { status: "not_found" } as PublicOffer;
      return data as PublicOffer;
    },
  });
  const [formOpen, setFormOpen] = useState(false);
  const [similarOpen, setSimilarOpen] = useState(false);

  if (isLoading) return <div className="flex min-h-[60vh] items-center justify-center"><AgencyBrandSpinner size="lg" /></div>;
  if (!offer || offer.status === "not_found") {
    return <Unavailable basePath={basePath} title="Oferta não encontrada" text="Este endereço não está disponível. Confira as ofertas vigentes." />;
  }
  if (offer.status === "paused") {
    return <Unavailable basePath={basePath} title="Oferta temporariamente indisponível" text="Esta oferta está indisponível no momento. Confira outras oportunidades de viagem." />;
  }

  const closed = offer.status === "expired" || offer.status === "ended";
  const period = formatOfferPeriod(offer.travel_start, offer.travel_end);
  const onRequest = offer.price_mode === "on_request" || !offer.price_from;

  return (
    <article className="mx-auto max-w-5xl px-4 py-10 md:py-14">
      {offer.cover_url && (
        <div className="relative aspect-[16/8] overflow-hidden rounded-3xl bg-muted">
          <img src={offer.cover_url} alt={offer.title ?? ""} className={`h-full w-full object-cover ${closed ? "grayscale" : ""}`} />
        </div>
      )}
      <div className="mt-8 grid gap-10 md:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <div className="flex flex-wrap gap-2">
            {offer.category && <Badge variant="secondary">{offer.category}</Badge>}
            {!closed && isProvenPromotion(offer) && <Badge>Promoção</Badge>}
            {closed && <Badge variant="outline">{offer.status === "ended" ? "Oferta encerrada" : "Oferta expirada"}</Badge>}
          </div>
          <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">{offer.destination}</p>
          <h1 className="text-3xl font-semibold leading-tight tracking-tight text-foreground md:text-4xl">{offer.title}</h1>
          {period && <p className="text-muted-foreground">{period}{offer.nights ? ` · ${offer.nights} noites` : ""}</p>}
          {offer.description && <p className="whitespace-pre-line leading-relaxed text-foreground/90">{offer.description}</p>}
          {!!offer.included_services?.length && (
            <div>
              <h2 className="mb-3 text-lg font-semibold text-foreground">O que está incluído</h2>
              <ul className="space-y-2">
                {offer.included_services.map((s, i) => {
                  const Icon = serviceIcon(s.type);
                  return (
                    <li key={i} className="flex gap-2 text-sm">
                      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span><strong>{serviceLabel(s.type)}</strong>{s.name ? ` · ${s.name}` : ""}{s.detail ? ` — ${s.detail}` : ""}</span>
                    </li>
                  );
                })}
              </ul>

            </div>
          )}
          {offer.payment_conditions && !closed && (
            <div>
              <h2 className="mb-2 text-lg font-semibold text-foreground">Condições</h2>
              <p className="whitespace-pre-line text-sm text-muted-foreground">{offer.payment_conditions}</p>
            </div>
          )}
        </div>

        <aside className="h-fit space-y-4 rounded-2xl border border-border/60 bg-card p-5 md:sticky md:top-24">
          {closed ? (
            <>
              <p className="text-sm text-muted-foreground">
                Esta oferta não está mais disponível. Podemos preparar uma cotação semelhante para você.
              </p>
              <Button className="w-full" size="lg" onClick={() => setSimilarOpen(true)}>Solicitar uma cotação semelhante</Button>
            </>
          ) : (
            <>
              {onRequest ? (
                <p className="text-xl font-semibold text-foreground">Solicite uma cotação</p>
              ) : (
                <div>
                  <p className="text-xs text-muted-foreground">Valor a partir de</p>
                  {isProvenPromotion(offer) && (
                    <p className="text-sm text-muted-foreground line-through">{formatOfferPrice(offer.compare_at_price, offer.currency)}</p>
                  )}
                  <p className="text-3xl font-bold text-foreground">{formatOfferPrice(offer.price_from, offer.currency, offer.price_mode)}</p>
                  {offer.price_note && <p className="mt-1 text-xs text-muted-foreground">{offer.price_note}</p>}
                </div>
              )}
              {offer.expires_at && (
                <p className="text-xs text-muted-foreground">Oferta válida até {new Date(offer.expires_at).toLocaleDateString("pt-BR")}</p>
              )}
              <Button className="w-full" size="lg" onClick={() => setFormOpen(true)}>Solicitar esta oferta</Button>
            </>
          )}
        </aside>
      </div>

      {!closed && <OfferRequestDialog open={formOpen} onOpenChange={setFormOpen} info={info} offer={offer} />}

      {closed && (
        <Dialog open={similarOpen} onOpenChange={setSimilarOpen}>
          <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Cotação semelhante</DialogTitle>
              <DialogDescription>Já preenchemos o destino e os dados principais desta oferta.</DialogDescription>
            </DialogHeader>
            <AgencyRequestCenter
              hostname={info.hostname}
              agencyName={agencyDisplayName(info)}
              initialService="pacotes"
              prefill={similarQuotePrefill(offer)}
              variant="plain"
              hideHeading
            />
          </DialogContent>
        </Dialog>
      )}
    </article>
  );
}

function OfferRequestDialog({
  open,
  onOpenChange,
  info,
  offer,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  info: AgencyDomainInfo;
  offer: PublicOffer;
}) {
  const [form, setForm] = useState<OfferRequestForm>(EMPTY_OFFER_REQUEST);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [serverError, setServerError] = useState<string | null>(null);
  const [honeypot, setHoneypot] = useState("");
  const openedAt = useRef(Date.now());
  const sending = useRef(false);
  const idem = useMemo(() => crypto.randomUUID(), [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = <K extends keyof OfferRequestForm>(k: K, v: OfferRequestForm[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => (e[k] ? { ...e, [k]: "" } : e));
  };

  const submit = async () => {
    if (sending.current) return;
    const errs = validateOfferRequest(form);
    setErrors(errs);
    if (Object.values(errs).some(Boolean)) return;
    sending.current = true;
    setState("sending");
    setServerError(null);
    const { data, error } = await supabase.functions.invoke("submit-agency-site-request", {
      body: {
        service_key: "oferta",
        offer_slug: offer.slug,
        hostname: info.hostname,
        lead_name: form.lead_name,
        lead_phone: form.lead_phone,
        lead_email: form.lead_email || null,
        adults: form.adults,
        children: form.children,
        departure_city: form.departure_city,
        notes: form.notes || null,
        consent: form.consent,
        consent_version: OFFER_CONSENT_VERSION,
        idempotency_key: `offer:${idem}`,
        source_url: window.location.href.slice(0, 500),
        elapsed_ms: Date.now() - openedAt.current,
        honeypot,
        utm: readUtm(),
      },
    });
    sending.current = false;
    if (error || (data as any)?.error) {
      let msg = (data as any)?.error as string | undefined;
      try {
        const ctx = (error as any)?.context as Response | undefined;
        if (ctx?.clone) msg = (await ctx.clone().json())?.error ?? msg;
      } catch {
        /* mantém mensagem amigável */
      }
      setServerError(msg ?? "Não foi possível enviar sua solicitação agora. Tente novamente.");
      setState("idle");
      return;
    }
    setState("done");
  };

  const close = (v: boolean) => {
    onOpenChange(v);
    if (!v && state === "done") {
      setForm(EMPTY_OFFER_REQUEST);
      setState("idle");
    }
  };

  const err = (k: string) => (errors[k] ? <p className="text-xs text-destructive">{errors[k]}</p> : null);

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        {state === "done" ? (
          <div className="space-y-4 py-6 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-primary" />
            <h2 className="text-lg font-semibold">Solicitação enviada!</h2>
            <p className="text-sm text-muted-foreground">
              Recebemos seu interesse em “{offer.title}”. Nossa equipe vai conferir disponibilidade e valores e retornará pelo WhatsApp informado.
            </p>
            <Button onClick={() => close(false)}>Fechar</Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Solicitar esta oferta</DialogTitle>
              <DialogDescription>{offer.title}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2 space-y-1">
                <Label htmlFor="of-name">Nome completo</Label>
                <Input id="of-name" autoComplete="name" value={form.lead_name} onChange={(e) => set("lead_name", e.target.value)} />
                {err("lead_name")}
              </div>
              <div className="space-y-1">
                <Label htmlFor="of-phone">WhatsApp com DDD</Label>
                <Input id="of-phone" type="tel" inputMode="tel" autoComplete="tel" value={form.lead_phone} onChange={(e) => set("lead_phone", e.target.value)} />
                {err("lead_phone")}
              </div>
              <div className="space-y-1">
                <Label htmlFor="of-email">E-mail (opcional)</Label>
                <Input id="of-email" type="email" autoComplete="email" value={form.lead_email} onChange={(e) => set("lead_email", e.target.value)} />
                {err("lead_email")}
              </div>
              <div className="space-y-1">
                <Label htmlFor="of-adults">Adultos</Label>
                <Input id="of-adults" type="number" min={1} max={30} value={form.adults} onChange={(e) => set("adults", e.target.value)} />
                {err("adults")}
              </div>
              <div className="space-y-1">
                <Label htmlFor="of-kids">Crianças</Label>
                <Input id="of-kids" type="number" min={0} max={20} value={form.children} onChange={(e) => set("children", e.target.value)} />
                {err("children")}
              </div>
              <div className="sm:col-span-2 space-y-1">
                <Label htmlFor="of-city">Cidade de saída</Label>
                <Input id="of-city" value={form.departure_city} onChange={(e) => set("departure_city", e.target.value)} />
                {err("departure_city")}
              </div>
              <div className="sm:col-span-2 space-y-1">
                <Label htmlFor="of-notes">Observações ou preferências (opcional)</Label>
                <Textarea id="of-notes" rows={3} maxLength={2000} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
              </div>
              <input tabIndex={-1} aria-hidden="true" autoComplete="off" className="hidden" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
              <label className="sm:col-span-2 flex items-start gap-2 text-sm">
                <Checkbox checked={form.consent} onCheckedChange={(v) => set("consent", v === true)} className="mt-0.5" />
                <span>
                  Autorizo o uso dos meus dados para contato sobre esta solicitação e li a{" "}
                  <a href="/politicasdeprivacidade" target="_blank" rel="noopener noreferrer" className="underline">Política de Privacidade</a>.
                </span>
              </label>
              <div className="sm:col-span-2">{err("consent")}</div>
              <div className="sm:col-span-2 flex gap-2 rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
                <Info className="h-4 w-4 shrink-0" /> {OFFER_PRICE_NOTICE}
              </div>
              {serverError && <p className="sm:col-span-2 text-sm text-destructive">{serverError}</p>}
              <Button className="sm:col-span-2" size="lg" onClick={submit} disabled={state === "sending"}>
                {state === "sending" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Enviar solicitação
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
