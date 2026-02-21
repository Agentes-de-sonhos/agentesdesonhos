import { useState } from "react";
import { useParams } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Wallet, MapPin, Calendar, FileText, Loader2, Lock, Plane, Hotel, Car, Bus,
  Ticket, Shield, Ship, Download, ExternalLink, Eye, MessageSquare
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { generateTripPDF } from "@/components/trip/TripPDF";
import { verifyTripAccess } from "@/hooks/useTrips";
import type { Trip, TripService, TripServiceType } from "@/types/trip";
import type { AgentProfile } from "@/hooks/useAgentProfile";

const SERVICE_ICONS: Record<TripServiceType, any> = {
  flight: Plane, hotel: Hotel, car_rental: Car, transfer: Bus,
  attraction: Ticket, insurance: Shield, cruise: Ship, other: FileText,
};

const SERVICE_LABELS: Record<TripServiceType, string> = {
  flight: "Passagens", hotel: "Hospedagem", car_rental: "Locação de Veículo",
  transfer: "Transfer", attraction: "Ingressos/Atrações", insurance: "Seguro Viagem",
  cruise: "Cruzeiro", other: "Outros",
};

const TAB_ORDER: TripServiceType[] = ["flight", "hotel", "attraction", "insurance", "car_rental", "transfer", "cruise", "other"];

function formatDate(dateStr: string) {
  try { return format(new Date(dateStr), "dd/MM/yyyy", { locale: ptBR }); }
  catch { return dateStr; }
}

function getServiceDetails(service: TripService): { title: string; details: string[]; dates?: string } {
  const data = service.service_data as any;
  switch (service.service_type) {
    case "flight":
      return { title: `${data.origin_city} → ${data.destination_city}`, details: [`Companhia: ${data.airline}`, ...(data.notes ? [`Obs: ${data.notes}`] : [])], dates: `${formatDate(data.departure_date)} - ${formatDate(data.return_date)}` };
    case "hotel":
      return { title: `${data.hotel_name}`, details: [`${data.city}`, ...(data.notes ? [`Obs: ${data.notes}`] : [])], dates: `${formatDate(data.check_in)} - ${formatDate(data.check_out)}` };
    case "car_rental":
      return { title: data.car_type, details: [`Retirada: ${data.pickup_location}`, `Devolução: ${data.dropoff_location}`] };
    case "transfer":
      return { title: `${data.transfer_type === "arrival" ? "Chegada" : "Saída"}`, details: [data.location], dates: formatDate(data.date) };
    case "attraction":
      return { title: data.name, details: [`Quantidade: ${data.quantity}x`], dates: formatDate(data.date) };
    case "insurance":
      return { title: data.provider, details: [`Cobertura: ${data.coverage}`], dates: `${formatDate(data.start_date)} - ${formatDate(data.end_date)}` };
    case "cruise":
      return { title: data.ship_name, details: [`Rota: ${data.route}`], dates: `${formatDate(data.start_date)} - ${formatDate(data.end_date)}` };
    case "other":
      return { title: "Serviço", details: [data.description] };
    default:
      return { title: "Serviço", details: [] };
  }
}

// Password Gate Component
function PasswordGate({ onUnlock }: { onUnlock: (password: string) => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) { setError("Digite a senha"); return; }
    setError("");
    setLoading(true);
    onUnlock(password);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-primary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardContent className="pt-8 pb-6 px-6 text-center space-y-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mx-auto">
            <Lock className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold mb-1">Carteira de Viagem</h1>
            <p className="text-sm text-muted-foreground">
              Digite a senha fornecida pela sua agência
            </p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(""); }}
              placeholder="Senha de acesso"
              className="text-center text-lg tracking-widest"
              autoFocus
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Lock className="h-4 w-4 mr-2" />}
              Acessar Carteira
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// Vertical Tab Menu
function ServiceTab({ type, count, active, onClick }: {
  type: TripServiceType; count: number; active: boolean; onClick: () => void;
}) {
  const Icon = SERVICE_ICONS[type];
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg text-left transition-all ${
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "hover:bg-muted/50 text-muted-foreground"
      }`}
    >
      <Icon className="h-5 w-5 shrink-0" />
      <span className="flex-1 text-sm font-medium">{SERVICE_LABELS[type]}</span>
      <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${
        active ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
      }`}>{count}</span>
    </button>
  );
}

