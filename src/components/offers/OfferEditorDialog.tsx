import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, RotateCcw, Sparkles, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useOffers, type OfferRow } from "@/hooks/useOffers";
import { OFFER_CATEGORIES, STRUCTURAL_FIELD_LABELS, type OfferIncludedService } from "@/lib/offers";

type Mode = "edit" | "manual" | "import";

interface FormState {
  title: string;
  description: string;
  cover_url: string;
  destination: string;
  category: string;
  travel_start: string;
  travel_end: string;
  nights: string;
  price_mode: "fixed" | "on_request";
  price_from: string;
  currency: string;
  price_note: string;
  base_pax: string;
  max_installments: string;
  compare_at_price: string;
  payment_conditions: string;
  included_services: OfferIncludedService[];
}

const EMPTY: FormState = {
  title: "",
  description: "",
  cover_url: "",
  destination: "",
  category: "Pacotes",
  travel_start: "",
  travel_end: "",
  nights: "",
  price_mode: "fixed",
  price_from: "",
  currency: "BRL",
  price_note: "",
  base_pax: "",
  max_installments: "",
  compare_at_price: "",
  payment_conditions: "",
  included_services: [],
};

function fromOffer(o: OfferRow): FormState {
  return {
    title: o.title ?? "",
    description: o.description ?? "",
    cover_url: o.cover_url ?? "",
    destination: o.destination ?? "",
    category: o.category ?? "Pacotes",
    travel_start: o.travel_start ?? "",
    travel_end: o.travel_end ?? "",
    nights: o.nights != null ? String(o.nights) : "",
    price_mode: o.price_mode,
    price_from: o.price_from != null ? String(o.price_from) : "",
    currency: o.currency ?? "BRL",
    price_note: o.price_note ?? "",
    base_pax: o.base_pax != null ? String(o.base_pax) : "",
    max_installments: o.max_installments != null ? String(o.max_installments) : "",
    compare_at_price: o.compare_at_price != null ? String(o.compare_at_price) : "",
    payment_conditions: o.payment_conditions ?? "",
    included_services: o.included_services ?? [],
  };
}

const num = (v: string) => {
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
};

const intOrNull = (v: string, min: number, max: number) => {
  const n = Math.round(Number(String(v).replace(",", ".")));
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
};

