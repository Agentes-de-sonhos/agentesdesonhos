// Worker da fila de notificações das solicitações do site white label.
// Compartilha a mesma passada de cron do worker de landings: um e-mail por
// destinatário, sem CC/BCC, e idempotência garantida pela fila no banco
// (UNIQUE (request_id, channel) + status por linha). Uma falha aqui nunca cria
// uma segunda oportunidade: a solicitação e o CRM já estão gravados.
import { escapeHtml, formatInTz, toE164Br } from "./template.ts";

const APP_BASE = "https://app.agentesdesonhos.com.br";
const TZ = "America/Sao_Paulo";

export interface AgencyRequestRow {
  notification_id: string;
  channel: "email_client" | "email_agency" | "whatsapp_agency";
  recipient: string | null;
  request_id: string;
  protocol: string;
  agency_name: string;
  opportunity_id: string | null;
  lead_name: string;
  lead_phone: string | null;
  lead_email: string | null;
  service_label: string | null;
  destination: string | null;
  summary: string | null;
  notes: string | null;
  details: Record<string, string> | null;
  created_at: string;
}

/** Link direto para a oportunidade no CRM (a autorização é validada na tela). */
export function opportunityDeepLink(opportunityId: string | null): string {
  return opportunityId ? `${APP_BASE}/crm?opportunity=${opportunityId}` : `${APP_BASE}/crm`;
}

function detailRows(details: Record<string, string> | null): Array<[string, string]> {
  if (!details) return [];
  return Object.entries(details)
    .filter(([, v]) => typeof v === "string" && v.trim().length > 0)
    .slice(0, 40)
    .map(([k, v]) => [k.replace(/_/g, " "), v]);
}

function table(rows: Array<[string, string | null]>): string {
  return rows
    .filter(([, v]) => !!v)
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 12px 6px 0;color:#64748b;font-size:13px;">${escapeHtml(k)}</td>` +
        `<td style="padding:6px 0;color:#0f172a;font-size:14px;font-weight:600;">${escapeHtml(v)}</td></tr>`,
    )
    .join("");
}

function shell(title: string, agencyName: string, when: string, inner: string): string {
  return `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;">
<div style="max-width:560px;margin:0 auto;padding:24px;">
  <p style="margin:0 0 4px;color:#4b2a6e;font-size:12px;letter-spacing:.08em;text-transform:uppercase;font-weight:700;">${escapeHtml(agencyName)}</p>
  <h1 style="margin:0 0 8px;font-size:20px;color:#0f172a;">${escapeHtml(title)}</h1>
  <p style="margin:0 0 20px;color:#64748b;font-size:13px;">${escapeHtml(when)}</p>
  ${inner}
</div></body></html>`;
}

/** E-mail de confirmação para o cliente: protocolo, agência, data e resumo fiel. */
export function renderClientEmail(row: AgencyRequestRow): { subject: string; html: string; text: string } {
  const when = formatInTz(row.created_at, TZ);
  const subject = `Recebemos sua solicitação — protocolo ${row.protocol}`;
  const rows: Array<[string, string | null]> = [
    ["Protocolo", row.protocol],
    ["Agência", row.agency_name],
    ["Data e hora", when],
    ["Serviço", row.service_label],
    ["Destino", row.destination],
    ...detailRows(row.details),
    ["Observações", row.notes],
  ];
  const html = shell(
    "Recebemos a sua solicitação",
    row.agency_name,
    `Protocolo ${row.protocol} • ${when}`,
    `<p style="margin:0 0 20px;color:#0f172a;font-size:14px;line-height:1.6;">Olá, ${escapeHtml(row.lead_name)}. Um consultor da ${escapeHtml(row.agency_name)} vai retornar para alinhar todos os detalhes. Este é o resumo do que recebemos:</p>
  ${row.summary ? `<p style="margin:0 0 20px;padding:12px 14px;background:#f3eff7;border-radius:10px;color:#4b2a6e;font-size:14px;line-height:1.5;">${escapeHtml(row.summary)}</p>` : ""}
  <table style="width:100%;border-collapse:collapse;">${table(rows)}</table>`,
  );
  const text = [
    "Recebemos a sua solicitação",
    ...rows.filter(([, v]) => !!v).map(([k, v]) => `${k}: ${v}`),
    row.summary ?? "",
  ]
    .filter(Boolean)
    .join("\n");
  return { subject, html, text };
}

