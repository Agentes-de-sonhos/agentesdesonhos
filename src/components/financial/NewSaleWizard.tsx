import { useEffect, useMemo, useState } from "react";
import { format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, ArrowRight, Calendar as CalendarIcon, Check, ChevronRight,
  Download, FileText, Loader2, MapPin, Package, Pencil, Plus, Receipt, Search, Wallet,
  Trash2, User as UserIcon, Users, Wand2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

import { ClientSelector } from "@/components/shared/ClientSelector";
import { PlacesAutocomplete } from "@/components/ui/PlacesAutocomplete";
import { SupplierSelector } from "@/components/financial/SupplierSelector";

import { useFinancial, useClosedOpportunities } from "@/hooks/useFinancial";
import { useSellers } from "@/hooks/useSellers";
import { useAuth } from "@/hooks/useAuth";
import { useAgencySupplierTerms, type SupplierTerms } from "@/hooks/useAgencySupplierTerms";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

import type { SaleProductFormData, ProductType } from "@/types/financial";
import { PRODUCT_TYPES } from "@/types/financial";

// ------------- types -------------

type WizardStep = "origin" | "opportunity" | "source" | "client" | "destination" | "date" | "products" | "review";
const MANUAL_STEPS: WizardStep[] = ["origin", "client", "destination", "date", "products", "review"];
const CRM_STEPS: WizardStep[] = ["origin", "opportunity", "source", "review"];
const STEP_LABELS: Record<WizardStep, string> = {
  origin: "Origem",
  opportunity: "Oportunidade",
  source: "Fonte",
  client: "Cliente",
  destination: "Destino",
  date: "Data",
  products: "Produtos",
  review: "Revisão",
};

type DraftProduct = SaleProductFormData & { _tempId: string };

const defaultProduct = (): DraftProduct => ({
  _tempId: crypto.randomUUID(),
  product_type: "aereo",
  description: "",
  sale_price: 0,
  cost_price: 0,
  non_commissionable_taxes: 0,
  commission_type: "percentage",
  commission_value: 0,
  supplier_name: "",
  operator_id: null,
  payment_rule: "after_sale",
  payment_days: 30,
  requires_invoice: false,
  invoice_status: "a_emitir",
  invoice_number: "",
  invoice_issued_date: "",
  invoice_sent_date: "",
});

const fmtCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

const productCommission = (p: SaleProductFormData) => {
  const taxes = Number(p.non_commissionable_taxes) || 0;
  const base = (Number(p.sale_price) || 0) - taxes;
  if (p.commission_type === "percentage") {
    return base * (Number(p.commission_value) || 0) / 100;
  }
  return Number(p.commission_value) || 0;
};

// ------------- main component -------------

interface NewSaleWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (saleId: string) => void;
}

