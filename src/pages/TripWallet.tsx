import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Plus, FileText, Copy, Loader2, Wallet, Lock, RefreshCw, Eye, EyeOff } from "lucide-react";
import { TripForm } from "@/components/trip/TripForm";
import { TripServiceForm } from "@/components/trip/TripServiceForms";
import { TripServiceList } from "@/components/trip/TripServiceCard";
import { TripWalletList } from "@/components/trip/TripWalletList";
import { generateTripPDF } from "@/components/trip/TripPDF";
import { useTrips, useTrip } from "@/hooks/useTrips";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { fetchAgentProfile, AgentProfile } from "@/hooks/useAgentProfile";
import { format } from "date-fns";

function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}
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
  const { createTrip, isCreating, updatePassword, regeneratePassword } = useTrips();
  const { trip, addService, deleteService, uploadVoucher, isAddingService } = useTrip(id && id !== "nova" ? id : undefined);

  const [selectedServiceType, setSelectedServiceType] = useState<TripServiceType | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [agentProfile, setAgentProfile] = useState<AgentProfile | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [editingPassword, setEditingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    if (user?.id) {
      fetchAgentProfile(user.id, supabase).then(setAgentProfile);
    }
  }, [user?.id]);

  const handleCreateTrip = async (data: TripFormData) => {
    const newTrip = await createTrip(data);
    navigate(`/ferramentas-ia/trip-wallet/${newTrip.id}`, { replace: true });
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
      await addService({ service_type: selectedServiceType, service_data: serviceData, voucher_url, voucher_name });
      setSelectedServiceType(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCopyLink = () => {
    if (!trip?.share_token) return;
    const url = `${window.location.origin}/viagem/${trip.share_token}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Link copiado!", description: "O link da carteira foi copiado." });
  };

  const handleCopyPassword = () => {
    if (!trip?.access_password) return;
    navigator.clipboard.writeText(trip.access_password);
    toast({ title: "Senha copiada!", description: "A senha foi copiada." });
  };

  const handleUpdatePassword = async () => {
    if (!id || !newPassword || newPassword.length < 4) {
      toast({ title: "Senha inválida", description: "A senha deve ter pelo menos 4 caracteres.", variant: "destructive" });
      return;
    }
    await updatePassword({ id, password: newPassword });
    setEditingPassword(false);
    setNewPassword("");
  };

  const handleRegeneratePassword = async () => {
    if (!id) return;
    await regeneratePassword(id);
  };

  const handleGeneratePDF = () => {
    if (trip) generateTripPDF(trip, agentProfile);
  };

  // Listing view (no ID or default route)
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
              <p className="text-muted-foreground">Organize vouchers, documentos e serviços das viagens</p>
            </div>
          </div>
          <TripWalletList />
        </div>
      </DashboardLayout>
    );
  }

  // Create new trip
  if (id === "nova") {
    return (
      <DashboardLayout>
        <div className="space-y-6 animate-fade-in">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/ferramentas-ia/trip-wallet")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="font-display text-2xl font-bold flex items-center gap-2">
                <Wallet className="h-6 w-6 text-primary" />
                Nova Carteira
              </h1>
              <p className="text-muted-foreground">Crie uma carteira digital para a viagem do cliente</p>
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

  // Loading
  if (!trip) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  const startDate = parseLocalDate(trip.start_date);
  const endDate = parseLocalDate(trip.end_date);
  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/ferramentas-ia/trip-wallet")}>
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
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={handleGeneratePDF}>
              <FileText className="mr-2 h-4 w-4" /> PDF
            </Button>
            <Button variant="outline" size="sm" onClick={handleCopyLink}>
              <Copy className="mr-2 h-4 w-4" /> Copiar Link
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

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Access Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Lock className="h-4 w-4" /> Acesso do Cliente
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Senha de acesso</p>
                  {editingPassword ? (
                    <div className="flex gap-2">
                      <Input
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Nova senha"
                        className="h-8 text-sm"
                      />
                      <Button size="sm" variant="outline" className="h-8" onClick={handleUpdatePassword}>Salvar</Button>
                      <Button size="sm" variant="ghost" className="h-8" onClick={() => { setEditingPassword(false); setNewPassword(""); }}>✕</Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <code className="bg-muted px-2 py-1 rounded text-sm font-mono flex-1">
                        {showPassword ? trip.access_password : "••••••"}
                      </code>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCopyPassword}>
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                  <div className="flex gap-2 mt-2">
                    <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setEditingPassword(true)}>
                      Editar senha
                    </Button>
                    <Button variant="ghost" size="sm" className="text-xs h-7" onClick={handleRegeneratePassword}>
                      <RefreshCw className="mr-1 h-3 w-3" /> Regenerar
                    </Button>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground mb-1">Link da carteira</p>
                  <Button variant="outline" size="sm" className="w-full text-xs" onClick={handleCopyLink}>
                    <Copy className="mr-2 h-3 w-3" /> Copiar link para o cliente
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Summary Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Resumo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
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
                  <span className="font-medium">{trip.services?.filter(s => s.voucher_url).length || 0}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
