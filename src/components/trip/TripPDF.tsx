import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Trip, TripService, TripServiceType } from "@/types/trip";

const SERVICE_LABELS: Record<TripServiceType, string> = {
  flight: "Passagem Aérea",
  hotel: "Hospedagem",
  car_rental: "Locação de Veículo",
  transfer: "Transfer",
  attraction: "Ingressos/Atrações",
  insurance: "Seguro Viagem",
  cruise: "Cruzeiro",
  other: "Outros",
};

function formatDate(dateStr: string) {
  try {
    return format(new Date(dateStr), "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return dateStr;
  }
}

function getServiceDetails(service: TripService): string[] {
  const data = service.service_data as any;
  const details: string[] = [];
  
  switch (service.service_type) {
    case "flight":
      details.push(`${data.origin_city} → ${data.destination_city}`);
      details.push(`Companhia: ${data.airline}`);
      details.push(`Ida: ${formatDate(data.departure_date)} | Volta: ${formatDate(data.return_date)}`);
      if (data.notes) details.push(`Obs: ${data.notes}`);
      break;
    case "hotel":
      details.push(`${data.hotel_name} - ${data.city}`);
      details.push(`Check-in: ${formatDate(data.check_in)} | Check-out: ${formatDate(data.check_out)}`);
      if (data.notes) details.push(`Obs: ${data.notes}`);
      break;
    case "car_rental":
      details.push(`Tipo: ${data.car_type}`);
      details.push(`Retirada: ${data.pickup_location}`);
      details.push(`Devolução: ${data.dropoff_location}`);
      if (data.notes) details.push(`Obs: ${data.notes}`);
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
      details.push(`Navio: ${data.ship_name}`);
      details.push(`Rota: ${data.route}`);
      details.push(`Período: ${formatDate(data.start_date)} a ${formatDate(data.end_date)}`);
      break;
    case "other":
      details.push(data.description);
      break;
  }
  
  return details;
}

export function generateTripPDF(trip: Trip) {
  const startDate = new Date(trip.start_date);
  const endDate = new Date(trip.end_date);
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
      <title>Trip Wallet - ${trip.client_name}</title>
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
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 40px;">
          <h1 style="font-size: 32px; color: #0f766e; margin-bottom: 8px;">
            🧳 Trip Wallet
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
        <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid #e2e8f0; text-align: center;">
          <p style="font-size: 12px; color: #64748b;">
            Gerado em ${format(new Date(), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
          </p>
          <p style="font-size: 12px; color: #64748b; margin-top: 4px;">
            Agentes de Sonhos • Sua viagem começa aqui
          </p>
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
