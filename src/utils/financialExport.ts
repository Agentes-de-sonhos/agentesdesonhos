import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import type { ExportFormat } from "@/components/financial/ExportModal";

type Row = Record<string, string | number>;

interface ExportConfig {
  tabLabel: string;
  columns: { key: string; header: string; width?: number }[];
  rows: Row[];
  period: { start: Date; end: Date };
  agencyName?: string;
  totals?: { label: string; value: string }[];
}

function periodLabel(start: Date, end: Date): string {
  return `${format(start, "dd/MM/yyyy")} a ${format(end, "dd/MM/yyyy")}`;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function exportFinancialData(config: ExportConfig, fmt: ExportFormat) {
  if (fmt === "xlsx") return exportXlsx(config);
  return exportPdf(config);
}

function exportXlsx(config: ExportConfig) {
  const { tabLabel, columns, rows, period } = config;
  const headers = columns.map(c => c.header);
  const data = rows.map(row => columns.map(c => row[c.key] ?? ""));

  const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);

  // Set column widths
  ws["!cols"] = columns.map(c => ({ wch: c.width || 18 }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, tabLabel.substring(0, 31));

  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const filename = `${tabLabel.toLowerCase().replace(/\s+/g, "_")}_${format(new Date(), "yyyyMMdd")}.xlsx`;
  downloadBlob(blob, filename);
}

function exportPdf(config: ExportConfig) {
  const { tabLabel, columns, rows, period, agencyName, totals } = config;
  const doc = new jsPDF({ orientation: columns.length > 5 ? "landscape" : "portrait", unit: "mm", format: "a4" });

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginX = 14;
  let y = 16;

  // Header
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  if (agencyName) {
    doc.text(agencyName, marginX, y);
    y += 8;
  }
  doc.setFontSize(13);
  doc.text(`Relatório de ${tabLabel}`, marginX, y);
  y += 6;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text(`Período: ${periodLabel(period.start, period.end)}  •  Gerado em: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, marginX, y);
  doc.setTextColor(0);
  y += 8;

  // Table
  const colCount = columns.length;
  const tableW = pageW - marginX * 2;
  const colWidths = columns.map(c => c.width ? (c.width / columns.reduce((s, c2) => s + (c2.width || 18), 0)) * tableW : tableW / colCount);
  const totalAssigned = colWidths.reduce((s, w) => s + w, 0);
  const scale = tableW / totalAssigned;
  const finalWidths = colWidths.map(w => w * scale);

  const rowH = 7;
  const headerH = 8;

  // Draw header
  doc.setFillColor(240, 240, 240);
  doc.rect(marginX, y, tableW, headerH, "F");
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  let x = marginX;
  columns.forEach((col, i) => {
    doc.text(col.header, x + 2, y + 5.5);
    x += finalWidths[i];
  });
  y += headerH;

  // Draw rows
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);

  rows.forEach((row, ri) => {
    if (y + rowH > pageH - 20) {
      doc.addPage();
      y = 16;
      // Redraw header on new page
      doc.setFillColor(240, 240, 240);
      doc.rect(marginX, y, tableW, headerH, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      let hx = marginX;
      columns.forEach((col, i) => {
        doc.text(col.header, hx + 2, y + 5.5);
        hx += finalWidths[i];
      });
      y += headerH;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
    }

    if (ri % 2 === 1) {
      doc.setFillColor(248, 248, 248);
      doc.rect(marginX, y, tableW, rowH, "F");
    }

    x = marginX;
    columns.forEach((col, i) => {
      const val = String(row[col.key] ?? "");
      const truncated = val.length > 35 ? val.substring(0, 32) + "..." : val;
      doc.text(truncated, x + 2, y + 5);
      x += finalWidths[i];
    });
    y += rowH;
  });

  // Totals
  if (totals && totals.length > 0) {
    y += 4;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    totals.forEach(t => {
      if (y > pageH - 15) { doc.addPage(); y = 16; }
      doc.text(`${t.label}: ${t.value}`, marginX, y);
      y += 5;
    });
  }

  // Footer
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(150);
    doc.text(`Página ${i} de ${totalPages}`, pageW - marginX, pageH - 8, { align: "right" });
    doc.setTextColor(0);
  }

  const filename = `${tabLabel.toLowerCase().replace(/\s+/g, "_")}_${format(new Date(), "yyyyMMdd")}.pdf`;
  doc.save(filename);
}

// --- Data preparation helpers ---

const fmtCurrency = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
const fmtDate = (d: string) => { try { return format(new Date(d), "dd/MM/yyyy"); } catch { return d; } };

export function filterByPeriod<T extends Record<string, any>>(items: T[], dateField: string, start: Date, end: Date): T[] {
  return items.filter(item => {
    const d = new Date(item[dateField]);
    return d >= start && d <= end;
  });
}

export function prepareSalesExport(sales: any[], period: { start: Date; end: Date }) {
  const filtered = filterByPeriod(sales, "sale_date", period.start, period.end);
  const columns = [
    { key: "client_name", header: "Cliente", width: 25 },
    { key: "destination", header: "Destino", width: 20 },
    { key: "date", header: "Data", width: 12 },
    { key: "amount", header: "Valor", width: 15 },
    { key: "notes", header: "Observações", width: 25 },
  ];
  const rows = filtered.map(s => ({
    client_name: s.client_name,
    destination: s.destination || "",
    date: fmtDate(s.sale_date),
    amount: fmtCurrency(s.sale_amount),
    notes: s.notes || "",
  }));
  const total = filtered.reduce((s, i) => s + Number(i.sale_amount), 0);
  return { columns, rows, totals: [{ label: "Total Vendido", value: fmtCurrency(total) }] };
}

export function prepareCommissionsExport(commissions: any[], period: { start: Date; end: Date }) {
  const filtered = filterByPeriod(commissions, "created_at", period.start, period.end);
  const columns = [
    { key: "client", header: "Cliente", width: 22 },
    { key: "product", header: "Produto", width: 16 },
    { key: "supplier", header: "Fornecedor", width: 18 },
    { key: "commission", header: "Comissão", width: 14 },
    { key: "expected", header: "Previsão", width: 12 },
    { key: "status", header: "Status", width: 16 },
  ];
  const PRODUCT_MAP: Record<string, string> = { aereo: "Aéreo", hotel: "Hotel", seguro: "Seguro", cruzeiro: "Cruzeiro", transfer: "Transfer", atracao: "Atrações", locacao: "Locação", outro: "Outro" };
  const STATUS_MAP: Record<string, string> = { previsao_criada: "Previsão", aguardando_emissao_nota: "Aguard. Emissão NF", aguardando_envio_nota: "Aguard. Envio NF", aguardando_pagamento: "Aguard. Pagamento", recebido: "Recebido", atrasado: "Atrasado", cancelado: "Cancelado" };
  const rows = filtered.map(c => ({
    client: c.client_name || "—",
    product: PRODUCT_MAP[c.product_type] || c.product_type,
    supplier: c.supplier_name || "—",
    commission: fmtCurrency(c.commission_amount),
    expected: c.expected_date ? fmtDate(c.expected_date) : "—",
    status: STATUS_MAP[c.commission_status] || c.commission_status,
  }));
  const total = filtered.reduce((s, i) => s + Number(i.commission_amount), 0);
  return { columns, rows, totals: [{ label: "Total Comissões", value: fmtCurrency(total) }] };
}

export function prepareEntradasExport(entries: any[], sales: any[], period: { start: Date; end: Date }) {
  const filtered = filterByPeriod(entries, "entry_date", period.start, period.end);
  const METHODS: Record<string, string> = { pix: "PIX", credito: "Cartão de Crédito", debito: "Cartão de Débito", transferencia: "Transferência", dinheiro: "Dinheiro", boleto: "Boleto" };
  const columns = [
    { key: "origin", header: "Origem", width: 25 },
    { key: "amount", header: "Valor", width: 14 },
    { key: "date", header: "Data", width: 12 },
    { key: "method", header: "Forma", width: 16 },
    { key: "notes", header: "Obs", width: 20 },
  ];
  const rows = filtered.map(e => {
    const sale = sales.find((s: any) => s.id === e.sale_id);
    return {
      origin: sale ? sale.client_name : (e.notes || "Entrada manual"),
      amount: fmtCurrency(e.amount),
      date: fmtDate(e.entry_date),
      method: METHODS[e.payment_method] || e.payment_method,
      notes: e.notes || "",
    };
  });
  const total = filtered.reduce((s, i) => s + Number(i.amount), 0);
  return { columns, rows, totals: [{ label: "Total Entradas", value: fmtCurrency(total) }] };
}

export function prepareExpensesExport(expenses: any[], period: { start: Date; end: Date }) {
  const filtered = filterByPeriod(expenses, "entry_date", period.start, period.end);
  const CATS: Record<string, string> = { sistema: "Sistema", marketing: "Marketing", internet: "Internet/Telefone", aluguel: "Aluguel", salarios: "Salários", cafe_reuniao: "Café/Reunião", presente_fornecedor: "Presente Fornecedor", taxas: "Taxas/Impostos", fornecedor: "Fornecedor", comissao: "Comissão", transporte: "Transporte", outros: "Outros" };
  const columns = [
    { key: "description", header: "Descrição", width: 25 },
    { key: "category", header: "Categoria", width: 18 },
    { key: "amount", header: "Valor", width: 14 },
    { key: "date", header: "Data", width: 12 },
    { key: "notes", header: "Obs", width: 20 },
  ];
  const rows = filtered.map(e => ({
    description: e.description,
    category: CATS[e.category] || e.category,
    amount: fmtCurrency(e.amount),
    date: fmtDate(e.entry_date),
    notes: e.notes || "",
  }));
  const total = filtered.reduce((s, i) => s + Number(i.amount), 0);
  return { columns, rows, totals: [{ label: "Total Despesas", value: fmtCurrency(total) }] };
}

export function prepareDashboardExport(
  sales: any[], incomeEntries: any[], expenseEntries: any[], saleProducts: any[],
  period: { start: Date; end: Date }
) {
  const filteredSales = filterByPeriod(sales, "sale_date", period.start, period.end);
  const filteredIncome = filterByPeriod(incomeEntries, "entry_date", period.start, period.end);
  const filteredExpenses = filterByPeriod(expenseEntries, "entry_date", period.start, period.end);

  const totalVendido = filteredSales.reduce((s, i) => s + Number(i.sale_amount), 0);
  const totalEntradas = filteredIncome.reduce((s, i) => s + Number(i.amount), 0);
  const totalDespesas = filteredExpenses.reduce((s, i) => s + Number(i.amount), 0);
  
  // Commission from products of filtered sales
  const saleIds = new Set(filteredSales.map(s => s.id));
  const relatedProducts = saleProducts.filter(p => saleIds.has(p.sale_id));
  const totalComissoes = relatedProducts.reduce((s, p) => {
    const base = Number(p.sale_price) - (Number(p.non_commissionable_taxes) || 0);
    return s + (p.commission_type === "percentage" ? base * Number(p.commission_value) / 100 : Number(p.commission_value));
  }, 0);

  const columns = [
    { key: "metric", header: "Indicador", width: 30 },
    { key: "value", header: "Valor", width: 20 },
  ];
  const rows = [
    { metric: "Total Vendido", value: fmtCurrency(totalVendido) },
    { metric: "Qtd. Vendas", value: String(filteredSales.length) },
    { metric: "Total Entradas", value: fmtCurrency(totalEntradas) },
    { metric: "Total Despesas", value: fmtCurrency(totalDespesas) },
    { metric: "Total Comissões (previsto)", value: fmtCurrency(totalComissoes) },
    { metric: "Lucro Líquido (Entradas - Despesas)", value: fmtCurrency(totalEntradas - totalDespesas) },
  ];
  return { columns, rows, totals: [] };
}
