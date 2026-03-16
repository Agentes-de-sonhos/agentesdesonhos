import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plane, Hotel, Car, Bus, Ticket, Shield, Ship, TrainFront, FileText, Sparkles, Loader2, Check, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { TripServiceType } from "@/types/trip";

interface DetectedService {
  type: string;
  data: Record<string, any>;
  confidence: number;
}

const SERVICE_TYPE_MAP: Record<string, TripServiceType> = {
  flight: 'flight',
  hotel: 'hotel',
  transfer: 'transfer',
  car_rental: 'car_rental',
  insurance: 'insurance',
  cruise: 'cruise',
  train: 'train',
  attraction: 'attraction',
};

const SERVICE_LABELS: Record<string, string> = {
  flight: 'Passagem Aérea',
  hotel: 'Hospedagem',
  transfer: 'Transfer',
  car_rental: 'Locação de Veículo',
  insurance: 'Seguro Viagem',
  cruise: 'Cruzeiro',
  train: 'Trem',
  attraction: 'Ingressos/Atrações',
};

const SERVICE_ICONS: Record<string, React.ReactNode> = {
  flight: <Plane className="h-4 w-4" />,
  hotel: <Hotel className="h-4 w-4" />,
  transfer: <Bus className="h-4 w-4" />,
  car_rental: <Car className="h-4 w-4" />,
  insurance: <Shield className="h-4 w-4" />,
  cruise: <Ship className="h-4 w-4" />,
  train: <TrainFront className="h-4 w-4" />,
  attraction: <Ticket className="h-4 w-4" />,
};

