import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Plus, FileText, Link as LinkIcon, Loader2, Wallet } from "lucide-react";
import { TripForm } from "@/components/trip/TripForm";
import { TripServiceForm } from "@/components/trip/TripServiceForms";
import { TripServiceList } from "@/components/trip/TripServiceCard";
import { generateTripPDF } from "@/components/trip/TripPDF";
import { useTrips, useTrip } from "@/hooks/useTrips";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { fetchAgentProfile, AgentProfile } from "@/hooks/useAgentProfile";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { TripServiceType, TripFormData } from "@/types/trip";

const SERVICE_TYPE_LABELS: Record<TripServiceType, string> = {
  flight: "Passagem Aérea",
  hotel: "Hospedagem",
  car_rental: "Locação de Veículo",
  transfer: "Transfer",
  attraction: "Ingressos/Atrações",
  insurance: "Seguro Viagem",
  cruise: "Cruzeiro",
  other: "Outros",
};

export default function TripWallet() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();
  const { user } = useAuth();
  const { createTrip, isCreating, shareTrip, isSharing } = useTrips();
  const { trip, addService, deleteService, uploadVoucher, isAddingService } = useTrip(id);
  
  const [selectedServiceType, setSelectedServiceType] = useState<TripServiceType | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [agentProfile, setAgentProfile] = useState<AgentProfile | null>(null);

  // Fetch agent profile for PDF generation
  useEffect(() => {
    if (user?.id) {
      fetchAgentProfile(user.id, supabase).then(setAgentProfile);
    }
  }, [user?.id]);

  const handleCreateTrip = async (data: TripFormData) => {
    const newTrip = await createTrip(data);
    navigate(`/ferramentas-ia/trip-wallet/${newTrip.id}`);
  };

  const handleAddService = async (serviceData: any, file?: File) => {
    if (!selectedServiceType) return;
    
    try {
      setIsUploading(true);
      let voucher_url: string | undefined;
      let voucher_name: string | undefined;
      
      if (file) {
        const result = await uploadVoucher(file);
        voucher_url = result.url;
        voucher_name = result.name;
      }
      
      await addService({ 
        service_type: selectedServiceType, 
        service_data: serviceData, 
        voucher_url,
        voucher_name,
      });
      setSelectedServiceType(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleShare = async () => {
    if (!id) return;
    const token = await shareTrip(id);
    const url = `${window.location.origin}/viagem/${token}`;
    await navigator.clipboard.writeText(url);
    toast({ 
      title: "Link copiado!", 
      description: "O link da viagem foi copiado para a área de transferência." 
    });
  };

  const handleGeneratePDF = () => {
    if (trip) {
      generateTripPDF(trip, agentProfile);
    }
  };

  // Step 1: Create trip
  if (!id) {
    return (
      <DashboardLayout>
        <div className="space-y-6 animate-fade-in">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/ferramentas-ia")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="font-display text-2xl font-bold flex items-center gap-2">
                <Wallet className="h-6 w-6 text-primary" />
                Carteira Digital
              </h1>
              <p className="text-muted-foreground">Organize vouchers, documentos e serviços da viagem do cliente</p>
            </div>
          </div>
          <Card className="max-w-2xl">
            <CardHeader><CardTitle>Informações da Viagem</CardTitle></CardHeader>
            <CardContent>
              <TripForm onSubmit={handleCreateTrip} isLoading={isCreating} />
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  // Loading state
  if (!trip) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  const startDate = new Date(trip.start_date);
  const endDate = new Date(trip.end_date);
  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  // Step 2 & 3: Add services and view
  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/ferramentas-ia")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="font-display text-2xl font-bold flex items-center gap-2">
                <Wallet className="h-6 w-6 text-primary" />
                {trip.client_name}
              </h1>
              <p className="text-muted-foreground">
                {trip.destination} • {format(startDate, "dd/MM", { locale: ptBR })} - {format(endDate, "dd/MM/yyyy", { locale: ptBR })} ({days} dias)
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleGeneratePDF}>
              <FileText className="mr-2 h-4 w-4" /> PDF
            </Button>
            <Button onClick={handleShare} disabled={isSharing}>
              <LinkIcon className="mr-2 h-4 w-4" /> {trip.share_token ? "Copiar Link" : "Compartilhar"}
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Services Section */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle>Serviços da Viagem</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedServiceType ? (
                  <div className="space-y-4">
                    <h3 className="font-medium">{SERVICE_TYPE_LABELS[selectedServiceType]}</h3>
                    <TripServiceForm
                      serviceType={selectedServiceType}
                      onSubmit={handleAddService}
                      onCancel={() => setSelectedServiceType(null)}
                      isLoading={isAddingService || isUploading}
                    />
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap gap-2 mb-6">
                      {(Object.keys(SERVICE_TYPE_LABELS) as TripServiceType[]).map((type) => (
                        <Button key={type} variant="outline" size="sm" onClick={() => setSelectedServiceType(type)}>
                          <Plus className="mr-1 h-3 w-3" /> {SERVICE_TYPE_LABELS[type]}
                        </Button>
                      ))}
                    </div>
                    <TripServiceList 
                      services={trip.services || []} 
                      onDeleteService={deleteService}
                      groupByType={true}
                    />
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Summary Section */}
          <div>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Resumo da Viagem</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cliente</span>
                    <span className="font-medium">{trip.client_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Destino</span>
                    <span className="font-medium">{trip.destination}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Período</span>
                    <span className="font-medium">{days} dias</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Serviços</span>
                    <span className="font-medium">{trip.services?.length || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Documentos</span>
                    <span className="font-medium">
                      {trip.services?.filter(s => s.voucher_url).length || 0}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
