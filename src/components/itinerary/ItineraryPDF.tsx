import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Itinerary, ItineraryDay } from "@/types/itinerary";
import { parseLocalDate } from "@/lib/dateParsing";
import type { AgentProfile } from "@/hooks/useAgentProfile";
import { PASSENGER_INTEREST_LABELS } from "@/types/itinerary";

const tripTypeLabels: Record<string, string> = {
  familia: "Viagem em Família",
  casal: "Viagem de Casal",
  lua_de_mel: "Lua de Mel",
  sozinho: "Viagem Solo",
  solo: "Viagem Solo",
  corporativo: "Viagem Corporativa",
  familia_crianca_pequena: "Família com criança pequena",
  familia_adolescentes: "Família com adolescentes",
  grupo_amigos: "Grupo de amigos",
  melhor_idade: "Melhor idade",
};

const budgetLabels: Record<string, string> = {
  economico: "Econômico",
  conforto: "Conforto",
  luxo: "Luxo",
};

const periodLabels: Record<string, string> = {
  manha: "☀️ Manhã",
  tarde: "🌅 Tarde",
  noite: "🌙 Noite",
};

function generateAgencyHeader(profile: AgentProfile | null): string {
  if (!profile?.agency_logo_url) {
    return `
      <div style="text-align:center;padding:10px 0;background:#ffffff;border-bottom:1px solid #e2e8f0;">
        <p style="font-size:22px;font-weight:800;color:#0f766e;margin:0;letter-spacing:-0.3px;">
          ${profile?.agency_name || "Roteiro de Viagem"}
        </p>
      </div>
    `;
  }
  return `
    <div style="text-align:center;padding:4px 0 2px;background:#ffffff;">
      <img src="${profile.agency_logo_url}" alt="${profile.agency_name || "Logo"}"
        style="max-height:180px;max-width:520px;object-fit:contain;display:block;margin:0 auto;" />
    </div>
  `;
}

function generateAgentSignature(profile: AgentProfile | null): string {
  if (!profile) return "";

  const avatarHtml = profile.avatar_url
    ? `<img src="${profile.avatar_url}" alt="${profile.name}" style="width:68px;height:68px;border-radius:50%;object-fit:cover;border:4px solid rgba(15,118,110,0.12);box-shadow:0 8px 20px rgba(0,0,0,0.08);display:inline-block;" />`
    : `<div style="width:68px;height:68px;border-radius:50%;background:linear-gradient(135deg,#0f766e,#14b8a6);display:inline-flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:26px;box-shadow:0 8px 20px rgba(0,0,0,0.08);">${profile.name.charAt(0).toUpperCase()}</div>`;

  const whatsappNumber = profile.phone?.replace(/\D/g, "") || "";
  const whatsappLink = whatsappNumber
    ? `https://wa.me/${whatsappNumber.startsWith("55") ? whatsappNumber : `55${whatsappNumber}`}`
    : "";

  return `
    <div class="pdf-block agent-signature" style="margin-top:14px;border:1px solid #e2e8f0;border-radius:16px;background:#ffffff;overflow:hidden;box-shadow:0 1px 2px rgba(0,0,0,0.04);">
      <div style="background:linear-gradient(90deg,rgba(241,245,249,0.7),rgba(241,245,249,0.2));padding:8px 18px;text-align:center;">
        <p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:3px;color:#64748b;margin:0;">Seu consultor de viagens</p>
      </div>
      <div style="padding:14px 18px;text-align:center;">
        ${avatarHtml}
        <p style="font-size:17px;font-weight:800;color:#1e293b;margin:8px 0 1px;">${profile.name}</p>
        ${profile.agency_name ? `<p style="font-size:12px;color:#64748b;margin:0;font-weight:500;">${profile.agency_name}</p>` : ""}
        ${profile.city || profile.state ? `<p style="font-size:11px;color:#94a3b8;margin:2px 0 0;">${[profile.city, profile.state].filter(Boolean).join(", ")}</p>` : ""}
        ${
          whatsappLink
            ? `<div style="margin-top:10px;">
                <a href="${whatsappLink}" target="_blank" style="display:inline-block;background:#25D366;color:#ffffff;padding:9px 24px;border-radius:9999px;font-size:13px;font-weight:700;text-decoration:none;box-shadow:0 6px 16px rgba(37,211,102,0.35);">
                  💬 Falar no WhatsApp
                </a>
              </div>`
            : ""
        }
      </div>
    </div>
  `;
}

