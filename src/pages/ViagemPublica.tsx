import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useLocation } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Wallet, MapPin, Calendar, FileText, Loader2, Lock, Plane, Hotel, Car, Bus,
  Ticket, Shield, Ship, TrainFront, Download, ExternalLink, Eye, MessageSquare,
  ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
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
  cruise: "Cruzeiro", train: "Trem", other: "Outros Serviços",
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
    case "hotel": {
      const statusMap: Record<string, string> = { confirmada: '✅ Confirmada', emitida: '📄 Emitida', pre_reserva: '⏳ Pré-reserva' };
      const catMap: Record<string, string> = { '3': '⭐⭐⭐', '4': '⭐⭐⭐⭐', '5': '⭐⭐⭐⭐⭐', boutique: 'Boutique', resort: 'Resort', pousada: 'Pousada' };
      const roomMap: Record<string, string> = { standard: 'Standard', superior: 'Superior', deluxe: 'Deluxe', suite: 'Suíte', suite_junior: 'Suíte Júnior', presidencial: 'Presidencial', apartamento: 'Apartamento', villa: 'Villa', bangalo: 'Bangalô' };
      const mealMap: Record<string, string> = { somente_hospedagem: 'Somente Hospedagem', cafe_manha: 'Café da Manhã', meia_pensao: 'Meia Pensão', pensao_completa: 'Pensão Completa', all_inclusive: 'All Inclusive' };
      const hotelDetails: string[] = [];
      if (data.hotel_category) hotelDetails.push(`Categoria: ${catMap[data.hotel_category] || data.hotel_category}`);
      hotelDetails.push(`${data.city}${data.country ? `, ${data.country}` : ''}`);
      if (data.reservation_status) hotelDetails.push(`Status: ${statusMap[data.reservation_status] || data.reservation_status}`);
      if (data.reservation_code) hotelDetails.push(`Reserva: ${data.reservation_code}`);
      if (data.room_type) hotelDetails.push(`Acomodação: ${roomMap[data.room_type] || data.room_type}`);
      if (data.meal_plan) hotelDetails.push(`Regime: ${mealMap[data.meal_plan] || data.meal_plan}`);
      if (data.notes) hotelDetails.push(`Obs: ${data.notes}`);
      const nights = (() => { try { const [sy,sm,sd] = data.check_in.split('-').map(Number); const [ey,em,ed] = data.check_out.split('-').map(Number); return Math.ceil((new Date(ey,em-1,ed).getTime() - new Date(sy,sm-1,sd).getTime()) / (1000*60*60*24)); } catch { return null; } })();
      return { title: data.hotel_name, details: hotelDetails, dates: `${formatDate(data.check_in)} - ${formatDate(data.check_out)}${nights ? ` (${nights} noites)` : ''}` };
    }
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
    case "transfer": {
      const typeMap: Record<string, string> = { arrival: 'Transfer IN', departure: 'Transfer OUT', inter_hotel: 'Inter-hotel' };
      const modeMap: Record<string, string> = { privativo: 'Privativo', compartilhado: 'Compartilhado', shuttle: 'Shuttle' };
      const statusMap: Record<string, string> = { confirmado: '✅ Confirmado', agendado: '📅 Agendado', pendente: '⏳ Pendente' };
      const transferDetails: string[] = [];
      const typeLbl = typeMap[data.transfer_type] || data.transfer_type;
      if (data.transfer_mode) transferDetails.push(`Modalidade: ${modeMap[data.transfer_mode] || data.transfer_mode}`);
      if (data.transfer_status) transferDetails.push(`Status: ${statusMap[data.transfer_status] || data.transfer_status}`);
      if (data.company_name) transferDetails.push(`Empresa: ${data.company_name}`);
      if (data.reservation_code) transferDetails.push(`Reserva: ${data.reservation_code}`);
      if (data.city) transferDetails.push(`Cidade: ${data.city}`);
      const route = data.origin_location && data.destination_location 
        ? `${data.origin_location} → ${data.destination_location}` 
        : data.location || '';
      return { title: `${typeLbl} — ${route}`, details: transferDetails, dates: data.date ? `${formatDate(data.date)}${data.time ? ` às ${data.time}` : ''}` : undefined };
    }
    case "attraction": {
      const typeMap: Record<string, string> = { parque: '🎢 Parque', show: '🎭 Show', passeio: '🚤 Passeio', museu: '🏛️ Museu', tour: '🗺️ Tour', evento: '📅 Evento', experiencia: '✨ Experiência' };
      const statusMap: Record<string, string> = { confirmado: '✅ Confirmado', reservado: '📅 Reservado', flexivel: '🔄 Flexível', utilizado: '☑️ Utilizado' };
      const accessMap: Record<string, string> = { '1_dia': '1 Dia', 'multi_day': 'Multi-Day', 'open_date': 'Data Aberta', 'horario_marcado': 'Horário Marcado' };
      const attractionDetails: string[] = [];
      if (data.attraction_type) attractionDetails.push(`Tipo: ${typeMap[data.attraction_type] || data.attraction_type}`);
      if (data.city) attractionDetails.push(`${data.city}${data.country ? `, ${data.country}` : ''}`);
      if (data.status) attractionDetails.push(`Status: ${statusMap[data.status] || data.status}`);
      attractionDetails.push(`Quantidade: ${data.quantity}x`);
      if (data.access_type) attractionDetails.push(`Acesso: ${accessMap[data.access_type] || data.access_type}`);
      if (data.entry_time) attractionDetails.push(`Entrada: ${data.entry_time}`);
      if (data.duration) attractionDetails.push(`Duração: ${data.duration}`);
      if (data.ticket_code) attractionDetails.push(`Ingresso: ${data.ticket_code}`);
      if (data.confirmation_code) attractionDetails.push(`Confirmação: ${data.confirmation_code}`);
      return { title: data.name, details: attractionDetails, dates: formatDate(data.date) };
    }
    case "insurance": {
      const statusMap: Record<string, string> = { ativo: '✅ Ativo', expirado: '❌ Expirado', futuro: '📅 Futuro' };
      const covTypeMap: Record<string, string> = { internacional: 'Internacional', nacional: 'Nacional', schengen: 'Schengen', global: 'Global' };
      const insuranceDetails: string[] = [];
      if (data.plan_name) insuranceDetails.push(`Plano: ${data.plan_name}`);
      if (data.policy_number) insuranceDetails.push(`Apólice: ${data.policy_number}`);
      if (data.status) insuranceDetails.push(`Status: ${statusMap[data.status] || data.status}`);
      if (data.destination_covered) insuranceDetails.push(`Destino: ${data.destination_covered}`);
      if (data.coverage_type) insuranceDetails.push(`Tipo: ${covTypeMap[data.coverage_type] || data.coverage_type}`);
      if (data.coverage) insuranceDetails.push(`Cobertura: ${data.coverage}`);
      if (data.medical_assistance) insuranceDetails.push(`Assistência Médica: ${data.medical_assistance}`);
      if (data.insured_persons?.length > 0) insuranceDetails.push(`Segurados: ${data.insured_persons.map((p: any) => p.name).join(', ')}`);
      if (data.emergency_phone) insuranceDetails.push(`📞 Emergência: ${data.emergency_phone}`);
      const days2 = (() => { try { const [sy,sm,sd] = data.start_date.split('-').map(Number); const [ey,em,ed] = data.end_date.split('-').map(Number); return Math.ceil((new Date(ey,em-1,ed).getTime() - new Date(sy,sm-1,sd).getTime()) / (1000*60*60*24)); } catch { return null; } })();
      return { title: data.provider, details: insuranceDetails, dates: `${formatDate(data.start_date)} - ${formatDate(data.end_date)}${days2 ? ` (${days2} dias)` : ''}` };
    }
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
    case "other": {
      const otherTypeMap: Record<string, string> = { restaurante: '🍽️ Restaurante', guia_turistico: '🧭 Guia Turístico', chip_internet: '📶 Chip/Internet', experiencia: '✨ Experiência', evento: '📅 Evento', spa_wellness: '🧘 Spa/Bem-estar', servico_vip: '👑 Serviço VIP', concierge: '🛎️ Concierge', personalizado: '⭐ Personalizado' };
      const statusMap: Record<string, string> = { confirmado: '✅ Confirmado', agendado: '📅 Agendado', opcional: '🔄 Opcional' };
      const otherDetails: string[] = [];
      if (data.other_service_type) otherDetails.push(`Tipo: ${otherTypeMap[data.other_service_type] || data.custom_type_name || data.other_service_type}`);
      if (data.city) otherDetails.push(`Local: ${data.city}${data.country ? `, ${data.country}` : ''}`);
      if (data.status) otherDetails.push(`Status: ${statusMap[data.status] || data.status}`);
      if (data.date) otherDetails.push(`Data: ${formatDate(data.date)}${data.time ? ` às ${data.time}` : ''}`);
      if (data.duration) otherDetails.push(`Duração: ${data.duration}`);
      if (data.location_name) otherDetails.push(`Local: ${data.location_name}`);
      if (data.address) otherDetails.push(`Endereço: ${data.address}`);
      if (data.reservation_code) otherDetails.push(`Reserva: ${data.reservation_code}`);
      if (data.contact_company) otherDetails.push(`Empresa: ${data.contact_company}`);
      if (data.contact_name) otherDetails.push(`Contato: ${data.contact_name}`);
      if (data.contact_phone) otherDetails.push(`Telefone: ${data.contact_phone}`);
      // Chip specific
      if (data.chip_operator) otherDetails.push(`Operadora: ${data.chip_operator}`);
      if (data.chip_type) otherDetails.push(`Tipo: ${data.chip_type === 'esim' ? 'eSIM' : 'Chip Físico'}`);
      if (data.chip_activation_instructions) otherDetails.push(`Ativação: ${data.chip_activation_instructions}`);
      // Guide specific
      if (data.guide_name) otherDetails.push(`Guia: ${data.guide_name}`);
      if (data.guide_language) otherDetails.push(`Idioma: ${data.guide_language}`);
      if (data.guide_meeting_point) otherDetails.push(`Ponto de encontro: ${data.guide_meeting_point}`);
      if (data.description) otherDetails.push(data.description);
      if (data.agency_tips) otherDetails.push(`Dicas: ${data.agency_tips}`);
      if (data.agency_notes) otherDetails.push(`Obs: ${data.agency_notes}`);
      return { title: data.service_name || 'Serviço', details: otherDetails, dates: data.date ? formatDate(data.date) : undefined };
    }
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

