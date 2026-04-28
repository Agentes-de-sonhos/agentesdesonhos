import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Itinerary, ItineraryDay } from "@/types/itinerary";
import { parseLocalDate } from "@/lib/dateParsing";

const tripTypeLabels: Record<string, string> = {
  familia: "Viagem em Família",
  casal: "Viagem de Casal",
  lua_de_mel: "Lua de Mel",
  sozinho: "Viagem Solo",
  corporativo: "Viagem Corporativa",
};

const budgetLabels: Record<string, string> = {
  economico: "Econômico ⭐⭐⭐",
  conforto: "Conforto ⭐⭐⭐⭐",
  luxo: "Luxo ⭐⭐⭐⭐⭐",
};

const periodLabels: Record<string, string> = {
  manha: "☀️ Manhã",
  tarde: "🌅 Tarde",
  noite: "🌙 Noite",
};

export function generatePDFContent(
  itinerary: Itinerary & { days: ItineraryDay[] }
): string {
  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Roteiro - ${itinerary.destination}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #fff;
    }
    .container { max-width: 800px; margin: 0 auto; padding: 40px; }
    .header {
      text-align: center;
      margin-bottom: 40px;
      padding-bottom: 30px;
      border-bottom: 3px solid #6366f1;
    }
    .header h1 {
      font-size: 32px;
      color: #1a1a2e;
      margin-bottom: 10px;
    }
    .header .dates {
      font-size: 18px;
      color: #666;
      margin-bottom: 15px;
    }
    .meta {
      display: flex;
      justify-content: center;
      gap: 30px;
      flex-wrap: wrap;
    }
    .meta-item {
      background: #f5f5f5;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 14px;
    }
    .day {
      margin-bottom: 30px;
      page-break-inside: avoid;
    }
    .day-header {
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      color: white;
      padding: 15px 20px;
      border-radius: 10px 10px 0 0;
    }
    .day-header h2 { font-size: 20px; margin-bottom: 5px; }
    .day-header .date { font-size: 14px; opacity: 0.9; }
    .day-content {
      border: 1px solid #e5e5e5;
      border-top: none;
      border-radius: 0 0 10px 10px;
      padding: 20px;
    }
    .period {
      margin-bottom: 20px;
    }
    .period:last-child { margin-bottom: 0; }
    .period-title {
      font-size: 16px;
      font-weight: 600;
      color: #6366f1;
      margin-bottom: 10px;
      padding-bottom: 5px;
      border-bottom: 1px dashed #e5e5e5;
    }
    .activity {
      background: #fafafa;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 10px;
    }
    .activity:last-child { margin-bottom: 0; }
    .activity h4 {
      font-size: 15px;
      color: #1a1a2e;
      margin-bottom: 8px;
    }
    .activity p {
      font-size: 13px;
      color: #666;
      margin-bottom: 8px;
    }
    .activity-meta {
      display: flex;
      gap: 15px;
      flex-wrap: wrap;
      font-size: 12px;
      color: #888;
    }
    .activity-meta span { display: flex; align-items: center; gap: 5px; }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e5e5;
      text-align: center;
      color: #888;
      font-size: 12px;
    }
    @media print {
      .container { padding: 20px; }
      .day { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📍 ${itinerary.destination}</h1>
      <div class="dates">
        ${format(parseLocalDate(itinerary.startDate), "dd 'de' MMMM", { locale: ptBR })} 
        - ${format(parseLocalDate(itinerary.endDate), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
      </div>
      <div class="meta">
        <span class="meta-item">👥 ${itinerary.travelersCount} viajante(s)</span>
        <span class="meta-item">${tripTypeLabels[itinerary.tripType] || itinerary.tripType}</span>
        <span class="meta-item">${budgetLabels[itinerary.budgetLevel] || itinerary.budgetLevel}</span>
      </div>
    </div>

    ${itinerary.days
      .map(
        (day) => `
      <div class="day">
        <div class="day-header">
          <h2>Dia ${day.dayNumber}</h2>
          <div class="date">${format(parseLocalDate(day.date), "EEEE, dd 'de' MMMM", { locale: ptBR })}</div>
        </div>
        <div class="day-content">
          ${(["manha", "tarde", "noite"] as const)
            .map((period) => {
              const activities = day.activities.filter((a) => a.period === period);
              if (activities.length === 0) return "";
              return `
              <div class="period">
                <div class="period-title">${periodLabels[period]}</div>
                ${activities
                  .map(
                    (activity) => `
                  <div class="activity">
                    <h4>${activity.title}</h4>
                    ${activity.description ? `<p>${activity.description}</p>` : ""}
                    <div class="activity-meta">
                      ${activity.location ? `<span>📍 ${activity.location}</span>` : ""}
                      ${activity.estimatedDuration ? `<span>⏱️ ${activity.estimatedDuration}</span>` : ""}
                      ${activity.estimatedCost ? `<span>💰 ${activity.estimatedCost}</span>` : ""}
                    </div>
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
      .join("")}



  </div>
</body>
</html>
`;
  return html;
}

export function downloadPDF(itinerary: Itinerary & { days: ItineraryDay[] }) {
  const html = generatePDFContent(itinerary);
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  
  const printWindow = window.open(url, "_blank");
  if (printWindow) {
    printWindow.onload = () => {
      printWindow.print();
    };
  }
}