export function generatePDFContent(
  itinerary: Itinerary & { days: ItineraryDay[] } & Record<string, any>,
  profile?: AgentProfile | null
): string {
  const startDate = parseLocalDate(itinerary.startDate);
  const endDate = parseLocalDate(itinerary.endDate);
  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const clientName = (itinerary as any).client_name || (itinerary as any).clientName || "";
  const passengers = (itinerary.passengers || []) as { name: string; age?: number | null }[];
  const passengerInterests = (itinerary.passengerInterests || []) as string[];
  const passengersHtml = (passengers.length > 0 || passengerInterests.length > 0)
    ? `<div class="pdf-block" style="background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;padding:12px 16px;margin-bottom:14px;">
        ${passengers.length > 0 ? `
          <p style="font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1.5px;margin:0 0 6px;">👥 Passageiros</p>
          <ul style="margin:0 0 ${passengerInterests.length > 0 ? "10px" : "0"};padding-left:18px;">
            ${passengers.map((p) => `<li style="font-size:13px;color:#1e293b;font-weight:600;">${p.name}${p.age != null ? `<span style="font-weight:400;color:#64748b;"> · ${p.age} anos</span>` : ""}</li>`).join("")}
          </ul>` : ""}
        ${passengerInterests.length > 0 ? `
          <p style="font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1.5px;margin:0 0 6px;">✨ Perfil da viagem</p>
          <p style="font-size:12px;color:#475569;line-height:1.5;margin:0;">${passengerInterests.map((k) => (PASSENGER_INTEREST_LABELS as any)[k] || k).join(" • ")}</p>` : ""}
      </div>`
    : "";

  const daysHtml = itinerary.days
    .map(
      (day) => `
      <div class="pdf-card day-card" style="border:1px solid #e2e8f0;border-radius:14px;margin-bottom:10px;background:#ffffff;overflow:hidden;box-shadow:0 1px 2px rgba(0,0,0,0.04);">
        <div class="pdf-block pdf-header day-title" style="background:linear-gradient(90deg,rgba(15,118,110,0.15),rgba(15,118,110,0.05));padding:8px 14px;color:#0f766e;display:flex;align-items:center;gap:12px;">
          <div style="width:34px;height:34px;border-radius:9px;background:rgba(255,255,255,0.85);display:inline-flex;align-items:center;justify-content:center;font-size:15px;font-weight:800;color:#0f766e;box-shadow:0 1px 2px rgba(0,0,0,0.06);">${day.dayNumber}</div>
          <div style="min-width:0;flex:1;">
            <p style="font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:1.2px;color:#0f766e;margin:0;line-height:1.2;">Dia ${day.dayNumber}</p>
            <p style="font-size:12px;color:#0f766e;opacity:0.75;margin:2px 0 0;font-weight:500;line-height:1.3;">${format(parseLocalDate(day.date), "EEEE, dd 'de' MMMM", { locale: ptBR })}</p>
          </div>
        </div>
        <div style="padding:12px 16px;">
          ${(["manha", "tarde", "noite"] as const)
            .map((period) => {
              const activities = day.activities.filter((a) => a.period === period);
              if (activities.length === 0) return "";
              return `
                <div class="pdf-block period" style="margin-bottom:10px;">
                  <p style="font-size:12px;font-weight:700;color:#0f766e;margin:0 0 6px;border-bottom:1px dashed #e2e8f0;padding-bottom:4px;">${periodLabels[period]}</p>
                  ${activities
                    .map(
                      (a) => `
                    <div class="pdf-block activity" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:10px 12px;margin-bottom:6px;">
                      <p style="font-size:13px;font-weight:700;color:#1e293b;margin:0 0 4px;">${a.title}</p>
                      ${(a as any).photoUrl ? `<img src="${(a as any).photoUrl}" alt="${a.title}" style="width:100%;max-height:180px;object-fit:cover;border-radius:8px;margin:0 0 6px;" />` : ""}
                      ${a.description ? `<p style="font-size:12px;color:#475569;line-height:1.45;margin:0 0 6px;white-space:pre-wrap;word-break:break-word;">${a.description}</p>` : ""}
                      <div style="font-size:11px;color:#64748b;display:flex;flex-wrap:wrap;gap:10px;">
                        ${a.location ? `<span>📍 ${a.location}</span>` : ""}
                        ${a.estimatedDuration ? `<span>⏱️ ${a.estimatedDuration}</span>` : ""}
                        ${a.estimatedCost ? `<span>💰 ${a.estimatedCost}</span>` : ""}
                      </div>
                      ${
                        ((a as any).documentUrls || []).length > 0
                          ? `<div style="margin-top:6px;display:flex;flex-direction:column;gap:3px;">
                              ${((a as any).documentUrls as string[])
                                .map((url) => {
                                  const name = decodeURIComponent((url.split("/").pop() || "arquivo").split("?")[0]);
                                  return `<a href="${url}" target="_blank" style="font-size:11px;color:#0f766e;text-decoration:none;">📎 ${name}</a>`;
                                })
                                .join("")}
                            </div>`
                          : ""
                      }
                    </div>
                  `
                    )
                    .join("")}
                </div>
              `;
            })
            .join("")}
        </div>
      </div>
    `
    )
    .join("");

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Roteiro — ${itinerary.destination}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:'Segoe UI',system-ui,-apple-system,sans-serif; color:#1e293b; line-height:1.5; background:#f8fafc; }
    img { max-width:100%; height:auto; }

    @media print {
      @page { size: A4; margin: 14mm 10mm 10mm 10mm; }
      @page :first { margin-top: 8mm; }
      html, body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
        background: #fff !important;
        line-height: 1.42 !important;
      }
      .pdf-block, .pdf-header, .agent-signature, .overview-card, .activity, img {
        break-inside: avoid;
        page-break-inside: avoid;
      }
      .pdf-title, .day-title { break-after: avoid; page-break-after: avoid; }
      .day-card { break-inside: auto; page-break-inside: auto; }
      h1, h2, h3 { break-after: avoid; page-break-after: avoid; }
      p { orphans: 3; widows: 3; }
      body, html { margin: 0 !important; padding: 0 !important; }
    }
  </style>
