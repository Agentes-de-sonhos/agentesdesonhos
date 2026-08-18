// Avisos do pedido de reserva (best-effort).
//
// A solicitação NUNCA depende deste envio: qualquer falha aqui apenas marca a
// linha da fila `quote_booking_request_deliveries` como `failed`. WhatsApp não é
// enviado nem marcado como enviado — não há integração configurada.
const APP_CRM_URL = "https://app.agentesdesonhos.com.br/crm";

const esc = (v: unknown) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const money = (currency: string, value: number) => {
  try {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: currency || "BRL" })
      .format(Number(value) || 0);
  } catch {
    return `${currency} ${(Number(value) || 0).toFixed(2)}`;
  }
};

export interface DeliveryRow {
  delivery_id: string;
  channel: string;
  recipient_kind: string;
  recipient_email: string | null;
  protocol: string;
  version: number;
  client_name: string;
  client_email: string | null;
  client_whatsapp: string | null;
  client_notes: string | null;
  currency: string;
  total_estimated: number;
  quote_id: string;
  destination: string | null;
  trip_title: string | null;
  agency_name: string | null;
  agency_user_id: string;
  opportunity_id: string | null;
  service_names: string | null;
}

export function renderAgencyEmail(row: DeliveryRow) {
  const trip = row.trip_title || row.destination || "Orçamento";
  const contact = [row.client_whatsapp, row.client_email].filter(Boolean).join(" · ");
  return {
    subject: `Nova solicitação de reserva ${row.protocol} — ${trip}`,
    text: [
      `Solicitação de reserva ${row.protocol} (v${row.version})`,
      `Cliente: ${row.client_name}`,
      `Contato: ${contact || "não informado"}`,
      `Orçamento/destino: ${trip}`,
      `Serviços: ${row.service_names || "-"}`,
      `Valor apresentado: ${money(row.currency, row.total_estimated)}`,
      row.client_notes ? `Observações: ${row.client_notes}` : "",
      "",
      "Este pedido não é uma reserva confirmada: reconfirme serviços, disponibilidade e valores.",
      `Abrir no CRM: ${APP_CRM_URL}`,
    ].filter(Boolean).join("\n"),
    html: `
      <div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:560px">
        <p style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#6b7280;margin:0 0 4px">
          Solicitação de reserva
        </p>
        <h2 style="margin:0 0 12px;font-size:20px">${esc(row.protocol)} · v${esc(row.version)}</h2>
        <p style="margin:0 0 4px"><strong>Cliente:</strong> ${esc(row.client_name)}</p>
        <p style="margin:0 0 4px"><strong>Contato:</strong> ${esc(contact || "não informado")}</p>
        <p style="margin:0 0 4px"><strong>Orçamento/destino:</strong> ${esc(trip)}</p>
        <p style="margin:0 0 4px"><strong>Serviços:</strong> ${esc(row.service_names || "-")}</p>
        <p style="margin:0 0 12px"><strong>Valor apresentado:</strong> ${esc(money(row.currency, row.total_estimated))}</p>
        ${row.client_notes ? `<p style="margin:0 0 12px"><strong>Observações:</strong> ${esc(row.client_notes)}</p>` : ""}
        <p style="margin:0 0 16px;color:#b45309;font-size:13px">
          Este pedido <strong>não é uma reserva confirmada</strong>. Reconfirme serviços,
          disponibilidade e valores antes de retornar ao viajante.
        </p>
        <a href="${APP_CRM_URL}" style="display:inline-block;background:#111827;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;font-size:14px">
          Abrir no CRM
        </a>
      </div>`,
  };
}