export function NewSaleWizard({ open, onOpenChange, onCreated }: NewSaleWizardProps) {
  const { createSale, createSaleProduct } = useFinancial();
  const { sellers } = useSellers();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [step, setStep] = useState<WizardStep>("origin");
  const [submitting, setSubmitting] = useState(false);

  // step 1
  const [origin, setOrigin] = useState<"manual" | "crm">("manual");
  // CRM import state
  const [opportunityId, setOpportunityId] = useState<string | null>(null);
  const [sourceKind, setSourceKind] = useState<"wallet" | "quote" | null>(null);
  const [importDetected, setImportDetected] = useState<{ tripId: string | null; quoteId: string | null }>({ tripId: null, quoteId: null });
  const [importing, setImporting] = useState(false);
  const [importSourceLabel, setImportSourceLabel] = useState<string>("");
  // step 2
  const [client, setClient] = useState<{ id: string; name: string } | null>(null);
  // step 3
  const [destination, setDestination] = useState("");
  // step 4
  const [saleDate, setSaleDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [dateMode, setDateMode] = useState<"today" | "custom">("today");
  // step 5
  const [products, setProducts] = useState<DraftProduct[]>([]);
  const [editingProduct, setEditingProduct] = useState<DraftProduct | null>(null);
  // step 6
  const [notes, setNotes] = useState("");
  const [sellerId, setSellerId] = useState<string>("");
  const [sellerCommission, setSellerCommission] = useState<number>(0);

  // reset on open
  useEffect(() => {
    if (open) {
      setStep("origin");
      setOrigin("manual");
      setClient(null);
      setDestination("");
      setSaleDate(new Date().toISOString().split("T")[0]);
      setDateMode("today");
      setProducts([]);
      setEditingProduct(null);
      setNotes("");
      setSellerId("");
      setSellerCommission(0);
      setSubmitting(false);
      setOpportunityId(null);
      setSourceKind(null);
      setImportDetected({ tripId: null, quoteId: null });
      setImporting(false);
      setImportSourceLabel("");
    }
  }, [open]);

  const stepOrder = origin === "crm" ? CRM_STEPS : MANUAL_STEPS;
  const stepIndex = stepOrder.indexOf(step);
  const progress = ((Math.max(stepIndex, 0) + 1) / stepOrder.length) * 100;

  const totals = useMemo(() => {
    const sale = products.reduce((s, p) => s + (Number(p.sale_price) || 0), 0);
    const taxes = products.reduce((s, p) => s + (Number(p.non_commissionable_taxes) || 0), 0);
    const commission = products.reduce((s, p) => s + productCommission(p), 0);
    return { sale, taxes, base: sale - taxes, commission };
  }, [products]);

  const canAdvance = (): boolean => {
    switch (step) {
      case "origin": return origin === "manual" || origin === "crm";
      case "opportunity": return !!opportunityId;
      case "source": return !!sourceKind && products.length > 0 && !importing;
      case "client": return !!client;
      case "destination": return destination.trim().length > 1;
      case "date": return !!saleDate;
      case "products": return products.length > 0;
      case "review": return true;
    }
  };

  const next = () => {
    const i = stepOrder.indexOf(step);
    if (i < stepOrder.length - 1) setStep(stepOrder[i + 1]);
  };
  const back = () => {
    const i = stepOrder.indexOf(step);
    if (i > 0) setStep(stepOrder[i - 1]);
  };

  // ---------- product handlers ----------

  const openAddProduct = () => setEditingProduct(defaultProduct());
  const openEditProduct = (p: DraftProduct) => setEditingProduct({ ...p });
  const removeProduct = (id: string) => setProducts((prev) => prev.filter((p) => p._tempId !== id));

  const saveProduct = (p: DraftProduct) => {
    setProducts((prev) => {
      const idx = prev.findIndex((x) => x._tempId === p._tempId);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = p;
        return copy;
      }
      return [...prev, p];
    });
    setEditingProduct(null);
  };

  // ---------- final submit ----------

  const syncSellerExpense = async (saleId: string, amount: number) => {
    if (!user || !sellerId || sellerCommission <= 0 || amount <= 0) return;
    const seller = sellers.find((s) => s.id === sellerId);
    if (!seller) return;
    const commissionAmount = amount * sellerCommission / 100;
    if (commissionAmount <= 0) return;
    await supabase.from("expense_entries").delete()
      .eq("sale_id", saleId).eq("category", "comissao").eq("user_id", user.id);
    await supabase.from("expense_entries").insert({
      user_id: user.id,
      description: `Comissão - ${seller.name}`,
      category: "comissao",
      amount: commissionAmount,
      entry_date: saleDate,
      notes: `Comissão de ${sellerCommission}% sobre venda de ${client?.name}`,
      sale_id: saleId,
    });
    queryClient.invalidateQueries({ queryKey: ["expense_entries"] });
  };

  const handleCreate = async () => {
    if (!client) return;
    setSubmitting(true);
    try {
      const sale: any = await createSale({
        client_name: client.name,
        destination,
        sale_amount: totals.sale,
        sale_date: saleDate,
        notes: notes || undefined,
        ...(sellerId ? { seller_id: sellerId, seller_commission_percent: sellerCommission } : {}),
      } as any);
      if (!sale?.id) throw new Error("Falha ao criar venda");

      for (const p of products) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { _tempId, ...payload } = p;
        await createSaleProduct({ saleId: sale.id, ...payload } as any);
      }

      await syncSellerExpense(sale.id, totals.sale);

      toast({ title: "Venda criada", description: "A venda foi cadastrada com sucesso." });
      onCreated?.(sale.id);
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Erro ao criar venda", description: e?.message || "Tente novamente", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" />
            Nova Venda
          </DialogTitle>
          <div className="space-y-2 pt-2">
            <Progress value={progress} className="h-1.5" />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              {stepOrder.map((s, i) => (
                <span
                  key={s}
                  className={cn(
                    "transition-colors",
                    i === stepIndex && "text-primary font-semibold",
                    i < stepIndex && "text-foreground",
                  )}
                >
                  {STEP_LABELS[s]}
                </span>
              ))}
            </div>
          </div>
        </DialogHeader>

        <div className="py-2 min-h-[280px]">
          {step === "origin" && (
            <StepOrigin value={origin} onChange={setOrigin} />
          )}
          {step === "client" && (
            <StepClient client={client} onChange={setClient} />
          )}
          {step === "destination" && (
            <StepDestination value={destination} onChange={setDestination} />
          )}
          {step === "date" && (
            <StepDate
              mode={dateMode}
              setMode={setDateMode}
              value={saleDate}
              onChange={setSaleDate}
            />
          )}
          {step === "products" && (
            <StepProducts
              products={products}
              totals={totals}
              onAdd={openAddProduct}
              onEdit={openEditProduct}
              onRemove={removeProduct}
            />
          )}
          {step === "review" && (
            <StepReview
              client={client}
              destination={destination}
              saleDate={saleDate}
              products={products}
              totals={totals}
              notes={notes}
              setNotes={setNotes}
              sellers={sellers}
              sellerId={sellerId}
              setSellerId={setSellerId}
              sellerCommission={sellerCommission}
              setSellerCommission={setSellerCommission}
            />
          )}
        </div>

        <DialogFooter className="border-t pt-3">
          <div className="flex w-full items-center justify-between gap-2">
            <Button variant="ghost" onClick={back} disabled={stepIndex === 0 || submitting}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
            </Button>
            {step !== "review" ? (
              <Button onClick={next} disabled={!canAdvance()}>
                Continuar <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleCreate} disabled={submitting || products.length === 0 || !client}>
                {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
                Criar venda
              </Button>
            )}
          </div>
        </DialogFooter>

        {editingProduct && (
          <ProductWizard
            initial={editingProduct}
            onCancel={() => setEditingProduct(null)}
            onSave={saveProduct}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

// ------------- step components -------------

function StepOrigin({ value, onChange }: { value: "manual" | "crm"; onChange: (v: "manual" | "crm") => void }) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold">Como você deseja criar esta venda?</h3>
        <p className="text-sm text-muted-foreground">Escolha por onde começar.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => onChange("manual")}
          className={cn(
            "flex flex-col items-start gap-2 rounded-lg border-2 p-4 text-left transition-colors",
            value === "manual" ? "border-primary bg-primary/5" : "border-muted hover:border-muted-foreground/30",
          )}
        >
          <div className="flex items-center gap-2 font-medium">
            <UserIcon className="h-4 w-4 text-primary" /> Criar nova venda manualmente
          </div>
          <p className="text-xs text-muted-foreground">
            Selecione um cliente e cadastre os serviços vendidos passo a passo.
          </p>
        </button>
        <button
          type="button"
          disabled
          className="flex flex-col items-start gap-2 rounded-lg border-2 border-dashed border-muted p-4 text-left opacity-60 cursor-not-allowed"
        >
          <div className="flex items-center gap-2 font-medium">
            <Download className="h-4 w-4" /> Importar do CRM
            <Badge variant="secondary" className="ml-auto text-[10px]">Em breve</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Essa opção será liberada na próxima etapa.
          </p>
        </button>
      </div>
    </div>
  );
}

function StepClient({
  client, onChange,
}: { client: { id: string; name: string } | null; onChange: (c: { id: string; name: string } | null) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold">Para quem foi realizada esta venda?</h3>
        <p className="text-sm text-muted-foreground">Busque um cliente existente ou cadastre um novo.</p>
      </div>
      <ClientSelector value={client} onChange={onChange} required />
      {client && (
        <div className="flex items-center gap-2 rounded-lg border bg-muted/30 p-3 text-sm">
          <Check className="h-4 w-4 text-primary" />
          <span>Cliente selecionado: <strong>{client.name}</strong></span>
        </div>
      )}
    </div>
  );
}

function StepDestination({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold">Qual é o destino principal da viagem?</h3>
        <p className="text-sm text-muted-foreground">Comece a digitar para receber sugestões.</p>
      </div>
      <div className="space-y-2">
        <Label className="flex items-center gap-1"><MapPin className="h-3 w-3" /> Destino</Label>
        <PlacesAutocomplete
          value={value}
          onChange={onChange}
          placeType="city"
          placeholder="Ex: Orlando, Paris, Cancún"
        />
      </div>
    </div>
  );
}

function StepDate({
  mode, setMode, value, onChange,
}: {
  mode: "today" | "custom";
  setMode: (m: "today" | "custom") => void;
  value: string;
  onChange: (v: string) => void;
}) {
  const todayStr = new Date().toISOString().split("T")[0];
  const dateObj = value ? (() => { const [y,m,d]=value.split("-").map(Number); return new Date(y, m-1, d); })() : undefined;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold">Quando esta venda foi realizada?</h3>
        <p className="text-sm text-muted-foreground">O valor total será calculado pela soma dos produtos.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => { setMode("today"); onChange(todayStr); }}
          className={cn(
            "flex items-center justify-center gap-2 rounded-lg border-2 p-3 text-sm font-medium transition-colors",
            mode === "today" ? "border-primary bg-primary/5 text-primary" : "border-muted hover:border-muted-foreground/30",
          )}
        >
          <CalendarIcon className="h-4 w-4" /> Hoje
        </button>
        <button
          type="button"
          onClick={() => setMode("custom")}
          className={cn(
            "flex items-center justify-center gap-2 rounded-lg border-2 p-3 text-sm font-medium transition-colors",
            mode === "custom" ? "border-primary bg-primary/5 text-primary" : "border-muted hover:border-muted-foreground/30",
          )}
        >
          <CalendarIcon className="h-4 w-4" /> Escolher outra data
        </button>
      </div>
      {mode === "custom" && (
        <div className="space-y-2">
          <Label>Data da venda</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start text-left font-normal">
                <CalendarIcon className="h-4 w-4 mr-2" />
                {dateObj ? format(dateObj, "PPP", { locale: ptBR }) : "Escolher data"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateObj}
                onSelect={(d) => d && onChange(format(d, "yyyy-MM-dd"))}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </div>
      )}
      <p className="text-sm text-muted-foreground">
        Data selecionada: <strong className="text-foreground">{dateObj ? format(dateObj, "dd/MM/yyyy", { locale: ptBR }) : "—"}</strong>
      </p>
    </div>
  );
}

