import jsPDF from 'jspdf';
import type { ContractPayload } from '@/types/contracts';
import { formatDateBR, formatMoney } from '@/lib/saleContractData';

const M_L = 18;
const M_R = 18;

/** Versão do gerador — registrada junto ao hash para rastreabilidade do arquivo entregue. */
export const PDF_GENERATOR_VERSION = 'contract-pdf/2.0.0';

const slug = (v: string) =>
  v
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

export function contractPdfFileName(payload: ContractPayload): string {
  return `Contrato_${slug(payload.contract_number)}_${slug(payload.client.name)}.pdf`;
}

/** Baixa exatamente os bytes recebidos — nunca reserializa o documento. */
export function downloadPdfBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

const CATEGORY_LABELS: Record<string, string> = {
  adulto: 'Adulto',
  crianca: 'Criança',
  bebe: 'Bebê',
};

function htmlToLines(html: string): string[] {
  if (!html) return [];
  const withBreaks = html
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/\s*(p|div|li|h[1-6])\s*>/gi, '\n')
    .replace(/<\s*li[^>]*>/gi, '• ')
    .replace(/<[^>]+>/g, '');
  const txt = withBreaks
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"');
  return txt.split('\n').map((l) => l.trim()).filter(Boolean);
}

async function loadImage(url: string): Promise<{ data: string; w: number; h: number } | null> {
  try {
    const res = await fetch(url, { mode: 'cors' });
    const blob = await res.blob();
    const data = await new Promise<string>((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result));
      fr.onerror = reject;
      fr.readAsDataURL(blob);
    });
    const dims = await new Promise<{ w: number; h: number }>((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.width, h: img.height });
      img.onerror = () => resolve({ w: 0, h: 0 });
      img.src = data;
    });
    if (!dims.w) return null;
    return { data, ...dims };
  } catch {
    return null;
  }
}

