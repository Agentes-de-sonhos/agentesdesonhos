import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Quote, QuoteService, ServiceType } from "@/types/quote";
import type { AgentProfile } from "@/hooks/useAgentProfile";
import { formatQuoteCurrency, getQuoteCurrencyInfo, getCurrencySymbol, type QuoteCurrency } from "@/lib/quoteCurrency";
import { extractServicePaymentConfig, getServicePaymentDisplay } from "@/lib/servicePayment";

const SERVICE_LABELS: Record<ServiceType, string> = {
  flight: "Passagem Aérea",
  hotel: "Hospedagem",
  car_rental: "Locação de Veículo",
  transfer: "Transfer",
  attraction: "Ingressos/Atrações",
  insurance: "Seguro Viagem",
  cruise: "Cruzeiro",
  circuit: "Circuitos",
  other: "Outros Serviços",
};

function getServiceLabel(service: QuoteService): string {
  if (service.service_type === "other") {
    const customTitle = (service.service_data as any)?.custom_title?.trim();
    if (customTitle) return customTitle;
  }
  return SERVICE_LABELS[service.service_type as ServiceType] || "Serviço";
}

const SERVICE_EMOJI: Record<ServiceType, string> = {
  flight: "✈️",
  hotel: "🏨",
  car_rental: "🚗",
  transfer: "🚐",
  attraction: "🎟️",
  insurance: "🛡️",
  cruise: "🚢",
  circuit: "🗺️",
  other: "📦",
};

function formatLabel(value: string) {
  if (!value) return value;
  return value.replace(/_/g, " ").replace(/^\w/, c => c.toUpperCase());
}

function parseLocalDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatDate(dateStr: string) {
  try {
    return format(parseLocalDate(dateStr), "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return dateStr;
  }
}

function getServiceDetails(service: QuoteService): string[] {
  const data = service.service_data as any;
  const details: string[] = [];
  switch (service.service_type) {
    case "flight":
      if (data.return_date && !data.is_one_way) {
        details.push(`Ida: ${formatDate(data.departure_date)} | Volta: ${formatDate(data.return_date)}`);
      } else {
        details.push(`Ida: ${formatDate(data.departure_date)} (somente ida)`);
      }
      // Multi-leg support (backward compat)
      const outLegs = data.outbound_legs?.length ? data.outbound_legs : data.outbound_detail ? [data.outbound_detail] : [];
      const retLegs = data.return_legs?.length ? data.return_legs : data.return_detail ? [data.return_detail] : [];
      outLegs.forEach((ob: any, i: number) => {
        const parts: string[] = [];
        if (ob.leg_date) parts.push(formatDate(ob.leg_date));
        if (ob.flight_number) parts.push(`Voo ${ob.flight_number}`);
        if (ob.airport_origin && ob.airport_destination) parts.push(`${ob.airport_origin} → ${ob.airport_destination}`);
        if (ob.departure_time) parts.push(`Saída ${ob.departure_time}`);
        if (ob.arrival_time) parts.push(`Chegada ${ob.arrival_time}`);
        const label = outLegs.length > 1 ? `✈ Ida (trecho ${i + 1})` : `✈ Ida`;
        if (parts.length) details.push(`${label}: ${parts.join(" | ")}`);
      });
      retLegs.forEach((rt: any, i: number) => {
        const parts: string[] = [];
        if (rt.leg_date) parts.push(formatDate(rt.leg_date));
        if (rt.flight_number) parts.push(`Voo ${rt.flight_number}`);
        if (rt.airport_origin && rt.airport_destination) parts.push(`${rt.airport_origin} → ${rt.airport_destination}`);
        if (rt.departure_time) parts.push(`Saída ${rt.departure_time}`);
        if (rt.arrival_time) parts.push(`Chegada ${rt.arrival_time}`);
        const label = retLegs.length > 1 ? `✈ Volta (trecho ${i + 1})` : `✈ Volta`;
        if (parts.length) details.push(`${label}: ${parts.join(" | ")}`);
      });
      if (data.includes_baggage) details.push("✓ Bagagem incluída");
      if (data.includes_boarding_fee) details.push("✓ Taxa de embarque incluída");
      if (data.notes) details.push(data.notes);
      break;
    case "hotel":
      details.push(`${data.hotel_name} — ${data.city}`);
      details.push(`Check-in: ${formatDate(data.check_in)} | Check-out: ${formatDate(data.check_out)}`);
      details.push(`Quarto: ${formatLabel(data.room_type)} | Regime: ${formatLabel(data.meal_plan)}`);
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
      details.push([data.product_name, data.ticket_type].filter(Boolean).join(" | ") || data.name);
      details.push(`Data: ${formatDate(data.date)} | Quantidade: ${data.quantity || 1}`);
      if (data.adult_price > 0) details.push(`Adulto: ${Number(data.adult_price).toFixed(2)}`);
      if (data.child_price > 0) details.push(`Criança: ${Number(data.child_price).toFixed(2)}`);
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
    case "circuit":
      if (data.circuit_name) details.push(`Circuito: ${data.circuit_name}`);
      if (data.duration) details.push(`Duração: ${data.duration}`);
      if (data.itinerary) details.push(data.itinerary);
      if (data.notes) details.push(`Obs: ${data.notes}`);
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
      <div style="text-align:center;padding:24px 0 20px;border-bottom:2px solid #f1f5f9;">
        <p style="font-size:20px;font-weight:700;color:#0f766e;margin:0;letter-spacing:-0.3px;">
          ${profile?.agency_name || "Agentes de Sonhos"}
        </p>
      </div>
    `;
  }
  return `
    <div style="text-align:center;padding:24px 0 20px;border-bottom:2px solid #f1f5f9;">
      <img src="${profile.agency_logo_url}" alt="${profile.agency_name || "Logo"}"
        style="max-height:60px;max-width:200px;object-fit:contain;" />
    </div>
  `;
}

function generateAgentSignature(profile: AgentProfile | null): string {
  if (!profile) {
    return `
      <div class="pdf-block agent-signature" style="text-align:center;padding:20px 0;border-top:2px solid #f1f5f9;margin-top:28px;">
        <p style="font-size:13px;color:#94a3b8;">Agentes de Sonhos • Sua viagem começa aqui</p>
      </div>
    `;
  }

  const avatarHtml = profile.avatar_url
    ? `<img src="${profile.avatar_url}" alt="${profile.name}" style="width:64px;height:64px;border-radius:50%;object-fit:cover;border:3px solid #e2e8f0;" />`
    : `<div style="width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,#0f766e,#14b8a6);display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:24px;">${profile.name.charAt(0).toUpperCase()}</div>`;

  const whatsappNumber = profile.phone?.replace(/\D/g, "") || "";
  const whatsappLink = whatsappNumber
    ? `https://wa.me/${whatsappNumber.startsWith("55") ? whatsappNumber : `55${whatsappNumber}`}`
    : "";

  return `
    <div class="pdf-block agent-signature" style="margin-top:28px;padding:24px;border-top:2px solid #f1f5f9;text-align:center;">
      <div style="display:inline-block;">${avatarHtml}</div>
      <p style="font-size:16px;font-weight:700;color:#1e293b;margin:12px 0 2px;">${profile.name}</p>
      ${profile.agency_name ? `<p style="font-size:13px;color:#64748b;margin:0;">${profile.agency_name}</p>` : ""}
      ${profile.city || profile.state ? `<p style="font-size:12px;color:#94a3b8;margin:4px 0 0;">${[profile.city, profile.state].filter(Boolean).join(", ")}</p>` : ""}
      ${
        whatsappLink
          ? `<div style="margin-top:16px;">
              <a href="${whatsappLink}" target="_blank" style="display:inline-block;background:#25D366;color:white;padding:10px 28px;border-radius:50px;font-size:14px;font-weight:600;text-decoration:none;">
                💬 Falar com seu agente
              </a>
            </div>`
          : ""
      }
    </div>
  `;
}

export function generateQuotePDF(quote: Quote & Record<string, any>, profile?: AgentProfile | null) {
  const { currency } = getQuoteCurrencyInfo(quote);
  const formatCurrency = (v: number) => formatQuoteCurrency(v, currency);

  const startDate = parseLocalDate(quote.start_date);
  const endDate = parseLocalDate(quote.end_date);
  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  const useServicePayment = (quote as any).use_service_payment || 
    quote.services?.some((s: any) => s.is_custom_payment === true) || false;

  const servicesHtml =
    quote.services
      ?.map((service) => {
        const label = getServiceLabel(service);
        const emoji = SERVICE_EMOJI[service.service_type as ServiceType] || "📋";
        const details = getServiceDetails(service);
        const data = service.service_data as any;
        const notesText = service.service_type === "attraction" ? data?.notes : null;
        const descText = service.description || null;
        const allImages = [
          ...(service.image_urls || []),
          ...(service.image_url && !(service.image_urls || []).includes(service.image_url) ? [service.image_url] : []),
        ].slice(0, 6);
        const extraCount = ((service.image_urls || []).length + (service.image_url && !(service.image_urls || []).includes(service.image_url) ? 1 : 0)) - 6;

        const photosHtml = allImages.length > 0 ? `
          <div class="pdf-block pdf-gallery" style="padding-left:34px;margin:10px 0;display:grid;grid-template-columns:repeat(3,1fr);gap:8px;">
            ${allImages.map((url: string) => `<img src="${url}" style="width:100%;height:110px;object-fit:cover;border-radius:8px;border:1px solid #e2e8f0;" />`).join("")}
          </div>
          ${extraCount > 0 ? `<p style="padding-left:34px;font-size:11px;color:#94a3b8;margin:4px 0 8px;">+${extraCount} foto(s) disponíveis no link completo</p>` : ""}
        ` : "";

        // Per-service payment display
        let paymentHtml = "";
        if (useServicePayment) {
          const payConfig = extractServicePaymentConfig(service);
          if (payConfig.is_custom_payment) {
            const display = getServicePaymentDisplay(service.amount, payConfig);
            if (display) {
              paymentHtml = `
                <div class="pdf-block pdf-payment" style="padding-left:34px;margin-top:10px;padding-top:10px;border-top:1px solid #e2e8f0;">
                  <p style="font-size:13px;font-weight:600;color:#0f766e;">💳 ${display}</p>
                </div>
              `;
            }
          }
        }

        // Decompose service card into sub-blocks (safe break points).
        // Header is "keep with next"; gallery, details, notes, payment are independent
        // safe-break blocks. The wrapper is NOT break-inside:avoid (large cards
        // would otherwise push to next page leaving whitespace — this is the
        // exact bug we're fixing).
        const detailsHtml = details.length > 0 ? `
          <div class="pdf-block pdf-details" style="padding-left:34px;word-wrap:break-word;overflow-wrap:break-word;">
            ${details.map((d) => `<p style="margin:3px 0;font-size:13px;color:#475569;line-height:1.55;white-space:pre-wrap;word-break:break-word;">${d}</p>`).join("")}
          </div>
        ` : "";

        const descHtml = descText ? `
          <div class="pdf-block pdf-desc" style="padding-left:34px;margin-top:6px;word-wrap:break-word;overflow-wrap:break-word;">
            <p style="margin:3px 0;font-size:13px;color:#475569;line-height:1.55;white-space:pre-wrap;word-break:break-word;">${descText}</p>
          </div>
        ` : "";

        const notesHtml = notesText ? `
          <div class="pdf-block pdf-notes" style="padding-left:34px;margin-top:6px;">
            <p style="margin:3px 0;font-size:13px;color:#64748b;line-height:1.55;font-style:italic;border-left:2px solid rgba(15,118,110,0.2);padding-left:12px;white-space:pre-wrap;word-break:break-word;">${notesText}</p>
          </div>
        ` : "";

        return `
        <div class="pdf-card service-card" style="border:1px solid #e2e8f0;border-radius:12px;padding:18px 20px;margin-bottom:12px;">
          <div class="pdf-block pdf-header service-title" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;gap:12px;">
            <div style="display:flex;align-items:center;gap:8px;min-width:0;">
              <span style="font-size:18px;">${emoji}</span>
              <span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#64748b;">${label}</span>
            </div>
            <span style="font-size:18px;font-weight:700;color:#0f766e;white-space:nowrap;">${formatCurrency(service.amount)}</span>
          </div>
          ${photosHtml}
          ${detailsHtml}
          ${descHtml}
          ${notesHtml}
          ${paymentHtml}
        </div>
      `;
      })
      .join("") || "";

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Orçamento — ${quote.client_name}</title>
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family:'Segoe UI',system-ui,-apple-system,sans-serif; color:#1e293b; line-height:1.5; }
        img { max-width:100%; height:auto; }

        /* ----- SMART PAGINATION (briefing) -----
           Idea: do NOT wrap large cards in break-inside:avoid (that causes the
           giant whitespace bug). Instead, mark only SAFE atomic sub-blocks as
           unbreakable, and keep titles glued to what comes next.            */
        @media print {
          @page { size: A4; margin: 12mm; }
          html, body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            background: #fff !important;
          }
          .page-break { page-break-before: always; break-before: page; }

          /* Atomic sub-blocks — never split these in the middle */
          .pdf-block,
          .pdf-header,
          .pdf-gallery,
          .pdf-payment,
          .pdf-notes,
          .investment-card,
          .agent-signature,
          .overview-card,
          .payment-terms,
          img {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          /* Titles stay with the content that follows them */
          .pdf-title,
          .section-title,
          .service-title {
            break-after: avoid;
            page-break-after: avoid;
          }

          /* Service card wrapper is intentionally breakable so long cards
             flow naturally across pages instead of being pushed whole. */
          .pdf-card,
          .service-card,
          .pdf-details,
          .pdf-desc,
          .long-text {
            break-inside: auto;
            page-break-inside: auto;
          }

          /* Avoid orphan headings */
          h1, h2, h3 {
            break-after: avoid;
            page-break-after: avoid;
          }

          /* Avoid widow lines inside paragraphs */
          p { orphans: 3; widows: 3; }
        }
      </style>
    </head>
    <body>
      <div style="max-width:800px;margin:0 auto;padding:40px;">
        ${generateAgencyHeader(profile || null)}

        <!-- Hero -->
        <div class="pdf-block pdf-hero" style="text-align:center;padding:28px 0 24px;">
          <p style="font-size:11px;text-transform:uppercase;letter-spacing:3px;color:#0f766e;font-weight:600;margin-bottom:12px;">Proposta de Viagem</p>
          <h1 style="font-size:32px;font-weight:800;color:#1e293b;margin-bottom:8px;letter-spacing:-0.5px;">${quote.destination}</h1>
          <p style="font-size:15px;color:#64748b;">
            Preparado especialmente para <strong style="color:#1e293b;">${quote.client_name}</strong>
          </p>
        </div>

        <!-- Overview -->
        <div class="pdf-block overview-card" style="background:#f8fafc;border-radius:16px;padding:20px 22px;margin-bottom:28px;display:grid;grid-template-columns:repeat(3,1fr);gap:16px;">
          <div>
            <p style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Destino</p>
            <p style="font-size:14px;font-weight:600;">${quote.destination}</p>
          </div>
          <div>
            <p style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Período</p>
            <p style="font-size:14px;font-weight:600;">${formatDate(quote.start_date)} — ${formatDate(quote.end_date)}</p>
            <p style="font-size:12px;color:#94a3b8;">${days} dias</p>
          </div>
          <div>
            <p style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Viajantes</p>
            <p style="font-size:14px;font-weight:600;">${quote.adults_count} adulto${quote.adults_count > 1 ? "s" : ""}${quote.children_count > 0 ? ` + ${quote.children_count} criança${quote.children_count > 1 ? "s" : ""}` : ""}</p>
          </div>
        </div>

        <!-- Services -->
        <div style="margin-bottom:28px;">
          <h3 class="pdf-title section-title" style="font-size:16px;font-weight:700;margin-bottom:14px;padding-bottom:8px;border-bottom:2px solid #f1f5f9;">Serviços Incluídos</h3>
          ${servicesHtml || '<p style="text-align:center;color:#94a3b8;padding:32px;">Nenhum serviço adicionado</p>'}
        </div>

        <!-- Total -->
        ${(() => {
          const total = quote.services && quote.services.length > 0
            ? quote.services.reduce((sum: number, s: any) => sum + (Number(s.amount) || 0), 0)
            : quote.total_amount;
          const mode = quote.payment_display_mode || "full_payment";
          const installments = quote.installments_count || 10;
          const entryPct = quote.entry_percentage || 0;
          const discountPct = quote.full_payment_discount_percent || 0;
          const methodLabel = quote.payment_method_label || "";

          let paymentHtml = "";
          if (mode === "installments") {
            const iv = total / (installments || 1);
            paymentHtml = `
              <p style="font-size:13px;opacity:0.85;margin-bottom:8px;font-weight:500;">Investimento Total</p>
              <p style="font-size:22px;font-weight:700;opacity:0.9;">${installments}x de</p>
              <p style="font-size:40px;font-weight:800;letter-spacing:-1px;">${formatCurrency(iv)}</p>
              <p style="font-size:13px;opacity:0.7;margin-top:6px;">Total: ${formatCurrency(total)}${methodLabel ? ` • ${methodLabel}` : ""} • sem juros</p>
            `;
          } else if (mode === "installments_with_entry") {
            const entryValue = total * (entryPct / 100);
            const remainder = total - entryValue;
            const iv = remainder / (installments || 1);
            paymentHtml = `
              <p style="font-size:13px;opacity:0.85;margin-bottom:8px;font-weight:500;">Investimento Total</p>
              <p style="font-size:20px;font-weight:700;opacity:0.9;">Entrada de ${formatCurrency(entryValue)}</p>
              <p style="font-size:36px;font-weight:800;letter-spacing:-1px;">+ ${installments}x de ${formatCurrency(iv)}</p>
              <p style="font-size:13px;opacity:0.7;margin-top:6px;">Total: ${formatCurrency(total)}${methodLabel ? ` • ${methodLabel}` : ""}</p>
            `;
          } else {
            const discountedTotal = total * (1 - discountPct / 100);
            paymentHtml = `
              <p style="font-size:13px;opacity:0.85;margin-bottom:8px;font-weight:500;">Investimento Total</p>
              <p style="font-size:40px;font-weight:800;letter-spacing:-1px;">${formatCurrency(discountedTotal)}</p>
              ${discountPct > 0 ? `<p style="font-size:13px;opacity:0.7;margin-top:6px;text-decoration:line-through;">${formatCurrency(total)}</p><p style="font-size:13px;opacity:0.85;">🎉 ${discountPct}% de desconto${methodLabel ? ` via ${methodLabel}` : ""}</p>` : ""}
              ${discountPct === 0 && methodLabel ? `<p style="font-size:13px;opacity:0.7;margin-top:6px;">${methodLabel}</p>` : ""}
            `;
          }

          if (quote.show_investment_section === false) return '';

          return `
            <div class="pdf-block investment-card" style="background:linear-gradient(135deg,#0f766e 0%,#14b8a6 100%);color:white;border-radius:16px;padding:28px;text-align:center;margin-bottom:24px;">
              ${paymentHtml}
              ${quote.services && quote.services.length > 0 ? `<p style="font-size:13px;opacity:0.7;margin-top:6px;">${quote.services.length} serviço(s) incluído(s)</p>` : ""}
            </div>
          `;
        })()}

        <!-- Payment Terms -->
        ${quote.show_investment_section !== false && quote.payment_terms ? `
          <div class="pdf-block payment-terms" style="border:1px solid #e2e8f0;border-radius:12px;padding:18px 20px;margin-bottom:18px;">
            <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#64748b;margin-bottom:8px;">💳 Condições de Pagamento</p>
            <p style="font-size:13px;color:#475569;line-height:1.6;white-space:pre-wrap;">${quote.payment_terms}</p>
          </div>
        ` : ""}

        <!-- Validity -->
        <p style="text-align:center;font-size:12px;color:#94a3b8;margin-bottom:16px;">
          ${quote.valid_until ? `Proposta válida até ${formatDate(quote.valid_until)}` : "Este orçamento é válido por 7 dias."}
          ${quote.validity_disclaimer ? `<br/>${quote.validity_disclaimer}` : " Valores sujeitos a alteração conforme disponibilidade."}
        </p>

        <!-- Agent Signature -->
        ${generateAgentSignature(profile || null)}

        <!-- Footer -->
        <div style="text-align:center;padding-top:16px;">
          <p style="font-size:10px;color:#cbd5e1;">
            Gerado em ${format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })} • Agentes de Sonhos
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