</head>
<body>
  <div style="max-width:820px;margin:0 auto;padding:0 0 20px;">
    ${generateAgencyHeader(profile || null)}

    <div style="padding:6px 32px 0;">
      <!-- Hero -->
      <div class="pdf-block pdf-hero" style="text-align:center;padding:2px 0 12px;">
        <div style="display:inline-block;background:rgba(15,118,110,0.1);color:#0f766e;padding:5px 14px;border-radius:9999px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:2.5px;margin-bottom:8px;">
          🗺️ Roteiro de Viagem
        </div>
        <h1 style="font-size:32px;font-weight:800;color:#1e293b;margin:0 0 2px;letter-spacing:-1px;line-height:1.05;">${itinerary.destination}</h1>
        ${clientName ? `<p style="font-size:14px;color:#64748b;margin-top:4px;">Preparado especialmente para <strong style="color:#1e293b;">${clientName}</strong></p>` : ""}
      </div>

      <!-- Overview -->
      <div class="pdf-block overview-card" style="background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;padding:14px 18px;margin-bottom:18px;display:grid;grid-template-columns:repeat(3,1fr);gap:14px;box-shadow:0 1px 2px rgba(0,0,0,0.04);">
        <div>
          <p style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;font-weight:700;">📍 Destino</p>
          <p style="font-size:14px;font-weight:700;color:#1e293b;">${itinerary.destination}</p>
        </div>
        <div style="border-left:1px solid #f1f5f9;padding-left:18px;">
          <p style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;font-weight:700;">📅 Período</p>
          <p style="font-size:14px;font-weight:700;color:#1e293b;">${format(startDate, "dd/MM/yyyy", { locale: ptBR })} — ${format(endDate, "dd/MM/yyyy", { locale: ptBR })}</p>
          <p style="font-size:12px;color:#94a3b8;margin-top:2px;">${days} dias</p>
        </div>
        <div style="border-left:1px solid #f1f5f9;padding-left:18px;">
          <p style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;font-weight:700;">👥 Viajantes</p>
          <p style="font-size:14px;font-weight:700;color:#1e293b;">${itinerary.travelersCount} viajante${itinerary.travelersCount > 1 ? "s" : ""}</p>
          <p style="font-size:12px;color:#94a3b8;margin-top:2px;">${tripTypeLabels[itinerary.tripType] || itinerary.tripType}${itinerary.budgetLevel ? ` • ${budgetLabels[itinerary.budgetLevel] || itinerary.budgetLevel}` : ""}</p>
        </div>
      </div>

      <!-- Days -->
      <div style="margin-bottom:18px;">
        ${passengersHtml}
        <div class="pdf-title" style="display:flex;align-items:center;gap:14px;margin-bottom:10px;">
          <div style="flex:1;height:1px;background:#e2e8f0;"></div>
          <h3 style="font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:3px;color:#64748b;margin:0;white-space:nowrap;">Programação Dia a Dia</h3>
          <div style="flex:1;height:1px;background:#e2e8f0;"></div>
        </div>
        ${daysHtml || '<p style="text-align:center;color:#94a3b8;padding:32px;">Nenhum dia programado</p>'}
      </div>

      <!-- Agent Signature -->
      ${generateAgentSignature(profile || null)}

      <!-- Footer -->
      <div style="text-align:center;padding-top:20px;">
        <p style="font-size:10px;color:#cbd5e1;">
          Gerado em ${format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })} • Agentes de Sonhos
        </p>
      </div>
    </div>
  </div>
</body>
</html>
`;
  return html;
}

export function downloadPDF(
  itinerary: Itinerary & { days: ItineraryDay[] },
  profile?: AgentProfile | null
) {
  const html = generatePDFContent(itinerary, profile);
  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  }
}
