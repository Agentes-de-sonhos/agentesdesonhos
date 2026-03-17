import { useState, useEffect } from "react";
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
              navigator.clipboard.writeText(`${window.location.origin}/orcamento/${q.share_token}`);
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
  const { quote, addService, deleteService, isAddingService } = useQuote(id);
  const { canUse: canCreateQuote, remaining: quotesRemaining, hasLimit, incrementUsage } = useDailyLimit("quote_generator");

  const [selectedServiceType, setSelectedServiceType] = useState<ServiceType | null>(null);
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

  useEffect(() => {
    if (user?.id) { fetchAgentProfile(user.id, supabase).then(setAgentProfile); }
  }, [user?.id]);

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

  const handleAddService = async (serviceData: ServiceData, amount: number, optionLabel?: string, description?: string) => {
    if (!selectedServiceType) return;
    await addService({ service_type: selectedServiceType, service_data: serviceData, amount, option_label: optionLabel, description });
    setSelectedServiceType(null);
  };

  const handlePublish = async () => {
    if (!id) return;
    const token = await publishQuote(id);
    const url = `${window.location.origin}/orcamento/${token}`;
    await navigator.clipboard.writeText(url);
    toast({ title: "Link copiado!", description: "O link do orçamento foi copiado para a área de transferência." });
  };

  const handleGeneratePDF = () => {
    if (quote) generateQuotePDF(quote, agentProfile);
  };

  const handleToggleDetailedPrices = async (checked: boolean) => {
    if (!quote) return;
    await supabase.from("quotes").update({ show_detailed_prices: checked } as any).eq("id", quote.id);
    window.location.reload();
  };

  const handleSavePaymentTerms = async () => {
    if (!quote) return;
    await supabase.from("quotes").update({ payment_terms: paymentTerms || null } as any).eq("id", quote.id);
    toast({ title: "Salvo", description: "Condições de pagamento atualizadas." });
  };

  const handleSaveValidity = async () => {
    if (!quote) return;
    await supabase.from("quotes").update({
      valid_until: validUntil ? format(validUntil, "yyyy-MM-dd") : null,
      validity_disclaimer: validityDisclaimer,
    } as any).eq("id", quote.id);
    toast({ title: "Salvo", description: "Validade do orçamento atualizada." });
  };

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

  const showDetailed = (quote as any).show_detailed_prices !== false;
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
              </p>
            </div>
          </div>
          <div className="flex gap-2">
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
                      {SERVICE_TYPE_LABELS[selectedServiceType]}
                      {MULTI_OPTION_TYPES.includes(selectedServiceType) && serviceCountByType[selectedServiceType] ? (
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
                      serviceType={selectedServiceType}
                      onSubmit={handleAddService}
                      onCancel={() => setSelectedServiceType(null)}
                      isLoading={isAddingService}
                      showOptionLabel={MULTI_OPTION_TYPES.includes(selectedServiceType)}
                      tripStartDate={tripStartDate}
                      tripEndDate={tripEndDate}
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
                    <ServiceList services={quote.services || []} onDeleteService={deleteService} />
                  </>
                )}
              </CardContent>
            </Card>

            {/* Condições de Pagamento */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Condições de Pagamento
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-1.5">
                  {PAYMENT_TEMPLATES.map((tpl) => (
                    <Button
                      key={tpl.label}
                      variant="outline"
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => setPaymentTerms(prev => prev ? `${prev}\n${tpl.text}` : tpl.text)}
                    >
                      <Plus className="mr-1 h-3 w-3" />{tpl.label}
                    </Button>
                  ))}
                </div>
                <Textarea
                  placeholder="Ex: Entrada + saldo em até 10x sem juros no cartão. Pagamento via Pix com 5% de desconto."
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  Use os botões acima para inserir modelos. Personalize livremente o texto.
                </p>
                <Button variant="outline" size="sm" onClick={handleSavePaymentTerms}>
                  Salvar
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
          <div><QuoteSummary quote={quote} /></div>
        </div>
      </div>
    </DashboardLayout>
  );
}
