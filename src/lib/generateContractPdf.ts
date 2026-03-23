import jsPDF from "jspdf";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface ContractData {
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
}

const SERVICE_TYPE_LABELS: Record<string, string> = {
  hotel: "Hotel", voo: "Voo", seguro: "Seguro", passeio: "Passeio",
  transfer: "Transfer", cruzeiro: "Cruzeiro", locacao: "Locação", outro: "Outro",
};

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function generateContractPdf(data: ContractData) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const mL = 20;
  const mR = 20;
  const cW = pageW - mL - mR;
  let y = 20;

  const drawLine = () => {
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.3);
    doc.line(mL, y, pageW - mR, y);
    y += 6;
  };

  const checkPage = (need: number) => {
    if (y + need > pageH - 20) { doc.addPage(); y = 20; }
  };

  // ── Title ──
  doc.setFillColor(30, 41, 59); // slate-800
  doc.rect(0, 0, pageW, 22, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE VIAGEM", pageW / 2, 13, { align: "center" });
  y = 32;

  // ── Parties ──
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("CONTRATANTE:", mL, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.text(data.clientName, mL, y);
  y += 8;

  doc.setFont("helvetica", "bold");
  doc.text("CONTRATADA:", mL, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.text(data.agencyName, mL, y);
  y += 5;
  if (data.agencyCnpj) {
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(`CNPJ: ${data.agencyCnpj}`, mL, y);
    y += 4;
  }
  const contact: string[] = [];
  if (data.agencyEmail) contact.push(data.agencyEmail);
  if (data.agencyPhone) contact.push(data.agencyPhone);
  if (contact.length) {
    doc.text(contact.join("  |  "), mL, y);
    y += 4;
  }

  y += 4;
  drawLine();

  // ── Object ──
  checkPage(40);
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("OBJETO", mL, y);
  y += 6;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const objText = "O presente contrato tem como objeto a prestação de serviços de intermediação de viagens, incluindo os serviços abaixo:";
  const objLines = doc.splitTextToSize(objText, cW);
  doc.text(objLines, mL, y);
  y += objLines.length * 4.5 + 4;

  // Services list
  for (const svc of data.services) {
    checkPage(6);
    const label = SERVICE_TYPE_LABELS[svc.type] || svc.type;
    const desc = svc.description ? ` – ${svc.description}` : "";
    doc.text(`•  ${label}${desc} – ${fmt(svc.salePrice)}`, mL + 4, y);
    y += 5;
  }

  y += 4;
  drawLine();

  // ── Values & Payment ──
  checkPage(30);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("VALORES E PAGAMENTO", mL, y);
  y += 6;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const valText = `O valor total dos serviços contratados é de ${fmt(data.totalAmount)}, a ser pago conforme acordado.`;
  const valLines = doc.splitTextToSize(valText, cW);
  doc.text(valLines, mL, y);
  y += valLines.length * 4.5 + 2;
  if (data.paymentMethod) {
    doc.text(`Forma de pagamento: ${data.paymentMethod}`, mL, y);
    y += 5;
  }

  y += 4;
  drawLine();

  // ── Responsibilities ──
  checkPage(30);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("RESPONSABILIDADES", mL, y);
  y += 6;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const resp1 = "A CONTRATADA atua como intermediadora entre o cliente e os fornecedores (companhias aéreas, hotéis, operadoras, etc).";
  const resp2 = "Não se responsabiliza por alterações, atrasos, cancelamentos ou falhas operacionais dos fornecedores.";
  for (const txt of [resp1, resp2]) {
    const lines = doc.splitTextToSize(txt, cW);
    doc.text(lines, mL, y);
    y += lines.length * 4.5 + 2;
  }

  y += 2;
  drawLine();

  // ── Cancellation ──
  checkPage(20);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("CANCELAMENTO", mL, y);
  y += 6;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const canc = "Cancelamentos estão sujeitos às regras e multas impostas pelos fornecedores contratados.";
  const cancLines = doc.splitTextToSize(canc, cW);
  doc.text(cancLines, mL, y);
  y += cancLines.length * 4.5;

  y += 4;
  drawLine();

  // ── General ──
  checkPage(20);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("DISPOSIÇÕES GERAIS", mL, y);
  y += 6;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const gen = "O cliente declara estar ciente das condições acima e concorda com os termos deste contrato.";
  const genLines = doc.splitTextToSize(gen, cW);
  doc.text(genLines, mL, y);
  y += genLines.length * 4.5;

  y += 6;
  drawLine();

  // ── Signatures ──
  checkPage(40);
  y += 4;
  doc.setFontSize(9);
  doc.text(`Local e data: _________________________________________`, mL, y);
  y += 14;

  // Signature lines side by side
  const sigW = cW / 2 - 5;
  doc.line(mL, y, mL + sigW, y);
  doc.line(mL + sigW + 10, y, pageW - mR, y);
  y += 5;
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  doc.text("Assinatura do cliente", mL, y);
  doc.text("Assinatura da agência", mL + sigW + 10, y);

  // ── Footer ──
  const footerY = pageH - 10;
  doc.setFontSize(7);
  doc.setTextColor(160, 160, 160);
  doc.text(
    `Documento gerado automaticamente em ${format(new Date(), "dd/MM/yyyy HH:mm")}`,
    pageW / 2, footerY, { align: "center" }
  );

  const fileName = `Contrato_${data.clientName.replace(/\s/g, "_")}_${format(new Date(), "yyyyMMdd")}.pdf`;
  doc.save(fileName);
}
