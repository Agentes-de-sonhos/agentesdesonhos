import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Trip, TripService, TripServiceType } from "@/types/trip";
import type { AgentProfile } from "@/hooks/useAgentProfile";

const SERVICE_LABELS: Record<TripServiceType, string> = {
  flight: "Passagem Aérea",
  hotel: "Hospedagem",
  car_rental: "Locação de Veículo",
  transfer: "Transfer",
  attraction: "Ingressos/Atrações",
  insurance: "Seguro Viagem",
  cruise: "Cruzeiro",
  train: "Trem",
  other: "Outros",
};

function formatDate(dateStr: string) {
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    return format(new Date(y, m - 1, d), "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return dateStr;
  }
}

function getServiceDetails(service: TripService): string[] {
  const data = service.service_data as any;
  const details: string[] = [];
  
  switch (service.service_type) {
    case "flight":
      details.push(`${data.origin_city || ''} → ${data.destination_city || ''}`);
      details.push(`Companhia: ${data.main_airline || data.airline || ''}`);
      if (data.locator_code) details.push(`Localizador: ${data.locator_code}`);
      if (data.trip_type) {
        const types: Record<string, string> = { ida: 'Somente Ida', ida_volta: 'Ida e Volta', multi_trechos: 'Multi-trechos' };
        details.push(`Tipo: ${types[data.trip_type] || data.trip_type}`);
      }
      if (data.segments?.length > 0) {
        details.push(`--- Trechos ---`);
        data.segments.forEach((seg: any, i: number) => {
          const segType = seg.segment_type === 'ida' ? 'Ida' : seg.segment_type === 'conexao' ? 'Conexão' : 'Volta';
          details.push(`${segType}: ${seg.origin_airport || seg.origin_city} → ${seg.destination_airport || seg.destination_city} • ${seg.flight_date ? formatDate(seg.flight_date) : ''} ${seg.departure_time || ''} → ${seg.arrival_time || ''} • ${seg.airline || ''} ${seg.flight_number || ''}`);
        });
      } else {
        details.push(`Ida: ${formatDate(data.departure_date)} | Volta: ${formatDate(data.return_date)}`);
      }
      if (data.passengers?.length > 0) details.push(`Passageiros: ${data.passengers.map((p: any) => p.name).join(', ')}`);
      if (data.carry_on || data.checked_baggage) details.push(`Bagagem: ${data.carry_on ? `Mão: ${data.carry_on}` : ''} ${data.checked_baggage ? `Despachada: ${data.checked_baggage}` : ''}`);
      if (data.recommended_arrival) details.push(`Antecedência: ${data.recommended_arrival}`);
      if (data.required_documents) details.push(`Documentos: ${data.required_documents}`);
      if (data.boarding_notes || data.notes) details.push(`Obs: ${data.boarding_notes || data.notes}`);
      break;
    case "hotel":
      details.push(`${data.hotel_name} - ${data.city}`);
      details.push(`Check-in: ${formatDate(data.check_in)} | Check-out: ${formatDate(data.check_out)}`);
      if (data.notes) details.push(`Obs: ${data.notes}`);
      break;
    case "car_rental":
      if (data.rental_company) details.push(`Locadora: ${data.rental_company}`);
      if (data.reservation_code) details.push(`Reserva: ${data.reservation_code}`);
      const catLabels: Record<string, string> = { economico: 'Econômico', compacto: 'Compacto', intermediario: 'Intermediário', suv: 'SUV', premium: 'Premium', luxo: 'Luxo', van: 'Van' };
      details.push(`Categoria: ${catLabels[data.car_type] || data.car_type || ''}`);
      if (data.car_model) details.push(`Modelo: ${data.car_model}`);
      if (data.transmission) details.push(`Transmissão: ${data.transmission === 'automatico' ? 'Automático' : 'Manual'}`);
      details.push(`Retirada: ${data.pickup_location || ''}${data.pickup_date ? ` • ${formatDate(data.pickup_date)}` : ''}${data.pickup_time ? ` às ${data.pickup_time}` : ''}`);
      details.push(`Devolução: ${data.dropoff_location || ''}${data.dropoff_date ? ` • ${formatDate(data.dropoff_date)}` : ''}${data.dropoff_time ? ` às ${data.dropoff_time}` : ''}`);
      if (data.drivers?.length > 0) details.push(`Condutores: ${data.drivers.map((d: any) => d.name).join(', ')}`);
      if (data.fuel_policy) {
        const fuelLabels: Record<string, string> = { cheio_cheio: 'Cheio-Cheio', cheio_vazio: 'Cheio-Vazio', outro: 'Outro' };
        details.push(`Combustível: ${fuelLabels[data.fuel_policy] || data.fuel_policy}`);
      }
      if (data.deposit_amount) details.push(`Caução: ${data.deposit_amount}`);
      if (data.required_documents) details.push(`Documentos: ${data.required_documents}`);
      if (data.notes) details.push(`Obs: ${data.notes}`);
      break;
      break;
    case "transfer":
      details.push(`Tipo: ${data.transfer_type === "arrival" ? "Chegada" : "Saída"}`);
      details.push(`Local: ${data.location}`);
      details.push(`Data: ${formatDate(data.date)}`);
      break;
    case "attraction":
      details.push(`${data.name}`);
      details.push(`Data: ${formatDate(data.date)} | Quantidade: ${data.quantity}`);
      break;
    case "insurance":
      details.push(`Seguradora: ${data.provider}`);
      details.push(`Período: ${formatDate(data.start_date)} a ${formatDate(data.end_date)}`);
      details.push(`Cobertura: ${data.coverage}`);
      break;
    case "cruise":
      if (data.cruise_company) details.push(`Companhia: ${data.cruise_company}`);
      details.push(`Navio: ${data.ship_name}`);
      details.push(`Rota: ${data.route}`);
      if (data.embarkation_port) details.push(`Embarque: ${data.embarkation_port}`);
      if (data.disembarkation_port) details.push(`Desembarque: ${data.disembarkation_port}`);
      details.push(`Período: ${formatDate(data.start_date)} a ${formatDate(data.end_date)}`);
      if (data.booking_number) details.push(`Reserva: ${data.booking_number}`);
      if (data.cabin_type) details.push(`Cabine: ${data.cabin_type}${data.cabin_number ? ` #${data.cabin_number}` : ''}`);
      if (data.deck) details.push(`Deck: ${data.deck}`);
      if (data.occupancy) details.push(`Ocupação: ${data.occupancy}`);
      if (data.passengers?.length > 0) details.push(`Passageiros: ${data.passengers.map((p: any) => p.name).join(', ')}`);
      if (data.itinerary?.length > 0) {
        details.push(`--- Roteiro ---`);
        data.itinerary.forEach((stop: any) => {
          details.push(`${stop.date ? stop.date + ' – ' : ''}${stop.port} (${stop.stop_type})${stop.arrival_time ? ' ' + stop.arrival_time : ''}${stop.departure_time ? ' – ' + stop.departure_time : ''}`);
        });
      }
      if (data.boarding_terminal) details.push(`Terminal: ${data.boarding_terminal}`);
      if (data.recommended_arrival) details.push(`Chegada recomendada: ${data.recommended_arrival}`);
      if (data.required_documents) details.push(`Documentos: ${data.required_documents}`);
      if (data.boarding_notes) details.push(`Orientações: ${data.boarding_notes}`);
      break;
    case "train":
      details.push(`🚆 ${data.origin_city} → ${data.destination_city}`);
      if (data.travel_date) details.push(`Data: ${formatDate(data.travel_date)}${data.departure_time ? ` • ${data.departure_time} → ${data.arrival_time || ''}` : ''}`);
      if (data.train_company) details.push(`Companhia: ${data.train_company}${data.train_number ? ` • Trem ${data.train_number}` : ''}`);
      if (data.travel_class) details.push(`Classe: ${data.travel_class}`);
      if (data.coach || data.seat) details.push(`${data.coach ? `Vagão ${data.coach}` : ''}${data.seat ? ` • Assento ${data.seat}` : ''}`);
      if (data.origin_station) details.push(`Embarque: ${data.origin_station}`);
      if (data.destination_station) details.push(`Desembarque: ${data.destination_station}`);
      if (data.passengers?.length > 0) details.push(`Passageiros: ${data.passengers.map((p: any) => p.name).join(', ')}`);
      if (data.boarding_notes) details.push(`Orientações: ${data.boarding_notes}`);
      break;
    case "other":
      details.push(data.description);
      break;
  }
  
  return details;
}

function generateAgencyHeader(profile: AgentProfile | null): string {
  if (!profile?.agency_logo_url) {
    return `
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="font-size: 24px; color: #0f766e; margin: 0;">
          ${profile?.agency_name || '🧳 Carteira Digital'}
        </h1>
      </div>
    `;
  }
  
  return `
    <div style="text-align: center; margin-bottom: 32px;">
      <img 
        src="${profile.agency_logo_url}" 
        alt="${profile.agency_name || 'Logo'}"
        style="max-height: 80px; max-width: 200px; object-fit: contain; margin: 0 auto;"
      />
    </div>
  `;
}

function generateAgentSignature(profile: AgentProfile | null): string {
  if (!profile) {
    return `
      <div style="text-align: center; padding-top: 24px; border-top: 1px solid #e2e8f0;">
        <p style="font-size: 12px; color: #64748b;">
          Agentes de Sonhos • Sua viagem começa aqui
        </p>
      </div>
    `;
  }

  const avatarHtml = profile.avatar_url
    ? `<img src="${profile.avatar_url}" alt="${profile.name}" style="width: 48px; height: 48px; border-radius: 50%; object-fit: cover; margin-right: 12px;" />`
    : `<div style="width: 48px; height: 48px; border-radius: 50%; background: linear-gradient(135deg, #0f766e, #14b8a6); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 18px; margin-right: 12px;">${profile.name.charAt(0).toUpperCase()}</div>`;

  return `
    <div style="padding-top: 24px; border-top: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: center;">
      ${avatarHtml}
      <div style="text-align: left;">
        <p style="font-weight: 600; font-size: 14px; color: #1e293b; margin: 0;">${profile.name}</p>
        ${profile.phone ? `<p style="font-size: 12px; color: #64748b; margin: 2px 0 0 0;">📱 ${profile.phone}</p>` : ''}
        ${profile.agency_name ? `<p style="font-size: 12px; color: #64748b; margin: 2px 0 0 0;">${profile.agency_name}</p>` : ''}
      </div>
    </div>
  `;
}

export function generateTripPDF(trip: Trip, profile?: AgentProfile | null) {
  const parseLocal = (d: string) => { const [y,m,day] = d.split('-').map(Number); return new Date(y, m-1, day); };
  const startDate = parseLocal(trip.start_date);
  const endDate = parseLocal(trip.end_date);
  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  // Group services by type
  const grouped = (trip.services || []).reduce((acc, service) => {
    const type = service.service_type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(service);
    return acc;
  }, {} as Record<string, TripService[]>);

  const servicesHtml = Object.entries(grouped).map(([type, services]) => {
    const label = SERVICE_LABELS[type as TripServiceType] || "Serviço";
    
    const servicesItems = services.map((service) => {
      const details = getServiceDetails(service);
      const voucherLink = service.voucher_url 
        ? `<a href="${service.voucher_url}" target="_blank" style="color: #0f766e; text-decoration: none; font-size: 12px;">📎 ${service.voucher_name || 'Ver documento'}</a>` 
        : '';
      
      return `
        <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 8px; background: white;">
          <div style="margin-bottom: 4px;">
            ${details.map((d) => `<p style="margin: 2px 0; font-size: 13px; color: #475569;">${d}</p>`).join("")}
          </div>
          ${voucherLink}
        </div>
      `;
    }).join("");
    
    return `
      <div style="margin-bottom: 24px;">
        <h3 style="font-size: 14px; font-weight: 600; color: #0f766e; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px;">
          ${label}
        </h3>
        ${servicesItems}
      </div>
    `;
  }).join("");

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Carteira Digital - ${trip.client_name}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
          color: #1e293b;
          line-height: 1.5;
          background: #f8fafc;
        }
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: white; }
        }
      </style>
    </head>
    <body>
      <div style="max-width: 800px; margin: 0 auto; padding: 40px;">
        <!-- Agency Logo/Header -->
        ${generateAgencyHeader(profile || null)}

        <!-- Header -->
        <div style="text-align: center; margin-bottom: 40px;">
          <h1 style="font-size: 32px; color: #0f766e; margin-bottom: 8px;">
            🧳 Carteira Digital
          </h1>
          <p style="color: #64748b; font-size: 14px;">
            Organizador de Viagem
          </p>
        </div>

        <!-- Client Info -->
        <div style="background: linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%); border-radius: 16px; padding: 24px; margin-bottom: 32px;">
          <h2 style="font-size: 24px; margin-bottom: 16px; color: #0f766e;">
            ${trip.client_name}
          </h2>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;">
            <div>
              <span style="color: #64748b; font-size: 12px; text-transform: uppercase;">Destino</span>
              <p style="font-weight: 600; font-size: 16px;">${trip.destination}</p>
            </div>
            <div>
              <span style="color: #64748b; font-size: 12px; text-transform: uppercase;">Período</span>
              <p style="font-weight: 600; font-size: 16px;">
                ${formatDate(trip.start_date)} - ${formatDate(trip.end_date)}
              </p>
            </div>
            <div>
              <span style="color: #64748b; font-size: 12px; text-transform: uppercase;">Duração</span>
              <p style="font-weight: 600; font-size: 16px;">${days} dias</p>
            </div>
          </div>
        </div>

        <!-- Services -->
        <h3 style="font-size: 20px; margin-bottom: 20px; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0;">
          Serviços da Viagem
        </h3>
        
        ${servicesHtml || '<p style="text-align: center; color: #64748b; padding: 24px;">Nenhum serviço adicionado</p>'}

        <!-- Footer -->
        <div style="margin-top: 40px;">
          <p style="text-align: center; font-size: 12px; color: #64748b; margin-bottom: 16px;">
            Gerado em ${format(new Date(), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
          </p>
          
          <!-- Agent Signature -->
          ${generateAgentSignature(profile || null)}
        </div>
      </div>
    </body>
    </html>
  `;

  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  }
}
