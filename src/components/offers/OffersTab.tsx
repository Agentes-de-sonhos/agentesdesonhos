import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, Sparkles, FileText, MoreHorizontal, Loader2, Tag, AlertTriangle, Inbox, Link2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAgencyOwnerId } from "@/hooks/useAgencyOwnerId";
import { useQuotes } from "@/hooks/useQuotes";
import { useOffers, useOfferRequests, useOfferSettings, type OfferRow } from "@/hooks/useOffers";
import { OfferEditorDialog } from "@/components/offers/OfferEditorDialog";
import {
  OFFER_STATUS_LABELS,
  effectiveOfferStatus,
  formatOfferPeriod,
  formatOfferPrice,
  offerMatchesPanelFilter,
  type OfferPanelFilter,
} from "@/lib/offers";
import { cn } from "@/lib/utils";

const FILTERS: { key: OfferPanelFilter | "requests"; label: string }[] = [
  { key: "active", label: "Ativas" },
  { key: "scheduled", label: "Agendadas" },
  { key: "paused", label: "Pausadas" },
  { key: "draft", label: "Rascunhos" },
  { key: "history", label: "Histórico" },
  { key: "requests", label: "Solicitações" },
];

const fmtDate = (v?: string | null) => (v ? new Date(v).toLocaleDateString("pt-BR") : "—");

