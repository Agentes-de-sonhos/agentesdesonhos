import { useState } from "react";
import { useParams } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Wallet, MapPin, Calendar, FileText, Loader2, Lock, Plane, Hotel, Car, Bus,
  Ticket, Shield, Ship, TrainFront, Download, ExternalLink, Eye, MessageSquare
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
  attraction: Ticket, insurance: Shield, cruise: Ship, train: TrainFront, other: FileText,
};

const SERVICE_LABELS: Record<TripServiceType, string> = {
  flight: "Passagens", hotel: "Hospedagem", car_rental: "Locação de Veículo",
  transfer: "Transfer", attraction: "Ingressos/Atrações", insurance: "Seguro Viagem",
  cruise: "Cruzeiro", train: "Trem", other: "Outros",
};

const TAB_ORDER: TripServiceType[] = ["flight", "train", "hotel", "attraction", "insurance", "car_rental", "transfer", "cruise", "other"];

function formatDate(dateStr: string) {
  try { const [y,m,d] = dateStr.split('-').map(Number); return format(new Date(y, m-1, d), "dd/MM/yyyy", { locale: ptBR }); }
  catch { return dateStr; }
}

function getServiceDetails(service: TripService): { title: string; details: string[]; dates?: string } {
  const data = service.service_data as any;
  switch (service.service_type) {
    case "flight": {
      const tripTypeMap: Record<string, string> = { ida: 'Somente Ida', ida_volta: 'Ida e Volta', multi_trechos: 'Multi-trechos' };
      const statusMap: Record<string, string> = { confirmado: '✅ Confirmado', emitido: '📄 Emitido', pendente: '⏳ Pendente' };
      const details: string[] = [];
      const airline = data.main_airline || data.airline || '';
      if (airline) details.push(`Companhia: ${airline}`);
      if (data.trip_type) details.push(`Tipo: ${tripTypeMap[data.trip_type] || data.trip_type}`);
      if (data.locator_code) details.push(`Localizador: ${data.locator_code}`);
      if (data.flight_status) details.push(`Status: ${statusMap[data.flight_status] || data.flight_status}`);
      // Legacy compat
      if (!data.segments && data.notes) details.push(`Obs: ${data.notes}`);
      const firstDate = data.segments?.[0]?.flight_date || data.departure_date || '';
      const lastDate = data.segments?.[data.segments?.length - 1]?.flight_date || data.return_date || '';
      return { 
        title: `${data.origin_city || ''} → ${data.destination_city || ''}`, 
        details, 
        dates: firstDate ? `${formatDate(firstDate)}${lastDate && lastDate !== firstDate ? ` - ${formatDate(lastDate)}` : ''}` : undefined
      };
    }
    case "hotel":
      return { title: `${data.hotel_name}`, details: [`${data.city}`, ...(data.notes ? [`Obs: ${data.notes}`] : [])], dates: `${formatDate(data.check_in)} - ${formatDate(data.check_out)}` };
    case "car_rental": {
      const carDetails: string[] = [];
      const company = data.rental_company || '';
      if (company) carDetails.push(`Locadora: ${company}`);
      if (data.reservation_code) carDetails.push(`Reserva: ${data.reservation_code}`);
      const statusMap: Record<string, string> = { confirmada: '✅ Confirmada', emitida: '📄 Emitida', a_retirar: '🚗 A Retirar' };
      if (data.reservation_status) carDetails.push(`Status: ${statusMap[data.reservation_status] || data.reservation_status}`);
      if (data.car_model) carDetails.push(`Modelo: ${data.car_model}`);
      if (data.transmission) carDetails.push(`Transmissão: ${data.transmission === 'automatico' ? 'Automático' : 'Manual'}`);
      if (data.pickup_location) carDetails.push(`Retirada: ${data.pickup_location}`);
      if (data.dropoff_location && data.dropoff_location !== data.pickup_location) carDetails.push(`Devolução: ${data.dropoff_location}`);
      const catLabels: Record<string, string> = { economico: 'Econômico', compacto: 'Compacto', intermediario: 'Intermediário', suv: 'SUV', premium: 'Premium', luxo: 'Luxo', van: 'Van' };
      const catLabel = catLabels[data.car_type] || data.car_type || '';
      const pickupCity = data.pickup_city || data.pickup_location || '';
      const dropoffCity = data.dropoff_city || data.dropoff_location || '';
      const titleStr = `${pickupCity}${dropoffCity && dropoffCity !== pickupCity ? ` → ${dropoffCity}` : ''}`;
      let datesStr: string | undefined;
      if (data.pickup_date && data.dropoff_date) {
        const days = (() => { try { const [sy,sm,sd] = data.pickup_date.split('-').map(Number); const [ey,em,ed] = data.dropoff_date.split('-').map(Number); return Math.ceil((new Date(ey,em-1,ed).getTime() - new Date(sy,sm-1,sd).getTime()) / (1000*60*60*24)); } catch { return null; } })();
        datesStr = `${formatDate(data.pickup_date)} - ${formatDate(data.dropoff_date)}${days ? ` (${days} dias)` : ''}`;
      }
      return { title: `${catLabel}${catLabel && titleStr ? ' • ' : ''}${titleStr}`, details: carDetails, dates: datesStr };
    }
    case "transfer":
      return { title: `${data.transfer_type === "arrival" ? "Chegada" : "Saída"}`, details: [data.location], dates: formatDate(data.date) };
    case "attraction":
      return { title: data.name, details: [`Quantidade: ${data.quantity}x`], dates: formatDate(data.date) };
    case "insurance":
      return { title: data.provider, details: [`Cobertura: ${data.coverage}`], dates: `${formatDate(data.start_date)} - ${formatDate(data.end_date)}` };
    case "cruise": {
      const nights = (() => {
        try {
          const [sy,sm,sd] = data.start_date.split('-').map(Number);
          const [ey,em,ed] = data.end_date.split('-').map(Number);
          return Math.ceil((new Date(ey,em-1,ed).getTime() - new Date(sy,sm-1,sd).getTime()) / (1000*60*60*24));
        } catch { return null; }
      })();
      const cruiseDetails: string[] = [];
      if (data.cruise_company) cruiseDetails.push(`Companhia: ${data.cruise_company}`);
      cruiseDetails.push(`Roteiro: ${data.route}`);
      if (data.embarkation_port) cruiseDetails.push(`Embarque: ${data.embarkation_port}`);
      if (data.disembarkation_port) cruiseDetails.push(`Desembarque: ${data.disembarkation_port}`);
      if (nights) cruiseDetails.push(`${nights} noites`);
      if (data.booking_number) cruiseDetails.push(`Reserva: ${data.booking_number}`);
      if (data.cabin_type) cruiseDetails.push(`Cabine: ${data.cabin_type}${data.cabin_number ? ` #${data.cabin_number}` : ''}`);
      if (data.deck) cruiseDetails.push(`Deck: ${data.deck}`);
      if (data.occupancy) cruiseDetails.push(`Ocupação: ${data.occupancy}`);
      if (data.meal_plan) cruiseDetails.push(`Alimentação: ${data.meal_plan === 'pensao_completa' ? 'Pensão Completa' : data.meal_plan === 'all_inclusive' ? 'All Inclusive' : data.meal_plan === 'meia_pensao' ? 'Meia Pensão' : data.meal_plan}`);
      if (data.passengers?.length > 0) cruiseDetails.push(`Passageiros: ${data.passengers.map((p: any) => p.name).join(', ')}`);
      return { title: data.ship_name, details: cruiseDetails, dates: `${formatDate(data.start_date)} - ${formatDate(data.end_date)}` };
    }
    case "train": {
      const time = data.departure_time && data.arrival_time ? `${data.departure_time} → ${data.arrival_time}` : '';
      const details: string[] = [];
      if (data.train_company) details.push(`${data.train_company}${data.train_number ? ` • Trem ${data.train_number}` : ''}`);
      if (data.travel_class) details.push(`Classe: ${data.travel_class}`);
      if (data.coach || data.seat) details.push(`${data.coach ? `Vagão ${data.coach}` : ''}${data.seat ? ` • Assento ${data.seat}` : ''}`);
      if (data.origin_station) details.push(`Embarque: ${data.origin_station}`);
      if (data.destination_station) details.push(`Desembarque: ${data.destination_station}`);
      if (data.passengers?.length > 0) details.push(`Passageiros: ${data.passengers.map((p: any) => p.name).join(', ')}`);
      if (data.boarding_notes) details.push(`📋 ${data.boarding_notes}`);
      return { title: `${data.origin_city} → ${data.destination_city}`, details, dates: data.travel_date ? `${formatDate(data.travel_date)}${time ? ` • ${time}` : ''}` : undefined };
    }
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
  const data = service.service_data as any;
  const isTrainWithMaps = service.service_type === 'train' && (data.origin_maps_url || data.destination_maps_url);
  const isCruise = service.service_type === 'cruise';
  const isFlight = service.service_type === 'flight';
  const isCarRental = service.service_type === 'car_rental';

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

        {/* Flight segments timeline */}
        {isFlight && data.segments?.length > 0 && (
          <div className="mt-3 space-y-2">
            <p className="text-xs font-semibold text-primary uppercase tracking-wide">🛫 Trechos</p>
            {data.segments.map((seg: any, i: number) => {
              const segTypeLabel = seg.segment_type === 'ida' ? 'Ida' : seg.segment_type === 'conexao' ? 'Conexão' : 'Volta';
              // Connection time calc
              let connectionInfo: string | null = null;
              if (i > 0 && data.segments[i-1]) {
                const prev = data.segments[i-1];
                if (prev.flight_date === seg.flight_date && prev.arrival_time && seg.departure_time) {
                  const [ph, pm] = prev.arrival_time.split(':').map(Number);
                  const [sh, sm] = seg.departure_time.split(':').map(Number);
                  const diff = (sh * 60 + sm) - (ph * 60 + pm);
                  if (diff > 0) {
                    const h = Math.floor(diff / 60);
                    const m = diff % 60;
                    connectionInfo = `Conexão em ${seg.origin_city || seg.origin_airport} — ${h}h${m > 0 ? `${m.toString().padStart(2, '0')}` : ''}`;
                  }
                }
              }
              return (
                <div key={i}>
                  {connectionInfo && (
                    <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-3 py-1.5 rounded-md mb-1 font-medium">
                      ✈️ {connectionInfo}
                    </div>
                  )}
                  <div className="border-l-2 border-primary/30 pl-3 py-1">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium">{segTypeLabel}</span>
                      {seg.airline && <span className="text-muted-foreground">{seg.airline}</span>}
                      {seg.flight_number && <span className="font-mono text-muted-foreground">{seg.flight_number}</span>}
                    </div>
                    <p className="text-sm font-medium mt-0.5">
                      {seg.origin_airport || seg.origin_city} → {seg.destination_airport || seg.destination_city}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {seg.flight_date ? formatDate(seg.flight_date) : ''}
                      {seg.departure_time ? ` • ${seg.departure_time}` : ''}
                      {seg.arrival_time ? ` → ${seg.arrival_time}` : ''}
                      {seg.terminal ? ` • Terminal ${seg.terminal}` : ''}
                      {seg.gate ? ` • Portão ${seg.gate}` : ''}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Flight passengers */}
        {isFlight && data.passengers?.length > 0 && (
          <div className="mt-3">
            <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-1">👤 Passageiros</p>
            {data.passengers.map((p: any, i: number) => (
              <p key={i} className="text-xs text-muted-foreground">
                {p.name} ({p.passenger_type === 'adulto' ? 'Adulto' : p.passenger_type === 'crianca' ? 'Criança' : 'Bebê'})
                {p.seat ? ` • Assento ${p.seat}` : ''}
              </p>
            ))}
          </div>
        )}

        {/* Flight baggage */}
        {isFlight && (data.carry_on || data.checked_baggage) && (
          <div className="mt-3 p-3 bg-muted/50 rounded-lg">
            <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-1">🧳 Bagagem</p>
            {data.carry_on && <p className="text-xs text-muted-foreground">Mão: {data.carry_on}</p>}
            {data.checked_baggage && <p className="text-xs text-muted-foreground">Despachada: {data.checked_baggage}</p>}
            {data.extra_baggage && <p className="text-xs text-muted-foreground">Extra: {data.extra_baggage}</p>}
            {data.baggage_rules && <p className="text-xs text-muted-foreground italic mt-1">{data.baggage_rules}</p>}
          </div>
        )}

        {/* Flight boarding instructions */}
        {isFlight && (data.recommended_arrival || data.required_documents || data.boarding_notes) && (
          <div className="mt-3 p-3 bg-muted/50 rounded-lg space-y-1">
            <p className="text-xs font-semibold text-primary uppercase tracking-wide">⚠️ Orientações de Embarque</p>
            {data.recommended_arrival && <p className="text-xs text-muted-foreground">Antecedência: {data.recommended_arrival}</p>}
            {data.boarding_terminal && <p className="text-xs text-muted-foreground">Terminal: {data.boarding_terminal}</p>}
            {data.required_documents && <p className="text-xs text-muted-foreground">Documentos: {data.required_documents}</p>}
            {data.immigration_rules && <p className="text-xs text-muted-foreground">Imigração: {data.immigration_rules}</p>}
            {data.boarding_notes && <p className="text-xs text-muted-foreground italic">{data.boarding_notes}</p>}
          </div>
        )}

        {/* Flight check-in */}
        {isFlight && data.checkin_url && (
          <div className="mt-3">
            <a href={data.checkin_url} target="_blank" rel="noopener noreferrer">
              <Button variant="default" size="sm" className="text-xs w-full sm:w-auto">
                ✅ Fazer Check-in Online
              </Button>
            </a>
            {data.checkin_open_date && <p className="text-xs text-muted-foreground mt-1">Abertura: {data.checkin_open_date}</p>}
          </div>
        )}

        {/* Cruise itinerary */}
        {isCruise && data.itinerary?.length > 0 && (
          <div className="mt-3 space-y-1">
            <p className="text-xs font-semibold text-primary uppercase tracking-wide">🗺 Roteiro</p>
            {data.itinerary.map((stop: any, i: number) => (
              <div key={i} className="text-xs text-muted-foreground pl-2 border-l-2 border-primary/20 py-0.5">
                <span className="font-medium">{stop.date ? `${stop.date} – ` : ''}{stop.port}</span>
                {stop.stop_type === 'navegacao' ? ' (Navegação)' : ''}
                {stop.arrival_time && ` ${stop.arrival_time}`}
                {stop.departure_time && ` – ${stop.departure_time}`}
              </div>
            ))}
          </div>
        )}

        {/* Cruise boarding instructions */}
        {isCruise && (data.boarding_terminal || data.recommended_arrival || data.required_documents || data.boarding_notes) && (
          <div className="mt-3 p-3 bg-muted/50 rounded-lg space-y-1">
            <p className="text-xs font-semibold text-primary uppercase tracking-wide">⚠️ Orientações de Embarque</p>
            {data.boarding_terminal && <p className="text-xs text-muted-foreground">Terminal: {data.boarding_terminal}</p>}
            {data.recommended_arrival && <p className="text-xs text-muted-foreground">Chegada: {data.recommended_arrival}</p>}
            {data.required_documents && <p className="text-xs text-muted-foreground">Documentos: {data.required_documents}</p>}
            {data.baggage_policy && <p className="text-xs text-muted-foreground">Bagagem: {data.baggage_policy}</p>}
            {data.dress_code && <p className="text-xs text-muted-foreground">Dress Code: {data.dress_code}</p>}
            {data.boarding_notes && <p className="text-xs text-muted-foreground italic">{data.boarding_notes}</p>}
          </div>
        )}

        {/* Cruise check-in button */}
        {isCruise && data.checkin_url && (
          <div className="mt-3">
            <a href={data.checkin_url} target="_blank" rel="noopener noreferrer">
              <Button variant="default" size="sm" className="text-xs w-full sm:w-auto">
                ✅ Fazer Check-in do Cruzeiro
              </Button>
            </a>
            {data.checkin_deadline && <p className="text-xs text-muted-foreground mt-1">Prazo: {data.checkin_deadline}</p>}
          </div>
        )}

        {/* Cruise maps */}
        {isCruise && data.port_maps_url && (
          <div className="mt-2">
            <a href={data.port_maps_url} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="text-xs h-7">
                <MapPin className="h-3 w-3 mr-1" /> Rota até o porto
              </Button>
            </a>
          </div>
        )}

        {/* Cruise ship info */}
        {isCruise && (data.onboard_currency || data.voltage || data.ship_website) && (
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
            {data.onboard_currency && <span>💰 {data.onboard_currency}</span>}
            {data.voltage && <span>🔌 {data.voltage}</span>}
            {data.ship_website && (
              <a href={data.ship_website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                🚢 Site do navio
              </a>
            )}
          </div>
        )}

        {/* Car Rental - Pickup & Dropoff */}
        {isCarRental && (data.pickup_date || data.pickup_time || data.pickup_address) && (
          <div className="mt-3 p-3 bg-muted/50 rounded-lg space-y-1">
            <p className="text-xs font-semibold text-primary uppercase tracking-wide">📍 Retirada</p>
            {data.pickup_address && <p className="text-xs text-muted-foreground">{data.pickup_address}</p>}
            {data.pickup_city && <p className="text-xs text-muted-foreground">{data.pickup_city}{data.pickup_country ? `, ${data.pickup_country}` : ''}</p>}
            {data.pickup_date && <p className="text-xs text-muted-foreground">📅 {formatDate(data.pickup_date)}{data.pickup_time ? ` às ${data.pickup_time}` : ''}</p>}
            {data.pickup_terminal && <p className="text-xs text-muted-foreground">Terminal: {data.pickup_terminal}</p>}
            {data.pickup_phone && <p className="text-xs text-muted-foreground">📞 {data.pickup_phone}</p>}
            {data.pickup_instructions && <p className="text-xs text-muted-foreground italic">{data.pickup_instructions}</p>}
            {data.pickup_maps_url && (
              <a href={data.pickup_maps_url} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="text-xs h-7 mt-1">
                  <MapPin className="h-3 w-3 mr-1" /> Ver no mapa
                </Button>
              </a>
            )}
          </div>
        )}

        {isCarRental && (data.dropoff_date || data.dropoff_address) && (
          <div className="mt-2 p-3 bg-muted/50 rounded-lg space-y-1">
            <p className="text-xs font-semibold text-primary uppercase tracking-wide">🔁 Devolução</p>
            {data.dropoff_address && <p className="text-xs text-muted-foreground">{data.dropoff_address}</p>}
            {data.dropoff_city && <p className="text-xs text-muted-foreground">{data.dropoff_city}{data.dropoff_country ? `, ${data.dropoff_country}` : ''}</p>}
            {data.dropoff_date && <p className="text-xs text-muted-foreground">📅 {formatDate(data.dropoff_date)}{data.dropoff_time ? ` às ${data.dropoff_time}` : ''}</p>}
            {data.dropoff_instructions && <p className="text-xs text-muted-foreground italic">{data.dropoff_instructions}</p>}
            {data.dropoff_late_policy && <p className="text-xs text-muted-foreground">⏰ {data.dropoff_late_policy}</p>}
          </div>
        )}

        {/* Car Rental - Vehicle details */}
        {isCarRental && (data.car_model || data.doors || data.passenger_capacity) && (
          <div className="mt-2 p-3 bg-muted/50 rounded-lg space-y-1">
            <p className="text-xs font-semibold text-primary uppercase tracking-wide">🚘 Veículo</p>
            {data.car_model && <p className="text-xs text-muted-foreground">Modelo: {data.car_model}</p>}
            {data.transmission && <p className="text-xs text-muted-foreground">Transmissão: {data.transmission === 'automatico' ? 'Automático' : 'Manual'}</p>}
            {data.fuel_type && <p className="text-xs text-muted-foreground">Combustível: {data.fuel_type}</p>}
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-1">
              {data.doors && <span>🚪 {data.doors} portas</span>}
              {data.passenger_capacity && <span>👤 {data.passenger_capacity} passageiros</span>}
              {data.luggage_capacity && <span>🧳 {data.luggage_capacity}</span>}
            </div>
            {data.plate && <p className="text-xs text-muted-foreground">Placa: {data.plate}</p>}
          </div>
        )}

        {/* Car Rental - Insurance */}
        {isCarRental && (data.basic_insurance || data.full_insurance || data.deductible) && (
          <div className="mt-2 p-3 bg-muted/50 rounded-lg space-y-1">
            <p className="text-xs font-semibold text-primary uppercase tracking-wide">🛡️ Seguros</p>
            {data.basic_insurance && <p className="text-xs text-muted-foreground">Básico: {data.basic_insurance}</p>}
            {data.full_insurance && <p className="text-xs text-muted-foreground">Total (CDW/LDW): {data.full_insurance}</p>}
            {data.third_party_protection && <p className="text-xs text-muted-foreground">Terceiros: {data.third_party_protection}</p>}
            {data.theft_protection && <p className="text-xs text-muted-foreground">Roubo: {data.theft_protection}</p>}
            {data.damage_protection && <p className="text-xs text-muted-foreground">Danos: {data.damage_protection}</p>}
            {data.deductible && <p className="text-xs text-muted-foreground font-medium">Franquia: {data.deductible}</p>}
            {data.insurance_notes && <p className="text-xs text-muted-foreground italic">{data.insurance_notes}</p>}
          </div>
        )}

        {/* Car Rental - Deposit alert */}
        {isCarRental && data.deposit_amount && (
          <div className="mt-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg space-y-1">
            <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">💳 Caução e Pagamento</p>
            <p className="text-xs text-amber-600 dark:text-amber-300">Caução: {data.deposit_amount}</p>
            {data.deposit_method && <p className="text-xs text-amber-600 dark:text-amber-300">Forma: {data.deposit_method}</p>}
            {data.card_in_driver_name && <p className="text-xs text-amber-600 dark:text-amber-300 font-medium">⚠️ Cartão no nome do condutor: {data.card_in_driver_name}</p>}
            {data.payment_status && <p className="text-xs text-amber-600 dark:text-amber-300">Pagamento: {data.payment_status}</p>}
          </div>
        )}

        {/* Car Rental - Drivers */}
        {isCarRental && data.drivers?.length > 0 && (
          <div className="mt-2">
            <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-1">👤 Condutores</p>
            {data.drivers.map((d: any, i: number) => (
              <p key={i} className="text-xs text-muted-foreground">
                {i === 0 ? '🔑 ' : '👤 '}{d.name}{d.document ? ` • ${d.document}` : ''}
              </p>
            ))}
          </div>
        )}

        {/* Car Rental - Fuel Policy */}
        {isCarRental && data.fuel_policy && (
          <div className="mt-2 p-3 bg-muted/50 rounded-lg space-y-1">
            <p className="text-xs font-semibold text-primary uppercase tracking-wide">⛽ Combustível</p>
            <p className="text-xs text-muted-foreground">
              Política: {data.fuel_policy === 'cheio_cheio' ? 'Cheio-Cheio' : data.fuel_policy === 'cheio_vazio' ? 'Cheio-Vazio' : data.fuel_policy}
            </p>
            {data.fuel_penalty && <p className="text-xs text-muted-foreground">Penalidade: {data.fuel_penalty}</p>}
            {data.fuel_notes && <p className="text-xs text-muted-foreground italic">{data.fuel_notes}</p>}
          </div>
        )}

        {/* Car Rental - Important info */}
        {isCarRental && (data.required_documents || data.international_permit || data.traffic_rules) && (
          <div className="mt-2 p-3 bg-muted/50 rounded-lg space-y-1">
            <p className="text-xs font-semibold text-primary uppercase tracking-wide">⚠️ Orientações</p>
            {data.required_documents && <p className="text-xs text-muted-foreground">Documentos: {data.required_documents}</p>}
            {data.minimum_age && <p className="text-xs text-muted-foreground">Idade mínima: {data.minimum_age}</p>}
            {data.international_permit && <p className="text-xs text-muted-foreground">PID (Permissão Internacional): {data.international_permit}</p>}
            {data.traffic_rules && <p className="text-xs text-muted-foreground italic">{data.traffic_rules}</p>}
            {data.emergency_contact && <p className="text-xs text-muted-foreground">📞 Emergência: {data.emergency_contact}</p>}
          </div>
        )}

        {/* Train maps */}
        {isTrainWithMaps && (
          <div className="flex flex-wrap gap-2 mt-3">
            {data.origin_maps_url && (
              <a href={data.origin_maps_url} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="text-xs h-7">
                  <MapPin className="h-3 w-3 mr-1" /> Rota até embarque
                </Button>
              </a>
            )}
            {data.destination_maps_url && (
              <a href={data.destination_maps_url} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="text-xs h-7">
                  <MapPin className="h-3 w-3 mr-1" /> Rota até desembarque
                </Button>
              </a>
            )}
          </div>
        )}
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

  const parseLocal = (d: string) => { const [y,m,day] = d.split('-').map(Number); return new Date(y, m-1, day); };
  const startDate = parseLocal(tripData.start_date);
  const endDate = parseLocal(tripData.end_date);
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
