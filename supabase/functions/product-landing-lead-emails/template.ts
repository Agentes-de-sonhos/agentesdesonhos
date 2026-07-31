// Transactional "new lead" e-mail. Minimal data, no tokens, no attachments.

const APP_BASE = "https://app.agentesdesonhos.com.br";

const PRODUCT_LABELS: Record<string, string> = {
  transamerica_comandatuba: "Transamérica Comandatuba",
  orlando_magic: "Orlando Magic",
};

export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function toE164Br(raw: unknown): string {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (!digits) return "";
  return digits.startsWith("55") ? digits : `55${digits}`;
}

export function formatInTz(iso: string, timezone: string): string {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      timeZone: timezone || "America/Sao_Paulo",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return new Date(iso).toISOString();
  }
}

export interface LeadEmailRow {
  lead_id: string;
  lead_name: string;
  lead_phone: string;
  lead_email?: string | null;
  origin_city?: string | null;
  travel_period?: string | null;
  adults?: number | null;
  children?: number | null;
  children_ages?: string | null;
  interest_category?: string | null;
  message?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  created_at: string;
  is_test?: boolean | null;
  product_key: string;
  agency_name?: string | null;
  timezone?: string | null;
  assignee_name?: string | null;
}

export function renderLeadEmail(row: LeadEmailRow): { subject: string; html: string; text: string } {
  const product = PRODUCT_LABELS[row.product_key] ?? row.product_key;
  const tz = row.timezone || "America/Sao_Paulo";
  const when = formatInTz(row.created_at, tz);
  const phone = toE164Br(row.lead_phone);
  const testTag = row.is_test ? "[TESTE] " : "";
  const subject = `${testTag}Novo lead: ${row.lead_name} — ${product}`;
  const preheader = "Uma nova oportunidade chegou pela sua landing personalizada.";
  const deepLink = `${APP_BASE}/meus-leads?lead=${encodeURIComponent(row.lead_id)}`;
  const waLink = phone ? `https://wa.me/${phone}` : "";

  const rows: Array<[string, string]> = [
    ["Nome", row.lead_name],
    ["WhatsApp", row.lead_phone],
  ];
  if (row.lead_email) rows.push(["E-mail", row.lead_email]);
  rows.push(["Produto / destino", product]);
  if (row.origin_city) rows.push(["Origem", row.origin_city]);
  if (row.travel_period) rows.push(["Período", row.travel_period]);
  const pax = [
    row.adults ? `${row.adults} adulto(s)` : null,
    row.children ? `${row.children} criança(s)` : null,
  ].filter(Boolean).join(" + ");
  if (pax) rows.push(["Passageiros", pax + (row.children_ages ? ` (idades: ${row.children_ages})` : "")]);
  if (row.interest_category) rows.push(["Acomodação de interesse", row.interest_category]);
  if (row.message) rows.push(["Observações", row.message]);
  const utm = [row.utm_source, row.utm_medium, row.utm_campaign].filter(Boolean).join(" / ");
  if (utm) rows.push(["Campanha", utm]);
  rows.push(["Recebido em", `${when} (${tz})`]);
  rows.push(["Responsável", row.assignee_name || "Titular da conta"]);

  const tableRows = rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:6px 12px 6px 0;color:#64748b;font-size:13px;white-space:nowrap;vertical-align:top">${escapeHtml(label)}</td><td style="padding:6px 0;color:#0f172a;font-size:14px;font-weight:600">${escapeHtml(value)}</td></tr>`,
    )
    .join("");

  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background-color:#ffffff;font-family:Arial,Helvetica,sans-serif">
<span style="display:none;max-height:0;overflow:hidden">${escapeHtml(preheader)}</span>
<div style="max-width:560px;margin:0 auto;padding:24px">
  <p style="margin:0 0 4px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#db2777">Novo lead</p>
  <h1 style="margin:0 0 4px;font-size:22px;color:#0f172a">${escapeHtml(row.lead_name)}</h1>
  <p style="margin:0 0 20px;font-size:14px;color:#475569">${escapeHtml(preheader)}</p>
  <table style="width:100%;border-collapse:collapse;border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;padding:8px 0">${tableRows}</table>
  <div style="margin:24px 0 8px">
    <a href="${deepLink}" style="display:inline-block;background-color:#db2777;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:10px;font-size:14px;font-weight:700">Abrir lead na plataforma</a>
    ${waLink ? `<a href="${waLink}" style="display:inline-block;margin-left:8px;background-color:#0f172a;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:10px;font-size:14px;font-weight:700">Falar no WhatsApp</a>` : ""}
  </div>
  <p style="margin:16px 0 0;font-size:12px;color:#94a3b8">O acesso ao lead exige login na plataforma.</p>
  <p style="margin:8px 0 0;font-size:12px;color:#94a3b8">${escapeHtml(row.agency_name || "Sua agência")} • Mensagem transacional automática enviada porque a notificação de novos leads está ativa nesta landing page.</p>
</div></body></html>`;

  const text = [
    `${testTag}Novo lead: ${row.lead_name} — ${product}`,
    preheader,
    "",
    ...rows.map(([l, v]) => `${l}: ${v}`),
    "",
    `Abrir na plataforma: ${deepLink}`,
    waLink ? `WhatsApp: ${waLink}` : "",
  ].filter(Boolean).join("\n");

  return { subject, html, text };
}