export async function generateSaleContractPdf(
  payload: ContractPayload,
  options: { download?: boolean } = {},
): Promise<Blob> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const cW = pageW - M_L - M_R;
  let y = 16;

  const ensure = (need: number) => {
    if (y + need > pageH - 18) {
      doc.addPage();
      y = 18;
    }
  };

  const text = (value: string, size = 9, style: 'normal' | 'bold' = 'normal', indent = 0) => {
    doc.setFont('helvetica', style);
    doc.setFontSize(size);
    doc.setTextColor(35, 35, 35);
    const lines = doc.splitTextToSize(value, cW - indent);
    for (const line of lines) {
      ensure(size * 0.45 + 1.5);
      doc.text(line, M_L + indent, y);
      y += size * 0.45 + 1.5;
    }
  };

  const sectionTitle = (title: string) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    const lines: string[] = doc.splitTextToSize(title.toUpperCase(), cW - 4);
    const boxH = lines.length * 5 + 2;
    // Título nunca é cortado nem separado do próprio bloco: cabe inteiro na página.
    ensure(boxH + 8);
    y += 3;
    doc.setFillColor(240, 242, 245);
    doc.rect(M_L, y - 4.5, cW, boxH, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(25, 25, 25);
    lines.forEach((line, i) => doc.text(line, M_L + 2, y + i * 5));
    y += boxH + 2.5;
  };

  const kv = (label: string, value?: string | null) => {
    if (!value) return;
    ensure(6);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(70, 70, 70);
    const labelText = `${label}: `;
    doc.text(labelText, M_L, y);
    const offset = doc.getTextWidth(labelText);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 30, 30);
    const lines = doc.splitTextToSize(value, cW - offset);
    doc.text(lines[0] ?? '', M_L + offset, y);
    y += 5;
    for (const line of lines.slice(1)) {
      ensure(5);
      doc.text(line, M_L + offset, y);
      y += 5;
    }
  };

  // ── Header ──
  const logo = payload.agency.logo_url ? await loadImage(payload.agency.logo_url) : null;
  let headerX = M_L;
  if (logo) {
    const h = 16;
    const w = Math.min(45, (logo.w / logo.h) * h);
    try {
      doc.addImage(logo.data, 'PNG', M_L, y - 4, w, h);
      headerX = M_L + w + 6;
    } catch {
      /* ignore invalid image */
    }
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(20, 20, 20);
  doc.text(payload.agency.trade_name || '', headerX, y + 1);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(90, 90, 90);
  let hy = y + 5.5;
  const headerLines = [
    payload.agency.legal_name,
    payload.agency.cnpj ? `CNPJ: ${payload.agency.cnpj}` : '',
    payload.agency.address,
    Array.from(
      new Set([payload.agency.phone, payload.agency.whatsapp, payload.agency.email].filter(Boolean) as string[]),
    ).join('  |  '),
    [payload.agency.website, payload.agency.cadastur ? `Cadastur: ${payload.agency.cadastur}` : '']
      .filter(Boolean)
      .join('  |  '),
  ].filter(Boolean) as string[];
  for (const line of headerLines) {
    doc.text(line, headerX, hy);
    hy += 3.6;
  }
  y = Math.max(hy, y + (logo ? 14 : 0)) + 3;
  doc.setDrawColor(200, 200, 200);
  doc.line(M_L, y, pageW - M_R, y);
  y += 7;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(20, 20, 20);
  doc.text(payload.contract_title, pageW / 2, y, { align: 'center' });
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 100, 100);
  const meta = [
    `Contrato nº ${payload.contract_number}`,
    `Versão ${payload.revision}`,
    `Emitido em ${new Date(payload.emitted_at).toLocaleString('pt-BR')}`,
    payload.emission_city ? `Local: ${payload.emission_city}` : '',
  ].filter(Boolean);
  doc.text(meta.join('   •   '), pageW / 2, y, { align: 'center' });
  y += 8;

  // ── Contratante ──
  sectionTitle('Contratante');
  kv('Nome', payload.client.name);
  kv(payload.client.person_type === 'juridica' ? 'CNPJ' : 'CPF', payload.client.document);
  kv('Data de nascimento', payload.client.birth_date ? formatDateBR(payload.client.birth_date) : undefined);
  kv('Nacionalidade', payload.client.nationality);
  kv('Endereço', payload.client.address);
  kv('E-mail', payload.client.email);
  kv('Telefone', payload.client.phone);
  kv('Responsável financeiro', payload.client.financial_responsible);
  kv('Contratante é passageiro', payload.client.is_passenger ? 'Sim' : 'Não');

  // ── Passageiros ──
  sectionTitle('Passageiros');
  payload.passengers.forEach((p, i) => {
    ensure(10);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(30, 30, 30);
    doc.text(`${i + 1}. ${p.name}`, M_L, y);
    y += 4.5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(80, 80, 80);
    const details = [
      p.cpf ? `CPF ${p.cpf}` : '',
      p.birth_date ? `Nasc. ${formatDateBR(p.birth_date)}` : '',
      p.age_at_trip !== null && p.age_at_trip !== undefined
        ? `${p.age_at_trip} ${p.age_at_trip === 1 ? 'ano' : 'anos'}`
        : '',
      p.category ? CATEGORY_LABELS[p.category] : '',
      p.passport ? `Passaporte ${p.passport}` : '',
      p.passport_validity ? `Validade ${formatDateBR(p.passport_validity)}` : '',
      p.nationality || '',
      p.is_minor ? (p.guardian ? `Menor — responsável: ${p.guardian}` : 'Menor de idade') : '',
    ].filter(Boolean);
    const lines = doc.splitTextToSize(details.join('  •  '), cW - 5);
    for (const line of lines) {
      ensure(4.5);
      doc.text(line, M_L + 5, y);
      y += 4;
    }
    y += 1;
  });

  // ── Viagem ──
  sectionTitle('Objeto e dados da viagem');
  kv('Título', payload.trip.title);
  kv('Abrangência', payload.trip.scope ? (payload.trip.scope === 'nacional' ? 'Nacional' : 'Internacional') : undefined);
  kv('Origem', payload.trip.origin);
  kv('Destino', payload.trip.destination);
  kv('Período', `${formatDateBR(payload.trip.start_date)} a ${formatDateBR(payload.trip.end_date)}`);
  if (payload.trip.nights !== null && payload.trip.nights !== undefined)
    kv('Duração', `${payload.trip.days} dia(s) / ${payload.trip.nights} noite(s)`);
  kv('Quantidade de passageiros', String(payload.trip.passengers_count ?? payload.passengers.length));
  kv('Finalidade', payload.trip.purpose);
  if (payload.trip.program_note) text(payload.trip.program_note, 9);

  // ── Serviços ──
  sectionTitle('Serviços contratados');
  const colW = [38, cW - 38 - 30, 30];
  ensure(8);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(60, 60, 60);
  doc.text('Tipo', M_L, y);
  doc.text('Descrição', M_L + colW[0], y);
  doc.text('Valor', pageW - M_R, y, { align: 'right' });
  y += 2;
  doc.setDrawColor(215, 215, 215);
  doc.line(M_L, y, pageW - M_R, y);
  y += 4;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(35, 35, 35);
  for (const s of payload.services) {
    const descParts = [
      s.description,
      s.supplier ? `Fornecedor: ${s.supplier}` : '',
      s.operator ? `Operadora/Consolidadora: ${s.operator}` : '',
      s.refundable === 'nao' ? 'Tarifa não reembolsável' : '',
      s.locator ? `Localizador: ${s.locator}` : '',
    ]
      .filter(Boolean)
      .join(' — ');
    const descLines = doc.splitTextToSize(descParts || '—', colW[1] - 3);
    ensure(Math.max(5, descLines.length * 4));
    doc.text(s.type_label, M_L, y);
    doc.text(descLines, M_L + colW[0], y);
    doc.text(formatMoney(s.amount, s.currency), pageW - M_R, y, { align: 'right' });
    y += Math.max(5, descLines.length * 4) + 1;
  }

  if (payload.included.length) {
    y += 2;
    text('Incluso:', 9, 'bold');
    payload.included.forEach((i) => text(`•  ${i}`, 9, 'normal', 4));
  }
  if (payload.not_included.length) {
    y += 2;
    text('Não incluso:', 9, 'bold');
    payload.not_included.forEach((i) => text(`•  ${i}`, 9, 'normal', 4));
  }

  // ── Financeiro ──
  sectionTitle('Valores e condições de pagamento');
  const f = payload.financial;
  kv('Valor bruto dos serviços', formatMoney(f.gross, f.currency));
  if (f.discounts) kv('Descontos', `- ${formatMoney(f.discounts, f.currency)}`);
  if (f.taxes) kv('Taxas', formatMoney(f.taxes, f.currency));
  if (f.service_fee) kv('Taxa de serviço', formatMoney(f.service_fee, f.currency));
  kv('Valor total do contrato', formatMoney(f.total, f.currency));
  if (f.down_payment) kv('Entrada', formatMoney(f.down_payment, f.currency));
  if (f.down_payment) kv('Saldo', formatMoney(f.balance, f.currency));
  kv('Forma de pagamento', f.payment_method);
  if (f.installments_count)
    kv('Parcelamento', `${f.installments_count}x${f.installment_value ? ` de ${formatMoney(f.installment_value, f.currency)}` : ''}`);
  kv('Total já pago', formatMoney(f.paid, f.currency));
  kv('Saldo pendente', formatMoney(f.pending, f.currency));
  if (f.paid_to_supplier) {
    kv('Pago diretamente ao fornecedor', formatMoney(f.paid_to_supplier, f.currency));
    text(
      'O valor pago diretamente ao fornecedor é informativo, foi quitado pelo CONTRATANTE junto ao respectivo prestador e NÃO abate o saldo pendente devido à CONTRATADA indicado acima.',
      8,
    );
  }
  if (f.notes) text(f.notes, 9);

  if (f.payment_summary) {
    y += 2;
    text('Composição do pagamento', 9, 'bold');
    text(f.payment_summary, 9);
  }

  if (f.received.length) {
    y += 2;
    text('Pagamentos já recebidos pela CONTRATADA', 9, 'bold');
    f.received.forEach((p) =>
      text(
        `•  ${formatDateBR(p.date)} — ${formatMoney(p.amount, f.currency)}${p.method ? ` (${p.method})` : ''}${
          p.kind === 'entrada' ? ' — entrada' : ''
        }`,
        9,
        'normal',
        4,
      ),
    );
  }

  if (f.schedule.length) {
    y += 2;
    text('Cronograma das parcelas a vencer', 9, 'bold');
    f.schedule.forEach((i) =>
      text(
        `•  Parcela ${i.number}/${f.schedule.length} — vencimento ${formatDateBR(i.due_date)} — ${formatMoney(i.amount, f.currency)}`,
        9,
        'normal',
        4,
      ),
    );
  } else if (f.due_dates) {
    kv('Vencimentos', f.due_dates);
  }

  // ── Seguro ──
  sectionTitle('Seguro viagem');
  if (payload.insurance.contracted) {
    kv('Situação', 'Contratado');
    kv('Seguradora', payload.insurance.insurer);
    kv('Plano', payload.insurance.plan);
    kv('Vigência', payload.insurance.validity);
    kv('Coberturas', payload.insurance.coverage);
    kv('Passageiros cobertos', payload.insurance.covered_passengers);
  } else {
    text(
      'O CONTRATANTE declara que foi oferecido seguro viagem e optou por NÃO contratá-lo, assumindo integralmente os riscos e custos decorrentes de eventos cobertos por apólices de seguro.',
      9,
    );
  }

  // ── Condições específicas ──
  const cond = payload.conditions;
  const condEntries: [string, string | undefined][] = [
    ['Multas e cancelamento', cond.penalties],
    ['No-show', cond.no_show],
    ['Bagagem', cond.baggage],
    ['Taxas no destino', cond.destination_fees],
    ['Documentação e vistos', cond.documentation],
    ['Menores de idade', cond.minors],
    ['Observações gerais', cond.general_notes],
  ];
  if (condEntries.some(([, v]) => v)) {
    sectionTitle('Condições específicas');
    for (const [label, value] of condEntries) {
      if (!value) continue;
      text(label, 9, 'bold');
      text(value, 9);
      y += 1;
    }
  }

  // ── Cláusulas jurídicas ──
  // Quando o modelo possui seções, elas são a fonte de renderização;
  // legal_body_html guarda o corpo integral e não é repetido.
  if (payload.legal_body_html && !payload.sections.length) {
    sectionTitle('Cláusulas contratuais');
    for (const line of htmlToLines(payload.legal_body_html)) text(line, 9);
  }
  for (const s of payload.sections) {
    if (!s.body_html) continue;
    sectionTitle(s.title || 'Cláusulas adicionais');
    for (const line of htmlToLines(s.body_html)) text(line, 9);
  }

  // ── Anexos ──
  if (payload.attachments.length) {
    sectionTitle('Anexos');
    text('Os documentos abaixo integram este contrato para todos os fins de direito:', 9);
    payload.attachments.forEach((a) => text(`•  ${a.label}`, 9, 'normal', 4));
  }

  // ── Assinaturas ──
  ensure(50);
  sectionTitle('Aceite e assinaturas');
  text(
    'As partes declaram ter lido e concordado integralmente com os termos deste contrato, que passa a vigorar entre elas para todos os fins de direito.',
    9,
  );
  y += 6;
  const cityLine = `${payload.emission_city || '_______________________'}, ${new Date(payload.emitted_at).toLocaleDateString('pt-BR')}`;
  text(cityLine, 9);
  y += 12;
  const sigW = cW / 2 - 6;
  ensure(22);
  doc.setDrawColor(120, 120, 120);
  doc.line(M_L, y, M_L + sigW, y);
  doc.line(M_L + sigW + 12, y, pageW - M_R, y);
  y += 4;
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  doc.text(payload.client.name, M_L, y);
  doc.text(payload.agency.trade_name || '', M_L + sigW + 12, y);
  y += 4;
  doc.setTextColor(120, 120, 120);
  doc.text('CONTRATANTE', M_L, y);
  doc.text(
    payload.signature_config.representative_name
      ? `CONTRATADA — ${payload.signature_config.representative_name}`
      : 'CONTRATADA',
    M_L + sigW + 12,
    y,
  );
  y += 10;

  // Assinaturas adicionais: SOMENTE quem tem papel explícito confirmado pela agência.
  // Menores de idade nunca recebem linha de assinatura — são representados pelo responsável legal.
  const extraSigners = (payload.signers ?? []).filter(
    (s) => s.name.trim().toLowerCase() !== payload.client.name.trim().toLowerCase(),
  );
  if (extraSigners.length) {
    y += 2;
    text('Demais signatários e anuentes', 9, 'bold');
    y += 4;
    for (const s of extraSigners) {
      ensure(18);
      doc.setFont('helvetica', 'normal');
      doc.setDrawColor(120, 120, 120);
      doc.line(M_L, y, M_L + sigW, y);
      y += 4;
      doc.setFontSize(8);
      doc.setTextColor(80, 80, 80);
      doc.text(s.document ? `${s.name} — CPF ${s.document}` : s.name, M_L, y);
      y += 3.5;
      doc.setTextColor(120, 120, 120);
      doc.text(s.role === 'signatario' ? 'SIGNATÁRIO' : 'ANUENTE', M_L, y);
      y += 8;
    }
  }
  const minors = payload.passengers.filter((p) => p.is_minor);
  if (minors.length) {
    ensure(12);
    text(
      `Os passageiros menores de idade (${minors
        .map((m) => m.name)
        .join(', ')}) são representados neste contrato por seu(s) responsável(is) legal(is), não havendo assinatura própria.`,
      8,
    );
  }

  if (payload.signature_config.show_witnesses) {
    ensure(24);
    y += 4;
    doc.line(M_L, y, M_L + sigW, y);
    doc.line(M_L + sigW + 12, y, pageW - M_R, y);
    y += 4;
    doc.setTextColor(120, 120, 120);
    doc.text('Testemunha 1', M_L, y);
    doc.text('Testemunha 2', M_L + sigW + 12, y);
  }

  // ── Footer on every page ──
  const pages = doc.getNumberOfPages();
  const clientDoc = payload.client.document
    ? `${payload.client.person_type === 'juridica' ? 'CNPJ' : 'CPF'}: ${payload.client.document}`
    : '';
  const saleRef = payload.sale_reference
    ? payload.sale_reference.replace(/-/g, '').slice(-8).toUpperCase()
    : '';
  const stripLine1 = [
    `CONTRATADA: ${payload.agency.trade_name || payload.agency.legal_name || ''}`,
    payload.agency.cnpj ? `CNPJ: ${payload.agency.cnpj}` : '',
  ]
    .filter(Boolean)
    .join('  •  ');
  const stripLine2 = [
    `CONTRATANTE: ${payload.client.name}`,
    clientDoc,
    saleRef ? `VENDA Nº ${saleRef}` : '',
  ]
    .filter(Boolean)
    .join('  •  ');
  const emittedAt = new Date(payload.emitted_at);
  const footerPlaceDate = `${payload.emission_city ? `${payload.emission_city}, ` : ''}${emittedAt.toLocaleDateString('pt-BR')} ${emittedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  const linkNote =
    payload.footer_config.note ||
    `Documento vinculado à venda ${saleRef}${payload.receipt_number ? ` e ao recibo ${payload.receipt_number}` : ''}.`;
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    if (i > 1) {
      doc.setFontSize(6.5);
      doc.setTextColor(130, 130, 130);
      doc.text(doc.splitTextToSize(stripLine1, cW)[0] ?? '', M_L, 8);
      doc.text(doc.splitTextToSize(stripLine2, cW)[0] ?? '', M_L, 11);
      doc.setDrawColor(215, 215, 215);
      doc.line(M_L, 13, pageW - M_R, 13);
    }
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(doc.splitTextToSize(linkNote, cW)[0] ?? '', M_L, pageH - 12);
    doc.text(`CONTRATANTE: ${payload.client.name}`, M_L, pageH - 8);
    doc.text(footerPlaceDate, pageW / 2, pageH - 8, { align: 'center' });
    if (payload.footer_config.show_pagination !== false)
      doc.text(`Página ${i} de ${pages}`, pageW - M_R, pageH - 8, { align: 'right' });
  }

  // ── White-label metadata (nunca expõe a plataforma) ──
  const agencyName = payload.agency.trade_name || payload.agency.legal_name || 'Agencia';
  doc.setProperties({
    title: `${payload.contract_title} - ${payload.contract_number}`,
    subject: `Contrato de prestação de serviços de viagem - ${payload.client.name}`,
    author: agencyName,
    creator: agencyName,
    keywords: `contrato,${payload.contract_number}`,
  });
  const blob = doc.output('blob') as Blob;
  if (options.download) downloadPdfBlob(blob, contractPdfFileName(payload));
  return blob;
}