// Collapsible Service Section
function CollapsibleServiceSection({ 
  type, services, defaultOpen, sectionRef 
}: { 
  type: TripServiceType; services: TripService[]; defaultOpen: boolean; sectionRef: (el: HTMLDivElement | null) => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const Icon = SERVICE_ICONS[type];
  const label = SERVICE_LABELS[type];

  return (
    <div ref={sectionRef} data-service-type={type}>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted/50 rounded-lg transition-colors">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                <Icon className="h-4.5 w-4.5 text-primary" />
              </div>
              <span className="font-semibold text-sm">{label}</span>
              <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">
                {services.length}
              </span>
            </div>
            <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform duration-200", open && "rotate-180")} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="space-y-2 mt-2 mb-1">
            {services.map((s) => <PublicServiceCard key={s.id} service={s} />)}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
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
  const isHotel = service.service_type === 'hotel';
  const isTransfer = service.service_type === 'transfer';
  const isAttraction = service.service_type === 'attraction';
  const isInsurance = service.service_type === 'insurance';
  const isOther = service.service_type === 'other';

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

        {/* Hotel - Check-in / Check-out details */}
        {isHotel && (data.checkin_time || data.checkin_holder || data.reservation_code) && (
          <div className="mt-3 p-3 bg-muted/50 rounded-lg space-y-1">
            <p className="text-xs font-semibold text-primary uppercase tracking-wide">📅 Check-in</p>
            {data.checkin_time && <p className="text-xs text-muted-foreground">Horário: {data.checkin_time}</p>}
            {data.early_checkin && <p className="text-xs text-muted-foreground">Early check-in: {data.early_checkin === 'sim' ? '✅ Incluso' : data.early_checkin === 'mediante_taxa' ? '💰 Mediante taxa' : data.early_checkin === 'sob_consulta' ? '📞 Sob consulta' : '❌ Não disponível'}</p>}
            {data.checkin_holder && <p className="text-xs text-muted-foreground">Titular: {data.checkin_holder}</p>}
            {data.checkin_instructions && <p className="text-xs text-muted-foreground italic">{data.checkin_instructions}</p>}
            {data.late_arrival_policy && <p className="text-xs text-muted-foreground">Chegada tardia: {data.late_arrival_policy}</p>}
          </div>
        )}

        {isHotel && (data.checkout_time || data.late_checkout || data.checkout_procedure) && (
          <div className="mt-2 p-3 bg-muted/50 rounded-lg space-y-1">
            <p className="text-xs font-semibold text-primary uppercase tracking-wide">🧳 Check-out</p>
            {data.checkout_time && <p className="text-xs text-muted-foreground">Horário: {data.checkout_time}</p>}
            {data.late_checkout && <p className="text-xs text-muted-foreground">Late check-out: {data.late_checkout === 'sim' ? '✅ Incluso' : data.late_checkout === 'mediante_taxa' ? `💰 Mediante taxa${data.late_checkout_fee ? ` (${data.late_checkout_fee})` : ''}` : data.late_checkout === 'sob_consulta' ? '📞 Sob consulta' : '❌ Não disponível'}</p>}
            {data.checkout_procedure && <p className="text-xs text-muted-foreground">Procedimento: {data.checkout_procedure === 'recepcao' ? 'Recepção' : data.checkout_procedure === 'express' ? 'Express' : 'Online'}</p>}
            {data.checkout_instructions && <p className="text-xs text-muted-foreground italic">{data.checkout_instructions}</p>}
          </div>
        )}

        {/* Hotel - Room details */}
        {isHotel && (data.bed_type || data.room_view || data.amenities) && (
          <div className="mt-2 p-3 bg-muted/50 rounded-lg space-y-1">
            <p className="text-xs font-semibold text-primary uppercase tracking-wide">🛏️ Acomodação</p>
            {data.bed_type && <p className="text-xs text-muted-foreground">Cama: {data.bed_type === 'king' ? 'King' : data.bed_type === 'queen' ? 'Queen' : data.bed_type === 'twin' ? 'Twin (2 Solteiro)' : data.bed_type === 'single' ? 'Solteiro' : data.bed_type === 'double' ? 'Casal' : data.bed_type === 'triple' ? 'Triplo' : data.bed_type}</p>}
            {data.guest_count && <p className="text-xs text-muted-foreground">Hóspedes: {data.guest_count}</p>}
            {data.room_view && <p className="text-xs text-muted-foreground">Vista: {data.room_view}</p>}
            {data.amenities && <p className="text-xs text-muted-foreground">Amenities: {data.amenities}</p>}
          </div>
        )}

        {/* Hotel - Food */}
        {isHotel && (data.breakfast_hours || data.restaurants_included || data.food_notes || data.all_inclusive_rules) && (
          <div className="mt-2 p-3 bg-muted/50 rounded-lg space-y-1">
            <p className="text-xs font-semibold text-primary uppercase tracking-wide">🍽️ Alimentação</p>
            {data.breakfast_hours && <p className="text-xs text-muted-foreground">Café da manhã: {data.breakfast_hours}</p>}
            {data.restaurants_included && <p className="text-xs text-muted-foreground">Restaurantes: {data.restaurants_included}</p>}
            {data.food_notes && <p className="text-xs text-muted-foreground italic">{data.food_notes}</p>}
            {data.all_inclusive_rules && <p className="text-xs text-muted-foreground">All Inclusive: {data.all_inclusive_rules}</p>}
          </div>
        )}

        {/* Hotel - What's included */}
        {isHotel && (data.breakfast_included || data.wifi_included || data.parking_included || data.resort_fee || data.other_inclusions) && (
          <div className="mt-2 p-3 bg-muted/50 rounded-lg space-y-1">
            <p className="text-xs font-semibold text-primary uppercase tracking-wide">💰 Inclusos na Reserva</p>
            <div className="flex flex-wrap gap-2 text-xs">
              {data.breakfast_included === 'sim' && <span className="bg-primary/10 text-primary px-2 py-0.5 rounded">☕ Café</span>}
              {data.wifi_included === 'sim' && <span className="bg-primary/10 text-primary px-2 py-0.5 rounded">📶 Wi-Fi</span>}
              {data.taxes_included === 'sim' && <span className="bg-primary/10 text-primary px-2 py-0.5 rounded">✅ Taxas</span>}
              {data.parking_included === 'sim' && <span className="bg-primary/10 text-primary px-2 py-0.5 rounded">🅿️ Estacionamento</span>}
              {data.transfer_included === 'sim' && <span className="bg-primary/10 text-primary px-2 py-0.5 rounded">🚐 Transfer</span>}
            </div>
            {data.resort_fee && <p className="text-xs text-muted-foreground mt-1">Resort Fee: {data.resort_fee}</p>}
            {data.other_inclusions && <p className="text-xs text-muted-foreground">{data.other_inclusions}</p>}
          </div>
        )}

        {/* Hotel - Policies */}
        {isHotel && (data.cancellation_policy || data.mandatory_fees || data.hotel_deposit) && (
          <div className="mt-2 p-3 bg-muted/50 rounded-lg space-y-1">
            <p className="text-xs font-semibold text-primary uppercase tracking-wide">🧾 Políticas</p>
            {data.cancellation_policy && <p className="text-xs text-muted-foreground">Cancelamento: {data.cancellation_policy}</p>}
            {data.children_policy && <p className="text-xs text-muted-foreground">Crianças: {data.children_policy}</p>}
            {data.pet_policy && <p className="text-xs text-muted-foreground">Pets: {data.pet_policy}</p>}
            {data.mandatory_fees && <p className="text-xs text-muted-foreground font-medium">⚠️ Taxas no destino: {data.mandatory_fees}</p>}
            {data.hotel_deposit && <p className="text-xs text-muted-foreground">Caução: {data.hotel_deposit}{data.hotel_deposit_method ? ` (${data.hotel_deposit_method})` : ''}</p>}
          </div>
        )}

        {/* Hotel - Guests */}
        {isHotel && data.guests?.length > 0 && (
          <div className="mt-2">
            <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-1">👨‍👩‍👧 Hóspedes</p>
            {data.guests.map((g: any, i: number) => (
              <p key={i} className="text-xs text-muted-foreground">
                {g.name}{g.age ? ` (${g.age})` : ''}{g.notes ? ` • ${g.notes}` : ''}
              </p>
            ))}
          </div>
        )}

        {/* Hotel - Location & Map */}
        {isHotel && (data.address || data.hotel_phone || data.maps_url) && (
          <div className="mt-2 p-3 bg-muted/50 rounded-lg space-y-1">
            <p className="text-xs font-semibold text-primary uppercase tracking-wide">📍 Localização e Contato</p>
            {data.address && <p className="text-xs text-muted-foreground">{data.address}</p>}
            {data.hotel_phone && <p className="text-xs text-muted-foreground">📞 {data.hotel_phone}</p>}
            {data.hotel_email && <p className="text-xs text-muted-foreground">✉️ {data.hotel_email}</p>}
            {data.maps_url && (
              <a href={data.maps_url} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="text-xs h-7 mt-1">
                  <MapPin className="h-3 w-3 mr-1" /> Ver no mapa
                </Button>
              </a>
            )}
            {data.hotel_website && (
              <a href={data.hotel_website} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline block">
                🌐 Site oficial do hotel
              </a>
            )}
          </div>
        )}

        {/* Hotel - Special requests / Agency notes */}
        {isHotel && (data.special_requests || data.agency_notes) && (
          <div className="mt-2 p-3 bg-muted/50 rounded-lg space-y-1">
            <p className="text-xs font-semibold text-primary uppercase tracking-wide">📝 Observações</p>
            {data.special_requests && <p className="text-xs text-muted-foreground">Solicitações: {data.special_requests}</p>}
            {data.agency_notes && <p className="text-xs text-muted-foreground italic">{data.agency_notes}</p>}
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

        {/* Transfer - Arrival details */}
        {isTransfer && data.transfer_type === 'arrival' && (data.flight_number || data.arrival_airport || data.meeting_instructions) && (
          <div className="mt-3 p-3 bg-muted/50 rounded-lg space-y-1">
            <p className="text-xs font-semibold text-primary uppercase tracking-wide">✈️ Detalhes da Chegada</p>
            {data.flight_number && <p className="text-xs text-muted-foreground">Voo: {data.flight_number}</p>}
            {data.arrival_time && <p className="text-xs text-muted-foreground">Chegada prevista: {data.arrival_time}</p>}
            {data.arrival_airport && <p className="text-xs text-muted-foreground">Aeroporto: {data.arrival_airport}{data.arrival_terminal ? ` • Terminal ${data.arrival_terminal}` : ''}</p>}
            {data.driver_wait_time && <p className="text-xs text-muted-foreground">Espera do motorista: {data.driver_wait_time}</p>}
            {data.reception_type && <p className="text-xs text-muted-foreground">Recepção: {data.reception_type === 'placa' ? 'Com placa / nome' : data.reception_type === 'balcao' ? 'Balcão da empresa' : 'Ponto fixo'}</p>}
            {data.meeting_instructions && (
              <div className="mt-1 p-2 bg-primary/5 border border-primary/20 rounded">
                <p className="text-xs font-medium text-primary">📍 Onde encontrar o motorista:</p>
                <p className="text-xs text-foreground">{data.meeting_instructions}</p>
              </div>
            )}
          </div>
        )}

        {/* Transfer - Departure details */}
        {isTransfer && data.transfer_type === 'departure' && (data.hotel_departure_time || data.departure_airport || data.departure_alert) && (
          <div className="mt-3 p-3 bg-muted/50 rounded-lg space-y-1">
            <p className="text-xs font-semibold text-primary uppercase tracking-wide">🧳 Detalhes da Saída</p>
            {data.hotel_departure_time && <p className="text-xs text-muted-foreground">Saída do hotel: {data.hotel_departure_time}</p>}
            {data.departure_flight_time && <p className="text-xs text-muted-foreground">Horário do voo: {data.departure_flight_time}</p>}
            {data.departure_airport && <p className="text-xs text-muted-foreground">Aeroporto: {data.departure_airport}</p>}
            {data.recommended_departure && <p className="text-xs text-muted-foreground">Saída recomendada: {data.recommended_departure}</p>}
            {data.boarding_point && <p className="text-xs text-muted-foreground">Embarque: {data.boarding_point === 'lobby' ? 'Lobby / Recepção' : data.boarding_point === 'entrada' ? 'Entrada Principal' : data.boarding_point === 'estacionamento' ? 'Estacionamento' : data.boarding_point}</p>}
            {data.departure_alert && (
              <div className="mt-1 p-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded">
                <p className="text-xs font-medium text-amber-700 dark:text-amber-400">⚠️ {data.departure_alert}</p>
              </div>
            )}
          </div>
        )}

        {/* Transfer - Driver & Contact */}
        {isTransfer && (data.driver_name || data.driver_phone) && (
          <div className="mt-2 p-3 bg-muted/50 rounded-lg space-y-1">
            <p className="text-xs font-semibold text-primary uppercase tracking-wide">👤 Motorista</p>
            {data.driver_name && <p className="text-xs text-muted-foreground">Nome: {data.driver_name}</p>}
            {data.driver_language && <p className="text-xs text-muted-foreground">Idioma: {data.driver_language}</p>}
            {data.vehicle_plate && <p className="text-xs text-muted-foreground">Placa: {data.vehicle_plate}</p>}
            {data.driver_phone && (
              <div className="flex gap-2 mt-2">
                <a href={`tel:${data.driver_phone}`}>
                  <Button variant="outline" size="sm" className="text-xs h-7">📞 Ligar</Button>
                </a>
                <a href={`https://wa.me/${data.driver_phone.replace(/[^0-9+]/g, '')}`} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm" className="text-xs h-7">💬 WhatsApp</Button>
                </a>
              </div>
            )}
          </div>
        )}

        {/* Transfer - Vehicle */}
        {isTransfer && (data.vehicle_type || data.vehicle_capacity) && (
          <div className="mt-2 p-3 bg-muted/50 rounded-lg space-y-1">
            <p className="text-xs font-semibold text-primary uppercase tracking-wide">🚗 Veículo</p>
            {data.vehicle_type && <p className="text-xs text-muted-foreground">Tipo: {data.vehicle_type === 'sedan' ? 'Sedan' : data.vehicle_type === 'suv' ? 'SUV' : data.vehicle_type === 'van' ? 'Van' : data.vehicle_type === 'minibus' ? 'Micro-ônibus' : data.vehicle_type === 'onibus' ? 'Ônibus' : data.vehicle_type}</p>}
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              {data.vehicle_capacity && <span>👤 {data.vehicle_capacity} passageiros</span>}
              {data.luggage_capacity && <span>🧳 {data.luggage_capacity}</span>}
              {data.air_conditioning === 'sim' && <span>❄️ Ar-condicionado</span>}
            </div>
            {data.accessibility && <p className="text-xs text-muted-foreground">♿ {data.accessibility}</p>}
            {data.vehicle_notes && <p className="text-xs text-muted-foreground italic">{data.vehicle_notes}</p>}
          </div>
        )}

        {/* Transfer - Passengers */}
        {isTransfer && data.passengers?.length > 0 && (
          <div className="mt-2">
            <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-1">👨‍👩‍👧 Passageiros</p>
            {data.passengers.map((p: any, i: number) => (
              <p key={i} className="text-xs text-muted-foreground">
                {p.name} ({p.passenger_type === 'adulto' ? 'Adulto' : p.passenger_type === 'crianca' ? 'Criança' : 'Bebê'})
                {p.needs_child_seat === 'sim' ? ' 🪑 Cadeirinha' : ''}
              </p>
            ))}
          </div>
        )}

        {/* Transfer - Locations & Maps */}
        {isTransfer && (data.pickup_address || data.destination_address || data.pickup_maps_url || data.destination_maps_url) && (
          <div className="mt-2 p-3 bg-muted/50 rounded-lg space-y-1">
            <p className="text-xs font-semibold text-primary uppercase tracking-wide">📍 Locais</p>
            {data.pickup_address && <p className="text-xs text-muted-foreground">Embarque: {data.pickup_address}</p>}
            {data.destination_address && <p className="text-xs text-muted-foreground">Destino: {data.destination_address}</p>}
            {data.location_notes && <p className="text-xs text-muted-foreground italic">{data.location_notes}</p>}
            <div className="flex flex-wrap gap-2 mt-1">
              {data.pickup_maps_url && (
                <a href={data.pickup_maps_url} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm" className="text-xs h-7">
                    <MapPin className="h-3 w-3 mr-1" /> Embarque no mapa
                  </Button>
                </a>
              )}
              {data.destination_maps_url && (
                <a href={data.destination_maps_url} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm" className="text-xs h-7">
                    <MapPin className="h-3 w-3 mr-1" /> Destino no mapa
                  </Button>
                </a>
              )}
            </div>
          </div>
        )}

        {/* Transfer - Important info */}
        {isTransfer && (data.required_documents || data.emergency_contact || data.plan_b || data.agency_notes) && (
          <div className="mt-2 p-3 bg-muted/50 rounded-lg space-y-1">
            <p className="text-xs font-semibold text-primary uppercase tracking-wide">⚠️ Orientações</p>
            {data.required_documents && <p className="text-xs text-muted-foreground">Documentos: {data.required_documents}</p>}
            {data.emergency_contact && <p className="text-xs text-muted-foreground">📞 Emergência: {data.emergency_contact}</p>}
            {data.agency_contact && <p className="text-xs text-muted-foreground">📱 Agência: {data.agency_contact}</p>}
            {data.plan_b && (
              <div className="mt-1 p-2 bg-primary/5 border border-primary/20 rounded">
                <p className="text-xs font-medium text-primary">🔄 Plano B:</p>
                <p className="text-xs text-foreground">{data.plan_b}</p>
              </div>
            )}
            {data.agency_notes && <p className="text-xs text-muted-foreground italic mt-1">{data.agency_notes}</p>}
          </div>
        )}

        {/* Attraction - Ticket Codes */}
        {isAttraction && (data.ticket_code || data.confirmation_code || data.order_number) && (
          <div className="mt-3 p-3 bg-muted/50 rounded-lg space-y-1">
            <p className="text-xs font-semibold text-primary uppercase tracking-wide">📱 Códigos do Ingresso</p>
            {data.ticket_code && <p className="text-sm font-mono font-semibold text-foreground">🎟️ {data.ticket_code}</p>}
            {data.confirmation_code && <p className="text-xs text-muted-foreground">Confirmação: {data.confirmation_code}</p>}
            {data.order_number && <p className="text-xs text-muted-foreground">Pedido: {data.order_number}</p>}
          </div>
        )}

        {/* Attraction - Usage details */}
        {isAttraction && (data.entry_time || data.usage_window || data.duration || data.access_type) && (
          <div className="mt-2 p-3 bg-muted/50 rounded-lg space-y-1">
            <p className="text-xs font-semibold text-primary uppercase tracking-wide">📅 Detalhes de Uso</p>
            {data.entry_time && <p className="text-xs text-muted-foreground">Horário de entrada: {data.entry_time}</p>}
            {data.usage_window && <p className="text-xs text-muted-foreground">Janela de uso: {data.usage_window}</p>}
            {data.duration && <p className="text-xs text-muted-foreground">Duração: {data.duration}</p>}
            {data.access_type && <p className="text-xs text-muted-foreground">Acesso: {data.access_type === '1_dia' ? '1 Dia' : data.access_type === 'multi_day' ? 'Multi-Day' : data.access_type === 'open_date' ? 'Data Aberta' : 'Horário Marcado'}</p>}
            {data.requires_reservation && <p className="text-xs text-muted-foreground">Reserva: {data.requires_reservation === 'sim' ? '✅ Necessária' : data.requires_reservation === 'recomendado' ? '📌 Recomendada' : '❌ Não necessária'}</p>}
          </div>
        )}

        {/* Attraction - Usage instructions */}
        {isAttraction && data.usage_instructions && (
          <div className="mt-2 p-3 bg-primary/5 border border-primary/20 rounded-lg">
            <p className="text-xs font-medium text-primary">📋 Instruções Importantes:</p>
            <p className="text-xs text-foreground mt-1">{data.usage_instructions}</p>
          </div>
        )}

        {/* Attraction - Passengers */}
        {isAttraction && data.passengers?.length > 0 && (
          <div className="mt-2">
            <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-1">👨‍👩‍👧 Ingressos por Pessoa</p>
            {data.passengers.map((p: any, i: number) => (
              <p key={i} className="text-xs text-muted-foreground">
                🎟️ {p.name} ({p.ticket_type === 'adulto' ? 'Adulto' : p.ticket_type === 'crianca' ? 'Criança' : 'Senior'})
                {p.document ? ` • ${p.document}` : ''}
              </p>
            ))}
          </div>
        )}

        {/* Attraction - Location & Map */}
        {isAttraction && (data.address || data.venue_name || data.maps_url) && (
          <div className="mt-2 p-3 bg-muted/50 rounded-lg space-y-1">
            <p className="text-xs font-semibold text-primary uppercase tracking-wide">📍 Localização</p>
            {data.venue_name && <p className="text-xs text-muted-foreground font-medium">{data.venue_name}</p>}
            {data.address && <p className="text-xs text-muted-foreground">{data.address}</p>}
            {data.entry_point && <p className="text-xs text-muted-foreground">Entrada: {data.entry_point}</p>}
            {data.maps_url && (
              <a href={data.maps_url} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="text-xs h-7 mt-1">
                  <MapPin className="h-3 w-3 mr-1" /> Ver no mapa
                </Button>
              </a>
            )}
          </div>
        )}

        {/* Attraction - Rules & Policies */}
        {isAttraction && (data.attraction_rules || data.cancellation_policy || data.prohibited_items || data.dress_code || data.required_documents) && (
          <div className="mt-2 p-3 bg-muted/50 rounded-lg space-y-1">
            <p className="text-xs font-semibold text-primary uppercase tracking-wide">📌 Regras e Políticas</p>
            {data.cancellation_policy && <p className="text-xs text-muted-foreground">Cancelamento: {data.cancellation_policy}</p>}
            {data.change_policy && <p className="text-xs text-muted-foreground">Alteração: {data.change_policy}</p>}
            {data.attraction_rules && <p className="text-xs text-muted-foreground">{data.attraction_rules}</p>}
            {data.prohibited_items && <p className="text-xs text-muted-foreground">🚫 Proibido: {data.prohibited_items}</p>}
            {data.dress_code && <p className="text-xs text-muted-foreground">👔 Dress code: {data.dress_code}</p>}
            {data.required_documents && <p className="text-xs text-muted-foreground">📄 Documentos: {data.required_documents}</p>}
          </div>
        )}

        {/* Attraction - Agency Tips (Premium highlight) */}
        {isAttraction && data.agency_tips && (
          <div className="mt-2 p-3 bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-lg">
            <p className="text-xs font-semibold text-primary">🧠 Dicas do seu Agente de Viagem</p>
            <p className="text-xs text-foreground mt-1 whitespace-pre-line">{data.agency_tips}</p>
          </div>
        )}

        {/* Attraction - Contacts */}
        {isAttraction && (data.attraction_contact || data.operator_contact || data.agency_contact) && (
          <div className="mt-2 p-3 bg-muted/50 rounded-lg space-y-1">
            <p className="text-xs font-semibold text-primary uppercase tracking-wide">📞 Contatos</p>
            {data.attraction_contact && <p className="text-xs text-muted-foreground">Atração: {data.attraction_contact}</p>}
            {data.operator_contact && <p className="text-xs text-muted-foreground">Operadora: {data.operator_contact}</p>}
            {data.agency_contact && (
              <a href={`https://wa.me/${data.agency_contact.replace(/[^0-9+]/g, '')}`} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="text-xs h-7 mt-1">
                  <MessageSquare className="h-3 w-3 mr-1" /> Falar com a agência
                </Button>
              </a>
            )}
            {data.emergency_contact && <p className="text-xs text-muted-foreground">🆘 Emergência: {data.emergency_contact}</p>}
          </div>
        )}

        {/* Attraction - Agency notes */}
        {isAttraction && data.agency_notes && (
          <div className="mt-2 p-3 bg-muted/50 rounded-lg space-y-1">
            <p className="text-xs font-semibold text-primary uppercase tracking-wide">📝 Observações</p>
            <p className="text-xs text-muted-foreground italic">{data.agency_notes}</p>
          </div>
        )}

        {/* Insurance - Emergency Contacts (PRIORITY) */}
        {isInsurance && (data.emergency_phone || data.emergency_whatsapp || data.emergency_email) && (
          <div className="mt-3 p-3 bg-destructive/5 border border-destructive/20 rounded-lg space-y-2">
            <p className="text-xs font-semibold text-destructive uppercase tracking-wide">🆘 Contatos de Emergência</p>
            {data.emergency_phone && (
              <div className="flex items-center gap-2">
                <a href={`tel:${data.emergency_phone}`} className="flex-1">
                  <Button variant="destructive" size="sm" className="text-xs w-full">📞 Ligar Emergência: {data.emergency_phone}</Button>
                </a>
              </div>
            )}
            {data.emergency_whatsapp && (
              <a href={`https://wa.me/${data.emergency_whatsapp.replace(/[^0-9+]/g, '')}`} target="_blank" rel="noopener noreferrer" className="block">
                <Button variant="outline" size="sm" className="text-xs w-full">💬 WhatsApp Assistência</Button>
              </a>
            )}
            {data.emergency_email && <p className="text-xs text-muted-foreground">✉️ {data.emergency_email}</p>}
            {data.emergency_24h === 'sim' && <p className="text-xs text-primary font-medium">✅ Atendimento 24 horas</p>}
            {data.emergency_languages && <p className="text-xs text-muted-foreground">🌐 Idiomas: {data.emergency_languages}</p>}
            {data.insurer_website && (
              <a href={data.insurer_website} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="text-xs w-full">🌐 Site da Seguradora</Button>
              </a>
            )}
          </div>
        )}

        {/* Insurance - Coverages */}
        {isInsurance && (data.medical_assistance || data.hospital_expenses || data.lost_baggage || data.trip_cancellation) && (
          <div className="mt-2 p-3 bg-muted/50 rounded-lg space-y-1">
            <p className="text-xs font-semibold text-primary uppercase tracking-wide">🏥 Coberturas</p>
            <div className="grid grid-cols-1 gap-1">
              {data.medical_assistance && <div className="flex justify-between text-xs"><span className="text-muted-foreground">Assistência Médica</span><span className="font-medium">{data.medical_assistance}</span></div>}
              {data.hospital_expenses && <div className="flex justify-between text-xs"><span className="text-muted-foreground">Despesas Hospitalares</span><span className="font-medium">{data.hospital_expenses}</span></div>}
              {data.lost_baggage && <div className="flex justify-between text-xs"><span className="text-muted-foreground">Bagagem Extraviada</span><span className="font-medium">{data.lost_baggage}</span></div>}
              {data.trip_cancellation && <div className="flex justify-between text-xs"><span className="text-muted-foreground">Cancelamento</span><span className="font-medium">{data.trip_cancellation}</span></div>}
              {data.trip_interruption && <div className="flex justify-between text-xs"><span className="text-muted-foreground">Interrupção</span><span className="font-medium">{data.trip_interruption}</span></div>}
              {data.dental_assistance && <div className="flex justify-between text-xs"><span className="text-muted-foreground">Odontológica</span><span className="font-medium">{data.dental_assistance}</span></div>}
              {data.medical_repatriation && <div className="flex justify-between text-xs"><span className="text-muted-foreground">Repatriação</span><span className="font-medium">{data.medical_repatriation}</span></div>}
              {data.covid_coverage && <div className="flex justify-between text-xs"><span className="text-muted-foreground">COVID</span><span className="font-medium">{data.covid_coverage}</span></div>}
            </div>
          </div>
        )}

        {/* Insurance - Policy details */}
        {isInsurance && (data.policy_number || data.destination_covered || data.coverage_type) && (
          <div className="mt-2 p-3 bg-muted/50 rounded-lg space-y-1">
            <p className="text-xs font-semibold text-primary uppercase tracking-wide">🛡️ Dados da Apólice</p>
            {data.policy_number && <p className="text-xs text-muted-foreground">Apólice: <span className="font-mono font-medium text-foreground">{data.policy_number}</span></p>}
            {data.plan_name && <p className="text-xs text-muted-foreground">Plano: {data.plan_name}</p>}
            {data.destination_covered && <p className="text-xs text-muted-foreground">Destino coberto: {data.destination_covered}</p>}
            {data.coverage_type && <p className="text-xs text-muted-foreground">Tipo: {data.coverage_type === 'internacional' ? 'Internacional' : data.coverage_type === 'nacional' ? 'Nacional' : data.coverage_type === 'schengen' ? 'Schengen' : 'Global'}</p>}
          </div>
        )}

        {/* Insurance - Emergency Procedure */}
        {isInsurance && (data.how_to_activate || data.hospital_procedure || data.reimbursement_info) && (
          <div className="mt-2 p-3 bg-primary/5 border border-primary/20 rounded-lg space-y-1">
            <p className="text-xs font-semibold text-primary">🆘 O que Fazer em Emergência</p>
            {data.how_to_activate && <p className="text-xs text-foreground whitespace-pre-line">{data.how_to_activate}</p>}
            {data.required_documents_claim && <p className="text-xs text-muted-foreground mt-1">📄 Documentos: {data.required_documents_claim}</p>}
            {data.hospital_procedure && <p className="text-xs text-muted-foreground">🏥 {data.hospital_procedure}</p>}
            {data.reimbursement_info && <p className="text-xs text-muted-foreground">💰 Reembolso: {data.reimbursement_info}</p>}
          </div>
        )}

        {/* Insurance - Insured Persons */}
        {isInsurance && data.insured_persons?.length > 0 && (
          <div className="mt-2">
            <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-1">👨‍👩‍👧 Segurados</p>
            {data.insured_persons.map((p: any, i: number) => (
              <p key={i} className="text-xs text-muted-foreground">
                {p.name}{p.coverage_type ? ` (${p.coverage_type === 'individual' ? 'Individual' : 'Familiar'})` : ''}
                {p.birth_date ? ` • ${p.birth_date}` : ''}
              </p>
            ))}
          </div>
        )}

        {/* Insurance - Agency Tips */}
        {isInsurance && data.agency_tips && (
          <div className="mt-2 p-3 bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-lg">
            <p className="text-xs font-semibold text-primary">🧠 Orientações do seu Agente</p>
            <p className="text-xs text-foreground mt-1 whitespace-pre-line">{data.agency_tips}</p>
          </div>
        )}

        {/* Insurance - Agency Contact */}
        {isInsurance && (data.agency_contact || data.emergency_contact_agency) && (
          <div className="mt-2 p-3 bg-muted/50 rounded-lg space-y-1">
            <p className="text-xs font-semibold text-primary uppercase tracking-wide">📞 Contato da Agência</p>
            {data.agency_contact && (
              <a href={`https://wa.me/${data.agency_contact.replace(/[^0-9+]/g, '')}`} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="text-xs h-7 w-full">
                  <MessageSquare className="h-3 w-3 mr-1" /> Falar com a agência
                </Button>
              </a>
            )}
            {data.emergency_contact_agency && <p className="text-xs text-muted-foreground">🆘 Emergência: {data.emergency_contact_agency}</p>}
          </div>
        )}

        {/* Insurance - Notes */}
        {isInsurance && data.agency_notes && (
          <div className="mt-2 p-3 bg-muted/50 rounded-lg space-y-1">
            <p className="text-xs font-semibold text-primary uppercase tracking-wide">📝 Observações</p>
            <p className="text-xs text-muted-foreground italic">{data.agency_notes}</p>
          </div>
        )}

        {/* Other Service - Location & Contact */}
        {isOther && (data.location_name || data.address || data.maps_url) && (
          <div className="mt-3 p-3 bg-muted/50 rounded-lg space-y-1">
            <p className="text-xs font-semibold text-primary uppercase tracking-wide">📍 Localização</p>
            {data.location_name && <p className="text-xs text-muted-foreground font-medium">{data.location_name}</p>}
            {data.address && <p className="text-xs text-muted-foreground">{data.address}</p>}
            {data.meeting_point && <p className="text-xs text-muted-foreground">Ponto de encontro: {data.meeting_point}</p>}
            {data.how_to_arrive && <p className="text-xs text-muted-foreground italic">{data.how_to_arrive}</p>}
            {data.maps_url && (
              <a href={data.maps_url} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="text-xs h-7 mt-1">
                  <MapPin className="h-3 w-3 mr-1" /> Abrir no mapa
                </Button>
              </a>
            )}
          </div>
        )}

        {/* Other Service - Contact */}
        {isOther && (data.contact_name || data.contact_phone || data.contact_whatsapp) && (
          <div className="mt-2 p-3 bg-muted/50 rounded-lg space-y-2">
            <p className="text-xs font-semibold text-primary uppercase tracking-wide">👤 Contato</p>
            {data.contact_name && <p className="text-xs text-muted-foreground">{data.contact_name}{data.contact_company ? ` — ${data.contact_company}` : ''}</p>}
            {data.contact_language && <p className="text-xs text-muted-foreground">🌐 {data.contact_language}</p>}
            <div className="flex flex-wrap gap-2 mt-1">
              {data.contact_phone && (
                <a href={`tel:${data.contact_phone}`}>
                  <Button variant="outline" size="sm" className="text-xs h-7">📞 Ligar</Button>
                </a>
              )}
              {data.contact_whatsapp && (
                <a href={`https://wa.me/${data.contact_whatsapp.replace(/[^0-9+]/g, '')}`} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm" className="text-xs h-7">💬 WhatsApp</Button>
                </a>
              )}
              {data.contact_email && (
                <a href={`mailto:${data.contact_email}`}>
                  <Button variant="outline" size="sm" className="text-xs h-7">✉️ E-mail</Button>
                </a>
              )}
            </div>
          </div>
        )}

        {/* Other - Chip / Internet */}
        {isOther && data.other_service_type === 'chip_internet' && (data.chip_operator || data.chip_activation_instructions) && (
          <div className="mt-2 p-3 bg-primary/5 border border-primary/20 rounded-lg space-y-1">
            <p className="text-xs font-semibold text-primary">📶 Chip / Internet</p>
            {data.chip_operator && <p className="text-xs text-muted-foreground">Operadora: {data.chip_operator}</p>}
            {data.chip_type && <p className="text-xs text-muted-foreground">Tipo: {data.chip_type === 'esim' ? 'eSIM (digital)' : 'Chip Físico'}</p>}
            {data.chip_activation_instructions && (
              <div className="mt-1">
                <p className="text-xs font-medium text-foreground">📲 Instruções de Ativação:</p>
                <p className="text-xs text-muted-foreground whitespace-pre-line">{data.chip_activation_instructions}</p>
              </div>
            )}
            {data.chip_activation_url && (
              <a href={data.chip_activation_url} target="_blank" rel="noopener noreferrer">
                <Button variant="default" size="sm" className="text-xs w-full mt-1">📲 Link de Ativação</Button>
              </a>
            )}
            {data.chip_support && <p className="text-xs text-muted-foreground mt-1">Suporte: {data.chip_support}</p>}
          </div>
        )}

        {/* Other - Guide */}
        {isOther && data.other_service_type === 'guia_turistico' && (data.guide_name || data.guide_meeting_point) && (
          <div className="mt-2 p-3 bg-muted/50 rounded-lg space-y-1">
            <p className="text-xs font-semibold text-primary uppercase tracking-wide">🧭 Guia Turístico</p>
            {data.guide_name && <p className="text-xs text-muted-foreground">Guia: {data.guide_name}</p>}
            {data.guide_language && <p className="text-xs text-muted-foreground">Idioma: {data.guide_language}</p>}
            {data.guide_tour_time && <p className="text-xs text-muted-foreground">Horário: {data.guide_tour_time}</p>}
            {data.guide_tour_duration && <p className="text-xs text-muted-foreground">Duração: {data.guide_tour_duration}</p>}
            {data.guide_meeting_point && <p className="text-xs text-muted-foreground">📍 Encontro: {data.guide_meeting_point}</p>}
          </div>
        )}

        {/* Other - Agency Tips */}
        {isOther && data.agency_tips && (
          <div className="mt-2 p-3 bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-lg">
            <p className="text-xs font-semibold text-primary">🧠 Orientações do seu Agente</p>
            <p className="text-xs text-foreground mt-1 whitespace-pre-line">{data.agency_tips}</p>
          </div>
        )}

        {/* Other - Agency Contact */}
        {isOther && (data.agency_contact || data.emergency_contact) && (
          <div className="mt-2 p-3 bg-muted/50 rounded-lg space-y-1">
            <p className="text-xs font-semibold text-primary uppercase tracking-wide">📞 Suporte</p>
            {data.agency_contact && (
              <a href={`https://wa.me/${data.agency_contact.replace(/[^0-9+]/g, '')}`} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="text-xs h-7 w-full">
                  <MessageSquare className="h-3 w-3 mr-1" /> Falar com a agência
                </Button>
              </a>
            )}
            {data.emergency_contact && <p className="text-xs text-muted-foreground">🆘 Emergência: {data.emergency_contact}</p>}
          </div>
        )}

        {/* Other - Notes */}
        {isOther && data.agency_notes && (
          <div className="mt-2 p-3 bg-muted/50 rounded-lg space-y-1">
            <p className="text-xs font-semibold text-primary uppercase tracking-wide">📝 Observações</p>
            <p className="text-xs text-muted-foreground italic">{data.agency_notes}</p>
          </div>
        )}

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
        {/* Attachments */}
        {(service.attachments?.length > 0 || service.voucher_url) && (
          <div className="mt-3 space-y-1">
            {service.attachments?.length > 0 ? (
              service.attachments.map((att: any, idx: number) => (
                <a
                  key={idx}
                  href={att.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-primary font-medium hover:underline mr-3"
                >
                  <Download className="h-3.5 w-3.5" />
                  {att.name}
                  <ExternalLink className="h-3 w-3" />
                </a>
              ))
            ) : service.voucher_url ? (
              <a
                href={service.voucher_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-primary font-medium hover:underline"
              >
                <Download className="h-3.5 w-3.5" />
                {service.voucher_name || "Baixar documento"}
                <ExternalLink className="h-3 w-3" />
              </a>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Main Public View
export default function ViagemPublica() {
  const { token } = useParams();
  const location = useLocation();
  const preAuth = location.state as { preAuthenticated?: boolean; tripData?: Trip; agentProfile?: AgentProfile | null } | null;
  const [authenticated, setAuthenticated] = useState(!!preAuth?.preAuthenticated);
  const [tripData, setTripData] = useState<Trip | null>(preAuth?.tripData || null);
  const [agentProfile, setAgentProfile] = useState<AgentProfile | null>(preAuth?.agentProfile || null);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const isMobile = useIsMobile();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const scrollToSection = useCallback((type: TripServiceType) => {
    const el = sectionRefs.current[type];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Also open the collapsible if it's closed - we trigger a click on the trigger
      const trigger = el.querySelector('[data-state="closed"]');
      if (trigger) (trigger as HTMLElement).click();
    }
  }, []);

  // Also try without password for trips that have no password set
  useEffect(() => {
    if (authenticated || !token) return;
    const tryNoPassword = async () => {
      try {
        const result = await verifyTripAccess(token, "");
        setTripData(result.trip);
        setAgentProfile(result.agentProfile);
        setAuthenticated(true);
      } catch {
        // Needs password — show the gate
      }
    };
    tryNoPassword();
  }, [token, authenticated]);

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
            Desenvolvido por <span className="font-medium text-muted-foreground/80">Nobre Digital</span>
          </p>
        </div>
      </div>
    </div>
  );
}
