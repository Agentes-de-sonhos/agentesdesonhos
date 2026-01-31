import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Quote, QuoteService, ServiceType } from "@/types/quote";
import type { AgentProfile } from "@/hooks/useAgentProfile";

const SERVICE_LABELS: Record<ServiceType, string> = {
  flight: "Passagem Aérea",
  hotel: "Hospedagem",
  car_rental: "Locação de Veículo",
  transfer: "Transfer",
  attraction: "Ingressos/Atrações",
  insurance: "Seguro Viagem",
  cruise: "Cruzeiro",
  other: "Outros Serviços",
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatDate(dateStr: string) {
  try {
    return format(new Date(dateStr), "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return dateStr;
  }
}

function getServiceDetails(service: QuoteService): string[] {
  const data = service.service_data as any;
  const details: string[] = [];
  
  switch (service.service_type) {
    case "flight":
      details.push(`${data.origin_city} → ${data.destination_city}`);
      details.push(`Companhia: ${data.airline}`);
      details.push(`Ida: ${formatDate(data.departure_date)} | Volta: ${formatDate(data.return_date)}`);
      if (data.includes_baggage) details.push("✓ Bagagem incluída");
      if (data.includes_boarding_fee) details.push("✓ Taxa de embarque incluída");
      if (data.notes) details.push(`Obs: ${data.notes}`);
      break;
    case "hotel":
      details.push(`${data.hotel_name} - ${data.city}`);
      details.push(`Check-in: ${formatDate(data.check_in)} | Check-out: ${formatDate(data.check_out)}`);
      details.push(`Quarto: ${data.room_type} | Regime: ${data.meal_plan}`);
      if (data.notes) details.push(`Obs: ${data.notes}`);
      break;
    case "car_rental":
      details.push(`Tipo: ${data.car_type} | ${data.days} diária(s)`);
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
      details.push(`Cabine: ${data.cabin_type}`);
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
          ${profile?.agency_name || 'Agentes de Sonhos'}
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
        <p style="font-size: 13px; color: #64748b;">
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

export function generateQuotePDF(quote: Quote, profile?: AgentProfile | null) {
  const startDate = new Date(quote.start_date);
  const endDate = new Date(quote.end_date);
  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  const servicesHtml = quote.services?.map((service) => {
    const label = SERVICE_LABELS[service.service_type as ServiceType] || "Serviço";
    const details = getServiceDetails(service);
    
    return `
      <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 12px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
          <div>
            <span style="background: #f1f5f9; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; text-transform: uppercase; color: #64748b;">
              ${label}
            </span>
          </div>
          <span style="font-weight: 600; color: #0f766e; font-size: 16px;">
            ${formatCurrency(service.amount)}
          </span>
        </div>
        <div style="margin-top: 8px;">
          ${details.map((d) => `<p style="margin: 4px 0; font-size: 13px; color: #475569;">${d}</p>`).join("")}
        </div>
      </div>
    `;
  }).join("") || "";

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Orçamento - ${quote.client_name}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
          color: #1e293b;
          line-height: 1.5;
        }
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      </style>
    </head>
    <body>
      <div style="max-width: 800px; margin: 0 auto; padding: 40px;">
        <!-- Agency Logo/Header -->
        ${generateAgencyHeader(profile || null)}

        <!-- Header -->
        <div style="text-align: center; margin-bottom: 40px;">
          <h1 style="font-size: 28px; color: #0f766e; margin-bottom: 8px;">
            Orçamento de Viagem
          </h1>
          <p style="color: #64748b;">
            Gerado em ${format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>

        <!-- Client Info -->
        <div style="background: linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%); border-radius: 12px; padding: 24px; margin-bottom: 32px;">
          <h2 style="font-size: 20px; margin-bottom: 16px; color: #0f766e;">
            ${quote.client_name}
          </h2>
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;">
            <div>
              <span style="color: #64748b; font-size: 13px;">Destino</span>
              <p style="font-weight: 600;">${quote.destination}</p>
            </div>
            <div>
              <span style="color: #64748b; font-size: 13px;">Viajantes</span>
              <p style="font-weight: 600;">
                ${quote.adults_count} adulto(s)${quote.children_count > 0 ? `, ${quote.children_count} criança(s)` : ""}
              </p>
            </div>
            <div>
              <span style="color: #64748b; font-size: 13px;">Período</span>
              <p style="font-weight: 600;">
                ${formatDate(quote.start_date)} a ${formatDate(quote.end_date)}
              </p>
            </div>
            <div>
              <span style="color: #64748b; font-size: 13px;">Duração</span>
              <p style="font-weight: 600;">${days} dias</p>
            </div>
          </div>
        </div>

        <!-- Services -->
        <h3 style="font-size: 18px; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0;">
          Serviços Incluídos
        </h3>
        
        <div style="margin-bottom: 32px;">
          ${servicesHtml || '<p style="text-align: center; color: #64748b; padding: 24px;">Nenhum serviço adicionado</p>'}
        </div>

        <!-- Total -->
        <div style="background: #0f766e; color: white; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 40px;">
          <p style="font-size: 14px; opacity: 0.9; margin-bottom: 8px;">Total Geral</p>
          <p style="font-size: 36px; font-weight: 700;">
            ${formatCurrency(quote.total_amount)}
          </p>
        </div>

        <!-- Validity Notice -->
        <div style="text-align: center; margin-bottom: 32px;">
          <p style="font-size: 13px; color: #64748b;">
            Este orçamento é válido por 7 dias. Valores sujeitos a alteração conforme disponibilidade.
          </p>
        </div>

        <!-- Agent Signature -->
        ${generateAgentSignature(profile || null)}
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
