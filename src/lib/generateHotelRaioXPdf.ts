import jsPDF from "jspdf";

interface CriteriaItem {
  score: number;
  comment: string;
}

interface HotelAnalysis {
  hotel_name: string;
  address: string;
  rating: number;
  total_reviews: number;
  score: number;
  summary: string;
  criteria: {
    service: CriteriaItem;
    cleanliness: CriteriaItem;
    location: CriteriaItem;
    comfort: CriteriaItem;
    value: CriteriaItem;
  };
  positives: string[];
  negatives: string[];
  ideal_for: string;
  alerts: string[];
  confidence: string;
  _cache?: { analysis_date: string };
}

const CRITERIA_LABELS: Record<string, string> = {
  service: "Atendimento",
  cleanliness: "Limpeza",
  location: "Localização",
  comfort: "Conforto",
  value: "Custo-benefício",
};

function scoreColor(score: number): [number, number, number] {
  if (score >= 8) return [16, 185, 129]; // emerald
  if (score >= 6) return [245, 158, 11]; // amber
  return [239, 68, 68]; // red
}

function confidenceLabel(level: string) {
  const map: Record<string, string> = {
    alto: "Alta confiança",
    "médio": "Confiança média",
    baixo: "Baixa confiança",
  };
  return map[level] || level;
}

export function generateHotelRaioXPdf(data: HotelAnalysis) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const mL = 20;
  const mR = 20;
  const contentW = pageW - mL - mR;
  let y = 0;

  const analysisDate = data._cache?.analysis_date
    ? new Date(data._cache.analysis_date).toLocaleDateString("pt-BR")
    : new Date().toLocaleDateString("pt-BR");

  const checkPage = (needed: number) => {
    if (y + needed > pageH - 20) {
      doc.addPage();
      y = 20;
    }
  };

  // ── Header stripe ──
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, pageW, 22, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("RAIO-X DO HOTEL", pageW / 2, 14, { align: "center" });

  // ── Hotel name & info ──
  y = 32;
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  const nameLines = doc.splitTextToSize(data.hotel_name, contentW);
  doc.text(nameLines, mL, y);
  y += nameLines.length * 6 + 2;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  if (data.address) {
    const addrLines = doc.splitTextToSize(data.address, contentW);
    doc.text(addrLines, mL, y);
    y += addrLines.length * 4 + 2;
  }

  // Rating line
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  const ratingText = `Nota Google: ${data.rating}/5  |  ${data.total_reviews.toLocaleString("pt-BR")} avaliações  |  ${confidenceLabel(data.confidence)}  |  Análise: ${analysisDate}`;
  doc.text(ratingText, mL, y);
  y += 8;

  // ── Score box ──
  const boxW = 36;
  const boxH = 24;
  const boxX = pageW / 2 - boxW / 2;
  const [sr, sg, sb] = scoreColor(data.score);
  doc.setFillColor(sr, sg, sb);
  doc.roundedRect(boxX, y, boxW, boxH, 4, 4, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text(data.score.toFixed(1), pageW / 2, y + 15, { align: "center" });
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("SCORE", pageW / 2, y + 21, { align: "center" });
  y += boxH + 10;

  // ── Divider helper ──
  const divider = () => {
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.3);
    doc.line(mL, y, pageW - mR, y);
    y += 6;
  };

  // ── Section helper ──
  const sectionTitle = (title: string) => {
    checkPage(20);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(37, 99, 235);
    doc.text(title, mL, y);
    y += 7;
    doc.setTextColor(50, 50, 50);
  };

  // ── Summary ──
  sectionTitle("Resumo Estratégico");
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const summaryLines = doc.splitTextToSize(data.summary, contentW);
  checkPage(summaryLines.length * 5);
  doc.text(summaryLines, mL, y);
  y += summaryLines.length * 5 + 6;
  divider();

  // ── Criteria ──
  sectionTitle("Avaliação por Critérios");
  const barH = 5;
  const barMaxW = contentW - 50;

  Object.entries(data.criteria).forEach(([key, item]) => {
    checkPage(18);
    const label = CRITERIA_LABELS[key] || key;
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(50, 50, 50);
    doc.text(label, mL, y);
    doc.text(item.score.toFixed(1), pageW - mR, y, { align: "right" });
    y += 3;

    // Bar background
    doc.setFillColor(230, 230, 230);
    doc.roundedRect(mL, y, barMaxW, barH, 1.5, 1.5, "F");

    // Bar fill
    const [cr, cg, cb] = scoreColor(item.score);
    const fillW = Math.max(2, (item.score / 10) * barMaxW);
    doc.setFillColor(cr, cg, cb);
    doc.roundedRect(mL, y, fillW, barH, 1.5, 1.5, "F");
    y += barH + 2;

    // Comment
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(120, 120, 120);
    const commentLines = doc.splitTextToSize(item.comment, contentW);
    doc.text(commentLines, mL, y);
    y += commentLines.length * 3.5 + 4;
  });

  y += 2;
  divider();

  // ── Bullet list helper ──
  const bulletList = (items: string[], bulletChar: string) => {
    items.forEach((text) => {
      checkPage(12);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(50, 50, 50);
      const lines = doc.splitTextToSize(text, contentW - 8);
      doc.text(bulletChar, mL, y);
      doc.text(lines, mL + 6, y);
      y += lines.length * 4 + 3;
    });
  };

  // ── Positives ──
  sectionTitle("Pontos Fortes");
  bulletList(data.positives, "✓");
  y += 2;
  divider();

  // ── Negatives ──
  sectionTitle("Pontos de Atenção");
  if (data.negatives.length > 0) {
    bulletList(data.negatives, "!");
  } else {
    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(120, 120, 120);
    doc.text("Nenhum ponto negativo identificado.", mL, y);
    y += 6;
  }
  y += 2;
  divider();

  // ── Ideal for ──
  sectionTitle("Perfil Ideal de Público");
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(50, 50, 50);
  const idealLines = doc.splitTextToSize(data.ideal_for, contentW);
  checkPage(idealLines.length * 5);
  doc.text(idealLines, mL, y);
  y += idealLines.length * 5 + 6;

  // ── Alerts ──
  if (data.alerts.length > 0) {
    divider();
    sectionTitle("Alertas Importantes");
    bulletList(data.alerts, "⚠");
    y += 2;
  }

  // ── Footer ──
  const footerY = pageH - 10;
  doc.setFontSize(7);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(160, 160, 160);
  doc.text("Gerado automaticamente pela plataforma Agentes de Sonhos", pageW / 2, footerY, { align: "center" });

  // Save
  const safeName = data.hotel_name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+$/, "");
  doc.save(`raio-x-hotel-${safeName}.pdf`);
}
