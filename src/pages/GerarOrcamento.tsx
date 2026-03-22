import { useState, useEffect, useCallback, useRef } from "react";
import { PUBLIC_DOMAIN } from "@/lib/platform-version";
import { useNavigate, useParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft, Plus, FileText, Link as LinkIcon, Loader2, Lock, Eye, EyeOff,
  CalendarIcon, CreditCard, Trash2, Copy, ExternalLink, MapPin, Users,
  Pencil, MoreHorizontal,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { PageHeader } from "@/components/layout/PageHeader";
import { QuoteClientForm } from "@/components/quote/QuoteClientForm";
import { ServiceForm } from "@/components/quote/ServiceForms";
import { ServiceList } from "@/components/quote/ServiceCard";
import { QuoteSummary } from "@/components/quote/QuoteSummary";
import { QuoteDateEditor } from "@/components/quote/QuoteDateEditor";
import { generateQuotePDF } from "@/components/quote/QuotePDF";
import { useQuotes, useQuote } from "@/hooks/useQuotes";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { fetchAgentProfile, AgentProfile } from "@/hooks/useAgentProfile";
import { useDailyLimit } from "@/hooks/useDailyLimit";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { ServiceType, QuoteFormData, ServiceData, Quote } from "@/types/quote";
import { SERVICE_TYPE_LABELS, MULTI_OPTION_TYPES } from "@/types/quote";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatDateShort(dateStr: string) {
  try {
    const [y, m, d] = dateStr.split("-").map(Number);
    return format(new Date(y, m - 1, d), "dd/MM/yyyy", { locale: ptBR });
  } catch { return dateStr; }
}

/* ──────────────────────── Quote History Row ──────────────────────── */
function QuoteHistoryRow({
  q, onEdit, onDuplicate, onDelete,
}: {
  q: Quote;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-card hover:bg-muted/40 transition-colors group">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="font-semibold text-sm truncate">{q.client_name}</span>
          <Badge variant={q.status === "published" ? "default" : "secondary"} className="text-[10px] px-1.5 py-0">
            {q.status === "published" ? "Enviado" : "Rascunho"}
          </Badge>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{q.destination}</span>
          <span>{formatDateShort(q.start_date)} — {formatDateShort(q.end_date)}</span>
        </div>
      </div>
      <span className="font-bold text-sm text-primary whitespace-nowrap">{formatCurrency(q.total_amount)}</span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onEdit}>
            <Pencil className="mr-2 h-3.5 w-3.5" /> Editar
          </DropdownMenuItem>
          {q.share_token && (
            <DropdownMenuItem onClick={() => {
              navigator.clipboard.writeText(`${PUBLIC_DOMAIN}/orcamento/${q.share_token}`);
            }}>
              <ExternalLink className="mr-2 h-3.5 w-3.5" /> Copiar Link
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={onDuplicate}>
            <Copy className="mr-2 h-3.5 w-3.5" /> Duplicar
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
            <Trash2 className="mr-2 h-3.5 w-3.5" /> Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

/* ──────────────────────── Payment Display Modes ──────────────────────── */
type PaymentDisplayMode = "installments" | "installments_with_entry" | "full_payment";

const PAYMENT_MODE_OPTIONS: { value: PaymentDisplayMode; label: string; description: string }[] = [
  { value: "installments", label: "Parcelado (sem entrada)", description: "Ex: 10x de R$ 2.400" },
  { value: "installments_with_entry", label: "Parcelado com entrada", description: "Ex: Entrada + 9x de R$ 2.400" },
  { value: "full_payment", label: "À vista", description: "Ex: R$ 24.000 à vista" },
];

const PAYMENT_METHOD_OPTIONS = ["Cartão de Crédito", "Pix", "Boleto", "Transferência Bancária"];

/* ══════════════════════════════════════════════════════════════════════ */
export default function GerarOrcamento() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();
  const { user } = useAuth();
  const { quotes, isLoading: quotesLoading, createQuote, isCreating, publishQuote, isPublishing, deleteQuote, duplicateQuote, isDuplicating } = useQuotes();
  const { quote, addService, updateService, deleteService, isAddingService } = useQuote(id);
  const { canUse: canCreateQuote, remaining: quotesRemaining, hasLimit, incrementUsage } = useDailyLimit("quote_generator");

  // Persist UI state in sessionStorage so tab switches don't lose progress
  const storageKey = id ? `quote-editor-${id}` : null;

  const readPersistedState = useCallback(() => {
    if (!storageKey) return null;
    try {
      const raw = sessionStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }, [storageKey]);

  const persisted = readPersistedState();

  const [selectedServiceType, setSelectedServiceType] = useState<ServiceType | null>(
    persisted?.selectedServiceType || null
  );
  const [editingService, setEditingService] = useState<import("@/types/quote").QuoteService | null>(
    persisted?.editingService || null
  );
  const [agentProfile, setAgentProfile] = useState<AgentProfile | null>(null);
  const [paymentTerms, setPaymentTerms] = useState("");
  const [validUntil, setValidUntil] = useState<Date | undefined>();
  const [validityDisclaimer, setValidityDisclaimer] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [paymentDisplayMode, setPaymentDisplayMode] = useState<PaymentDisplayMode>("full_payment");
  const [installmentsCount, setInstallmentsCount] = useState(10);
  const [entryPercentage, setEntryPercentage] = useState(30);
  const [paymentMethodLabel, setPaymentMethodLabel] = useState("");
  const [fullPaymentDiscountPercent, setFullPaymentDiscountPercent] = useState(0);
  const [autoSaved, setAutoSaved] = useState(false);
  const [showDetailedLocal, setShowDetailedLocal] = useState<boolean | null>(null);
  const [headerEditDates, setHeaderEditDates] = useState(false);

  // Persist selectedServiceType & editingService to sessionStorage
  useEffect(() => {
    if (!storageKey) return;
    try {
      sessionStorage.setItem(storageKey, JSON.stringify({
        selectedServiceType,
        editingService,
      }));
    } catch { /* quota exceeded — ignore */ }
  }, [storageKey, selectedServiceType, editingService]);

  useEffect(() => {
    if (user?.id) { fetchAgentProfile(user.id, supabase).then(setAgentProfile); }
  }, [user?.id]);

  const quoteLoadedRef = useRef(false);
  useEffect(() => {
    if (quote) {
      setPaymentTerms((quote as any).payment_terms || "");
      setValidUntil((quote as any).valid_until ? new Date((quote as any).valid_until) : undefined);
      setValidityDisclaimer((quote as any).validity_disclaimer || "Valores sujeitos à alteração sem aviso prévio devido à variação cambial e disponibilidade de tarifas.");
      setPaymentDisplayMode(((quote as any).payment_display_mode as PaymentDisplayMode) || "full_payment");
      setInstallmentsCount((quote as any).installments_count || 10);
      setEntryPercentage((quote as any).entry_percentage || 30);
      setPaymentMethodLabel((quote as any).payment_method_label || "");
      setFullPaymentDiscountPercent((quote as any).full_payment_discount_percent || 0);
      // Mark that quote data has been loaded — auto-save effects below
      // will skip their first run to avoid saving the initial values right back.
      setTimeout(() => { quoteLoadedRef.current = true; }, 2500);
    }
  }, [quote]);

  const handleCreateQuote = async (data: QuoteFormData) => {
    if (!canCreateQuote) {
      toast({ title: "Limite diário atingido", description: "Faça upgrade para criar orçamentos ilimitados.", variant: "destructive" });
      return;
    }
    const newQuote = await createQuote(data);
    await incrementUsage();
    navigate(`/ferramentas-ia/gerar-orcamento/${newQuote.id}`);
  };

  // Track pending add calls so round-trip transfers can fire two submits sequentially
  const addQueueRef = useRef<Promise<void>>(Promise.resolve());

  const handleAddService = async (serviceData: ServiceData, amount: number, optionLabel?: string, description?: string, imageUrl?: string) => {
    if (editingService) {
      await updateService({
        serviceId: editingService.id,
        service_type: editingService.service_type,
        service_data: serviceData,
        amount,
        option_label: optionLabel,
        description,
        image_url: imageUrl,
      });
      setEditingService(null);
      setSelectedServiceType(null);
      return;
    }
    const sType = selectedServiceType;
    if (!sType) return;
    // Queue add calls so round-trip transfers (2 rapid submits) are processed sequentially
    addQueueRef.current = addQueueRef.current.then(async () => {
      await addService({ service_type: sType, service_data: serviceData, amount, option_label: optionLabel, description, image_url: imageUrl });
    });
    // Clear service type after a micro-delay so a second synchronous call can still use it
    setTimeout(() => setSelectedServiceType(null), 100);
  };

  const handleEditService = (service: import("@/types/quote").QuoteService) => {
    setEditingService(service);
    setSelectedServiceType(service.service_type);
  };

  const handlePublish = async () => {
    if (!id) return;
    const token = await publishQuote(id);
    const url = `${PUBLIC_DOMAIN}/orcamento/${token}`;
    await navigator.clipboard.writeText(url);
    toast({ title: "Link copiado!", description: "O link do orçamento foi copiado para a área de transferência." });
  };

  const handleGeneratePDF = () => {
    if (quote) generateQuotePDF(quote, agentProfile);
  };

  const handleToggleDetailedPrices = async (checked: boolean) => {
    if (!quote) return;
    setShowDetailedLocal(checked);
    await supabase.from("quotes").update({ show_detailed_prices: checked } as any).eq("id", quote.id);
  };

  const handleSavePaymentConfig = useCallback(async () => {
    if (!quote) return;
    await supabase.from("quotes").update({
      payment_terms: paymentTerms || null,
      payment_display_mode: paymentDisplayMode,
      installments_count: installmentsCount,
      entry_percentage: entryPercentage,
      payment_method_label: paymentMethodLabel || null,
      full_payment_discount_percent: fullPaymentDiscountPercent,
    } as any).eq("id", quote.id);
    setAutoSaved(true);
    setTimeout(() => setAutoSaved(false), 2500);
  }, [quote, paymentTerms, paymentDisplayMode, installmentsCount, entryPercentage, paymentMethodLabel, fullPaymentDiscountPercent]);

  const handleSaveValidity = useCallback(async () => {
    if (!quote) return;
    await supabase.from("quotes").update({
      valid_until: validUntil ? format(validUntil, "yyyy-MM-dd") : null,
      validity_disclaimer: validityDisclaimer,
    } as any).eq("id", quote.id);
    setAutoSaved(true);
    setTimeout(() => setAutoSaved(false), 2500);
  }, [quote, validUntil, validityDisclaimer]);

  // Debounced auto-save for payment config
  useEffect(() => {
    if (!quote || !quoteLoadedRef.current) return;
    const timer = setTimeout(() => { handleSavePaymentConfig(); }, 2000);
    return () => clearTimeout(timer);
  }, [paymentTerms, paymentDisplayMode, installmentsCount, entryPercentage, paymentMethodLabel, fullPaymentDiscountPercent]);

  // Debounced auto-save for validity config
  useEffect(() => {
    if (!quote || !quoteLoadedRef.current) return;
    const timer = setTimeout(() => { handleSaveValidity(); }, 2000);
    return () => clearTimeout(timer);
  }, [validUntil, validityDisclaimer]);

  const handleDeleteQuote = async (qId: string) => {
    await deleteQuote(qId);
    setDeleteConfirmId(null);
  };

  const handleDuplicate = async (qId: string) => {
    const dup = await duplicateQuote(qId);
    navigate(`/ferramentas-ia/gerar-orcamento/${dup.id}`);
  };

  /* ─── Trip date range for constraining service calendars ─── */
  const tripStartDate = quote?.start_date ? (() => { const [y, m, d] = quote.start_date.split("-").map(Number); return new Date(y, m - 1, d); })() : undefined;
  const tripEndDate = quote?.end_date ? (() => { const [y, m, d] = quote.end_date.split("-").map(Number); return new Date(y, m - 1, d); })() : undefined;

  /* ═══════════════════  INITIAL SCREEN (no id) ═══════════════════ */
  if (!id) {
    return (
      <DashboardLayout>
        <div className="space-y-6 animate-fade-in">
          <PageHeader pageKey="gerar-orcamento" title="Gerar Orçamento" subtitle="Crie um orçamento profissional para seu cliente" icon={FileText} />

          {hasLimit && (
            <div className={`p-3 rounded-lg border text-sm flex items-center gap-2 ${canCreateQuote ? 'bg-muted/50 text-muted-foreground' : 'bg-destructive/10 border-destructive/30 text-destructive'}`}>
              {canCreateQuote ? (
                <><FileText className="h-4 w-4" /> Você pode criar mais {quotesRemaining} orçamento(s) hoje.</>
              ) : (
                <><Lock className="h-4 w-4" /> Limite diário atingido. Faça upgrade para orçamentos ilimitados.</>
              )}
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-5">
            {/* ── New Quote Form ── */}
            <Card className="lg:col-span-2">
              <CardHeader><CardTitle>Novo Orçamento</CardTitle></CardHeader>
              <CardContent>
                <QuoteClientForm onSubmit={handleCreateQuote} isLoading={isCreating} />
              </CardContent>
            </Card>

            {/* ── Quote History ── */}
            <Card className="lg:col-span-3">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-4 w-4" />
                  Meus Orçamentos
                  {quotes.length > 0 && (
                    <Badge variant="secondary" className="text-xs ml-1">{quotes.length}</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {quotesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : quotes.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Nenhum orçamento criado ainda. Crie o primeiro ao lado!
                  </p>
                ) : (
                  <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                    {quotes.map((q) => (
                      <QuoteHistoryRow
                        key={q.id}
                        q={q}
                        onEdit={() => navigate(`/ferramentas-ia/gerar-orcamento/${q.id}`)}
                        onDuplicate={() => handleDuplicate(q.id)}
                        onDelete={() => setDeleteConfirmId(q.id)}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Delete confirmation dialog */}
          <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir orçamento?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação não pode ser desfeita. Todos os serviços do orçamento serão removidos.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => deleteConfirmId && handleDeleteQuote(deleteConfirmId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </DashboardLayout>
    );
  }

  /* ═══════════════════  LOADING ═══════════════════ */
  if (!quote) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  const showDetailed = showDetailedLocal !== null ? showDetailedLocal : (quote as any).show_detailed_prices !== false;
  const serviceCountByType: Record<string, number> = {};
  (quote.services || []).forEach(s => {
    serviceCountByType[s.service_type] = (serviceCountByType[s.service_type] || 0) + 1;
  });

  /* ═══════════════════  QUOTE EDITOR ═══════════════════ */
  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/ferramentas-ia/gerar-orcamento")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="font-display text-2xl font-bold">Orçamento: {quote.client_name}</h1>
              <p className="text-muted-foreground text-sm flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5" />{quote.destination}
                <span className="text-xs">•</span>
                {formatDateShort(quote.start_date)} — {formatDateShort(quote.end_date)}
                <Button variant="ghost" size="icon" className="h-6 w-6 ml-0.5" onClick={() => setHeaderEditDates(true)} title="Editar datas">
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {autoSaved && (
              <span className="text-xs text-muted-foreground flex items-center gap-1 animate-fade-in">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Salvo automaticamente
              </span>
            )}
            <Button variant="outline" onClick={handleGeneratePDF}>
              <FileText className="mr-2 h-4 w-4" /> PDF
            </Button>
            <Button onClick={handlePublish} disabled={isPublishing}>
              <LinkIcon className="mr-2 h-4 w-4" /> {quote.share_token ? "Copiar Link" : "Publicar"}
            </Button>
          </div>
        </div>

        {/* Toggle de exibição de valores */}
        <Card>
          <CardContent className="py-3 px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {showDetailed ? <Eye className="h-4 w-4 text-muted-foreground" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                <Label htmlFor="show-prices" className="text-sm font-medium cursor-pointer">
                  Exibir valores detalhados por serviço
                </Label>
              </div>
              <Switch id="show-prices" checked={showDetailed} onCheckedChange={handleToggleDetailedPrices} />
            </div>
            <p className="text-xs text-muted-foreground mt-1 ml-6">
              {showDetailed ? "O cliente verá o valor de cada serviço e o total." : "O cliente verá apenas o valor total do pacote."}
            </p>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            {/* Serviços */}
            <Card>
              <CardHeader><CardTitle>Serviços</CardTitle></CardHeader>
              <CardContent>
                {selectedServiceType ? (
                  <div className="space-y-4">
                    <h3 className="font-medium">
                      {editingService ? "Editando: " : ""}{SERVICE_TYPE_LABELS[selectedServiceType]}
                      {!editingService && MULTI_OPTION_TYPES.includes(selectedServiceType) && serviceCountByType[selectedServiceType] ? (
                        <span className="text-xs text-muted-foreground ml-2">
                          (Opção {(serviceCountByType[selectedServiceType] || 0) + 1})
                        </span>
                      ) : null}
                    </h3>
                    {tripStartDate && tripEndDate && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-1.5">
                        <CalendarIcon className="h-3.5 w-3.5" />
                        Período da viagem: {format(tripStartDate, "dd/MM", { locale: ptBR })} a {format(tripEndDate, "dd/MM/yyyy", { locale: ptBR })}
                      </div>
                    )}
                    <ServiceForm
                      key={editingService?.id || "new"}
                      serviceType={selectedServiceType}
                      onSubmit={handleAddService}
                      onCancel={() => { setSelectedServiceType(null); setEditingService(null); }}
                      isLoading={isAddingService}
                      showOptionLabel={MULTI_OPTION_TYPES.includes(selectedServiceType)}
                      tripStartDate={tripStartDate}
                      tripEndDate={tripEndDate}
                      adultsCount={quote.adults_count}
                      childrenCount={quote.children_count}
                      initialData={editingService ? {
                        service_data: editingService.service_data,
                        amount: editingService.amount,
                        option_label: editingService.option_label,
                        description: editingService.description,
                        image_url: editingService.image_url,
                      } : undefined}
                    />
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {(Object.keys(SERVICE_TYPE_LABELS) as ServiceType[]).map((type) => (
                        <Button key={type} variant="outline" size="sm" onClick={() => setSelectedServiceType(type)}>
                          <Plus className="mr-1 h-3 w-3" />
                          {SERVICE_TYPE_LABELS[type]}
                          {MULTI_OPTION_TYPES.includes(type) && serviceCountByType[type] ? (
                            <span className="ml-1 text-xs text-muted-foreground">({serviceCountByType[type]})</span>
                          ) : null}
                        </Button>
                      ))}
                    </div>
                    <ServiceList services={quote.services || []} onDeleteService={deleteService} onEditService={handleEditService} />
                  </>
                )}
              </CardContent>
            </Card>

            {/* Apresentação do Investimento */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Apresentação do Investimento
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Mode selector */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Como exibir o valor para o cliente?</Label>
                  <div className="grid gap-2">
                    {PAYMENT_MODE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setPaymentDisplayMode(opt.value)}
                        className={cn(
                          "flex items-start gap-3 rounded-xl border p-3 text-left transition-all",
                          paymentDisplayMode === opt.value
                            ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                            : "border-border hover:border-border/80 hover:bg-muted/30"
                        )}
                      >
                        <div className={cn(
                          "mt-0.5 h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0",
                          paymentDisplayMode === opt.value ? "border-primary" : "border-muted-foreground/40"
                        )}>
                          {paymentDisplayMode === opt.value && <div className="h-2 w-2 rounded-full bg-primary" />}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{opt.label}</p>
                          <p className="text-xs text-muted-foreground">{opt.description}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Dynamic fields based on mode */}
                {paymentDisplayMode === "installments" && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-sm">Nº de parcelas</Label>
                      <Input type="number" min={2} max={48} value={installmentsCount} onChange={(e) => setInstallmentsCount(Number(e.target.value))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm">Meio de pagamento</Label>
                      <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={paymentMethodLabel} onChange={(e) => setPaymentMethodLabel(e.target.value)}>
                        <option value="">Selecione...</option>
                        {PAYMENT_METHOD_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                    {quote && (
                      <div className="sm:col-span-2 rounded-lg bg-muted/50 p-3">
                        <p className="text-sm font-medium text-primary">
                          Destaque: <span className="font-bold">{installmentsCount}x de {formatCurrency(quote.total_amount / (installmentsCount || 1))}</span>
                          {paymentMethodLabel && <span className="text-muted-foreground font-normal"> no {paymentMethodLabel}</span>}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {paymentDisplayMode === "installments_with_entry" && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-sm">% da entrada</Label>
                      <Input type="number" min={1} max={90} value={entryPercentage} onChange={(e) => setEntryPercentage(Number(e.target.value))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm">Nº de parcelas (saldo)</Label>
                      <Input type="number" min={1} max={48} value={installmentsCount} onChange={(e) => setInstallmentsCount(Number(e.target.value))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm">Meio de pagamento</Label>
                      <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={paymentMethodLabel} onChange={(e) => setPaymentMethodLabel(e.target.value)}>
                        <option value="">Selecione...</option>
                        {PAYMENT_METHOD_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                    {quote && (() => {
                      const entry = quote.total_amount * (entryPercentage / 100);
                      const remainder = quote.total_amount - entry;
                      const installmentValue = remainder / (installmentsCount || 1);
                      return (
                        <div className="sm:col-span-2 rounded-lg bg-muted/50 p-3">
                          <p className="text-sm font-medium text-primary">
                            Destaque: <span className="font-bold">Entrada de {formatCurrency(entry)} + {installmentsCount}x de {formatCurrency(installmentValue)}</span>
                          </p>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {paymentDisplayMode === "full_payment" && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-sm">Desconto à vista (%)</Label>
                      <Input type="number" min={0} max={50} value={fullPaymentDiscountPercent} onChange={(e) => setFullPaymentDiscountPercent(Number(e.target.value))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm">Meio de pagamento</Label>
                      <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={paymentMethodLabel} onChange={(e) => setPaymentMethodLabel(e.target.value)}>
                        <option value="">Selecione...</option>
                        {PAYMENT_METHOD_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                    {quote && (
                      <div className="sm:col-span-2 rounded-lg bg-muted/50 p-3">
                        <p className="text-sm font-medium text-primary">
                          Destaque: <span className="font-bold">{formatCurrency(quote.total_amount * (1 - fullPaymentDiscountPercent / 100))} à vista</span>
                          {fullPaymentDiscountPercent > 0 && (
                            <span className="text-xs text-muted-foreground ml-1">({fullPaymentDiscountPercent}% de desconto{paymentMethodLabel ? ` via ${paymentMethodLabel}` : ""})</span>
                          )}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <Separator />

                {/* Additional payment notes */}
                <div className="space-y-1.5">
                  <Label className="text-sm">Observações adicionais de pagamento</Label>
                  <Textarea
                    placeholder="Ex: Parcelamento sem juros. Desconto especial para pagamento via Pix."
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                    rows={3}
                  />
                </div>

                <Button variant="outline" size="sm" onClick={handleSavePaymentConfig}>
                  Salvar Configuração
                </Button>
              </CardContent>
            </Card>

            {/* Validade e Termos */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  Validade e Termos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-sm">Válido até</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !validUntil && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {validUntil ? format(validUntil, "dd/MM/yyyy", { locale: ptBR }) : "Selecione uma data"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={validUntil} onSelect={setValidUntil} initialFocus className="p-3 pointer-events-auto" />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Termos e condições</Label>
                  <Textarea
                    value={validityDisclaimer}
                    onChange={(e) => setValidityDisclaimer(e.target.value)}
                    rows={3}
                    placeholder="Valores sujeitos à alteração..."
                  />
                </div>
                <Button variant="outline" size="sm" onClick={handleSaveValidity}>
                  Salvar
                </Button>
              </CardContent>
            </Card>
          </div>
          <div><QuoteSummary quote={quote} externalEditDates={headerEditDates} onExternalEditDatesChange={setHeaderEditDates} /></div>
        </div>
      </div>
    </DashboardLayout>
  );
}