export function OffersTab() {
  const navigate = useNavigate();
  const { agencyOwnerId } = useAgencyOwnerId();
  const { data: settings } = useOfferSettings();
  const { offers, isLoading, createFromQuote, setStatus, saveSettings } = useOffers();
  const { requests, convert, isLoading: reqLoading } = useOfferRequests();
  const { quotes } = useQuotes();
  const [filter, setFilter] = useState<OfferPanelFilter | "requests">("active");
  const [editor, setEditor] = useState<{ mode: "edit" | "manual" | "import"; offer?: OfferRow | null } | null>(null);
  const [pickQuote, setPickQuote] = useState(false);

  const { data: siteHost } = useQuery({
    queryKey: ["offer-site-host", agencyOwnerId],
    enabled: !!agencyOwnerId,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("agency_public_domains")
        .select("hostname, is_primary")
        .eq("user_id", agencyOwnerId)
        .eq("is_active", true)
        .order("is_primary", { ascending: false })
        .limit(1);
      return (data?.[0]?.hostname as string | undefined) ?? null;
    },
  });

  const withStatus = useMemo(() => offers.map((o) => ({ ...o, eff: effectiveOfferStatus(o) })), [offers]);
  const counts = useMemo(() => {
    const c: Record<string, number> = { requests: requests.length };
    for (const f of FILTERS) if (f.key !== "requests") c[f.key] = withStatus.filter((o) => offerMatchesPanelFilter(o.eff, f.key as OfferPanelFilter)).length;
    return c;
  }, [withStatus, requests]);
  const visible = filter === "requests" ? [] : withStatus.filter((o) => offerMatchesPanelFilter(o.eff, filter));

  const offeredQuoteIds = new Set(offers.map((o) => o.source_quote_id).filter(Boolean));
  const eligibleQuotes = (quotes ?? []).filter(
    (q: any) => q.status === "published" && !q.offer_opt_out && !offeredQuoteIds.has(q.id),
  );

  const act = async (id: string, action: "publish" | "pause" | "resume" | "end" | "extend", ok: string) => {
    try {
      await setStatus.mutateAsync({ id, action });
      toast.success(ok);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const copyLink = (o: OfferRow) => {
    if (!siteHost) return toast.error("Site da agência não encontrado.");
    navigator.clipboard.writeText(`https://${siteHost}/ofertas/${o.slug}`);
    toast.success("Link copiado.");
  };

  const onPickQuote = async (quoteId: string) => {
    try {
      const r = await createFromQuote.mutateAsync(quoteId);
      setPickQuote(false);
      toast.success(r.existing ? "Este orçamento já possui oferta." : "Oferta criada como rascunho.");
      setFilter("draft");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const onConvert = async (requestId: string) => {
    try {
      const r = await convert.mutateAsync(requestId);
      toast.success(r.existing ? "Abrindo o orçamento já criado." : "Orçamento criado como rascunho.");
      navigate(`/ferramentas-ia/gerar-orcamento/${r.quote_id}`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Switch
              id="offers-auto"
              checked={!!settings?.auto_publish_new_quotes}
              disabled={saveSettings.isPending}
              onCheckedChange={(v) =>
                saveSettings.mutate(
                  { auto: v, days: settings?.default_validity_days ?? 7 },
                  { onSuccess: () => toast.success(v ? "Publicação automática ativada." : "Publicação automática desativada.") },
                )
              }
            />
            <div>
              <Label htmlFor="offers-auto" className="text-sm font-medium">Publicar automaticamente novos orçamentos publicados</Label>
              <p className="text-xs text-muted-foreground">Vale só para orçamentos criados a partir da ativação. Orçamentos antigos nunca são publicados sozinhos.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Validade padrão</span>
            <Select
              value={String(settings?.default_validity_days ?? 7)}
              onValueChange={(v) => saveSettings.mutate({ auto: !!settings?.auto_publish_new_quotes, days: Number(v) })}
            >
              <SelectTrigger className="h-9 w-[110px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[7, 15, 30].map((d) => <SelectItem key={d} value={String(d)}>{d} dias</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                filter === f.key ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {f.label} <span className="opacity-70">{counts[f.key] ?? 0}</span>
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setPickQuote(true)}><FileText className="mr-1.5 h-4 w-4" /> A partir de orçamento</Button>
          <Button variant="outline" size="sm" onClick={() => setEditor({ mode: "import" })}><Sparkles className="mr-1.5 h-4 w-4" /> Importar com IA</Button>
          <Button size="sm" onClick={() => setEditor({ mode: "manual" })}><Plus className="mr-1.5 h-4 w-4" /> Nova oferta</Button>
        </div>
      </div>

      {filter === "requests" ? (
        reqLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : requests.length === 0 ? (
          <Empty icon={Inbox} text="As solicitações recebidas pelas páginas de oferta aparecem aqui." />
        ) : (
          <div className="space-y-3">
            {requests.map((r) => {
              const s = r.offer_snapshot ?? {};
              return (
                <Card key={r.id}>
                  <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 space-y-1 text-sm">
                      <p className="font-medium">{r.lead_name} <span className="text-muted-foreground font-normal">· {fmtDate(r.created_at)}</span></p>
                      <p className="text-muted-foreground">
                        {[r.lead_phone, r.lead_email].filter(Boolean).join(" · ")} · {r.details?.ctx_adultos ?? "?"} adulto(s), {r.details?.ctx_criancas ?? "0"} criança(s) · saída {s.departure_city ?? r.details?.cidade_saida ?? "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Visto pelo cliente: <strong className="text-foreground">{s.title}</strong> · {s.destination} · {formatOfferPeriod(s.travel_start, s.travel_end) ?? "datas a definir"} · {formatOfferPrice(s.price_from, s.currency, s.price_mode)} · válida até {fmtDate(s.expires_at)}
                      </p>
                      {r.notes && <p className="text-xs">“{r.notes}”</p>}
                      <p className="text-[11px] text-muted-foreground">Consentimento {r.consent_version} em {r.consent_at ? new Date(r.consent_at).toLocaleString("pt-BR") : "—"}</p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      {r.opportunity_id && (
                        <Button variant="outline" size="sm" onClick={() => navigate(`/crm?opportunity=${r.opportunity_id}`)}>Ver no CRM</Button>
                      )}
                      <Button size="sm" onClick={() => onConvert(r.id)} disabled={convert.isPending}>
                        {r.converted_quote_id ? "Abrir orçamento" : "Criar orçamento a partir da oferta"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )
      ) : isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : visible.length === 0 ? (
        <Empty icon={Tag} text="Nenhuma oferta nesta etapa." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {visible.map((o) => (
            <Card key={o.id} className="overflow-hidden">
              <CardContent className="flex gap-3 p-3">
                <div className="h-20 w-24 shrink-0 overflow-hidden rounded-lg bg-muted">
                  {o.cover_url && <img src={o.cover_url} alt="" className="h-full w-full object-cover" loading="lazy" />}
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-sm font-semibold">{o.title || "Sem título"}</p>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Ações da oferta"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditor({ mode: "edit", offer: o })}>Editar</DropdownMenuItem>
                        {(o.eff === "draft" || o.eff === "expired" || o.eff === "ended") && (
                          <DropdownMenuItem onClick={() => act(o.id, "publish", "Oferta publicada.")}>{o.eff === "draft" ? "Publicar" : "Republicar"}</DropdownMenuItem>
                        )}
                        {o.eff === "published" && <DropdownMenuItem onClick={() => act(o.id, "pause", "Oferta pausada.")}>Pausar</DropdownMenuItem>}
                        {o.eff === "paused" && <DropdownMenuItem onClick={() => act(o.id, "resume", "Oferta retomada.")}>Retomar</DropdownMenuItem>}
                        {(o.eff === "published" || o.eff === "paused" || o.eff === "expired") && (
                          <DropdownMenuItem onClick={() => act(o.id, "extend", "Validade estendida.")}>Estender validade</DropdownMenuItem>
                        )}
                        {o.eff !== "draft" && o.eff !== "scheduled" && (
                          <DropdownMenuItem onClick={() => copyLink(o)}><Link2 className="mr-2 h-4 w-4" /> Copiar link</DropdownMenuItem>
                        )}
                        {o.eff !== "ended" && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => act(o.id, "end", "Oferta encerrada.")}>Encerrar</DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant={o.eff === "published" ? "default" : "secondary"} className="text-[10px]">{OFFER_STATUS_LABELS[o.eff]}</Badge>
                    <Badge variant="outline" className="text-[10px]">{o.origin === "quote" ? "Orçamento" : o.origin === "import" ? "Importada" : "Manual"}</Badge>
                    {o.customized_fields.length > 0 && <Badge variant="outline" className="text-[10px]">{o.customized_fields.length} personalizado(s)</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {o.destination ?? "—"} · {formatOfferPrice(o.price_from, o.currency, o.price_mode)} · {o.expires_at ? `até ${fmtDate(o.expires_at)}` : "sem validade"} · {o.requests_count} solicitação(ões)
                  </p>
                  {o.sync_warning && (
                    <p className="flex items-center gap-1 text-[11px] text-muted-foreground"><AlertTriangle className="h-3 w-3" /> {o.sync_warning}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <OfferEditorDialog
        open={!!editor}
        onOpenChange={(v) => !v && setEditor(null)}
        mode={editor?.mode ?? "manual"}
        offer={editor?.offer ?? null}
      />

      <Dialog open={pickQuote} onOpenChange={setPickQuote}>
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Criar oferta a partir de orçamento</DialogTitle>
            <DialogDescription>Somente orçamentos publicados e marcados para “Publicar como oferta no site”. Dados do cliente não são levados.</DialogDescription>
          </DialogHeader>
          {eligibleQuotes.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Nenhum orçamento publicado disponível.</p>
          ) : (
            <div className="space-y-2">
              {eligibleQuotes.slice(0, 50).map((q: any) => (
                <button
                  key={q.id}
                  onClick={() => onPickQuote(q.id)}
                  disabled={createFromQuote.isPending}
                  className="w-full rounded-lg border border-border p-3 text-left text-sm hover:bg-muted/50"
                >
                  <p className="font-medium">{q.trip_title || q.destination}</p>
                  <p className="text-xs text-muted-foreground">{q.destination} · {formatOfferPeriod(q.start_date, q.end_date)}</p>
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Empty({ icon: Icon, text }: { icon: typeof Tag; text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
      <Icon className="h-6 w-6" /> {text}
    </div>
  );
}