/** E-mail para a agência: contato, serviços, datas, preferências e link do CRM. */
export function renderAgencyEmail(row: AgencyRequestRow): { subject: string; html: string; text: string } {
  const when = formatInTz(row.created_at, TZ);
  const link = opportunityDeepLink(row.opportunity_id);
  const wa = toE164Br(row.lead_phone);
  const subject = `Nova solicitação pelo site: ${row.lead_name}${row.destination ? ` — ${row.destination}` : ""}`;
  const rows: Array<[string, string | null]> = [
    ["Protocolo", row.protocol],
    ["Nome", row.lead_name],
    ["WhatsApp", row.lead_phone],
    ["E-mail", row.lead_email],
    ["Serviço", row.service_label],
    ["Destino", row.destination],
    ...detailRows(row.details),
    ["Observações", row.notes],
    ["Recebido em", when],
  ];
  const html = shell(
    "Nova solicitação recebida pelo site",
    row.agency_name,
    `Protocolo ${row.protocol} • ${when}`,
    `${row.summary ? `<p style="margin:0 0 20px;padding:12px 14px;background:#f3eff7;border-radius:10px;color:#4b2a6e;font-size:14px;line-height:1.5;">${escapeHtml(row.summary)}</p>` : ""}
  <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">${table(rows)}</table>
  <p style="margin:0 0 12px;">
    <a href="${link}" style="display:inline-block;padding:11px 18px;background:#4b2a6e;color:#ffffff;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;">Abrir a oportunidade no CRM</a>
  </p>
  ${wa ? `<p style="margin:0;"><a href="https://wa.me/${wa}" style="color:#4b2a6e;font-size:13px;">Responder no WhatsApp</a></p>` : ""}`,
  );
  const text = [
    "NOVA SOLICITAÇÃO PELO SITE",
    ...rows.filter(([, v]) => !!v).map(([k, v]) => `${k}: ${v}`),
    link,
  ].join("\n");
  return { subject, html, text };
}

export function renderRequestEmail(row: AgencyRequestRow) {
  return row.channel === "email_client" ? renderClientEmail(row) : renderAgencyEmail(row);
}

export async function drainAgencyRequestQueue(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  resendKey: string,
  from: string,
  limit: number,
): Promise<{ claimed: number; sent: number; failed: number }> {
  const { data, error } = await supabase.rpc("claim_agency_request_notifications", { p_limit: limit });
  if (error) {
    console.error(`[agency-request-emails] claim-error err=${error.message}`);
    return { claimed: 0, sent: 0, failed: 0 };
  }

  const rows = (data ?? []) as AgencyRequestRow[];
  let sent = 0;
  let failed = 0;

  for (const row of rows) {
    // WhatsApp nunca é enviado por aqui: fica aguardando template aprovado.
    if (row.channel === "whatsapp_agency" || !row.recipient) {
      await supabase.rpc("complete_agency_request_notification", {
        p_notification_id: row.notification_id,
        p_status: "skipped",
        p_error: "Canal sem destinatário ou sem template aprovado.",
      });
      continue;
    }
    if (!resendKey) {
      await supabase.rpc("complete_agency_request_notification", {
        p_notification_id: row.notification_id,
        p_status: "failed",
        p_error: "Credencial de e-mail não configurada.",
      });
      failed++;
      continue;
    }
    try {
      const mail = renderRequestEmail(row);
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
        body: JSON.stringify({ from, to: [row.recipient], subject: mail.subject, html: mail.html, text: mail.text }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        // Só status: o corpo da solicitação nunca entra em log.
        console.error(`[agency-request-emails] provider-error status=${res.status}`);
        await supabase.rpc("complete_agency_request_notification", {
          p_notification_id: row.notification_id,
          p_status: "pending",
          p_error: `Provedor de e-mail retornou ${res.status}.`,
        });
        failed++;
        continue;
      }
      await supabase.rpc("complete_agency_request_notification", {
        p_notification_id: row.notification_id,
        p_status: "sent",
        p_provider_message_id: payload?.id ?? null,
      });
      sent++;
    } catch {
      console.error(`[agency-request-emails] send-exception channel=${row.channel}`);
      await supabase.rpc("complete_agency_request_notification", {
        p_notification_id: row.notification_id,
        p_status: "pending",
        p_error: "Falha temporária no envio do e-mail.",
      });
      failed++;
    }
  }

  console.log(`[agency-request-emails] done claimed=${rows.length} sent=${sent} failed=${failed}`);
  return { claimed: rows.length, sent, failed };
}
