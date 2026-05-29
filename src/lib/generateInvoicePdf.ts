import jsPDF from "jspdf";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Invoice } from "@/types/invoice";
import { INVOICE_SERVICE_CATEGORIES, INVOICE_STATUS_LABELS, INVOICE_PAYMENT_METHODS } from "@/types/invoice";
import QRCode from "qrcode";
import { buildPixBrCode } from "@/lib/pixBrCode";

interface AgencyInfo {
  name?: string | null;
  cnpj?: string | null;
  email?: string | null;
  phone?: string | null;
  logoUrl?: string | null;
}

const fmtCurrency = (v: number, currency = "BRL") =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(v || 0);

const fmtDate = (d?: string | null) => {
  if (!d) return "—";
  try {
    const [y, m, day] = d.split("-").map(Number);
    return format(new Date(y, m - 1, day), "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return d;
  }
};

export async function generateInvoicePdf(invoice: Invoice, agency: AgencyInfo, publicUrl?: string) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const marginL = 18;
  const marginR = 18;
  let y = 18;

  // Header
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageW, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("FATURA", marginL, 14);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Nº ${invoice.invoice_number}`, marginL, 21);
  doc.text(`Status: ${INVOICE_STATUS_LABELS[invoice.status]}`, marginL, 26);

  // Agency right
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(agency.name || "", pageW - marginR, 14, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const ctx = [agency.cnpj, agency.phone, agency.email].filter(Boolean).join(" • ");
  if (ctx) doc.text(ctx, pageW - marginR, 20, { align: "right" });

  y = 36;
  doc.setTextColor(40, 40, 40);

  // Dates
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Emissão:", marginL, y);
  doc.setFont("helvetica", "normal");
  doc.text(fmtDate(invoice.issue_date), marginL + 18, y);
  doc.setFont("helvetica", "bold");
  doc.text("Vencimento:", marginL + 60, y);
  doc.setFont("helvetica", "normal");
  doc.text(fmtDate(invoice.due_date), marginL + 82, y);
  y += 8;

  // Client block
  doc.setFillColor(245, 245, 248);
  doc.rect(marginL, y, pageW - marginL - marginR, 24, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("CLIENTE", marginL + 3, y + 5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(invoice.client_name, marginL + 3, y + 11);
  const docLine = [invoice.client_document, invoice.client_company].filter(Boolean).join(" • ");
  if (docLine) doc.text(docLine, marginL + 3, y + 16);
  const contact = [invoice.client_email, invoice.client_phone].filter(Boolean).join(" • ");
  if (contact) doc.text(contact, marginL + 3, y + 21);
  y += 28;

  // Trip info
  if (invoice.destination || invoice.travel_start || invoice.travel_end) {
    doc.setFont("helvetica", "bold");
    doc.text("Viagem:", marginL, y);
    doc.setFont("helvetica", "normal");
    const trip = [
      invoice.destination,
      invoice.travel_start ? `${fmtDate(invoice.travel_start)} → ${fmtDate(invoice.travel_end)}` : null,
    ].filter(Boolean).join("  •  ");
    doc.text(trip, marginL + 18, y);
    y += 6;
  }

  // Services table
  y += 2;
  doc.setFillColor(15, 23, 42);
  doc.rect(marginL, y, pageW - marginL - marginR, 7, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("CATEGORIA", marginL + 2, y + 5);
  doc.text("DESCRIÇÃO", marginL + 32, y + 5);
  doc.text("TARIFA", pageW - marginR - 50, y + 5, { align: "right" });
  doc.text("TAXAS", pageW - marginR - 30, y + 5, { align: "right" });
  doc.text("TOTAL", pageW - marginR - 2, y + 5, { align: "right" });
  y += 10;

  doc.setTextColor(30, 30, 30);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  for (const s of invoice.services || []) {
    if (y > 250) { doc.addPage(); y = 20; }
    doc.text(INVOICE_SERVICE_CATEGORIES[s.category], marginL + 2, y);
    const desc = doc.splitTextToSize(s.description || "—", 80);
    doc.text(desc[0], marginL + 32, y);
    doc.text(fmtCurrency(s.fare, invoice.currency), pageW - marginR - 50, y, { align: "right" });
    doc.text(fmtCurrency(s.taxes, invoice.currency), pageW - marginR - 30, y, { align: "right" });
    doc.text(fmtCurrency(s.final_amount, invoice.currency), pageW - marginR - 2, y, { align: "right" });
    y += 6;
  }

  // Totals block
  y += 4;
  doc.setDrawColor(220, 220, 220);
  doc.line(marginL, y, pageW - marginR, y);
  y += 6;

  const rows: [string, number][] = [
    ["Subtotal", invoice.subtotal],
    ["Taxas", invoice.taxes_total],
    ["Descontos", -invoice.discount_total],
  ];
  doc.setFontSize(9);
  for (const [label, val] of rows) {
    doc.setFont("helvetica", "normal");
    doc.text(label, pageW - marginR - 60, y);
    doc.text(fmtCurrency(val, invoice.currency), pageW - marginR - 2, y, { align: "right" });
    y += 5;
  }
  y += 1;
  doc.setDrawColor(180, 180, 180);
  doc.line(pageW - marginR - 62, y, pageW - marginR, y);
  y += 5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text("VALOR TOTAL", pageW - marginR - 60, y);
  doc.text(fmtCurrency(invoice.total_amount, invoice.currency), pageW - marginR - 2, y, { align: "right" });
  y += 6;
  doc.setFontSize(9);
  doc.setTextColor(60, 120, 60);
  doc.text("Recebido", pageW - marginR - 60, y);
  doc.text(fmtCurrency(invoice.paid_amount, invoice.currency), pageW - marginR - 2, y, { align: "right" });
  y += 5;
  doc.setTextColor(180, 50, 50);
  doc.text("Saldo em aberto", pageW - marginR - 60, y);
  doc.text(fmtCurrency(invoice.balance, invoice.currency), pageW - marginR - 2, y, { align: "right" });
  y += 8;
  doc.setTextColor(30, 30, 30);

  // Installments
  if (invoice.installments && invoice.installments.length) {
    if (y > 240) { doc.addPage(); y = 20; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("PARCELAS", marginL, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    for (const p of invoice.installments) {
      doc.text(`${p.installment_number}. ${p.label || ""}`, marginL, y);
      doc.text(fmtDate(p.due_date), marginL + 70, y);
      doc.text(fmtCurrency(p.amount, invoice.currency), marginL + 110, y);
      doc.text(p.status === "paid" ? "PAGO" : p.status === "overdue" ? "VENCIDO" : "PENDENTE", marginL + 150, y);
      y += 5;
    }
    y += 4;
  }

  // Payments
  if (invoice.payments && invoice.payments.length) {
    if (y > 240) { doc.addPage(); y = 20; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("PAGAMENTOS RECEBIDOS", marginL, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    for (const p of invoice.payments) {
      doc.text(p.receipt_number, marginL, y);
      doc.text(fmtDate(p.payment_date), marginL + 40, y);
      doc.text(INVOICE_PAYMENT_METHODS[p.method] || p.method, marginL + 75, y);
      doc.text(fmtCurrency(p.amount, invoice.currency), pageW - marginR - 2, y, { align: "right" });
      y += 5;
    }
    y += 4;
  }

  // Notes
  if (invoice.notes) {
    if (y > 250) { doc.addPage(); y = 20; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Observações:", marginL, y);
    y += 4;
    doc.setFont("helvetica", "normal");
    const notes = doc.splitTextToSize(invoice.notes, pageW - marginL - marginR);
    doc.text(notes, marginL, y);
    y += notes.length * 4 + 4;
  }

  // PIX QR Code
  if (invoice.pix_key && invoice.balance > 0) {
    if (y > 220) { doc.addPage(); y = 20; }
    try {
      const payload = invoice.pix_qr_payload || buildPixBrCode({
        pixKey: invoice.pix_key,
        amount: invoice.balance,
        merchantName: agency.name || "RECEBEDOR",
        merchantCity: "BRASIL",
        txid: invoice.invoice_number.replace(/[^A-Z0-9]/gi, "").slice(0, 25),
      });
      const dataUrl = await QRCode.toDataURL(payload, { margin: 1, width: 220 });
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text("PAGAR VIA PIX", marginL, y);
      y += 4;
      doc.addImage(dataUrl, "PNG", marginL, y, 38, 38);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(60, 60, 60);
      doc.text("Escaneie o QR Code ou copie o código abaixo:", marginL + 42, y + 6);
      const wrap = doc.splitTextToSize(payload, pageW - marginL - marginR - 44);
      doc.setFontSize(7);
      doc.text(wrap.slice(0, 5), marginL + 42, y + 11);
      y += 42;
    } catch (err) {
      console.error("Falha ao gerar QR PIX", err);
    }
  }

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 10;
  doc.setFontSize(7);
  doc.setTextColor(140, 140, 140);
  if (publicUrl) doc.text(publicUrl, marginL, footerY);
  doc.text(
    `Emitido em ${format(new Date(), "dd/MM/yyyy HH:mm")}`,
    pageW - marginR, footerY, { align: "right" }
  );

  doc.save(`Fatura_${invoice.invoice_number}.pdf`);
}