// Service Card for Public View
function PublicServiceCard({ service }: { service: TripService }) {
  const { title, details, dates } = getServiceDetails(service);

  return (
    <Card className="border-border/50">
      <CardContent className="p-4">
        <h4 className="font-semibold text-sm mb-1">{title}</h4>
        {dates && (
          <p className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
            <Calendar className="h-3 w-3" /> {dates}
          </p>
        )}
        {details.map((d, i) => (
          <p key={i} className="text-sm text-muted-foreground">{d}</p>
        ))}
        {service.voucher_url && (
          <a
            href={service.voucher_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 mt-3 text-xs text-primary font-medium hover:underline"
          >
            <Download className="h-3.5 w-3.5" />
            {service.voucher_name || "Baixar documento"}
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </CardContent>
    </Card>
  );
}

// Main Public View
export default function ViagemPublica() {
  const { token } = useParams();
  const [authenticated, setAuthenticated] = useState(false);
  const [tripData, setTripData] = useState<Trip | null>(null);
  const [agentProfile, setAgentProfile] = useState<AgentProfile | null>(null);
  const [activeTab, setActiveTab] = useState<TripServiceType | "overview" | "notes">("overview");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleUnlock = async (password: string) => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const result = await verifyTripAccess(token, password);
      setTripData(result.trip);
      setAgentProfile(result.agentProfile);
      setAuthenticated(true);
    } catch (err: any) {
      setError(err.message || "Senha incorreta");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/30">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <h1 className="text-xl font-bold mb-2">Link inválido</h1>
            <p className="text-muted-foreground">Verifique o link com a sua agência.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-primary/5 flex items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardContent className="pt-8 pb-6 px-6 text-center space-y-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mx-auto">
              <Lock className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold mb-1">Carteira de Viagem</h1>
              <p className="text-sm text-muted-foreground">
                Digite a senha fornecida pela sua agência
              </p>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleUnlock((e.target as any).password.value); }} className="space-y-4">
              <Input
                name="password"
                type="password"
                placeholder="Senha de acesso"
                className="text-center text-lg tracking-widest"
                autoFocus
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Lock className="h-4 w-4 mr-2" />}
                Acessar Carteira
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!tripData) return null;

  const startDate = new Date(tripData.start_date);
  const endDate = new Date(tripData.end_date);
  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const services = tripData.services || [];

  // Group services by type
  const grouped = services.reduce((acc, s) => {
    if (!acc[s.service_type]) acc[s.service_type] = [];
    acc[s.service_type].push(s);
    return acc;
  }, {} as Record<TripServiceType, TripService[]>);

  const availableTabs = TAB_ORDER.filter(t => grouped[t]?.length > 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/10 to-primary/5">
      {/* Agency Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {agentProfile?.agency_logo_url ? (
              <img src={agentProfile.agency_logo_url} alt={agentProfile.agency_name || ''} className="h-10 max-w-32 object-contain" />
            ) : agentProfile?.agency_name ? (
              <span className="font-bold text-primary">{agentProfile.agency_name}</span>
            ) : (
              <span className="font-bold text-primary flex items-center gap-2">
                <Wallet className="h-5 w-5" /> Carteira de Viagem
              </span>
            )}
          </div>
          <Button size="sm" variant="outline" onClick={() => generateTripPDF(tripData, agentProfile)}>
            <FileText className="mr-2 h-4 w-4" /> PDF
          </Button>
        </div>
      </header>

      <div className="container max-w-5xl mx-auto px-4 py-6">
        {/* Trip Overview Card */}
        <Card className="mb-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="pt-5 pb-4">
            <h1 className="text-xl sm:text-2xl font-bold mb-3">{tripData.client_name}</h1>
            <div className="flex flex-wrap gap-4 text-sm">
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-primary" />
                <span className="font-medium">{tripData.destination}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-primary" />
                <span>{format(startDate, "dd/MM", { locale: ptBR })} - {format(endDate, "dd/MM/yyyy", { locale: ptBR })}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-primary" />
                <span>{days} dias</span>
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Content: Vertical Tabs + Services */}
        <div className="flex flex-col md:flex-row gap-4">
          {/* Vertical Tab Menu */}
          <nav className="md:w-56 shrink-0 space-y-1">
            <button
              onClick={() => setActiveTab("overview")}
              className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg text-left transition-all ${
                activeTab === "overview"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "hover:bg-muted/50 text-muted-foreground"
              }`}
            >
              <Eye className="h-5 w-5 shrink-0" />
              <span className="flex-1 text-sm font-medium">Visão Geral</span>
            </button>

            {availableTabs.map((type) => (
              <ServiceTab
                key={type}
                type={type}
                count={grouped[type].length}
                active={activeTab === type}
                onClick={() => setActiveTab(type)}
              />
            ))}
          </nav>

          {/* Tab Content */}
          <div className="flex-1 min-w-0">
            {activeTab === "overview" ? (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">Todos os Serviços</h2>
                {services.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center text-muted-foreground">
                      Nenhum serviço adicionado ainda
                    </CardContent>
                  </Card>
                ) : (
                  availableTabs.map((type) => (
                    <div key={type}>
                      <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2 uppercase tracking-wide">
                        {(() => { const Icon = SERVICE_ICONS[type]; return <Icon className="h-4 w-4" />; })()}
                        {SERVICE_LABELS[type]}
                      </h3>
                      <div className="space-y-2 mb-4">
                        {grouped[type].map((s) => <PublicServiceCard key={s.id} service={s} />)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : activeTab !== "notes" && grouped[activeTab as TripServiceType] ? (
              <div className="space-y-3">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  {(() => { const Icon = SERVICE_ICONS[activeTab as TripServiceType]; return <Icon className="h-5 w-5 text-primary" />; })()}
                  {SERVICE_LABELS[activeTab as TripServiceType]}
                </h2>
                {grouped[activeTab as TripServiceType].map((s) => (
                  <PublicServiceCard key={s.id} service={s} />
                ))}
              </div>
            ) : null}
          </div>
        </div>

        {/* Agent Footer */}
        <div className="mt-12 pt-6 border-t">
          {agentProfile ? (
            <div className="flex items-center justify-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={agentProfile.avatar_url || undefined} />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {agentProfile.name?.charAt(0).toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
              <div className="text-left">
                <p className="font-semibold">{agentProfile.name}</p>
                {agentProfile.phone && <p className="text-sm text-muted-foreground">📱 {agentProfile.phone}</p>}
                {agentProfile.agency_name && <p className="text-sm text-muted-foreground">{agentProfile.agency_name}</p>}
              </div>
            </div>
          ) : (
            <p className="text-center text-sm text-muted-foreground">Agentes de Sonhos • Sua viagem começa aqui</p>
          )}
        </div>

        <div className="mt-8 text-center">
          <p className="text-xs text-muted-foreground/60">
            Desenvolvido por <span className="font-medium text-muted-foreground/80">Nobre Digital Hub</span>
          </p>
        </div>
      </div>
    </div>
  );
}
