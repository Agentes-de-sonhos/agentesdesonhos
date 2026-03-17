import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Plus, FileText, Link as LinkIcon, Loader2, Lock, Eye, EyeOff, CalendarIcon, CreditCard } from "lucide-react";
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
import type { ServiceType, QuoteFormData, ServiceData } from "@/types/quote";
import { SERVICE_TYPE_LABELS, MULTI_OPTION_TYPES } from "@/types/quote";

export default function GerarOrcamento() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();
  const { user } = useAuth();
  const { createQuote, isCreating, publishQuote, isPublishing } = useQuotes();
  const { quote, addService, deleteService, isAddingService } = useQuote(id);
  const { canUse: canCreateQuote, remaining: quotesRemaining, hasLimit, incrementUsage } = useDailyLimit("quote_generator");
  
  const [selectedServiceType, setSelectedServiceType] = useState<ServiceType | null>(null);
  const [agentProfile, setAgentProfile] = useState<AgentProfile | null>(null);
  const [paymentTerms, setPaymentTerms] = useState("");
  const [validUntil, setValidUntil] = useState<Date | undefined>();
  const [validityDisclaimer, setValidityDisclaimer] = useState("");

  useEffect(() => {
    if (user?.id) {
      fetchAgentProfile(user.id, supabase).then(setAgentProfile);
    }
  }, [user?.id]);

  // Sync local state with quote data
  useEffect(() => {
    if (quote) {
      setPaymentTerms((quote as any).payment_terms || "");
      setValidUntil((quote as any).valid_until ? new Date((quote as any).valid_until) : undefined);
      setValidityDisclaimer((quote as any).validity_disclaimer || "Valores sujeitos à alteração sem aviso prévio devido à variação cambial e disponibilidade de tarifas.");
    }
  }, [quote]);

  const handleCreateQuote = async (data: QuoteFormData) => {
    if (!canCreateQuote) {
      toast({ title: "Limite diário atingido", description: "Você já criou seu orçamento de hoje. Faça upgrade para o Plano Fundador para criar orçamentos ilimitados.", variant: "destructive" });
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
                <><Lock className="h-4 w-4" /> Limite diário atingido. Faça upgrade para o Plano Fundador para orçamentos ilimitados.</>
              )}
            </div>
          )}
          <Card className="max-w-2xl">
            <CardHeader><CardTitle>Informações do Cliente</CardTitle></CardHeader>
            <CardContent>
              <QuoteClientForm onSubmit={handleCreateQuote} isLoading={isCreating} />
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

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

  // Count existing services by type for "add another option" hint
  const serviceCountByType: Record<string, number> = {};
  (quote.services || []).forEach(s => {
    serviceCountByType[s.service_type] = (serviceCountByType[s.service_type] || 0) + 1;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/ferramentas-ia")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="font-display text-2xl font-bold">Orçamento: {quote.client_name}</h1>
              <p className="text-muted-foreground">{quote.destination}</p>
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
                    <ServiceForm
                      serviceType={selectedServiceType}
                      onSubmit={handleAddService}
                      onCancel={() => setSelectedServiceType(null)}
                      isLoading={isAddingService}
                      showOptionLabel={MULTI_OPTION_TYPES.includes(selectedServiceType)}
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
                <Textarea
                  placeholder="Ex: Entrada + saldo em até 10x sem juros no cartão. Pagamento via Pix com 5% de desconto."
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  rows={3}
                />
                <Button variant="outline" size="sm" onClick={handleSavePaymentTerms}>
                  Salvar
                </Button>
              </CardContent>
            </Card>

            {/* Validade do Orçamento */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  Validade do Orçamento
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
                  <Label className="text-sm">Texto de disclaimer</Label>
                  <Textarea
                    value={validityDisclaimer}
                    onChange={(e) => setValidityDisclaimer(e.target.value)}
                    rows={2}
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