function buildServiceData(service: DetectedService): Record<string, any> {
  const d = service.data;
  switch (service.type) {
    case 'flight':
      return {
        main_airline: d.airline || '',
        origin_city: d.origin_city || '',
        destination_city: d.destination_city || '',
        trip_type: 'ida',
        locator_code: '',
        flight_status: 'pendente',
        segments: [{
          origin_airport: d.origin_airport || '',
          origin_city: d.origin_city || '',
          destination_airport: d.destination_airport || '',
          destination_city: d.destination_city || '',
          flight_date: '',
          departure_time: d.departure_time || '',
          arrival_time: d.arrival_time || '',
          flight_number: d.flight_number || '',
          airline: d.airline || '',
          terminal: '',
          gate: '',
          segment_type: 'ida',
        }],
        passengers: [],
        carry_on: '', checked_baggage: '', extra_baggage: '', baggage_rules: '', baggage_notes: '',
        checkin_url: '', checkin_status: 'pendente', checkin_open_date: '', checkin_notes: '',
        recommended_arrival: '', boarding_terminal: '', required_documents: '', immigration_rules: '', boarding_notes: '',
        airline: d.airline || '', departure_date: '', return_date: '', notes: '',
      };
    case 'hotel':
      return {
        hotel_name: d.hotel_name || '', hotel_category: '', city: d.city || '', country: '',
        check_in: d.check_in || '', check_out: d.check_out || '',
        room_type: d.room_type || '', reservation_status: d.reservation_code ? 'confirmada' : '',
        reservation_code: d.reservation_code || '',
        checkin_time: '', early_checkin: '', checkin_holder: '', checkin_instructions: '', late_arrival_policy: '',
        checkout_time: '', late_checkout: '', late_checkout_fee: '', checkout_instructions: '', checkout_procedure: '',
        bed_type: '', guest_count: '', room_view: '', meal_plan: '', cleaning_policy: '', amenities: '',
        address: '', hotel_phone: '', hotel_email: '', hotel_website: '', maps_url: '',
        breakfast_hours: '', restaurants_included: '', food_notes: '', all_inclusive_rules: '',
        breakfast_included: '', wifi_included: '', taxes_included: '', resort_fee: '', parking_included: '', transfer_included: '', other_inclusions: '',
        cancellation_policy: '', change_policy: '', children_policy: '', pet_policy: '', mandatory_fees: '', hotel_deposit: '', hotel_deposit_method: '',
        guests: [], special_requests: '', agency_notes: '', notes: '',
      };
    case 'transfer':
      return {
        transfer_type: 'arrival', transfer_mode: '', transfer_status: d.company_name ? 'confirmado' : '',
        city: '', date: d.date || '', time: d.time || '',
        origin_location: d.origin_location || '', destination_location: d.destination_location || '',
        company_name: d.company_name || '', reservation_code: '',
        flight_number: '', arrival_time: '', arrival_airport: '', arrival_terminal: '', driver_wait_time: '', reception_type: '', meeting_instructions: '',
        hotel_departure_time: '', departure_flight_time: '', departure_airport: '', recommended_departure: '', boarding_point: '', departure_alert: '',
        pickup_address: '', pickup_maps_url: '', destination_address: '', destination_maps_url: '', location_notes: '',
        driver_name: '', driver_phone: '', driver_language: '', vehicle_plate: '',
        vehicle_type: '', vehicle_capacity: '', luggage_capacity: '', air_conditioning: '', accessibility: '', vehicle_notes: '',
        passengers: [], adults_count: '', children_count: '',
        required_documents: '', emergency_contact: '', agency_contact: '', plan_b: '', agency_notes: '',
        location: '', notes: '',
      };
    case 'car_rental':
      return {
        rental_company: d.rental_company || '', reservation_code: d.reservation_code || '', reservation_status: 'confirmada',
        pickup_location: d.pickup_location || '', pickup_address: '', pickup_city: '', pickup_country: '',
        pickup_date: '', pickup_time: '', pickup_terminal: '', pickup_instructions: '', pickup_phone: '', pickup_maps_url: '',
        dropoff_location: d.dropoff_location || '', dropoff_address: '', dropoff_city: '', dropoff_country: '',
        dropoff_date: '', dropoff_time: '', dropoff_instructions: '', dropoff_late_policy: '',
        car_type: '', car_model: '', transmission: '', fuel_type: '', doors: '', passenger_capacity: '', luggage_capacity: '', plate: '', car_notes: '',
        basic_insurance: '', full_insurance: '', third_party_protection: '', theft_protection: '', damage_protection: '', deductible: '', insurance_coverage: '', insurance_notes: '',
        deposit_amount: '', deposit_method: '', card_in_driver_name: '', payment_method: '', payment_status: '',
        drivers: [], additional_driver_fee: '',
        fuel_policy: '', fuel_rules: '', fuel_penalty: '', fuel_notes: '',
        required_documents: '', minimum_age: '', international_permit: '', traffic_rules: '', emergency_contact: '', agency_contact: '',
        notes: '',
      };
    case 'insurance':
      return {
        provider: d.provider || '', plan_name: '', policy_number: d.policy_number || '',
        destination_covered: '', coverage_type: '', start_date: d.start_date || '', end_date: d.end_date || '', status: 'ativo',
        medical_assistance: '', hospital_expenses: '', lost_baggage: '', trip_cancellation: '', trip_interruption: '',
        dental_assistance: '', medical_repatriation: '', covid_coverage: '', coverage: '',
        emergency_phone: '', emergency_whatsapp: '', emergency_email: '', emergency_24h: '', emergency_languages: '', insurer_website: '',
        how_to_activate: '', required_documents_claim: '', hospital_procedure: '', reimbursement_info: '',
        insured_persons: [], trip_purpose: '', special_activities: '', coverage_observations: '',
        agency_tips: '', agency_notes: '', agency_contact: '', emergency_contact_agency: '', notes: '',
      };
    case 'cruise':
      return {
        cruise_company: d.cruise_company || '', ship_name: d.ship_name || '', route: d.route || '',
        embarkation_port: d.embarkation_port || '', disembarkation_port: d.disembarkation_port || '',
        start_date: '', end_date: '', booking_number: '',
        cabin_type: '', cabin_number: '', cabin_category: '', deck: '', occupancy: '', meal_plan: '',
        passengers: [], itinerary: [],
        checkin_url: '', checkin_status: '', checkin_deadline: '',
        boarding_terminal: '', port_address: '', port_maps_url: '', recommended_arrival: '', required_documents: '', baggage_policy: '', dress_code: '', company_rules: '', boarding_notes: '',
        onboard_currency: '', onboard_language: '', voltage: '', ship_website: '',
      };
    case 'train':
      return {
        origin_city: '', origin_station: d.origin_station || '', destination_city: '', destination_station: d.destination_station || '',
        travel_date: '', departure_time: d.departure_time || '', arrival_time: '',
        train_company: d.train_company || '', train_number: d.train_number || '',
        travel_class: '', coach: '', seat: '', platform: '',
        passengers: [], boarding_notes: '', origin_maps_url: '', destination_maps_url: '',
      };
    case 'attraction':
      return {
        name: d.name || '', attraction_type: '', city: d.city || '', country: '', date: d.date || '',
        status: '', quantity: 1, entry_time: d.entry_time || '', usage_window: '', duration: '', access_type: '', requires_reservation: '', usage_instructions: '',
        ticket_code: '', confirmation_code: '', order_number: '',
        address: '', venue_name: '', maps_url: '', entry_point: '',
        passengers: [],
        cancellation_policy: '', change_policy: '', attraction_rules: '', prohibited_items: '', dress_code: '', required_documents: '',
        agency_tips: '', attraction_contact: '', operator_contact: '', agency_contact: '', emergency_contact: '', agency_notes: '', notes: '',
      };
    default:
      return { service_name: '', notes: '' };
  }
}

