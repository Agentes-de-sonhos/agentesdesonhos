import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Plus, FileText, Link as LinkIcon, Loader2, Lock } from "lucide-react";
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
import type { ServiceType, QuoteFormData, ServiceData } from "@/types/quote";
import { SERVICE_TYPE_LABELS } from "@/types/quote";

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

  // Fetch agent profile for PDF generation
  useEffect(() => {
    if (user?.id) {
      fetchAgentProfile(user.id, supabase).then(setAgentProfile);
    }
  }, [user?.id]);

  const handleCreateQuote = async (data: QuoteFormData) => {
    if (!canCreateQuote) {
      toast({ title: "Limite diário atingido", description: "Você já criou seu orçamento de hoje. Faça upgrade para o Plano Fundador para criar orçamentos ilimitados.", variant: "destructive" });
      return;
    }
    const newQuote = await createQuote(data);
    await incrementUsage();
    navigate(`/ferramentas-ia/gerar-orcamento/${newQuote.id}`);
  };

  const handleAddService = async (serviceData: ServiceData, amount: number) => {
    if (!selectedServiceType) return;
    await addService({ service_type: selectedServiceType, service_data: serviceData, amount });
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
    if (quote) {
      generateQuotePDF(quote, agentProfile);
    }
  };

  if (!id) {
    return (
      <DashboardLayout>
        <div className="space-y-6 animate-fade-in">
          <PageHeader
            pageKey="gerar-orcamento"
            title="Gerar Orçamento"
            subtitle="Crie um orçamento profissional para seu cliente"
            icon={FileText}
          />
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

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle>Serviços</CardTitle>
                {!selectedServiceType && (
                  <Tabs defaultValue="flight" onValueChange={(v) => setSelectedServiceType(v as ServiceType)}>
                    <TabsList className="grid grid-cols-4 h-auto">
                      {(Object.keys(SERVICE_TYPE_LABELS) as ServiceType[]).slice(0, 4).map((type) => (
                        <TabsTrigger key={type} value={type} className="text-xs px-2 py-1">
                          {SERVICE_TYPE_LABELS[type].split(" ")[0]}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </Tabs>
                )}
              </CardHeader>
              <CardContent>
                {selectedServiceType ? (
                  <div className="space-y-4">
                    <h3 className="font-medium">{SERVICE_TYPE_LABELS[selectedServiceType]}</h3>
                    <ServiceForm
                      serviceType={selectedServiceType}
                      onSubmit={handleAddService}
                      onCancel={() => setSelectedServiceType(null)}
                      isLoading={isAddingService}
                    />
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {(Object.keys(SERVICE_TYPE_LABELS) as ServiceType[]).map((type) => (
                        <Button key={type} variant="outline" size="sm" onClick={() => setSelectedServiceType(type)}>
                          <Plus className="mr-1 h-3 w-3" /> {SERVICE_TYPE_LABELS[type]}
                        </Button>
                      ))}
                    </div>
                    <ServiceList services={quote.services || []} onDeleteService={deleteService} />
                  </>
                )}
              </CardContent>
            </Card>
          </div>
          <div><QuoteSummary quote={quote} /></div>
        </div>
      </div>
    </DashboardLayout>
  );
}