export function OfferEditorDialog({
  open,
  onOpenChange,
  mode,
  offer,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: Mode;
  offer?: OfferRow | null;
}) {
  const { save, restore } = useOffers(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [reviewed, setReviewed] = useState(false);
  const [importText, setImportText] = useState("");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(offer ? fromOffer(offer) : EMPTY);
    setReviewed(!!offer?.reviewed_at);
    setImportText("");
    setImportFile(null);
    setImported(false);
  }, [open, offer]);

  const fromQuote = offer?.origin === "quote";
  const isImport = mode === "import" || offer?.origin === "import";
  const customized = useMemo(() => offer?.customized_fields ?? [], [offer]);
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));

  const runImport = async () => {
    if (!importText.trim() && !importFile) return toast.error("Cole o texto ou envie uma imagem da oferta.");
    if (importFile && importFile.size > 5 * 1024 * 1024) return toast.error("Imagem muito grande (máximo 5 MB).");
    setImporting(true);
    try {
      let image_data_url: string | undefined;
      if (importFile) {
        image_data_url = await new Promise<string>((resolve, reject) => {
          const r = new FileReader();
          r.onload = () => resolve(String(r.result));
          r.onerror = reject;
          r.readAsDataURL(importFile);
        });
      }
      const { data, error } = await supabase.functions.invoke("import-offer-ai", {
        body: { text: importText, image_data_url },
      });
      if (error || data?.error) throw new Error(data?.error || "Não foi possível analisar o material agora.");
      const o = data.offer ?? {};
      setForm({
        ...EMPTY,
        title: o.title ?? "",
        description: o.description ?? "",
        destination: o.destination ?? "",
        category: o.category ?? "Pacotes",
        travel_start: o.travel_start ?? "",
        travel_end: o.travel_end ?? "",
        nights: o.nights ? String(o.nights) : "",
        price_mode: o.price_from ? "fixed" : "on_request",
        price_from: o.price_from ? String(o.price_from) : "",
        currency: o.currency ?? "BRL",
        price_note: o.price_note ?? "",
        payment_conditions: o.payment_conditions ?? "",
        included_services: o.included_services ?? [],
      });
      setImported(true);
      setReviewed(false);
      toast.success("Dados extraídos. Revise tudo antes de salvar.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setImporting(false);
    }
  };

  const onSave = async () => {
    if (!form.title.trim()) return toast.error("Informe o título da oferta.");
    if (isImport && !reviewed) return toast.error("Confirme que revisou os dados importados.");
    const values: Partial<OfferRow> = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      cover_url: form.cover_url.trim() || null,
      category: form.category,
      price_note: form.price_note.trim() || null,
      compare_at_price: num(form.compare_at_price),
    };
    // Campos estruturais só são enviados quando mudam: o banco marca apenas esses como personalizados.
    const structural: Partial<OfferRow> = {
      destination: form.destination.trim() || null,
      travel_start: form.travel_start || null,
      travel_end: form.travel_end || null,
      nights: form.nights ? Math.max(0, Math.round(Number(form.nights))) : null,
      price_from: form.price_mode === "on_request" ? null : num(form.price_from),
      currency: form.currency,
      base_pax: form.price_mode === "on_request" ? null : intOrNull(form.base_pax, 1, 99),
      max_installments: form.price_mode === "on_request" ? null : intOrNull(form.max_installments, 1, 48),
      payment_conditions: form.payment_conditions.trim() || null,
    };
    if (offer) {
      for (const [k, v] of Object.entries(structural)) {
        const prev = (offer as any)[k];
        if ((prev ?? null) !== (v ?? null) && String(prev ?? "") !== String(v ?? "")) (values as any)[k] = v;
      }
      if (!fromQuote) values.price_mode = form.price_mode;
      if (isImport && reviewed && !offer.reviewed_at) values.reviewed_at = new Date().toISOString();
    } else {
      Object.assign(values, structural, {
        origin: mode === "import" ? "import" : "manual",
        status: "draft",
        price_mode: form.price_mode,
        included_services: form.included_services,
        service_types: [...new Set(form.included_services.map((s) => s.type).filter(Boolean))],
        reviewed_at: mode === "import" ? new Date().toISOString() : null,
      });
    }
    try {
      await save.mutateAsync({ id: offer?.id, values });
      toast.success(offer ? "Oferta atualizada." : "Oferta salva como rascunho.");
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const doRestore = async (fields: string[] | null) => {
    if (!offer) return;
    try {
      await restore.mutateAsync({ id: offer.id, fields });
      toast.success("Dados do orçamento restaurados.");
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const showForm = mode !== "import" || imported || !!offer;
  const CustomTag = ({ field }: { field: string }) =>
    fromQuote && customized.includes(field) ? (
      <button type="button" onClick={() => doRestore([field])} className="ml-2 inline-flex items-center gap-1 text-[11px] text-primary hover:underline">
        <RotateCcw className="h-3 w-3" /> Personalizado · restaurar
      </button>
    ) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{offer ? "Editar oferta" : mode === "import" ? "Importar oferta com IA" : "Nova oferta"}</DialogTitle>
          <DialogDescription>
            {fromQuote
              ? "Datas, serviços, preço e condições acompanham o orçamento. Editar um desses campos interrompe a sincronização só dele."
              : "A oferta é salva como rascunho. Publique quando estiver pronta."}
          </DialogDescription>
        </DialogHeader>

        {offer?.sync_warning && (
          <div className="flex gap-2 rounded-lg border border-border bg-muted/50 p-3 text-xs text-muted-foreground">
            <AlertTriangle className="h-4 w-4 shrink-0" /> {offer.sync_warning}
          </div>
        )}

        {mode === "import" && !offer && !imported && (
          <div className="space-y-3">
            <Textarea rows={7} placeholder="Cole aqui o texto do material do fornecedor…" value={importText} onChange={(e) => setImportText(e.target.value)} />
            <Input type="file" accept="image/*" onChange={(e) => setImportFile(e.target.files?.[0] ?? null)} />
            <Button onClick={runImport} disabled={importing} className="w-full">
              {importing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />} Extrair dados
            </Button>
          </div>
        )}

        {showForm && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2 space-y-1.5">
              <Label>Título comercial</Label>
              <Input value={form.title} maxLength={160} onChange={(e) => set("title", e.target.value)} />
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <Label>Descrição de vendas</Label>
              <Textarea rows={4} value={form.description} maxLength={2000} onChange={(e) => set("description", e.target.value)} />
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <Label>Imagem de capa (link)</Label>
              <Input value={form.cover_url} placeholder="https://…" onChange={(e) => set("cover_url", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Destino<CustomTag field="destination" /></Label>
              <Input value={form.destination} onChange={(e) => set("destination", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <Select value={form.category} onValueChange={(v) => set("category", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {OFFER_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Ida<CustomTag field="travel_start" /></Label>
              <Input type="date" value={form.travel_start} onChange={(e) => set("travel_start", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Volta<CustomTag field="travel_end" /></Label>
              <Input type="date" value={form.travel_end} onChange={(e) => set("travel_end", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Noites<CustomTag field="nights" /></Label>
              <Input type="number" min={0} value={form.nights} onChange={(e) => set("nights", e.target.value)} />
            </div>
            {!fromQuote && (
              <div className="space-y-1.5">
                <Label>Modalidade de preço</Label>
                <Select value={form.price_mode} onValueChange={(v) => set("price_mode", v as FormState["price_mode"])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Valor a partir de</SelectItem>
                    <SelectItem value="on_request">Sob consulta (exibe “Consulte”)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {form.price_mode === "fixed" && (
              <>
                <div className="space-y-1.5">
                  <Label>Preço<CustomTag field="price_from" /></Label>
                  <Input inputMode="decimal" value={form.price_from} onChange={(e) => set("price_from", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Moeda<CustomTag field="currency" /></Label>
                  <Select value={form.currency} onValueChange={(v) => set("currency", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BRL">BRL</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Passageiros do valor total<CustomTag field="base_pax" /></Label>
                  <Input
                    type="number"
                    min={1}
                    value={form.base_pax}
                    placeholder="Ex.: 5"
                    onChange={(e) => set("base_pax", e.target.value)}
                  />
                  <p className="text-[11px] text-muted-foreground">O site divide o total por essa quantidade e destaca o valor por pessoa.</p>
                </div>
                <div className="space-y-1.5">
                  <Label>Máximo de parcelas<CustomTag field="max_installments" /></Label>
                  <Input
                    type="number"
                    min={1}
                    max={48}
                    value={form.max_installments}
                    placeholder="Ex.: 10"
                    onChange={(e) => set("max_installments", e.target.value)}
                  />
                  <p className="text-[11px] text-muted-foreground">Exibido como “Em até 10x iguais”. Deixe vazio para não divulgar parcelamento.</p>
                </div>
                <div className="space-y-1.5">
                  <Label>Observação do preço</Label>
                  <Input value={form.price_note} placeholder="Ex.: por pessoa em apto duplo" onChange={(e) => set("price_note", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Valor anterior comprovado (opcional)</Label>
                  <Input inputMode="decimal" value={form.compare_at_price} onChange={(e) => set("compare_at_price", e.target.value)} />
                </div>
              </>
            )}
            <div className="sm:col-span-2 space-y-1.5">
              <Label>Condições de pagamento<CustomTag field="payment_conditions" /></Label>
              <Textarea rows={2} value={form.payment_conditions} onChange={(e) => set("payment_conditions", e.target.value)} />
            </div>
            {form.included_services.length > 0 && (
              <div className="sm:col-span-2 space-y-1.5">
                <Label>Serviços inclusos</Label>
                <div className="flex flex-wrap gap-1.5">
                  {form.included_services.map((s, i) => (
                    <Badge key={i} variant="secondary">{s.type}{s.name ? ` · ${s.name}` : ""}</Badge>
                  ))}
                </div>
              </div>
            )}
            {isImport && (
              <label className="sm:col-span-2 flex items-start gap-2 rounded-lg border border-border p-3 text-sm">
                <Checkbox checked={reviewed} onCheckedChange={(v) => setReviewed(v === true)} className="mt-0.5" />
                Revisei título, datas, preço, condições e serviços extraídos pela IA.
              </label>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:justify-between">
          {fromQuote && customized.length > 0 ? (
            <Button variant="outline" onClick={() => doRestore(null)} disabled={restore.isPending}>
              <RotateCcw className="mr-2 h-4 w-4" /> Restaurar dados do orçamento
              <span className="ml-1 text-xs text-muted-foreground">({customized.map((f) => STRUCTURAL_FIELD_LABELS[f] ?? f).join(", ")})</span>
            </Button>
          ) : <span />}
          {showForm && (
            <Button onClick={onSave} disabled={save.isPending}>
              {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