function ServiceSummaryItem({ service }: { service: DetectedService }) {
  const label = SERVICE_LABELS[service.type] || service.type;
  const icon = SERVICE_ICONS[service.type] || <FileText className="h-4 w-4" />;
  const d = service.data;

  let detail = '';
  switch (service.type) {
    case 'flight':
      detail = [d.flight_number, d.origin_airport && d.destination_airport ? `${d.origin_airport} → ${d.destination_airport}` : '', d.departure_time].filter(Boolean).join(' • ');
      break;
    case 'hotel':
      detail = [d.hotel_name, d.check_in && d.check_out ? `${d.check_in} → ${d.check_out}` : ''].filter(Boolean).join(' • ');
      break;
    case 'transfer':
      detail = [d.origin_location && d.destination_location ? `${d.origin_location} → ${d.destination_location}` : '', d.time].filter(Boolean).join(' • ');
      break;
    case 'car_rental':
      detail = [d.rental_company, d.pickup_location].filter(Boolean).join(' • ');
      break;
    case 'insurance':
      detail = [d.provider, d.policy_number].filter(Boolean).join(' • ');
      break;
    case 'cruise':
      detail = [d.cruise_company, d.ship_name].filter(Boolean).join(' • ');
      break;
    case 'train':
      detail = [d.train_company, d.origin_station && d.destination_station ? `${d.origin_station} → ${d.destination_station}` : ''].filter(Boolean).join(' • ');
      break;
    case 'attraction':
      detail = [d.name, d.city].filter(Boolean).join(' • ');
      break;
  }

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
      <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm">{label}</div>
        {detail && <div className="text-xs text-muted-foreground truncate">{detail}</div>}
      </div>
      <Badge variant="secondary" className="text-xs">
        {Math.round(service.confidence * 100)}%
      </Badge>
    </div>
  );
}

interface TravelImporterProps {
  onImportServices: (services: { service_type: TripServiceType; service_data: any }[]) => void;
  isImporting?: boolean;
}

export function TravelImporter({ onImportServices, isImporting }: TravelImporterProps) {
  const [text, setText] = useState('');
  const [isDetecting, setIsDetecting] = useState(false);
  const [detected, setDetected] = useState<DetectedService[] | null>(null);
  const { toast } = useToast();

  const handleDetect = async () => {
    if (!text.trim() || text.trim().length < 10) {
      toast({ title: "Texto muito curto", description: "Cole um texto de confirmação de viagem com pelo menos 10 caracteres.", variant: "destructive" });
      return;
    }

    setIsDetecting(true);
    setDetected(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: "Não autenticado", variant: "destructive" });
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/travel-import`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ text: text.trim() }),
        }
      );

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Erro ao processar texto');

      if (!result.services || result.services.length === 0) {
        toast({ title: "Nenhum serviço detectado", description: "Não foi possível identificar serviços de viagem no texto. Verifique o conteúdo ou insira manualmente.", variant: "destructive" });
        return;
      }

      setDetected(result.services);
    } catch (err: any) {
      toast({ title: "Erro ao detectar serviços", description: err.message, variant: "destructive" });
    } finally {
      setIsDetecting(false);
    }
  };

  const handleConfirmImport = () => {
    if (!detected) return;

    const mapped = detected
      .map(s => {
        const serviceType = SERVICE_TYPE_MAP[s.type];
        if (!serviceType) return null;
        return {
          service_type: serviceType,
          service_data: buildServiceData(s),
        };
      })
      .filter(Boolean) as { service_type: TripServiceType; service_data: any }[];

    onImportServices(mapped);
    setDetected(null);
    setText('');
  };

  const handleCancel = () => {
    setDetected(null);
  };

  // Count by type
  const typeCounts = detected?.reduce((acc, s) => {
    acc[s.type] = (acc[s.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          ✈ Importar Viagem Automaticamente
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Cole qualquer confirmação de viagem: e-ticket, voucher de hotel, apólice de seguro, voucher de transfer, confirmação de tour, itinerário completo por e-mail.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {!detected ? (
          <>
            <Textarea
              placeholder="Cole aqui a confirmação de viagem, e-ticket, voucher ou itinerário completo..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="min-h-[120px] resize-y"
              disabled={isDetecting}
            />
            <Button
              onClick={handleDetect}
              disabled={isDetecting || !text.trim()}
              className="w-full"
            >
              {isDetecting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Detectando serviços...</>
              ) : (
                <><Sparkles className="mr-2 h-4 w-4" /> Detectar Serviços de Viagem</>
              )}
            </Button>
          </>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <Check className="h-4 w-4" />
              Serviços de viagem detectados:
            </div>

            {/* Summary badges */}
            <div className="flex flex-wrap gap-2">
              {typeCounts && Object.entries(typeCounts).map(([type, count]) => (
                <Badge key={type} variant="outline" className="gap-1.5">
                  {SERVICE_ICONS[type]}
                  {count} {SERVICE_LABELS[type] || type}
                </Badge>
              ))}
            </div>

            {/* Detail list */}
            <div className="space-y-2">
              {detected.map((service, i) => (
                <ServiceSummaryItem key={i} service={service} />
              ))}
            </div>

            <div className="flex gap-2">
              <Button onClick={handleConfirmImport} disabled={isImporting} className="flex-1">
                {isImporting ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Importando...</>
                ) : (
                  <><Check className="mr-2 h-4 w-4" /> Confirmar e Importar</>
                )}
              </Button>
              <Button variant="outline" onClick={handleCancel} disabled={isImporting}>
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
