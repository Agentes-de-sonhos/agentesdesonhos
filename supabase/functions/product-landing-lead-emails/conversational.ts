// Queue worker for the conversational lead form ("Formulário Conversacional").
// Shares the cron invocation of the product-landing worker: one pass per run,
// one e-mail per recipient, never exposing other recipients.
import { escapeHtml, formatInTz, toE164Br } from "./template.ts";

interface Row {
  delivery_id: string;
  recipient_email: string;
  lead_id: string;
  lead_name: string;
  lead_phone: string;
  lead_email: string | null;
  destination: string | null;
  travel_dates: string | null;
  travelers_count: string | null;
  budget: string | null;
  additional_info: string | null;
  lead_summary: string | null;
  created_at: string;
  is_test: boolean;
  agency_name: string;
  timezone: string;
}

const APP_BASE = "https://app.agentesdesonhos.com.br";

function renderEmail(row: Row): { subject: string; html: string; text: string } {
  const when = formatInTz(row.created_at, row.timezone);
  const wa = toE164Br(row.lead_phone);
  const prefix = row.is_test ? "[TESTE] " : "";
  const subject = `${prefix}Novo lead: ${row.lead_name}${row.destination ? ` — ${row.destination}` : ""}`;

  const fields: Array<[string, string | null]> = [
    ["Nome", row.lead_name],
    ["WhatsApp", row.lead_phone],
    ["E-mail", row.lead_email],
    ["Destino", row.destination],
    ["Período", row.travel_dates],
    ["Viajantes", row.travelers_count],
    ["Orçamento", row.budget],
    ["Observações", row.additional_info],
  ];

  const rowsHtml = fields
    .filter(([, v]) => !!v)
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 12px 6px 0;color:#64748b;font-size:13px;">${escapeHtml(k)}</td><td style="padding:6px 0;color:#0f172a;font-size:14px;font-weight:600;">${escapeHtml(v)}</td></tr>`,
    )
    .join("");

  const html = `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;">
<div style="max-width:560px;margin:0 auto;padding:24px;">
  <p style="margin:0 0 4px;color:#059669;font-size:12px;letter-spacing:.08em;text-transform:uppercase;font-weight:700;">${escapeHtml(row.agency_name)}</p>
  <h1 style="margin:0 0 8px;font-size:20px;color:#0f172a;">${row.is_test ? "Lead de teste recebido" : "Novo lead recebido"}</h1>
  <p style="margin:0 0 20px;color:#64748b;font-size:13px;">Formulário Conversacional • ${escapeHtml(when)}</p>
  ${row.lead_summary ? `<p style="margin:0 0 20px;padding:12px 14px;background:#f0fdf4;border-radius:10px;color:#166534;font-size:14px;line-height:1.5;">${escapeHtml(row.lead_summary)}</p>` : ""}
  <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">${rowsHtml}</table>
  <p style="margin:0 0 12px;">
    ${wa ? `<a href="https://wa.me/${wa}" style="display:inline-block;padding:11px 18px;background:#059669;color:#ffffff;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;">Responder no WhatsApp</a>` : ""}
  </p>
  <p style="margin:0;"><a href="${APP_BASE}/meus-leads" style="color:#059669;font-size:13px;">Abrir na plataforma</a></p>
</div></body></html>`;

  const text = [
    row.is_test ? "LEAD DE TESTE" : "NOVO LEAD",
    `Recebido em ${when}`,
    ...fields.filter(([, v]) => !!v).map(([k, v]) => `${k}: ${v}`),
    wa ? `WhatsApp: https://wa.me/${wa}` : "",
    `${APP_BASE}/meus-leads`,
  ]
    .filter(Boolean)
    .join("\n");

  return { subject, html, text };
}

export async function drainConversationalQueue(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  resendKey: string,
  from: string,
  limit: number,
): Promise<{ claimed: number; sent: number; failed: number }> {
  const { data, error } = await supabase.rpc("claim_lead_form_deliveries", { p_limit: limit });
  if (error) {
    console.error(`[lead-form-emails] claim-error err=${error.message}`);
    return { claimed: 0, sent: 0, failed: 0 };
  }

  const rows = (data ?? []) as Row[];
  let sent = 0;
  let failed = 0;

  for (const row of rows) {
    if (!resendKey) {
      await supabase.rpc("complete_lead_form_delivery", {
        p_delivery_id: row.delivery_id,
        p_status: "failed",
        p_error: "Credencial de e-mail não configurada.",
      });
      failed++;
      continue;
    }
    try {
      const mail = renderEmail(row);
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
        body: JSON.stringify({
          from,
          to: [row.recipient_email],
          subject: mail.subject,
          html: mail.html,
          text: mail.text,
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error(`[lead-form-emails] provider-error status=${res.status}`);
        await supabase.rpc("complete_lead_form_delivery", {
          p_delivery_id: row.delivery_id,
          p_status: "failed",
          p_error: `Provedor de e-mail retornou ${res.status}.`,
        });
        failed++;
        continue;
      }
      await supabase.rpc("complete_lead_form_delivery", {
        p_delivery_id: row.delivery_id,
        p_status: "sent",
        p_provider_message_id: payload?.id ?? null,
      });
      sent++;
    } catch {
      console.error(`[lead-form-emails] send-exception lead=${row.lead_id}`);
      await supabase.rpc("complete_lead_form_delivery", {
        p_delivery_id: row.delivery_id,
        p_status: "failed",
        p_error: "Falha temporária no envio do e-mail.",
      });
      failed++;
    }
  }

  console.log(`[lead-form-emails] done claimed=${rows.length} sent=${sent} failed=${failed}`);
  return { claimed: rows.length, sent, failed };
}