export function renderClientEmail(row: DeliveryRow) {
  const trip = row.trip_title || row.destination || "sua viagem";
  const agency = row.agency_name || "sua agência";
  return {
    subject: `Recebemos sua solicitação de reserva — ${row.protocol}`,
    text: [
      `Olá, ${row.client_name}!`,
      `Recebemos sua solicitação de reserva para ${trip}.`,
      `Protocolo: ${row.protocol}`,
      `Serviços solicitados: ${row.service_names || "-"}`,
      "",
      "Esta é uma solicitação de reserva. Serviços, disponibilidade e valores serão reconfirmados pela agência. A reserva somente será efetivada após o retorno da agência e a concordância do viajante.",
      `— ${agency}`,
    ].join("\n"),
    html: `
      <div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:560px">
        <h2 style="margin:0 0 12px;font-size:20px">Recebemos sua solicitação</h2>
        <p style="margin:0 0 8px">Olá, ${esc(row.client_name)}!</p>
        <p style="margin:0 0 8px">Sua solicitação para <strong>${esc(trip)}</strong> foi registrada.</p>
        <p style="margin:0 0 8px"><strong>Protocolo:</strong> ${esc(row.protocol)}</p>
        <p style="margin:0 0 12px"><strong>Serviços solicitados:</strong> ${esc(row.service_names || "-")}</p>
        <p style="margin:0 0 12px;color:#6b7280;font-size:13px">
          Esta é uma solicitação de reserva. Serviços, disponibilidade e valores serão
          reconfirmados pela agência. A reserva somente será efetivada após o retorno da
          agência e a concordância do viajante.
        </p>
        <p style="margin:0;color:#111827">— ${esc(agency)}</p>
      </div>`,
  };
}

const FROM = "Agentes de Sonhos <fernando.nobre@agentesdesonhos.com.br>";

/** Drena a fila de e-mails de UM pedido. Nunca lança. */
export async function deliverBookingNotifications(
  supabase: any,
  requestId: string,
): Promise<{ sent: number; failed: number; skipped: number }> {
  const out = { sent: 0, failed: 0, skipped: 0 };
  try {
    const { data, error } = await supabase.rpc("pending_booking_request_deliveries", {
      p_request_id: requestId,
    });
    if (error) {
      console.error("[submit-booking-request] queue-error", error.message);
      return out;
    }
    const rows = (data ?? []) as DeliveryRow[];
    if (rows.length === 0) return out;

    const resendKey = Deno.env.get("RESEND_API_KEY") ?? "";

    for (const row of rows) {
      let to = row.recipient_email ?? "";

      // Destinatário da agência: e-mail da conta titular (nunca exposto ao público).
      if (row.recipient_kind === "agency" && !to) {
        try {
          const { data: userRes } = await supabase.auth.admin.getUserById(row.agency_user_id);
          to = userRes?.user?.email ?? "";
        } catch {
          to = "";
        }
      }

      if (!to) {
        await supabase.rpc("complete_booking_request_delivery", {
          p_delivery_id: row.delivery_id,
          p_status: "skipped",
          p_error: "Destinatário de e-mail não configurado.",
        });
        out.skipped++;
        continue;
      }
      if (!resendKey) {
        await supabase.rpc("complete_booking_request_delivery", {
          p_delivery_id: row.delivery_id,
          p_status: "failed",
          p_error: "Credencial de e-mail não configurada.",
          p_recipient_email: to,
        });
        out.failed++;
        continue;
      }

      const mail = row.recipient_kind === "client"
        ? renderClientEmail(row)
        : renderAgencyEmail(row);

      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
          body: JSON.stringify({
            from: FROM,
            to: [to],
            subject: mail.subject,
            html: mail.html,
            text: mail.text,
          }),
        });
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) {
          console.error(`[submit-booking-request] provider-error status=${res.status}`);
          await supabase.rpc("complete_booking_request_delivery", {
            p_delivery_id: row.delivery_id,
            p_status: "failed",
            p_error: `Provedor de e-mail retornou ${res.status}.`,
            p_recipient_email: to,
          });
          out.failed++;
          continue;
        }
        await supabase.rpc("complete_booking_request_delivery", {
          p_delivery_id: row.delivery_id,
          p_status: "sent",
          p_provider_message_id: payload?.id ?? null,
          p_recipient_email: to,
        });
        out.sent++;
      } catch {
        await supabase.rpc("complete_booking_request_delivery", {
          p_delivery_id: row.delivery_id,
          p_status: "failed",
          p_error: "Falha temporária no envio do e-mail.",
          p_recipient_email: to,
        });
        out.failed++;
      }
    }
  } catch (e) {
    console.error("[submit-booking-request] notify-exception");
  }
  return out;
}
