import jsPDF from "jspdf";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface ReceiptData {
  agencyName: string;
  agencyCnpj?: string;
  agencyEmail?: string;
  agencyPhone?: string;
  clientName: string;
  tripName: string;
  startDate?: string | null;
  endDate?: string | null;
  services: { type: string; description: string | null; salePrice: number }[];
  totalAmount: number;
  paymentMethod?: string;
  paymentStatus: string; // pago | pendente
}

const SERVICE_TYPE_LABELS: Record<string, string> = {
  hotel: "Hotel",
  voo: "Voo",
  seguro: "Seguro",
  passeio: "Passeio",
  transfer: "Transfer",
  cruzeiro: "Cruzeiro",
  locacao: "Locação",
  outro: "Outro",
};

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtDate = (d: string | null | undefined) => {
  if (!d) return "—";
  try {
    return format(new Date(d), "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return d;
  }
};

export function generateReceiptPdf(data: ReceiptData) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const marginL = 20;
  const marginR = 20;
  const contentW = pageW - marginL - marginR;
  let y = 25;

  // ── Header stripe ──
  doc.setFillColor(37, 99, 235); // blue-600
  doc.rect(0, 0, pageW, 18, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("RECIBO DE PRESTAÇÃO DE SERVIÇOS", pageW / 2, 11, { align: "center" });

  // ── Agency info ──
  y = 30;
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(data.agencyName || "Agência", marginL, y);
  y += 5;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  if (data.agencyCnpj) {
    doc.text(`CNPJ: ${data.agencyCnpj}`, marginL, y);
    y += 4;
  }
  const contactParts: string[] = [];
  if (data.agencyEmail) contactParts.push(data.agencyEmail);
  if (data.agencyPhone) contactParts.push(data.agencyPhone);
  if (contactParts.length > 0) {
    doc.text(`Contato: ${contactParts.join("  |  ")}`, marginL, y);
    y += 4;
  }

  // ── Divider ──
  y += 3;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(marginL, y, pageW - marginR, y);
  y += 8;

  // ── Client & Trip info ──
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Cliente:", marginL, y);
  doc.setFont("helvetica", "normal");
  doc.text(data.clientName, marginL + 20, y);
  y += 6;

  doc.setFont("helvetica", "bold");
  doc.text("Viagem:", marginL, y);
  doc.setFont("helvetica", "normal");
  doc.text(data.tripName, marginL + 20, y);
  y += 6;

  doc.setFont("helvetica", "bold");
  doc.text("Período:", marginL, y);
  doc.setFont("helvetica", "normal");
  doc.text(`${fmtDate(data.startDate)} a ${fmtDate(data.endDate)}`, marginL + 20, y);
  y += 4;

  // ── Divider ──
  y += 4;
  doc.line(marginL, y, pageW - marginR, y);
  y += 8;

  // ── Services table ──
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("SERVIÇOS CONTRATADOS", marginL, y);
  y += 6;

  // Table header
  doc.setFillColor(245, 245, 245);
  doc.rect(marginL, y - 3, contentW, 7, "F");
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(80, 80, 80);
  doc.text("TIPO", marginL + 2, y + 1);
  doc.text("DESCRIÇÃO", marginL + 35, y + 1);
  doc.text("VALOR", pageW - marginR - 2, y + 1, { align: "right" });
  y += 8;

  // Table rows
  doc.setFont("helvetica", "normal");
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(9);

  for (const svc of data.services) {
    if (y > 260) {
      doc.addPage();
      y = 20;
    }
    const typeLabel = SERVICE_TYPE_LABELS[svc.type] || svc.type;
    doc.text(typeLabel, marginL + 2, y);
    const desc = svc.description || "—";
    // Truncate long descriptions
    const maxDescW = contentW - 75;
    const descLines = doc.splitTextToSize(desc, maxDescW);
    doc.text(descLines[0], marginL + 35, y);
    doc.text(fmt(svc.salePrice), pageW - marginR - 2, y, { align: "right" });
    y += 6;
  }

  // ── Divider ──
  y += 2;
  doc.line(marginL, y, pageW - marginR, y);
  y += 8;

  // ── Total ──
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(37, 99, 235);
  doc.text("VALOR TOTAL:", marginL, y);
  doc.text(fmt(data.totalAmount), pageW - marginR, y, { align: "right" });
  y += 8;

  // ── Payment info ──
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.setFont("helvetica", "normal");
  if (data.paymentMethod) {
    doc.text(`Forma de pagamento: ${data.paymentMethod}`, marginL, y);
    y += 5;
  }
  const statusLabel = data.paymentStatus === "pago" ? "PAGO" : "PENDENTE";
  doc.text(`Status: ${statusLabel}`, marginL, y);
  y += 12;

  // ── Declaration ──
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(9);
  const declaration =
    "Declaro que recebi (ou receberei) os valores acima referentes aos serviços descritos.";
  doc.text(declaration, marginL, y);
  y += 10;

  doc.text(
    `Data de emissão: ${format(new Date(), "dd/MM/yyyy", { locale: ptBR })}`,
    marginL,
    y
  );
  y += 12;

  // ── Signature line ──
  doc.setDrawColor(150, 150, 150);
  doc.line(marginL, y, marginL + 70, y);
  y += 5;
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text(data.agencyName || "Agência", marginL, y);

  // ── Footer ──
  const footerY = doc.internal.pageSize.getHeight() - 10;
  doc.setFontSize(7);
  doc.setTextColor(160, 160, 160);
  doc.text(
    `Documento gerado automaticamente em ${format(new Date(), "dd/MM/yyyy HH:mm")}`,
    pageW / 2,
    footerY,
    { align: "center" }
  );

  // Save
  const fileName = `Recibo_${data.tripName.replace(/\s/g, "_")}_${format(new Date(), "yyyyMMdd")}.pdf`;
  doc.save(fileName);
}