function StepProducts({
  products, totals, onAdd, onEdit, onRemove,
}: {
  products: DraftProduct[];
  totals: { sale: number; taxes: number; base: number; commission: number };
  onAdd: () => void;
  onEdit: (p: DraftProduct) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold">Quais produtos ou serviços foram vendidos?</h3>
        <p className="text-sm text-muted-foreground">Adicione cada serviço da venda.</p>
      </div>

      {products.length === 0 ? (
        <div className="border-2 border-dashed rounded-lg p-8 text-center text-sm text-muted-foreground">
          <Package className="h-8 w-8 mx-auto mb-2 opacity-40" />
          Nenhum produto adicionado ainda
        </div>
      ) : (
        <div className="space-y-2">
          {products.map((p) => (
            <div key={p._tempId} className="flex items-center gap-3 rounded-lg border p-3">
              <Package className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">{PRODUCT_TYPES[p.product_type]}</Badge>
                  <p className="font-medium truncate">{p.description || "Sem descrição"}</p>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {p.supplier_name || "Fornecedor não informado"} • {fmtCurrency(Number(p.sale_price))} • Comissão {fmtCurrency(productCommission(p))}
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => onEdit(p)}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => onRemove(p._tempId)}>
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Button variant="outline" className="w-full" onClick={onAdd}>
        <Plus className="h-4 w-4 mr-2" /> Adicionar produto
      </Button>

      {products.length > 0 && (
        <div className="grid gap-2 rounded-lg border border-dashed bg-muted/30 p-3 text-sm sm:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground">Valor total</p>
            <p className="font-semibold">{fmtCurrency(totals.sale)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Base comissionável</p>
            <p className="font-semibold">{fmtCurrency(totals.base)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Comissão estimada</p>
            <p className="font-semibold text-primary">{fmtCurrency(totals.commission)}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function StepReview({
  client, destination, saleDate, products, totals, notes, setNotes,
  sellers, sellerId, setSellerId, sellerCommission, setSellerCommission,
}: {
  client: { id: string; name: string } | null;
  destination: string;
  saleDate: string;
  products: DraftProduct[];
  totals: { sale: number; taxes: number; base: number; commission: number };
  notes: string;
  setNotes: (v: string) => void;
  sellers: any[];
  sellerId: string;
  setSellerId: (v: string) => void;
  sellerCommission: number;
  setSellerCommission: (v: number) => void;
}) {
  const dateObj = (() => { const [y,m,d]=saleDate.split("-").map(Number); return new Date(y, m-1, d); })();
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold">Revisão da venda</h3>
        <p className="text-sm text-muted-foreground">Confira tudo antes de criar.</p>
      </div>

      <div className="grid gap-3 rounded-lg border p-4 text-sm sm:grid-cols-2">
        <div>
          <p className="text-xs text-muted-foreground">Cliente</p>
          <p className="font-medium">{client?.name || "—"}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Destino</p>
          <p className="font-medium">{destination || "—"}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Data da venda</p>
          <p className="font-medium">{format(dateObj, "dd/MM/yyyy", { locale: ptBR })}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Produtos</p>
          <p className="font-medium">{products.length}</p>
        </div>
      </div>

      <div className="rounded-lg border">
        <div className="border-b p-3 text-xs font-semibold uppercase text-muted-foreground">
          Produtos
        </div>
        <div className="divide-y">
          {products.map((p) => (
            <div key={p._tempId} className="flex items-center justify-between p-3 text-sm">
              <div className="min-w-0">
                <p className="font-medium truncate">{p.description || PRODUCT_TYPES[p.product_type]}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {PRODUCT_TYPES[p.product_type]} • {p.supplier_name || "Sem fornecedor"}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-medium">{fmtCurrency(Number(p.sale_price))}</p>
                <p className="text-xs text-primary">Comissão {fmtCurrency(productCommission(p))}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="border-t bg-muted/30 p-3 grid gap-2 text-sm sm:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground">Valor total</p>
            <p className="font-semibold">{fmtCurrency(totals.sale)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Base comissionável</p>
            <p className="font-semibold">{fmtCurrency(totals.base)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Comissão estimada</p>
            <p className="font-semibold text-primary">{fmtCurrency(totals.commission)}</p>
          </div>
        </div>
      </div>

      {sellers.length > 0 && (
        <div className="rounded-lg border border-dashed bg-muted/30 p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Users className="h-4 w-4 text-muted-foreground" /> Quem vendeu? (opcional)
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs">Vendedora</Label>
              <Select
                value={sellerId || "__none"}
                onValueChange={(v) => {
                  if (v === "__none") { setSellerId(""); setSellerCommission(0); return; }
                  setSellerId(v);
                  const s = sellers.find((x) => x.id === v);
                  if (s) setSellerCommission(Number(s.default_commission_percent) || 0);
                }}
              >
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">Nenhuma</SelectItem>
                  {sellers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name} ({s.default_commission_percent}%)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {sellerId && (
              <div className="space-y-1">
                <Label className="text-xs">Comissão (%)</Label>
                <Input
                  type="number"
                  value={sellerCommission}
                  onChange={(e) => setSellerCommission(Number(e.target.value))}
                  min={0} max={100} step={0.5}
                />
                <p className="text-xs text-muted-foreground">
                  = {fmtCurrency(totals.sale * sellerCommission / 100)}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label>Deseja adicionar alguma observação?</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Observações opcionais sobre a venda"
          rows={3}
        />
      </div>
    </div>
  );
}

// ------------- product wizard (nested dialog) -------------

type ProductStep =
  | "type" | "supplier" | "description" | "price"
  | "commission" | "taxes" | "payment" | "invoice" | "summary";

const PRODUCT_STEP_ORDER: ProductStep[] = [
  "type", "supplier", "description", "price",
  "commission", "taxes", "payment", "invoice", "summary",
];

function ProductWizard({
  initial, onCancel, onSave,
}: {
  initial: DraftProduct;
  onCancel: () => void;
  onSave: (p: DraftProduct) => void;
}) {
  const { data: termsData } = useAgencySupplierTerms();
  const [data, setData] = useState<DraftProduct>(initial);
  const [step, setStep] = useState<ProductStep>("type");
  const [hadTerms, setHadTerms] = useState(false);

  const stepIndex = PRODUCT_STEP_ORDER.indexOf(step);
  const progress = ((stepIndex + 1) / PRODUCT_STEP_ORDER.length) * 100;

  const update = (patch: Partial<DraftProduct>) => setData((prev) => ({ ...prev, ...patch }));

  const next = () => {
    let nextStep = PRODUCT_STEP_ORDER[stepIndex + 1];
    // skip invoice details if not required
    if (step === "payment" && !data.requires_invoice) nextStep = "summary";
    if (nextStep) setStep(nextStep);
  };
  const back = () => {
    let prevStep = PRODUCT_STEP_ORDER[stepIndex - 1];
    if (step === "summary" && !data.requires_invoice) prevStep = "payment";
    if (prevStep) setStep(prevStep);
  };

  const canAdvance = (): boolean => {
    switch (step) {
      case "type": return !!data.product_type;
      case "supplier": return true; // optional
      case "description": return (data.description || "").trim().length > 0;
      case "price": return Number(data.sale_price) > 0;
      case "commission": return Number(data.commission_value) >= 0;
      case "taxes": return true;
      case "payment": return !!data.payment_rule;
      case "invoice": return true;
      case "summary": return true;
    }
  };

  // auto-fill expected date based on payment rule + days
  useEffect(() => {
    if (data.payment_rule === "manual") return;
    let base: string | null = null;
    const today = new Date().toISOString().split("T")[0];
    if (data.payment_rule === "after_sale" || data.payment_rule === "after_travel") base = today;
    else if (data.payment_rule === "after_invoice_issued" && data.invoice_issued_date) base = data.invoice_issued_date;
    else if (data.payment_rule === "after_invoice_sent" && data.invoice_sent_date) base = data.invoice_sent_date;
    if (base) {
      const [y, m, d] = base.split("-").map(Number);
      const expected = addDays(new Date(y, m - 1, d), Number(data.payment_days) || 0);
      const formatted = format(expected, "yyyy-MM-dd");
      if (formatted !== data.expected_date) {
        setData((prev) => ({ ...prev, expected_date: formatted }));
      }
    }
  }, [data.payment_rule, data.payment_days, data.invoice_issued_date, data.invoice_sent_date]);

  const taxes = Number(data.non_commissionable_taxes) || 0;
  const base = (Number(data.sale_price) || 0) - taxes;
  const commission = productCommission(data);

  return (
    <Dialog open onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Adicionar produto
          </DialogTitle>
          <Progress value={progress} className="h-1.5 mt-2" />
        </DialogHeader>

        <div className="min-h-[260px] py-2">
          {step === "type" && (
            <div className="space-y-3">
              <h4 className="font-semibold">Qual produto ou serviço foi vendido?</h4>
              <div className="grid gap-2 sm:grid-cols-2">
                {Object.entries(PRODUCT_TYPES).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => update({ product_type: key as ProductType })}
                    className={cn(
                      "rounded-lg border-2 p-3 text-sm text-left transition-colors",
                      data.product_type === key
                        ? "border-primary bg-primary/5 text-primary font-medium"
                        : "border-muted hover:border-muted-foreground/30",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === "supplier" && (
            <div className="space-y-3">
              <h4 className="font-semibold">Quem é o fornecedor deste serviço?</h4>
              <p className="text-xs text-muted-foreground">
                Selecione um fornecedor estruturado para preencher comissão e regras automaticamente, ou digite livremente.
              </p>
              <SupplierSelector
                value={{ operator_id: data.operator_id ?? null, supplier_name: data.supplier_name || "" }}
                onChange={(v) => {
                  const patch: Partial<DraftProduct> = {
                    supplier_name: v.supplier_name,
                    operator_id: v.operator_id,
                  };
                  // auto-fill from agency_supplier_terms (only if not editing an already-set product)
                  if (v.operator_id && v.operator_id !== data.operator_id) {
                    const t = termsData?.byOperator.get(v.operator_id);
                    if (t) {
                      setHadTerms(true);
                      if (t.default_commission_type) {
                        patch.commission_type = t.default_commission_type as "percentage" | "fixed";
                        if (t.default_commission_type === "percentage" && t.default_commission_percent != null) {
                          patch.commission_value = Number(t.default_commission_percent);
                        } else if (t.default_commission_type === "fixed" && t.default_commission_fixed != null) {
                          patch.commission_value = Number(t.default_commission_fixed);
                        }
                      }
                      if (t.default_non_commissionable_fees != null) patch.non_commissionable_taxes = Number(t.default_non_commissionable_fees);
                      if (t.payment_rule && t.payment_rule !== "manual") patch.payment_rule = t.payment_rule as any;
                      if (t.payment_days != null) patch.payment_days = Number(t.payment_days);
                      patch.requires_invoice = !!t.requires_invoice;
                    } else {
                      setHadTerms(false);
                    }
                  }
                  update(patch);
                }}
              />
              {hadTerms && (
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs text-primary">
                  Preenchemos os próximos campos com base nas regras comerciais deste fornecedor. Você pode ajustar apenas para esta venda.
                </div>
              )}
            </div>
          )}

          {step === "description" && (
            <div className="space-y-3">
              <h4 className="font-semibold">Como deseja identificar este serviço?</h4>
              <p className="text-xs text-muted-foreground">
                Ex: Disney's Pop Century Resort, Seguro GTA Europa, Passagem aérea SP/Orlando.
              </p>
              <Input
                value={data.description || ""}
                onChange={(e) => update({ description: e.target.value })}
                placeholder="Nome do serviço"
                autoFocus
              />
            </div>
          )}

          {step === "price" && (
            <div className="space-y-3">
              <h4 className="font-semibold">Qual foi o preço de venda deste serviço?</h4>
              <Input
                type="number"
                value={data.sale_price || ""}
                onChange={(e) => update({ sale_price: Number(e.target.value) })}
                placeholder="0,00"
                autoFocus
              />
            </div>
          )}

          {step === "commission" && (
            <div className="space-y-3">
              <h4 className="font-semibold">Como a comissão será calculada?</h4>
              {hadTerms && (
                <p className="text-xs text-muted-foreground">
                  Preenchemos com base nas regras comerciais. Ajuste apenas para esta venda, se necessário.
                </p>
              )}
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => update({ commission_type: "percentage" })}
                  className={cn(
                    "rounded-lg border-2 p-3 text-sm transition-colors",
                    data.commission_type === "percentage"
                      ? "border-primary bg-primary/5 text-primary font-medium"
                      : "border-muted hover:border-muted-foreground/30",
                  )}
                >
                  Percentual (%)
                </button>
                <button
                  type="button"
                  onClick={() => update({ commission_type: "fixed" })}
                  className={cn(
                    "rounded-lg border-2 p-3 text-sm transition-colors",
                    data.commission_type === "fixed"
                      ? "border-primary bg-primary/5 text-primary font-medium"
                      : "border-muted hover:border-muted-foreground/30",
                  )}
                >
                  Valor fixo (R$)
                </button>
              </div>
              <div className="space-y-2">
                <Label>{data.commission_type === "percentage" ? "Percentual (%)" : "Valor (R$)"}</Label>
                <Input
                  type="number"
                  value={data.commission_value || ""}
                  onChange={(e) => update({ commission_value: Number(e.target.value) })}
                  placeholder="0"
                />
              </div>
            </div>
          )}

          {step === "taxes" && (
            <div className="space-y-3">
              <h4 className="font-semibold">Existe algum valor que não gera comissão?</h4>
              <p className="text-xs text-muted-foreground">
                Taxas de embarque, administrativas ou outros valores podem ser descontados da base comissionável. Você pode pular.
              </p>
              <Input
                type="number"
                value={data.non_commissionable_taxes || ""}
                onChange={(e) => update({ non_commissionable_taxes: Number(e.target.value) })}
                placeholder="0,00"
              />
              <div className="rounded-lg border border-dashed bg-muted/30 p-3 text-sm">
                <p>Base comissionável: <strong>{fmtCurrency(base)}</strong></p>
                <p>Comissão estimada: <strong className="text-primary">{fmtCurrency(commission)}</strong></p>
              </div>
            </div>
          )}

          {step === "payment" && (
            <div className="space-y-3">
              <h4 className="font-semibold">Quando o fornecedor paga a comissão?</h4>
              <Select value={data.payment_rule} onValueChange={(v) => update({ payment_rule: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="after_sale">Após a venda</SelectItem>
                  <SelectItem value="after_travel">Após a viagem</SelectItem>
                  <SelectItem value="after_invoice_issued">Após emissão da NF</SelectItem>
                  <SelectItem value="after_invoice_sent">Após envio da NF</SelectItem>
                  <SelectItem value="manual">Data manual</SelectItem>
                </SelectContent>
              </Select>
              {data.payment_rule !== "manual" ? (
                <div className="space-y-2">
                  <Label>Prazo em dias</Label>
                  <Input
                    type="number"
                    value={data.payment_days}
                    onChange={(e) => update({ payment_days: Number(e.target.value) })}
                    placeholder="30"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Data prevista de recebimento</Label>
                  <Input
                    type="date"
                    value={data.expected_date || ""}
                    onChange={(e) => update({ expected_date: e.target.value })}
                  />
                </div>
              )}
              <div className="flex items-center gap-2 rounded-lg border bg-muted/30 p-3 text-sm">
                <input
                  type="checkbox"
                  id="requires_invoice_wizard"
                  checked={data.requires_invoice}
                  onChange={(e) => update({ requires_invoice: e.target.checked })}
                  className="h-4 w-4"
                />
                <Label htmlFor="requires_invoice_wizard" className="cursor-pointer text-sm font-normal">
                  Este fornecedor exige nota fiscal para pagamento da comissão
                </Label>
              </div>
            </div>
          )}

          {step === "invoice" && data.requires_invoice && (
            <div className="space-y-3">
              <h4 className="font-semibold">Qual é o status da nota fiscal?</h4>
              <Select value={data.invoice_status || "a_emitir"} onValueChange={(v) => update({ invoice_status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="a_emitir">A emitir</SelectItem>
                  <SelectItem value="emitida">Emitida</SelectItem>
                  <SelectItem value="enviada">Enviada</SelectItem>
                </SelectContent>
              </Select>
              {(data.invoice_status === "emitida" || data.invoice_status === "enviada") && (
                <>
                  <div className="space-y-2">
                    <Label>Número da nota</Label>
                    <Input
                      value={data.invoice_number || ""}
                      onChange={(e) => update({ invoice_number: e.target.value })}
                      placeholder="Nº da NF"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Data de emissão</Label>
                    <Input
                      type="date"
                      value={data.invoice_issued_date || ""}
                      onChange={(e) => update({ invoice_issued_date: e.target.value })}
                    />
                  </div>
                </>
              )}
              {data.invoice_status === "enviada" && (
                <div className="space-y-2">
                  <Label>Data de envio</Label>
                  <Input
                    type="date"
                    value={data.invoice_sent_date || ""}
                    onChange={(e) => update({ invoice_sent_date: e.target.value })}
                  />
                </div>
              )}
            </div>
          )}

          {step === "summary" && (
            <div className="space-y-3">
              <h4 className="font-semibold">Resumo do produto</h4>
              <div className="rounded-lg border divide-y text-sm">
                <Row k="Tipo" v={PRODUCT_TYPES[data.product_type]} />
                <Row k="Fornecedor" v={data.supplier_name || "—"} />
                <Row k="Serviço" v={data.description || "—"} />
                <Row k="Preço de venda" v={fmtCurrency(Number(data.sale_price))} />
                <Row k="Taxas não comissionáveis" v={fmtCurrency(taxes)} />
                <Row k="Base comissionável" v={fmtCurrency(base)} />
                <Row k="Comissão estimada" v={fmtCurrency(commission)} highlight />
                <Row k="Regra de recebimento" v={paymentRuleLabel(data.payment_rule)} />
                <Row k="Previsão de recebimento" v={data.expected_date ? format((() => { const [y,m,d]=data.expected_date!.split("-").map(Number); return new Date(y, m-1, d); })(), "dd/MM/yyyy") : "—"} />
                <Row k="Exige NF" v={data.requires_invoice ? "Sim" : "Não"} />
                {data.requires_invoice && (
                  <Row k="Status da NF" v={invoiceStatusLabel(data.invoice_status)} />
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="border-t pt-3">
          <div className="flex w-full items-center justify-between gap-2">
            <Button variant="ghost" onClick={stepIndex === 0 ? onCancel : back}>
              <ArrowLeft className="h-4 w-4 mr-1" /> {stepIndex === 0 ? "Cancelar" : "Voltar"}
            </Button>
            {step !== "summary" ? (
              <Button onClick={next} disabled={!canAdvance()}>
                Continuar <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={() => onSave(data)}>
                <Check className="h-4 w-4 mr-2" /> Adicionar produto
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({ k, v, highlight }: { k: string; v: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between p-3">
      <span className="text-xs text-muted-foreground">{k}</span>
      <span className={cn("text-sm font-medium", highlight && "text-primary")}>{v}</span>
    </div>
  );
}

function paymentRuleLabel(rule?: string) {
  switch (rule) {
    case "after_sale": return "Após a venda";
    case "after_travel": return "Após a viagem";
    case "after_invoice_issued": return "Após emissão da NF";
    case "after_invoice_sent": return "Após envio da NF";
    case "manual": return "Data manual";
    default: return "—";
  }
}
function invoiceStatusLabel(s?: string) {
  switch (s) {
    case "a_emitir": return "A emitir";
    case "emitida": return "Emitida";
    case "enviada": return "Enviada";
    default: return "—";
  }
}